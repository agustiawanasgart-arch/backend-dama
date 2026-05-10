-- ============================================================
-- PropTrack — PostgreSQL Schema v2.1 (Multi-Tenant / Group PT)
-- Compatible: PostgreSQL 14+ (Supabase Ready)
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUMs ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role   AS ENUM ('super_admin', 'admin', 'customer');
  CREATE TYPE user_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('active', 'completed', 'on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE unit_status AS ENUM ('belum_mulai', 'dalam_pembangunan', 'selesai');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE doc_type AS ENUM ('foto', 'video', 'dokumen');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tipe Pembayaran Baru
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash_lunas', 'cash_cicil', 'kredit_kpr');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABEL UTAMA
-- ============================================================

-- ── companies (Anak Perusahaan) ──────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_pt     TEXT        NOT NULL,
  kode_pt     TEXT        NOT NULL UNIQUE,
  alamat      TEXT,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID        REFERENCES companies(id) ON DELETE SET NULL,
  nama           TEXT        NOT NULL,
  email          TEXT        NOT NULL UNIQUE,
  password_hash  TEXT        NOT NULL,
  nomor_telepon  TEXT,
  role           user_role   NOT NULL DEFAULT 'customer',
  status         user_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── refresh_tokens ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── projects ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID           NOT NULL REFERENCES companies(id) ON DELETE RESTRICT, -- Diubah jadi RESTRICT agar tidak terhapus jika ada company
  nama_proyek  TEXT           NOT NULL,
  lokasi       TEXT           NOT NULL,
  deskripsi    TEXT,
  status       project_status NOT NULL DEFAULT 'active',
  created_by   UUID           REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── clusters ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clusters (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_cluster  TEXT        NOT NULL,
  project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  jumlah_unit   INTEGER     NOT NULL DEFAULT 0 CHECK (jumlah_unit >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── units ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS units (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nomor_unit           TEXT        NOT NULL,
  tipe_rumah           TEXT,
  cluster_id           UUID        NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  luas_tanah           NUMERIC(10,2) CHECK (luas_tanah > 0),
  luas_bangunan        NUMERIC(10,2) CHECK (luas_bangunan > 0),
  status_pembangunan   unit_status NOT NULL DEFAULT 'belum_mulai',
  progress_percentage  SMALLINT    NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (nomor_unit, cluster_id)
);

-- ── property_assignments (Perjanjian Jual Beli / Kepemilikan) ─
CREATE TABLE IF NOT EXISTS property_assignments (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  unit_id             UUID        NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  tanggal_pembelian   DATE        NOT NULL DEFAULT CURRENT_DATE,
  status_kepemilikan  TEXT        NOT NULL DEFAULT 'active' CHECK (status_kepemilikan IN ('active','inactive')),
  
  -- Konteks Pembayaran
  tipe_pembayaran     payment_method NOT NULL,
  harga_total         NUMERIC(15,2) NOT NULL CHECK (harga_total >= 0),
  total_dibayar       NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_dibayar >= 0 AND total_dibayar <= harga_total),
  
  -- Info Ekstra untuk Cicilan / KPR
  tenor_bulan         INTEGER     DEFAULT 0, -- 0 jika cash keras
  keterangan_kpr      TEXT,       -- Nama Bank / Status Pengajuan KPR
  
  created_by          UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial Index: Mencegah 1 unit di-assign ke 2 orang berbeda pada waktu bersamaan
CREATE UNIQUE INDEX idx_unique_active_assignment ON property_assignments(unit_id) WHERE status_kepemilikan = 'active';

-- ── payment_history (Riwayat Pembayaran) ─────────────────────
CREATE TABLE IF NOT EXISTS payment_history (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id       UUID        NOT NULL REFERENCES property_assignments(id) ON DELETE CASCADE,
  jumlah_bayar        NUMERIC(15,2) NOT NULL CHECK (jumlah_bayar > 0),
  tanggal_bayar       DATE        NOT NULL DEFAULT CURRENT_DATE,
  catatan             TEXT,       -- Misal: "DP", "Cicilan ke-1", "Pelunasan"
  created_by          UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── progress (Progress Lapangan) ──────────────────────────────
CREATE TABLE IF NOT EXISTS progress (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id              UUID        NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tahap                TEXT        NOT NULL,
  progress_percentage  SMALLINT    NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  tanggal_update       DATE        NOT NULL DEFAULT CURRENT_DATE,
  catatan              TEXT,
  created_by           UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── documentation ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentation (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id               UUID        NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  progress_id           UUID        REFERENCES progress(id) ON DELETE SET NULL,
  jenis                 doc_type    NOT NULL,
  url                   TEXT        NOT NULL,
  cloudinary_public_id  TEXT,
  nama_file             TEXT,
  ukuran_bytes          BIGINT,
  created_by            UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_company           ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company        ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_clusters_project        ON clusters(project_id);
CREATE INDEX IF NOT EXISTS idx_units_cluster           ON units(cluster_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user        ON property_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_assignment     ON payment_history(assignment_id);
CREATE INDEX IF NOT EXISTS idx_progress_unit           ON progress(unit_id);
CREATE INDEX IF NOT EXISTS idx_docs_unit               ON documentation(unit_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- 1. Trigger Updated_at (Otomatis ubah waktu update)
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$ DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['companies','users','projects','clusters','units','property_assignments','progress'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$s;
      CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    ', t);
  END LOOP;
END $$;

-- 2. Trigger Sinkronisasi Progress Unit
-- Otomatis menimpa progress_percentage di tabel unit dengan progress terbaru
CREATE OR REPLACE FUNCTION fn_sync_unit_progress()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE units SET progress_percentage = NEW.progress_percentage WHERE id = NEW.unit_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_progress ON progress;
CREATE TRIGGER trg_sync_progress
  AFTER INSERT OR UPDATE ON progress
  FOR EACH ROW EXECUTE FUNCTION fn_sync_unit_progress();

-- 3. Trigger Auto-Update Total Pembayaran
-- Mengkalkulasi otomatis total uang yang masuk ke kolom 'total_dibayar' di property_assignments
CREATE OR REPLACE FUNCTION fn_update_total_pembayaran()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE property_assignments 
  SET total_dibayar = (SELECT COALESCE(SUM(jumlah_bayar), 0) FROM payment_history WHERE assignment_id = NEW.assignment_id)
  WHERE id = NEW.assignment_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_payment ON payment_history;
CREATE TRIGGER trg_update_payment
  AFTER INSERT OR UPDATE OR DELETE ON payment_history
  FOR EACH ROW EXECUTE FUNCTION fn_update_total_pembayaran();

-- ============================================================
-- VIEWS (Diperbarui tanpa kolom 'developer')
-- ============================================================

CREATE OR REPLACE VIEW v_unit_detail AS
SELECT
  u.id, u.nomor_unit, u.tipe_rumah, u.luas_tanah, u.luas_bangunan,
  u.status_pembangunan, u.progress_percentage, u.created_at, u.updated_at,
  c.id AS cluster_id, c.nama_cluster,
  p.id AS project_id, p.nama_proyek, p.lokasi AS project_lokasi, p.status AS project_status,
  comp.id AS company_id, comp.nama_pt, comp.kode_pt
FROM units u
JOIN clusters c ON c.id = u.cluster_id
JOIN projects p ON p.id = c.project_id
JOIN companies comp ON comp.id = p.company_id;

CREATE OR REPLACE VIEW v_assignment_detail AS
SELECT
  a.id, a.tanggal_pembelian, a.status_kepemilikan, a.tipe_pembayaran, a.harga_total, 
  a.total_dibayar, a.tenor_bulan, a.keterangan_kpr, a.created_at,
  -- Kalkulasi Persentase Bayar Langsung di View
  ROUND((a.total_dibayar / NULLIF(a.harga_total, 0)) * 100, 2) AS persentase_dibayar,
  usr.id AS user_id, usr.nama AS user_nama, usr.email AS user_email, usr.nomor_telepon AS user_telepon,
  u.id AS unit_id, u.nomor_unit, u.status_pembangunan, u.progress_percentage,
  c.id AS cluster_id, c.nama_cluster,
  pr.id AS project_id, pr.nama_proyek, pr.lokasi AS project_lokasi,
  comp.id AS company_id, comp.nama_pt
FROM property_assignments a
JOIN users usr ON usr.id = a.user_id
JOIN units u ON u.id = a.unit_id
JOIN clusters c ON c.id = u.cluster_id
JOIN projects pr ON pr.id = c.project_id
JOIN companies comp ON comp.id = pr.company_id;

CREATE OR REPLACE VIEW v_progress_detail AS
SELECT 
    -- Data Progress Lapangan
    p.id AS progress_id,
    p.tahap,
    p.progress_percentage AS progress_pembangunan, -- % Fisik Bangunan
    p.tanggal_update,
    p.catatan,
    
    -- Data Unit & Lokasi
    u.id AS unit_id,
    u.nomor_unit,
    u.tipe_rumah,
    u.status_pembangunan,
    c.nama_cluster,
    pr.nama_proyek,
    comp.nama_pt,

    -- Data Pembayaran (Dari Property Assignments)
    pa.harga_total,
    pa.total_dibayar,
    -- Kalkulasi % Pembayaran
    ROUND(COALESCE((pa.total_dibayar / NULLIF(pa.harga_total, 0)) * 100, 0), 2) AS progress_pembayaran,
    pa.tipe_pembayaran,
    pa.status_kepemilikan,
    
    -- Data Pembeli (Jika sudah ada)
    usr.nama AS nama_pembeli

FROM progress p
JOIN units u ON u.id = p.unit_id
JOIN clusters c ON c.id = u.cluster_id
JOIN projects pr ON pr.id = c.project_id
JOIN companies comp ON comp.id = pr.company_id
-- Menggunakan LEFT JOIN agar progress tetap muncul meski unit belum terjual/di-assign
LEFT JOIN property_assignments pa ON pa.unit_id = u.id AND pa.status_kepemilikan = 'active'
LEFT JOIN users usr ON usr.id = pa.user_id;