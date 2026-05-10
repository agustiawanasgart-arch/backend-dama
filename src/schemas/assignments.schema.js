import { z } from 'zod';

export const assignmentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  user_id: z.string().uuid().optional(),
  unit_id: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createAssignmentSchema = z.object({
  user_id: z.string().uuid("Format ID User tidak valid"),
  unit_id: z.string().uuid("Format ID Unit tidak valid"),
  tanggal_pembelian: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Format tanggal tidak valid" }),
  status_kepemilikan: z.enum(['active', 'inactive']).default('active'),
  
  // NEW: Field Finansial
  tipe_pembayaran: z.enum(['cash_lunas', 'cash_cicil', 'kredit_kpr'], { required_error: "Tipe pembayaran wajib dipilih" }),
  harga_total: z.coerce.number().min(0, "Harga total tidak boleh minus"),
  tenor_bulan: z.coerce.number().min(0).default(0),
  keterangan_kpr: z.string().optional().nullable(),
});

export const updateAssignmentSchema = z.object({
  tanggal_pembelian: z.string().refine((date) => !isNaN(Date.parse(date))).optional(),
  status_kepemilikan: z.enum(['active', 'inactive']).optional(),
  
  // NEW: Field Finansial (Opsional saat update)
  tipe_pembayaran: z.enum(['cash_lunas', 'cash_cicil', 'kredit_kpr']).optional(),
  harga_total: z.coerce.number().min(0).optional(),
  tenor_bulan: z.coerce.number().min(0).optional(),
  keterangan_kpr: z.string().optional().nullable(),
});

// NEW: Schema untuk Riwayat Pembayaran (Cicilan / DP)
export const createPaymentSchema = z.object({
  jumlah_bayar: z.coerce.number().min(1, "Jumlah bayar harus lebih dari 0"),
  tanggal_bayar: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Format tanggal tidak valid" }).optional(),
  catatan: z.string().optional().nullable()
});