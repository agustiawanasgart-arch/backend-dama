export default async function companyRoutes(fastify, options) {
  
  // Hanya Super Admin yang bisa akses grup ini
  fastify.addHook('preValidation', fastify.authenticate);
  fastify.addHook('preValidation', fastify.requireRole(['super_admin']));

  // GET /api/companies
  fastify.get('/', async (request, reply) => {
    const client = await fastify.pg.connect();
    const { rows } = await client.query('SELECT * FROM companies ORDER BY nama_pt ASC');
    client.release();
    return { success: true, data: rows };
  });

  // POST /api/companies (Tambah Anak Perusahaan Baru)
  fastify.post('/', async (request, reply) => {
    const { nama_pt, kode_pt, alamat } = request.body;
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        'INSERT INTO companies (nama_pt, kode_pt, alamat) VALUES ($1, $2, $3) RETURNING *',
        [nama_pt, kode_pt, alamat]
      );
      reply.status(201).send({ success: true, data: rows[0] });
    } finally {
      client.release();
    }
  });
}