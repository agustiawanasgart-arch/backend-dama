export default async function dashboardRoutes(fastify, options) {
  fastify.get(
    "/stats",
    {
      preValidation: [
        fastify.authenticate,
        fastify.requireRole(["super_admin", "admin"]),
      ],
    },
    async (request, reply) => {
      const { role, company_id } = request.user;
      const client = await fastify.pg.connect();

      if (role !== "super_admin" && !company_id) {
        client.release();
        return reply.status(401).send({
          success: false,
          error: {
            message: "Sesi tidak valid. Silakan logout dan login kembali.",
          },
        });
      }

      try {
        // 1. Statistik Unit — tambah dalam_pembangunan & belum_mulai
        const unitStats = await client.query(
          `
        SELECT 
          COUNT(u.id)::int as total,
          COUNT(u.id) FILTER (WHERE u.status_pembangunan = 'selesai')::int as selesai,
          COUNT(u.id) FILTER (WHERE u.status_pembangunan = 'dalam_pembangunan')::int as dalam_pembangunan,
          COUNT(u.id) FILTER (WHERE u.status_pembangunan = 'belum_mulai')::int as belum_mulai
        FROM units u
        JOIN clusters c ON c.id = u.cluster_id
        JOIN projects p ON p.id = c.project_id
        ${role !== "super_admin" ? "WHERE p.company_id = $1" : ""}
      `,
          role !== "super_admin" ? [company_id] : [],
        );

        // 2. Statistik Proyek — tambah active, completed, on_hold
        const projectStats = await client.query(
          `
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'active')::int as active,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
          COUNT(*) FILTER (WHERE status = 'on_hold')::int as on_hold
        FROM projects
        ${role !== "super_admin" ? "WHERE company_id = $1" : ""}
      `,
          role !== "super_admin" ? [company_id] : [],
        );

        // 3. Statistik Customer — tambah total
        const customerStats = await client.query(
          `
  SELECT
    COUNT(DISTINCT u.id)::int as total,
    COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'active')::int as active
  FROM users u
  JOIN property_assignments pa ON pa.user_id = u.id
  JOIN units un ON un.id = pa.unit_id
  JOIN clusters c ON c.id = un.cluster_id
  JOIN projects p ON p.id = c.project_id
  WHERE u.role = 'customer'::user_role
  ${role !== "super_admin" ? "AND p.company_id = $1" : ""}
`,
          role !== "super_admin" ? [company_id] : [],
        );

        // 4. Statistik Assignment — query baru
        const assignmentStats = await client.query(
          `
  SELECT
    COUNT(a.id)::int as total,
    COUNT(a.id) FILTER (WHERE a.status_kepemilikan = 'active')::int as active
  FROM property_assignments a
  JOIN units u ON u.id = a.unit_id
  JOIN clusters c ON c.id = u.cluster_id
  JOIN projects p ON p.id = c.project_id
  ${role !== "super_admin" ? "WHERE p.company_id = $1" : ""}
`,
          role !== "super_admin" ? [company_id] : [],
        );
        reply.send({
          success: true,
          data: {
            units: unitStats.rows[0],
            projects: projectStats.rows[0],
            customers: customerStats.rows[0],
            property_assignments: assignmentStats.rows[0],
          },
        });
      } catch (err) {
        fastify.log.error({ err }, "DASHBOARD_STATS_ERROR");
        reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Gagal mengambil statistik dashboard",
          },
        });
      } finally {
        client.release();
      }
    },
  );
}
