import { 
  assignmentQuerySchema, 
  createAssignmentSchema, 
  updateAssignmentSchema, 
  createPaymentSchema 
} from '../schemas/assignments.schema.js';

export default async function assignmentRoutes(fastify, options) {

  // Helper untuk memetakan row dari v_assignment_detail
  const mapAssignmentResponse = (row) => ({
    id: row.id,
    tanggal_pembelian: row.tanggal_pembelian,
    status_kepemilikan: row.status_kepemilikan,
    
    pembayaran: {
      tipe: row.tipe_pembayaran,
      harga_total: parseFloat(row.harga_total || 0),
      total_dibayar: parseFloat(row.total_dibayar || 0),
      persentase_dibayar: parseFloat(row.persentase_dibayar || 0),
      tenor_bulan: row.tenor_bulan,
      keterangan_kpr: row.keterangan_kpr
    },
    
    created_at: row.created_at,
    user: {
      id: row.user_id,
      nama: row.user_nama,
      email: row.user_email,
      nomor_telepon: row.user_telepon
    },
    unit: {
      id: row.unit_id,
      nomor_unit: row.nomor_unit,
      tipe_rumah: row.tipe_rumah,
      status_pembangunan: row.status_pembangunan,
      progress_percentage: row.progress_percentage,
      cluster: {
        nama_cluster: row.nama_cluster,
        project: {
          nama_proyek: row.nama_proyek,
          lokasi: row.project_lokasi
        }
      }
    }
  });

  // GET /api/assignments
  fastify.get('/', {
    preValidation: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { role, company_id: userCompanyId, sub: userId } = request.user;
      
      // Ambil data query termasuk 'search'
      const { page = 1, limit = 15, user_id, unit_id, status, search } = request.query;
      const offset = (page - 1) * limit;

      const client = await fastify.pg.connect();
      try {
        let whereClauses = [];
        let values = [];
        let paramIndex = 1;

        // Aturan Akses Role
        if (role === 'customer') {
          // Customer HANYA bisa lihat miliknya sendiri
          whereClauses.push(`user_id = $${paramIndex++}`);
          values.push(userId);
        } else if (role !== 'super_admin') {
          // Admin hanya bisa lihat yang ada di perusahaannya
          whereClauses.push(`company_id = $${paramIndex++}`);
          values.push(userCompanyId);
        }

        // Filter Manual
        if (user_id && role !== 'customer') {
          whereClauses.push(`user_id = $${paramIndex++}`);
          values.push(user_id);
        }
        if (unit_id) {
          whereClauses.push(`unit_id = $${paramIndex++}`);
          values.push(unit_id);
        }
        if (status) {
          whereClauses.push(`status_kepemilikan = $${paramIndex++}`);
          values.push(status);
        }

        // Fitur Pencarian (Search)
        if (search) {
          whereClauses.push(`(user_nama ILIKE $${paramIndex} OR nomor_unit ILIKE $${paramIndex} OR nama_cluster ILIKE $${paramIndex})`);
          values.push(`%${search}%`);
          paramIndex++;
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const dataQuery = `
          SELECT * FROM v_assignment_detail
          ${whereString}
          ORDER BY created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        const { rows: dataRows } = await client.query(dataQuery, [...values, limit, offset]);

        const countQuery = `SELECT COUNT(*) FROM v_assignment_detail ${whereString}`;
        const { rows: countRows } = await client.query(countQuery, values);
        
        reply.send({
          success: true,
          data: dataRows.map(mapAssignmentResponse),
          meta: { 
            page: parseInt(page), 
            limit: parseInt(limit), 
            total: parseInt(countRows[0].count, 10) 
          }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error' } });
    }
  });

  // POST /api/assignments
  fastify.post('/', {
    preValidation: [fastify.authenticate, fastify.requireRole(['admin', 'super_admin'])]
  }, async (request, reply) => {
    try {
      const data = createAssignmentSchema.parse(request.body);
      const createdBy = request.user.sub;

      const client = await fastify.pg.connect();
      try {
        const query = `
          INSERT INTO property_assignments (
            user_id, unit_id, tanggal_pembelian, status_kepemilikan, 
            tipe_pembayaran, harga_total, tenor_bulan, keterangan_kpr, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `;
        const values = [
          data.user_id, data.unit_id, data.tanggal_pembelian, data.status_kepemilikan,
          data.tipe_pembayaran, data.harga_total, data.tenor_bulan, data.keterangan_kpr, createdBy
        ];

        const { rows } = await client.query(query, values);
        
        const { rows: detailRows } = await client.query('SELECT * FROM v_assignment_detail WHERE id = $1', [rows[0].id]);
        
        reply.status(201).send({ success: true, data: mapAssignmentResponse(detailRows[0]) });
      } catch (dbError) {
        if (dbError.code === '23505') {
          return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: 'Unit ini sudah aktif dimiliki oleh seseorang' } });
        }
        throw dbError;
      } finally {
        client.release();
      }
    } catch (error) {
      if (error.name === 'ZodError') return reply.status(422).send({ success: false, error: { code: 'VALIDATION_ERROR', message: error.errors } });
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error' } });
    }
  });

  // PATCH /api/assignments/:id
  fastify.patch('/:id', {
    preValidation: [fastify.authenticate, fastify.requireRole(['admin', 'super_admin'])]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const data = updateAssignmentSchema.parse(request.body);

      const client = await fastify.pg.connect();
      try {
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (data.tanggal_pembelian) { updates.push(`tanggal_pembelian = $${paramIndex++}`); values.push(data.tanggal_pembelian); }
        if (data.status_kepemilikan) { updates.push(`status_kepemilikan = $${paramIndex++}`); values.push(data.status_kepemilikan); }
        if (data.tipe_pembayaran) { updates.push(`tipe_pembayaran = $${paramIndex++}`); values.push(data.tipe_pembayaran); }
        if (data.harga_total !== undefined) { updates.push(`harga_total = $${paramIndex++}`); values.push(data.harga_total); }
        if (data.tenor_bulan !== undefined) { updates.push(`tenor_bulan = $${paramIndex++}`); values.push(data.tenor_bulan); }
        if (data.keterangan_kpr !== undefined) { updates.push(`keterangan_kpr = $${paramIndex++}`); values.push(data.keterangan_kpr); }

        if (updates.length === 0) return reply.send({ success: true, message: "Tidak ada data yang diubah" });

        values.push(id); 
        const query = `UPDATE property_assignments SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING id`;
        
        const { rowCount } = await client.query(query, values);
        if (rowCount === 0) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Assignment tidak ditemukan' } });

        reply.send({ success: true, message: "Assignment berhasil diupdate" });
      } finally {
        client.release();
      }
    } catch (error) {
      if (error.name === 'ZodError') return reply.status(422).send({ success: false, error: { code: 'VALIDATION_ERROR', message: error.errors } });
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error' } });
    }
  });

  // DELETE /api/assignments/:id
  fastify.delete('/:id', {
    preValidation: [fastify.authenticate, fastify.requireRole(['admin', 'super_admin'])]
  }, async (request, reply) => {
      const client = await fastify.pg.connect();
      try {
        const { rowCount } = await client.query('DELETE FROM property_assignments WHERE id = $1', [request.params.id]);
        if (rowCount === 0) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Assignment tidak ditemukan' } });
        reply.send({ success: true, message: 'Assignment berhasil dihapus' });
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error' } });
      } finally {
        client.release();
      }
  });

  // GET /api/assignments/:id/payments
  fastify.get('/:id/payments', {
    preValidation: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const query = `
        SELECT p.id, p.jumlah_bayar, p.tanggal_bayar, p.catatan, p.created_at, u.nama AS dicatat_oleh 
        FROM payment_history p
        LEFT JOIN users u ON u.id = p.created_by
        WHERE p.assignment_id = $1 
        ORDER BY p.tanggal_bayar DESC, p.created_at DESC
      `;
      const { rows } = await fastify.pg.query(query, [id]);
      return reply.send({ success: true, data: rows });
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error' } });
    }
  });

  // POST /api/assignments/:id/payments
  fastify.post('/:id/payments', {
    preValidation: [fastify.authenticate, fastify.requireRole(['admin', 'super_admin'])]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const data = createPaymentSchema.parse(request.body);
      const createdBy = request.user.sub;

      const client = await fastify.pg.connect();
      try {
        const query = `
          INSERT INTO payment_history (assignment_id, jumlah_bayar, tanggal_bayar, catatan, created_by) 
          VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5) 
          RETURNING id, jumlah_bayar, tanggal_bayar, catatan
        `;
        const { rows } = await client.query(query, [id, data.jumlah_bayar, data.tanggal_bayar, data.catatan, createdBy]);
        reply.status(201).send({ success: true, message: 'Pembayaran berhasil dicatat', data: rows[0] });
      } finally {
        client.release();
      }
    } catch (error) {
      if (error.name === 'ZodError') return reply.status(422).send({ success: false, error: { code: 'VALIDATION_ERROR', message: error.errors } });
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error' } });
    }
  });

}