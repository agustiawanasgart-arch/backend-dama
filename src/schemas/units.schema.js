import { z } from 'zod';

export const unitQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  cluster_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  status: z.enum(['belum_mulai', 'dalam_pembangunan', 'selesai']).optional(),
});

export const createUnitSchema = z.object({
  nomor_unit: z.string().min(1, "Nomor unit wajib diisi"),
  tipe_rumah: z.string().optional(),
  cluster_id: z.string().uuid("Format ID Cluster tidak valid"),
  luas_tanah: z.number().positive("Luas tanah harus positif"),
  luas_bangunan: z.number().positive("Luas bangunan harus positif"),
  status_pembangunan: z.enum(['belum_mulai', 'dalam_pembangunan', 'selesai']).default('belum_mulai'),
  progress_percentage: z.number().min(0).max(100).default(0),
});

export const updateUnitSchema = createUnitSchema.partial(); // .partial() membuat semua field jadi opsional