import bcrypt from 'bcryptjs';
import { z } from 'zod';

const updateUserSchema = z.object({
  nama: z.string().optional(),
  nomor_telepon: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  password: z.string().min(6).optional()
});

export default async function userRoutes(fastify, options) {
  // GET /api/users - List
// GET /api/users - List (VERSI PERBAIKAN)
fastify.get('/', { preValidation: [fastify.authenticate, fastify.requireRole(['super_admin', 'admin'])] }, async (request, reply) => {
    const { role, company_id } = request.user;
    
    // Ambil query params dari frontend
    const { search, page = 1, limit = 15 } = request.query;
    const offset = (page - 1) * limit;

    const client = await fastify.pg.connect();
    try {
        let query = 'SELECT id, nama, email, nomor_telepon, role, status, company_id, created_at FROM users WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
        let params = [];
        let paramIndex = 1;

        // 1. Filter Role (Logika yang sudah Anda punya)
        if (role === 'admin') {
            const filter = ` AND (role = $${paramIndex} OR company_id = $${paramIndex + 1})`;
            query += filter;
            countQuery += filter;
            params.push('customer', company_id);
            paramIndex += 2;
        } else if (role !== 'super_admin') {
            const filter = ` AND company_id = $${paramIndex}`;
            query += filter;
            countQuery += filter;
            params.push(company_id);
            paramIndex += 1;
        }

        // 2. LOGIKA SEARCH (Tambahan agar search berfungsi)
        if (search) {
            const searchFilter = ` AND (nama ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
            query += searchFilter;
            countQuery += searchFilter;
            params.push(`%${search}%`);
            paramIndex += 1;
        }

        // 3. Ambil Total Data untuk Meta
        const { rows: countRows } = await client.query(countQuery, params);
        const total = parseInt(countRows[0].count);

        // 4. Tambahkan Ordering & Pagination
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const { rows } = await client.query(query, params);

        // Kirim respons dengan struktur yang diharapkan Frontend
        reply.send({ 
            success: true, 
            data: rows,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } finally {
        client.release();
    }
});

  // POST /api/users - Create
  fastify.post('/', { preValidation: [fastify.authenticate, fastify.requireRole(['super_admin', 'admin'])] }, async (request, reply) => {
    const { role: myRole, company_id: myCompanyId } = request.user;
    const { nama, email, password, nomor_telepon, role, company_id } = request.body;

    if (myRole === 'admin' && (role === 'super_admin' || role === 'admin')) {
      return reply.status(403).send({ success: false, error: { message: 'Admin hanya boleh membuat akun Customer' } });
    }

    const client = await fastify.pg.connect();
    try {
      const { rowCount } = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (rowCount > 0) return reply.status(409).send({ success: false, error: { message: 'Email sudah terdaftar' } });

      const passwordHash = await bcrypt.hash(password, 12);

      // Jika role = customer → company_id null
      const targetCompanyId = role === 'customer' ? null : (myRole === 'admin' ? myCompanyId : company_id);

      const query = `INSERT INTO users (nama, email, password_hash, nomor_telepon, role, company_id) 
                     VALUES ($1, $2, $3, $4, $5, $6) 
                     RETURNING id, nama, email, role, company_id`;
      const { rows } = await client.query(query, [nama, email, passwordHash, nomor_telepon, role, targetCompanyId]);
      reply.status(201).send({ success: true, data: rows[0] });
    } finally {
      client.release();
    }
  });

  // PATCH /api/users/:id - Update User (Profile/Status/Password)
  fastify.patch('/:id', { preValidation: [fastify.authenticate, fastify.requireRole(['super_admin', 'admin'])] }, async (request, reply) => {
    const { id } = request.params;
    const { role: myRole, company_id: myCompanyId } = request.user;
    const body = updateUserSchema.parse(request.body);
    const client = await fastify.pg.connect();
    try {
      const { rows: check } = await client.query('SELECT role, company_id FROM users WHERE id = $1', [id]);
      if (check.length === 0) return reply.status(404).send({ success: false, message: 'User tidak ditemukan' });

      // Admin tidak boleh update user admin lain atau super_admin
      if (myRole === 'admin' && (check[0].role === 'admin' || check[0].role === 'super_admin')) {
        return reply.status(403).send({ success: false, message: 'Akses dilarang' });
      }
      // Admin hanya boleh update user di company-nya, kecuali customer (company_id null)
      if (myRole === 'admin' && check[0].role !== 'customer' && check[0].company_id !== myCompanyId) {
        return reply.status(403).send({ success: false, message: 'Akses dilarang' });
      }

      if (body.password) {
        body.password_hash = await bcrypt.hash(body.password, 12);
        delete body.password;
      }

      const keys = Object.keys(body);
      if (keys.length === 0) return reply.send({ success: true, message: 'Tidak ada perubahan' });

      const fields = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
      const query = `UPDATE users SET ${fields} WHERE id = $1 RETURNING id, nama, email, status`;
      const { rows } = await client.query(query, [id, ...Object.values(body)]);
      reply.send({ success: true, data: rows[0] });
    } finally {
      client.release();
    }
  });

  // DELETE /api/users/:id
  fastify.delete('/:id', { preValidation: [fastify.authenticate, fastify.requireRole(['super_admin'])] }, async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      const { rowCount } = await client.query('DELETE FROM users WHERE id = $1', [request.params.id]);
      if (rowCount === 0) return reply.status(404).send({ success: false, message: 'User tidak ditemukan' });
      reply.send({ success: true, message: 'User berhasil dihapus secara permanen' });
    } finally {
      client.release();
    }
  });
}
