export default async function dashboardRoutes(fastify, options) {
  fastify.get('/stats', { preValidation: [fastify.authenticate, fastify.requireRole(['super_admin', 'admin'])] }, async (request, reply) => {
    const { role, company_id } = request.user;
    const client = await fastify.pg.connect();

    // Validasi: Jika role bukan super_admin, company_id WAJIB ada di token
    if (role !== 'super_admin' && !company_id) {
      client.release();
      return reply.status(401).send({ 
        success: false, 
        error: { message: 'Sesi tidak valid. Silakan logout dan login kembali.' } 
      });
    }

    try {
      // 1. Statistik Unit (Gunakan alias p.company_id agar tidak bingung)
      const unitStats = await client.query(`
        SELECT 
          COUNT(u.id)::int as total,
          COUNT(u.id) FILTER (WHERE u.status_pembangunan = 'selesai')::int as selesai
        FROM units u
        JOIN clusters c ON c.id = u.cluster_id
        JOIN projects p ON p.id = c.project_id
        ${role !== 'super_admin' ? 'WHERE p.company_id = $1' : ''}
      `, role !== 'super_admin' ? [company_id] : []);

      // 2. Statistik Proyek
      const projectStats = await client.query(`
        SELECT COUNT(*)::int as total 
        FROM projects 
        ${role !== 'super_admin' ? 'WHERE company_id = $1' : ''}
      `, role !== 'super_admin' ? [company_id] : []);

      // 3. Statistik Customer (Role customer yang terikat ke company_id tersebut)
      const customerStats = await client.query(`
        SELECT COUNT(*)::int as active 
        FROM users 
        WHERE role = 'customer' AND status = 'active'
        ${role !== 'super_admin' ? 'AND company_id = $1' : ''}
      `, role !== 'super_admin' ? [company_id] : []);

      reply.send({
        success: true,
        data: {
          units: unitStats.rows[0],
          projects: projectStats.rows[0],
          customers: customerStats.rows[0]
        }
      });
    } catch (err) {
      // Ini akan mencetak error ke terminal Backend Anda (sangat penting untuk debug)
      fastify.log.error("DASHBOARD_STATS_ERROR:", err); 
      
      reply.status(500).send({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'Gagal mengambil statistik dashboard' } 
      });
    } finally {
      client.release();
    }
  });
}