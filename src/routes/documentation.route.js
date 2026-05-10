import cloudinary from "../config/cloudinary.js";
import { docQuerySchema } from "../schemas/documentation.schema.js";

export default async function documentationRoutes(fastify, options) {
  // Helper function untuk stream file ke Cloudinary
  const uploadStreamToCloudinary = (fileStream, options) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      fileStream.pipe(stream);
    });
  };

  // GET /api/documentation - Bisa diakses semua role yang login
  // GET /api/documentation
  fastify.get(
    "/",
    {
      preValidation: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        // 1. Ambil role dan company_id dari token
        const { role, company_id: userCompanyId } = request.user;

        const { page, limit, unit_id, progress_id, jenis } =
          docQuerySchema.parse(request.query);
        const offset = (page - 1) * limit;

        const client = await fastify.pg.connect();
        try {
          let whereClauses = [];
          let values = [];
          let paramIndex = 1;

          // 2. Isolasi Multi-Tenant menggunakan alias p (projects)
          if (role !== "super_admin" && userCompanyId) {
            whereClauses.push(`p.company_id = $${paramIndex++}`);
            values.push(userCompanyId);
          }

          if (unit_id) {
            whereClauses.push(`d.unit_id = $${paramIndex++}`);
            values.push(unit_id);
          }
          if (progress_id) {
            whereClauses.push(`d.progress_id = $${paramIndex++}`);
            values.push(progress_id);
          }
          if (jenis) {
            whereClauses.push(`d.jenis = $${paramIndex++}`);
            values.push(jenis);
          }

          const whereString =
            whereClauses.length > 0
              ? `WHERE ${whereClauses.join(" AND ")}`
              : "";

          // 3. Tambahkan JOIN ke clusters dan projects agar p.company_id bisa dibaca
          const dataQuery = `
          SELECT 
            d.id, d.jenis, d.url, d.cloudinary_public_id, d.nama_file, d.ukuran_bytes, d.created_at,
            u.id as unit_id, u.nomor_unit,
            cp.id as progress_id, cp.tahap as progress_tahap,
            usr.id as created_by_id, usr.nama as created_by_nama
          FROM documentation d
          JOIN units u ON u.id = d.unit_id
          JOIN clusters c ON c.id = u.cluster_id       -- <-- TAMBAHAN JOIN
          JOIN projects p ON p.id = c.project_id       -- <-- TAMBAHAN JOIN
          LEFT JOIN progress cp ON cp.id = d.progress_id
          LEFT JOIN users usr ON usr.id = d.created_by
          ${whereString}
          ORDER BY d.created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
          const { rows: dataRows } = await client.query(dataQuery, [
            ...values,
            limit,
            offset,
          ]);

          // 4. Update query Count Total dengan JOIN yang sama
          const countQuery = `
          SELECT COUNT(*) 
          FROM documentation d
          JOIN units u ON u.id = d.unit_id
          JOIN clusters c ON c.id = u.cluster_id
          JOIN projects p ON p.id = c.project_id
          ${whereString}
        `;
          const { rows: countRows } = await client.query(countQuery, values);

          // Map hasil query ke bentuk nested
          const mappedData = dataRows.map((row) => ({
            id: row.id,
            jenis: row.jenis,
            url: row.url,
            cloudinary_public_id: row.cloudinary_public_id,
            nama_file: row.nama_file,
            ukuran_bytes: parseInt(row.ukuran_bytes || 0, 10),
            unit: { id: row.unit_id, nomor_unit: row.nomor_unit },
            progress: row.progress_id
              ? { id: row.progress_id, tahap: row.progress_tahap }
              : null,
            created_by: row.created_by_id
              ? { id: row.created_by_id, nama: row.created_by_nama }
              : null,
            created_at: row.created_at,
          }));

          reply.send({
            success: true,
            data: mappedData,
            meta: { page, limit, total: parseInt(countRows[0].count, 10) },
          });
        } finally {
          client.release();
        }
      } catch (error) {
        if (error.name === "ZodError")
          return reply.status(422).send({
            success: false,
            error: { code: "VALIDATION_ERROR", message: error.errors },
          });
        fastify.log.error(error);
        reply.status(500).send({
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Server error" },
        });
      }
    },
  );

  // POST /api/documentation - Upload File (Admin & Super Admin)
  fastify.post(
    "/",
    {
      preValidation: [
        fastify.authenticate,
        fastify.requireRole(["super_admin", "admin"]),
      ],
    },
    async (request, reply) => {
      const parts = request.parts(); // Iterator multipart
      const fields = {};
      const uploadedFiles = [];
      const createdBy = request.user.sub;

      try {
        // Loop tiap bagian dari form-data
        for await (const part of parts) {
          if (part.type === "file") {
            // Stream file langsung ke Cloudinary
            const uploadResult = await uploadStreamToCloudinary(part.file, {
              folder: "proptrack/documentation",
              resource_type: "auto", // Deteksi otomatis apakah itu image/video/raw document
            });

            uploadedFiles.push({
              url: uploadResult.secure_url,
              cloudinary_public_id: uploadResult.public_id,
              nama_file: part.filename,
              ukuran_bytes: uploadResult.bytes,
            });
          } else {
            // Tangkap field non-file (unit_id, jenis, progress_id)
            fields[part.fieldname] = part.value;
          }
        }

        // Validasi field yang wajib
        if (!fields.unit_id || !fields.jenis || uploadedFiles.length === 0) {
          return reply.status(422).send({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "unit_id, jenis, dan minimal 1 file wajib disertakan",
            },
          });
        }

        const client = await fastify.pg.connect();
        try {
          await client.query("BEGIN");
          const savedDocs = [];

          // Simpan metadata setiap file yang diunggah ke PostgreSQL
          const insertQuery = `
          INSERT INTO documentation (unit_id, progress_id, jenis, url, cloudinary_public_id, nama_file, ukuran_bytes, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, jenis, url, cloudinary_public_id, nama_file, ukuran_bytes
        `;

          for (const file of uploadedFiles) {
            const { rows } = await client.query(insertQuery, [
              fields.unit_id,
              fields.progress_id || null, // Opsional
              fields.jenis,
              file.url,
              file.cloudinary_public_id,
              file.nama_file,
              file.ukuran_bytes,
              createdBy,
            ]);
            savedDocs.push(rows[0]);
          }

          await client.query("COMMIT");
          reply.status(201).send({ success: true, data: savedDocs }); // Return metadata file sesuai spec
        } catch (dbError) {
          await client.query("ROLLBACK");
          throw dbError;
        } finally {
          client.release();
        }
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Terjadi kesalahan saat upload file",
          },
        });
      }
    },
  );

  // DELETE /api/documentation/:id - Hapus Data & File di Cloudinary (Admin & Super Admin)
  fastify.delete(
    "/:id",
    {
      preValidation: [
        fastify.authenticate,
        fastify.requireRole(["super_admin", "admin"]),
      ], //
    },
    async (request, reply) => {
      const { id } = request.params;
      const client = await fastify.pg.connect();

      try {
        // Ambil public_id Cloudinary dari database
        const { rows } = await client.query(
          "SELECT cloudinary_public_id FROM documentation WHERE id = $1",
          [id],
        );

        if (rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Dokumentasi tidak ditemukan",
            },
          });
        }

        const publicId = rows[0].cloudinary_public_id;

        // 1. Hapus file fisik dari Cloudinary
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }

        // 2. Hapus data dari PostgreSQL
        await client.query("DELETE FROM documentation WHERE id = $1", [id]);

        reply.send({
          success: true,
          data: { message: "Dokumentasi berhasil dihapus" },
        }); //
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Server error" },
        });
      } finally {
        client.release();
      }
    },
  );

  fastify.post("/api/documentation/batch-upload", async (req, reply) => {
    try {
      const parts = req.parts();

      let fields = {};
      const files = [];

      for await (const part of parts) {
        if (part.type === "file") {
          files.push(part);
        } else {
          fields[part.fieldname] = part.value;
        }
      }

      const results = [];

      for (const file of files) {
        const buffer = await file.toBuffer();

        const uploaded = await streamUpload(buffer);

        const streamUpload = (buffer) => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "documentation" },
              (error, result) => {
                if (result) resolve(result);
                else reject(error);
              },
            );

            stream.end(buffer);
          });
        };

        const doc = await fastify.db.query(
          `
        INSERT INTO documentation
        (unit_id, progress_id, jenis, url, cloudinary_public_id, nama_file, ukuran_bytes, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *
      `,
          [
            fields.unit_id,
            fields.progress_id,
            fields.jenis,
            uploaded.secure_url,
            uploaded.public_id,
            file.filename,
            file.file.bytesRead,
            req.user.id,
          ],
        );

        results.push(doc.rows[0]);
      }

      reply.send({
        success: true,
        total: results.length,
        data: results,
      });
    } catch (err) {
      req.log.error(err);
      reply.code(500).send({ message: "Batch upload failed" });
    }
  });
}
