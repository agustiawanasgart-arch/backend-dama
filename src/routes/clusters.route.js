import {
  clusterQuerySchema,
  createClusterSchema,
  updateClusterSchema,
} from "../schemas/clusters.schema.js";

export default async function clusterRoutes(fastify, options) {
  // Helper untuk format response
  const mapClusterResponse = (row) => ({
    id: row.id,
    nama_cluster: row.nama_cluster,
    jumlah_unit: row.jumlah_unit,
    project: {
      id: row.project_id,
      nama_proyek: row.nama_proyek,
      lokasi: row.lokasi,
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  // GET /api/clusters - List semua cluster
  fastify.get(
    "/",
    {
      preValidation: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { project_id, page = 1, limit = 100 } = request.query;
        const offset = (page - 1) * limit;

        const client = await fastify.pg.connect();

        try {
          let whereClauses = [];
          let values = [];
          let paramIndex = 1;

          // ✅ FILTER PROJECT
          if (project_id) {
            whereClauses.push(`project_id = $${paramIndex++}`);
            values.push(project_id);
          }

          const whereString =
            whereClauses.length > 0
              ? `WHERE ${whereClauses.join(" AND ")}`
              : "";

          const query = `
        SELECT * FROM clusters
        ${whereString}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

          const { rows } = await client.query(query, [
            ...values,
            limit,
            offset,
          ]);

          reply.send({
            success: true,
            data: rows,
          });
        } finally {
          client.release();
        }
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Server error",
          },
        });
      }
    },
  );

  // GET /api/clusters/:id - Detail cluster
  fastify.get(
    "/:id",
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { role, company_id } = request.user;

        const client = await fastify.pg.connect();
        try {
          let query = `
          SELECT 
            c.id, c.nama_cluster, c.jumlah_unit, c.project_id,
            p.nama_proyek, p.lokasi, p.company_id,
            c.created_at, c.updated_at
          FROM clusters c
          JOIN projects p ON p.id = c.project_id
          WHERE c.id = $1
        `;

          const params = [id];

          // Filter by company (jika bukan super_admin)
          if (role !== "super_admin") {
            query += " AND p.company_id = $2";
            params.push(company_id);
          }

          const { rows } = await client.query(query, params);

          if (rows.length === 0) {
            return reply.status(404).send({
              success: false,
              error: { code: "NOT_FOUND", message: "Cluster tidak ditemukan" },
            });
          }

          reply.send({
            success: true,
            data: mapClusterResponse(rows[0]),
          });
        } finally {
          client.release();
        }
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({
          success: false,
          error: { code: "INTERNAL_ERROR", message: error.message },
        });
      }
    },
  );

  // POST /api/clusters - Buat cluster baru
  fastify.post(
    "/",
    {
      preValidation: [
        fastify.authenticate,
        fastify.requireRole(["super_admin", "admin"]),
      ],
    },
    async (request, reply) => {
      try {
        const { role, company_id } = request.user;
        const data = createClusterSchema.parse(request.body);

        const client = await fastify.pg.connect();
        try {
          // Cek apakah project ada dan milik company_id yang benar
          const projectCheck =
            role === "super_admin"
              ? `SELECT id, company_id FROM projects WHERE id = $1`
              : `SELECT id, company_id FROM projects WHERE id = $1 AND company_id = $2`;

          const projectParams =
            role === "super_admin"
              ? [data.project_id]
              : [data.project_id, company_id];
          const { rows: projectRows } = await client.query(
            projectCheck,
            projectParams,
          );

          if (projectRows.length === 0) {
            return reply.status(403).send({
              success: false,
              error: {
                code: "FORBIDDEN",
                message: "Proyek tidak ditemukan atau Anda tidak punya akses",
              },
            });
          }

          // Insert cluster baru
          const query = `
          INSERT INTO clusters (project_id, nama_cluster, jumlah_unit)
          VALUES ($1, $2, $3)
          RETURNING id, nama_cluster, jumlah_unit, project_id, created_at, updated_at
        `;

          const { rows } = await client.query(query, [
            data.project_id,
            data.nama_cluster,
            data.jumlah_unit,
          ]);

          // Ambil data project untuk response
          const { rows: projectData } = await client.query(
            "SELECT nama_proyek, lokasi FROM projects WHERE id = $1",
            [data.project_id],
          );

          reply.status(201).send({
            success: true,
            data: {
              id: rows[0].id,
              nama_cluster: rows[0].nama_cluster,
              jumlah_unit: rows[0].jumlah_unit,
              project: {
                id: rows[0].project_id,
                nama_proyek: projectData[0].nama_proyek,
                lokasi: projectData[0].lokasi,
              },
              created_at: rows[0].created_at,
              updated_at: rows[0].updated_at,
            },
          });
        } finally {
          client.release();
        }
      } catch (error) {
        if (error.name === "ZodError") {
          return reply.status(422).send({
            success: false,
            error: { code: "VALIDATION_ERROR", details: error.errors },
          });
        }
        fastify.log.error(error);
        reply.status(500).send({
          success: false,
          error: { code: "INTERNAL_ERROR", message: error.message },
        });
      }
    },
  );

  // PATCH /api/clusters/:id - Update cluster
  fastify.patch(
    "/:id",
    {
      preValidation: [
        fastify.authenticate,
        fastify.requireRole(["super_admin", "admin"]),
      ],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { role, company_id } = request.user;
        const data = updateClusterSchema.parse(request.body);

        const client = await fastify.pg.connect();
        try {
          // Cek cluster ada dan milik company yang benar
          const clusterCheck =
            role === "super_admin"
              ? `SELECT c.id, c.project_id FROM clusters c JOIN projects p ON p.id = c.project_id WHERE c.id = $1`
              : `SELECT c.id, c.project_id FROM clusters c JOIN projects p ON p.id = c.project_id WHERE c.id = $1 AND p.company_id = $2`;

          const checkParams = role === "super_admin" ? [id] : [id, company_id];
          const { rows: clusterRows } = await client.query(
            clusterCheck,
            checkParams,
          );

          if (clusterRows.length === 0) {
            return reply.status(404).send({
              success: false,
              error: {
                code: "NOT_FOUND",
                message: "Cluster tidak ditemukan atau Anda tidak punya akses",
              },
            });
          }

          // Build dynamic UPDATE query
          const updates = [];
          const values = [];
          let paramIndex = 1;

          if (data.nama_cluster !== undefined) {
            updates.push(`nama_cluster = $${paramIndex}`);
            values.push(data.nama_cluster);
            paramIndex++;
          }

          if (data.jumlah_unit !== undefined) {
            updates.push(`jumlah_unit = $${paramIndex}`);
            values.push(data.jumlah_unit);
            paramIndex++;
          }

          if (data.project_id !== undefined) {
            updates.push(`project_id = $${paramIndex}`);
            values.push(data.project_id);
            paramIndex++;
          }

          updates.push("updated_at = NOW()");

          if (updates.length === 1) {
            // Hanya ada updated_at
            return reply.send({
              success: true,
              message: "Tidak ada data yang diubah",
            });
          }

          values.push(id);
          const query = `
          UPDATE clusters
          SET ${updates.join(", ")}
          WHERE id = $${paramIndex}
          RETURNING id, nama_cluster, jumlah_unit, project_id, created_at, updated_at
        `;

          const { rows } = await client.query(query, values);

          // Ambil data project untuk response
          const { rows: projectData } = await client.query(
            "SELECT nama_proyek, lokasi FROM projects WHERE id = $1",
            [rows[0].project_id],
          );

          reply.send({
            success: true,
            data: {
              id: rows[0].id,
              nama_cluster: rows[0].nama_cluster,
              jumlah_unit: rows[0].jumlah_unit,
              project: {
                id: rows[0].project_id,
                nama_proyek: projectData[0].nama_proyek,
                lokasi: projectData[0].lokasi,
              },
              created_at: rows[0].created_at,
              updated_at: rows[0].updated_at,
            },
          });
        } finally {
          client.release();
        }
      } catch (error) {
        if (error.name === "ZodError") {
          return reply.status(422).send({
            success: false,
            error: { code: "VALIDATION_ERROR", details: error.errors },
          });
        }
        fastify.log.error(error);
        reply.status(500).send({
          success: false,
          error: { code: "INTERNAL_ERROR", message: error.message },
        });
      }
    },
  );

  // DELETE /api/clusters/:id - Hapus cluster
  fastify.delete(
    "/:id",
    {
      preValidation: [
        fastify.authenticate,
        fastify.requireRole(["super_admin", "admin"]),
      ],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { role, company_id } = request.user;

        const client = await fastify.pg.connect();
        try {
          // Cek cluster ada dan milik company yang benar
          const clusterCheck =
            role === "super_admin"
              ? `SELECT id FROM clusters c JOIN projects p ON p.id = c.project_id WHERE c.id = $1`
              : `SELECT id FROM clusters c JOIN projects p ON p.id = c.project_id WHERE c.id = $1 AND p.company_id = $2`;

          const checkParams = role === "super_admin" ? [id] : [id, company_id];
          const { rows: clusterRows } = await client.query(
            clusterCheck,
            checkParams,
          );

          if (clusterRows.length === 0) {
            return reply.status(404).send({
              success: false,
              error: {
                code: "NOT_FOUND",
                message: "Cluster tidak ditemukan atau Anda tidak punya akses",
              },
            });
          }

          // Cek apakah ada units yang terikat ke cluster ini
          const unitsCheck = await client.query(
            "SELECT COUNT(*) as count FROM units WHERE cluster_id = $1",
            [id],
          );

          if (parseInt(unitsCheck.rows[0].count) > 0) {
            return reply.status(409).send({
              success: false,
              error: {
                code: "CONFLICT",
                message:
                  "Tidak bisa menghapus cluster karena masih ada unit yang terikat",
              },
            });
          }

          // Delete cluster
          await client.query("DELETE FROM clusters WHERE id = $1", [id]);

          reply.send({
            success: true,
            message: "Cluster berhasil dihapus",
          });
        } finally {
          client.release();
        }
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({
          success: false,
          error: { code: "INTERNAL_ERROR", message: error.message },
        });
      }
    },
  );

  // GET /api/clusters/project/:projectId - List cluster by project
  fastify.get(
    "/project/:projectId",
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { role, company_id } = request.user;

        const client = await fastify.pg.connect();
        try {
          let query = `
          SELECT 
            c.id, c.nama_cluster, c.jumlah_unit, c.project_id,
            p.nama_proyek, p.lokasi,
            c.created_at, c.updated_at
          FROM clusters c
          JOIN projects p ON p.id = c.project_id
          WHERE c.project_id = $1
        `;

          const params = [projectId];

          // Filter by company (jika bukan super_admin)
          if (role !== "super_admin") {
            query += " AND p.company_id = $2";
            params.push(company_id);
          }

          query += " ORDER BY c.nama_cluster ASC";

          const { rows } = await client.query(query, params);

          reply.send({
            success: true,
            data: rows.map(mapClusterResponse),
          });
        } finally {
          client.release();
        }
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({
          success: false,
          error: { code: "INTERNAL_ERROR", message: error.message },
        });
      }
    },
  );
}
