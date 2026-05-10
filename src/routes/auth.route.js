import bcrypt from "bcryptjs";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";

export default async function authRoutes(fastify, options) {
  // POST /api/auth/register
  fastify.post("/register", async (request, reply) => {
    try {
      // 1. Validasi Input dengan Zod
      const data = registerSchema.parse(request.body);

      const client = await fastify.pg.connect();
      try {
        // 2. Cek apakah email sudah ada
        const { rowCount } = await client.query(
          "SELECT id FROM users WHERE email = $1",
          [data.email],
        );
        if (rowCount > 0) {
          return reply.status(409).send({
            success: false,
            error: { code: "CONFLICT", message: "Email sudah terdaftar" },
          });
        }

        // 3. Hash Password
        const rounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
        const passwordHash = await bcrypt.hash(data.password, rounds);

        // 4. Insert User Baru (Role otomatis 'customer' sesuai skema)
        const insertUserQuery = `
          INSERT INTO users (nama, email, password_hash, nomor_telepon) 
          VALUES ($1, $2, $3, $4) 
          RETURNING id, nama, email, nomor_telepon, role, status, created_at
        `;
        const { rows: userRows } = await client.query(insertUserQuery, [
          data.nama,
          data.email,
          passwordHash,
          data.nomor_telepon || null,
        ]);
        const user = userRows[0];

        // 5. Generate Tokens
        const tokenPayload = {
          sub: user.id,
          email: user.email,
          role: user.role,
        };
        const accessToken = fastify.jwt.sign(tokenPayload, {
          expiresIn: process.env.JWT_EXPIRES_IN || "15m",
        });
        // Catatan: Anda bisa menambahkan logic Refresh Token di sini menggunakan tabel refresh_tokens

        reply.status(201).send({
          success: true,
          data: {
            user,
            access_token: accessToken,
            expires_in: 900, // 15 menit
          },
        });
      } finally {
        client.release();
      }
    } catch (error) {
      if (error.name === "ZodError") {
        return reply.status(422).send({
          success: false,
          error: { code: "VALIDATION_ERROR", message: error.errors },
        });
      }
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan pada server",
        },
      });
    }
  });

  // POST /api/auth/login
  // POST /api/auth/login
  fastify.post("/login", async (request, reply) => {
    try {
      // 1. Gunakan loginSchema yang sudah di-import!
      // Ini memastikan email & password yang dikirim sesuai format (misal: email valid)
      const { email, password } = loginSchema.parse(request.body);

      const client = await fastify.pg.connect();

      try {
        // 2. Ambil data user
        const { rows } = await client.query(
          "SELECT id, nama, email, password_hash, role, company_id FROM users WHERE email = $1",
          [email],
        );
        const user = rows[0];

        // 3. Cek keberadaan user & validasi password
        // Tips: Gunakan console.log sementara jika masih penasaran
        if (!user) {
          return reply.status(401).send({
            success: false,
            error: { code: "AUTH_FAILED", message: "Email tidak terdaftar" },
          });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
          return reply.status(401).send({
            success: false,
            error: {
              code: "AUTH_FAILED",
              message: "Password yang Anda masukkan salah",
            },
          });
        }

        // 4. Generate Token (Payload sudah benar menggunakan info Company)
        const tokenPayload = {
          sub: user.id,
          role: user.role,
          company_id: user.company_id,
        };

        const accessToken = fastify.jwt.sign(tokenPayload, { expiresIn: "1h" }); // Naikkan sedikit biar gak cepat habis saat dev

        reply.send({
          success: true,
          data: {
            user: {
              id: user.id,
              nama: user.nama,
              role: user.role,
              company_id: user.company_id,
            },
            access_token: accessToken,
          },
        });
      } finally {
        client.release();
      }
    } catch (error) {
      // Tangani error validasi Zod
      if (error.name === "ZodError") {
        return reply.status(422).send({
          success: false,
          error: { code: "VALIDATION_ERROR", message: error.errors },
        });
      }

      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan pada server",
        },
      });
    }
  });

  fastify.get(
    "/me",
    {
      preValidation: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userId = request.user.sub; // ID diambil dari token JWT
        const client = await fastify.pg.connect();

        try {
          const { rows } = await client.query(
            "SELECT id, nama, email, nomor_telepon, role, status, created_at FROM users WHERE id = $1",
            [userId],
          );

          if (rows.length === 0) {
            return reply.status(404).send({
              success: false,
              error: { code: "NOT_FOUND", message: "User tidak ditemukan" },
            });
          }

          reply.send({ success: true, data: rows[0] });
        } finally {
          client.release();
        }
      } catch (err) {
        fastify.log.error(err);
        reply.status(500).send({
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Server error" },
        });
      }
    },
  );
}
