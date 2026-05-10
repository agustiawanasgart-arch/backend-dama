import { z } from 'zod';

export const docQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  unit_id: z.string().uuid().optional(),
  progress_id: z.string().uuid().optional(),
  jenis: z.enum(['foto', 'video', 'dokumen']).optional(), //
});