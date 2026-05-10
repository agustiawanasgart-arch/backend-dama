import { progressQuerySchema, createProgressSchema } from "../schemas/progress.schema.js";

const updateProgressSchema = createProgressSchema.partial();

export default async function progressRoutes(fastify, options) {

  // ── Explicit SELECT replaces SELECT * FROM v_progress_detail ───
  // The old view caused column-name ambiguity: row.id and row.unit_id
  // could resolve to undefined depending on the view definition.
  // With an explicit JOIN every alias is guaranteed.
  const PROGRESS_SELECT = `
    SELECT
      p.id                  AS id,
      p.tahap               AS tahap,
      p.progress_percentage AS progress_percentage,
      p.tanggal_update      AS tanggal_update,
      p.catatan             AS catatan,
      p.created_at          AS created_at,
      p.unit_id             AS unit_id,
      u.nomor_unit          AS nomor_unit,
      cl.id                 AS cluster_id,
      cl.nama_cluster       AS nama_cluster,
      pr.id                 AS project_id,
      pr.nama_proyek        AS nama_proyek,
      p.created_by          AS created_by_id,
      cb.nama               AS created_by_nama
    FROM progress p
    JOIN units    u  ON u.id  = p.unit_id
    JOIN clusters cl ON cl.id = u.cluster_id
    JOIN projects pr ON pr.id = cl.project_id
    LEFT JOIN users cb ON cb.id = p.created_by
  `;

  const mapProgressResponse = (row) => ({
    id:                  row.id,
    tahap:               row.tahap,
    progress_percentage: Number(row.progress_percentage ?? 0),
    tanggal_update:      row.tanggal_update,
    catatan:             row.catatan,
    created_at:          row.created_at,
    unit: {
      id:         row.unit_id,
      nomor_unit: row.nomor_unit,
      cluster: {
        id:           row.cluster_id,
        nama_cluster: row.nama_cluster,
        project: { id: row.project_id, nama_proyek: row.nama_proyek },
      },
    },
    created_by: row.created_by_id
      ? { id: row.created_by_id, nama: row.created_by_nama }
      : null,
  });

  /**
   * Recalculate and sync the unit's total progress_percentage from all its
   * progress records (SUM capped at 100). Must be called inside an open txn.
   */
  const syncUnitProgress = async (client, unitId) => {
    const { rows } = await client.query(
      `SELECT LEAST(COALESCE(SUM(progress_percentage), 0), 100)::int AS total
         FROM progress WHERE unit_id = $1`,
      [unitId]
    );
    await client.query(
      `UPDATE units SET progress_percentage = $1, updated_at = NOW() WHERE id = $2`,
      [rows[0].total, unitId]
    );
    return rows[0].total;
  };

  // ── POST /api/progress ─────────────────────────────────────────
  fastify.post(
    "/",
    { preValidation: [fastify.authenticate, fastify.requireRole(["super_admin", "admin"])] },
    async (request, reply) => {
      const { unit_id, tahap, progress_percentage, tanggal_update, catatan } =
        createProgressSchema.parse(request.body);
      const userId = request.user.sub;
      const client = await fastify.pg.connect();

      try {
        await client.query("BEGIN");

        const { rows } = await client.query(
          `INSERT INTO progress
             (unit_id, tahap, progress_percentage, tanggal_update, catatan, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [unit_id, tahap, progress_percentage, tanggal_update, catatan, userId]
        );

        await syncUnitProgress(client, unit_id);
        await client.query("COMMIT");

        const { rows: detail } = await client.query(
          `${PROGRESS_SELECT} WHERE p.id = $1`, [rows[0].id]
        );
        reply.status(201).send({ success: true, data: mapProgressResponse(detail[0]) });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
  );

  // ── PATCH /api/progress/:id ────────────────────────────────────
  fastify.patch(
    "/:id",
    { preValidation: [fastify.authenticate, fastify.requireRole(["super_admin", "admin"])] },
    async (request, reply) => {
      const { id } = request.params;
      const data = updateProgressSchema.parse(request.body);
      const client = await fastify.pg.connect();

      try {
        await client.query("BEGIN");

        const keys = Object.keys(data);
        if (keys.length === 0) {
          await client.query("ROLLBACK");
          return reply.send({ success: true, message: "Tidak ada data yang diubah" });
        }

        const fields = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
        const { rows } = await client.query(
          `UPDATE progress SET ${fields} WHERE id = $1 RETURNING id, unit_id`,
          [id, ...Object.values(data)]
        );

        if (rows.length === 0) {
          await client.query("ROLLBACK");
          return reply.status(404).send({ success: false, message: "Data tidak ditemukan" });
        }

        // Recalculate unit total from ALL records (not just the edited one)
        await syncUnitProgress(client, rows[0].unit_id);
        await client.query("COMMIT");

        const { rows: detail } = await client.query(
          `${PROGRESS_SELECT} WHERE p.id = $1`, [id]
        );
        reply.send({ success: true, data: mapProgressResponse(detail[0]) });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
  );

  // ── DELETE /api/progress/:id ───────────────────────────────────
  fastify.delete(
    "/:id",
    { preValidation: [fastify.authenticate, fastify.requireRole(["super_admin", "admin"])] },
    async (request, reply) => {
      const { id } = request.params;
      const client = await fastify.pg.connect();

      try {
        await client.query("BEGIN");

        const { rows: target } = await client.query(
          "SELECT unit_id FROM progress WHERE id = $1", [id]
        );
        if (target.length === 0) {
          await client.query("ROLLBACK");
          return reply.status(404).send({ success: false, message: "Data tidak ditemukan" });
        }

        const unitId = target[0].unit_id;
        await client.query("DELETE FROM progress WHERE id = $1", [id]);

        // Recalculate from remaining records (0 when none left)
        await syncUnitProgress(client, unitId);
        await client.query("COMMIT");

        reply.send({ success: true, message: "Progress dihapus dan Unit disinkronkan" });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
  );

  // ── GET /api/progress ──────────────────────────────────────────
  fastify.get(
    "/",
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      const { page, limit, unit_id, tahap } = progressQuerySchema.parse(request.query);
      const offset = (page - 1) * limit;
      const client = await fastify.pg.connect();

      try {
        const conditions = [];
        const values = [];
        let i = 1;

        if (unit_id) { conditions.push(`p.unit_id = $${i++}`); values.push(unit_id); }
        if (tahap)   { conditions.push(`p.tahap ILIKE $${i++}`); values.push(`%${tahap}%`); }

        const whereStr = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const { rows } = await client.query(
          `${PROGRESS_SELECT}
           ${whereStr}
           ORDER BY p.tanggal_update DESC, p.created_at DESC
           LIMIT $${i} OFFSET $${i + 1}`,
          [...values, limit, offset]
        );

        reply.send({ success: true, data: rows.map(mapProgressResponse) });
      } finally {
        client.release();
      }
    }
  );
}