import { z } from 'zod';

export const progressQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  unit_id: z.string().uuid().optional(),
  tahap: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export const createProgressSchema = z.object({
  unit_id: z.string().uuid("Format ID Unit tidak valid"),
  tahap: z.string().min(1, "Tahap pembangunan wajib diisi"),
  progress_percentage: z.number().min(0).max(100),
  tanggal_update: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Format tanggal tidak valid" }),
  catatan: z.string().optional()
});