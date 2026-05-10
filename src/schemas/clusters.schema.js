import { z } from 'zod';

export const clusterQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  project_id: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const createClusterSchema = z.object({
  project_id: z.string().uuid("Format ID Project tidak valid"),
  nama_cluster: z.string().min(2, "Nama cluster minimal 2 karakter"),
  jumlah_unit: z.number().min(1, "Jumlah unit minimal 1").default(0),
});

export const updateClusterSchema = createClusterSchema.partial();
