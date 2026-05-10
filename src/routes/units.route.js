import { unitQuerySchema, createUnitSchema, updateUnitSchema } from '../schemas/units.schema.js';

export default async function unitRoutes(fastify, options) {
  const mapUnitResponse = (row) => ({
    id: row.id, nomor_unit: row.nomor_unit, tipe_rumah: row.tipe_rumah,
    luas_tanah: parseFloat(row.luas_tanah), luas_bangunan: parseFloat(row.luas_bangunan),
    status_pembangunan: row.status_pembangunan, progress_percentage: row.progress_percentage,
    cluster: { id: row.cluster_id, nama_cluster: row.nama_cluster, project: { id: row.project_id, nama_proyek: row.nama_proyek } }
  });

  // PATCH /api/units/:id - Update Unit
  fastify.patch('/:id', { preValidation: [fastify.authenticate, fastify.requireRole(['admin'])] }, async (request, reply) => {
    const { id } = request.params;
    const data = updateUnitSchema.parse(request.body);
    const client = await fastify.pg.connect();
    try {
      const keys = Object.keys(data);
      const fields = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
      const query = `UPDATE units SET ${fields} WHERE id = $1 RETURNING *`;
      const { rows } = await client.query(query, [id, ...Object.values(data)]);
      if (rows.length === 0) return reply.status(404).send({ success: false, message: 'Unit tidak ditemukan' });
      reply.send({ success: true, data: rows[0] });
    } finally { client.release(); }
  });

  // POST /api/units/bulk - Fungsionalitas Tambahan: Bulk Upload
  fastify.post('/bulk', { preValidation: [fastify.authenticate, fastify.requireRole(['admin'])] }, async (request, reply) => {
    const units = request.body; // Expecting array of unit objects
    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');
      for (const unit of units) {
        const parsed = createUnitSchema.parse(unit);
        await client.query(
          'INSERT INTO units (cluster_id, nomor_unit, tipe_rumah, luas_tanah, luas_bangunan) VALUES ($1, $2, $3, $4, $5)',
          [parsed.cluster_id, parsed.nomor_unit, parsed.tipe_rumah, parsed.luas_tanah, parsed.luas_bangunan]
        );
      }
      await client.query('COMMIT');
      reply.send({ success: true, message: `${units.length} unit berhasil ditambahkan` });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  });

  // GET /api/units
  fastify.get('/', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query('SELECT * FROM v_unit_detail');
      reply.send({ success: true, data: rows.map(mapUnitResponse) });
    } finally { client.release(); }
  });
}