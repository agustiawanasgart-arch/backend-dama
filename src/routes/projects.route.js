import { z } from "zod";

const createProjectSchema = z.object({
  nama_proyek: z.string().min(3),
  lokasi: z.string().min(3),
  deskripsi: z.string().optional(),
  status: z.enum(["active", "completed", "on_hold"]).default("active"),
});

const updateProjectSchema = createProjectSchema.partial();

export default async function projectRoutes(fastify, options) {
  // GET /api/projects - List all projects
  fastify.get(
    "/",
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      const { role, company_id } = request.user;
      const client = await fastify.pg.connect();
      try {
        let query = "SELECT * FROM projects";
        let params = [];
        if (role !== "super_admin") {
          query += " WHERE company_id = $1";
          params.push(company_id);
        }
        query += " ORDER BY created_at DESC";
        const { rows } = await client.query(query, params);
        reply.send({ success: true, data: rows });
      } finally {
        client.release();
      }
    },
  );

  // GET /api/projects/:id - Get Single Project Detail
  fastify.get(
    "/:id",
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const { role, company_id } = request.user;
      const client = await fastify.pg.connect();
      try {
        let query = "SELECT * FROM projects WHERE id = $1";
        let params = [id];
        if (role !== "super_admin") {
          query += " AND company_id = $2";
          params.push(company_id);
        }
        const { rows } = await client.query(query, params);
        if (rows.length === 0)
          return reply
            .status(404)
            .send({ success: false, message: "Proyek tidak ditemukan" });
        reply.send({ success: true, data: rows[0] });
      } finally {
        client.release();
      }
    },
  );

  // POST /api/projects - Create
  // POST /api/projects
  fastify.post(
    "/",
    { preValidation: [fastify.authenticate, fastify.requireRole(["admin"])] },
    async (request, reply) => {
      const { company_id, id: userId } = request.user; // Pastikan menggunakan id/sub yang benar dari payload JWT
      const data = createProjectSchema.parse(request.body);
      const client = await fastify.pg.connect();
      try {
        // DISINI PERBAIKANNYA: Kolom dan Values harus match (6 vs 6)
        const query = `
      INSERT INTO projects (company_id, nama_proyek, lokasi, deskripsi, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;

        const { rows } = await client.query(query, [
          company_id,
          data.nama_proyek,
          data.lokasi,
          data.deskripsi || null, // Handle jika deskripsi kosong
          data.status,
          userId,
        ]);

        reply.status(201).send({ success: true, data: rows[0] });
      } finally {
        client.release();
      }
    },
  );

  // PATCH /api/projects/:id - Update
  fastify.patch(
    "/:id",
    { preValidation: [fastify.authenticate, fastify.requireRole(["admin"])] },
    async (request, reply) => {
      const { id } = request.params;
      const { company_id } = request.user;
      const data = updateProjectSchema.parse(request.body);
      const client = await fastify.pg.connect();
      try {
        const fields = Object.keys(data)
          .map((key, i) => `${key} = $${i + 3}`)
          .join(", ");
        const values = Object.values(data);
        const query = `UPDATE projects SET ${fields} WHERE id = $1 AND company_id = $2 RETURNING *`;
        const { rows } = await client.query(query, [id, company_id, ...values]);
        if (rows.length === 0)
          return reply
            .status(404)
            .send({ success: false, message: "Proyek tidak ditemukan" });
        reply.send({ success: true, data: rows[0] });
      } finally {
        client.release();
      }
    },
  );

  // DELETE /api/projects/:id - Delete
  fastify.delete(
    "/:id",
    {
      preValidation: [
        fastify.authenticate,
        fastify.requireRole(["admin", "super_admin"]),
      ],
    },
    async (request, reply) => {
      console.log("DELETE project", request.params.id, "user:", request.user);

      const { id } = request.params;
      const { role, company_id } = request.user;
      const client = await fastify.pg.connect();

      try {
        let query = "DELETE FROM projects WHERE id = $1";
        let params = [id];

        if (role !== "super_admin") {
          query += " AND company_id = $2";
          params.push(company_id);
        }

        const { rowCount } = await client.query(query, params);

        if (rowCount === 0) {
          return reply.status(404).send({
            success: false,
            message: "Proyek tidak ditemukan",
          });
        }

        return reply.send({
          success: true,
          message: "Proyek berhasil dihapus",
        });
      } catch (err) {
        request.log.error(err); // 🔥 tambahan biar debug enak
        return reply.status(500).send({
          success: false,
          message: "Internal Server Error",
        });
      } finally {
        client.release();
      }
    },
  );
}
