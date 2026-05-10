import { progressQuerySchema, createProgressSchema } from "../schemas/progress.schema.js";
import { z } from 'zod';

const updateProgressSchema = createProgressSchema.partial();

export default async function progressRoutes(fastify, options) {
  const mapProgressResponse = (row) => ({
    id: row.id, tahap: row.tahap, progress_percentage: row.progress_percentage,
    tanggal_update: row.tanggal_update, catatan: row.catatan, created_at: row.created_at,
    unit: { id: row.unit_id, nomor_unit: row.nomor_unit, cluster: { id: row.cluster_id, nama_cluster: row.nama_cluster, project: { id: row.project_id, nama_proyek: row.nama_proyek } } },
    created_by: row.created_by_id ? { id: row.created_by_id, nama: row.created_by_nama } : null,
  });

  // POST /api/progress
  fastify.post("/", { preValidation: [fastify.authenticate, fastify.requireRole(["super_admin", "admin"])] }, async (request, reply) => {
    const { unit_id, tahap, progress_percentage, tanggal_update, catatan } = createProgressSchema.parse(request.body);
    const userId = request.user.sub;
    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');
      const ins = `INSERT INTO progress (unit_id, tahap, progress_percentage, tanggal_update, catatan, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
      const { rows } = await client.query(ins, [unit_id, tahap, progress_percentage, tanggal_update, catatan, userId]);
      await client.query('UPDATE units SET progress_percentage = $1, updated_at = NOW() WHERE id = $2', [progress_percentage, unit_id]);
      await client.query('COMMIT');
      reply.status(201).send({ success: true, data: rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally { client.release(); }
  });

  // PATCH /api/progress/:id - Edit Progress
  fastify.patch("/:id", { preValidation: [fastify.authenticate, fastify.requireRole(["super_admin", "admin"])] }, async (request, reply) => {
    const { id } = request.params;
    const data = updateProgressSchema.parse(request.body);
    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');
      const keys = Object.keys(data);
      const fields = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
      const { rows } = await client.query(`UPDATE progress SET ${fields} WHERE id = $1 RETURNING *`, [id, ...Object.values(data)]);
      if (rows.length === 0) return reply.status(404).send({ success: false, message: 'Data tidak ditemukan' });
      
      // Update unit progress if percentage changed
      if (data.progress_percentage) {
        await client.query('UPDATE units SET progress_percentage = $1 WHERE id = $2', [data.progress_percentage, rows[0].unit_id]);
      }
      await client.query('COMMIT');
      reply.send({ success: true, data: rows[0] });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  });

  // DELETE /api/progress/:id - Delete & Sync Unit
  fastify.delete("/:id", { preValidation: [fastify.authenticate, fastify.requireRole(["super_admin", "admin"])] }, async (request, reply) => {
    const { id } = request.params;
    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');
      const { rows: target } = await client.query('SELECT unit_id FROM progress WHERE id = $1', [id]);
      if (target.length === 0) return reply.status(404).send({ success: false, message: 'Data tidak ditemukan' });
      const unitId = target[0].unit_id;
      await client.query('DELETE FROM progress WHERE id = $1', [id]);
      const { rows: latest } = await client.query('SELECT progress_percentage FROM progress WHERE unit_id = $1 ORDER BY tanggal_update DESC, created_at DESC LIMIT 1', [unitId]);
      const newPerc = latest.length > 0 ? latest[0].progress_percentage : 0;
      await client.query('UPDATE units SET progress_percentage = $1 WHERE id = $2', [newPerc, unitId]);
      await client.query('COMMIT');
      reply.send({ success: true, message: 'Progress dihapus dan Unit disinkronkan' });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  });

  // GET /api/progress
  fastify.get("/", { preValidation: [fastify.authenticate] }, async (request, reply) => {
      const { page, limit, unit_id, project_id, cluster_id, tahap, date_from, date_to } = progressQuerySchema.parse(request.query);
      const offset = (page - 1) * limit;
      const client = await fastify.pg.connect();
      try {
          let where = []; let values = []; let i = 1;
          if (unit_id) { where.push(`unit_id = $${i++}`); values.push(unit_id); }
          if (tahap) { where.push(`tahap ILIKE $${i++}`); values.push(`%${tahap}%`); }
          const whereStr = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
          const { rows } = await client.query(`SELECT * FROM v_progress_detail ${whereStr} ORDER BY tanggal_update DESC LIMIT $${i} OFFSET $${i+1}`, [...values, limit, offset]);
          reply.send({ success: true, data: rows.map(mapProgressResponse) });
      } finally { client.release(); }
  });
}