import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // Aktifkan jika pakai Supabase
});

// ─────────────────────────────────────────────
// HELPER: jalankan query dan kembalikan rows[0]
// ─────────────────────────────────────────────
const q = (client, sql, params = []) => client.query(sql, params);
const qOne = async (client, sql, params = []) => (await client.query(sql, params)).rows[0];

async function runSeed() {
  console.log('🌱 Memulai seeding PropTrack v2.1 — data lengkap & terkoneksi...\n');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ═══════════════════════════════════════════════
    // 0. BERSIHKAN DATA LAMA
    // ═══════════════════════════════════════════════
    console.log('🧹 Menghapus data lama...');
    await q(client, `
      TRUNCATE TABLE
        documentation, progress, payment_history,
        property_assignments, units, clusters,
        projects, refresh_tokens, users, companies
      CASCADE
    `);

    // ═══════════════════════════════════════════════
    // 1. HASH PASSWORD
    // ═══════════════════════════════════════════════
    const passwordHash = await bcrypt.hash('password123', 10);

    // ═══════════════════════════════════════════════
    // 2. PERUSAHAAN (COMPANIES)
    // ═══════════════════════════════════════════════
    console.log('🏢 Membuat data Companies...');

    const cMaju = await qOne(client,
      `INSERT INTO companies (nama_pt, kode_pt, alamat) VALUES
        ('PT. Maju Jaya Properti', 'MJU', 'Jl. Merdeka No. 1, Jakarta Pusat')
       RETURNING id`
    );
    const cGraha = await qOne(client,
      `INSERT INTO companies (nama_pt, kode_pt, alamat) VALUES
        ('PT. Graha Sejahtera Utama', 'GSU', 'Jl. Sudirman No. 45, Bandung')
       RETURNING id`
    );

    // ═══════════════════════════════════════════════
    // 3. USERS — Super Admin, Admin per PT, Customers
    // ═══════════════════════════════════════════════
    console.log('👤 Membuat data Users...');

    // Super Admin (tidak terikat company)
    await q(client,
      `INSERT INTO users (nama, email, password_hash, nomor_telepon, role, status) VALUES
        ('Super Admin Group', 'super@proptrack.com', $1, '08100000000', 'super_admin', 'active')`,
      [passwordHash]
    );

    // Admin PT. Maju Jaya
    const admMaju = await qOne(client,
      `INSERT INTO users (company_id, nama, email, password_hash, nomor_telepon, role, status)
       VALUES ($1, 'Budi Santoso', 'admin@majujaya.com', $2, '08111111111', 'admin', 'active')
       RETURNING id`,
      [cMaju.id, passwordHash]
    );

    // Admin PT. Graha Sejahtera
    const admGraha = await qOne(client,
      `INSERT INTO users (company_id, nama, email, password_hash, nomor_telepon, role, status)
       VALUES ($1, 'Siti Rahayu', 'admin@grahaSejahtera.com', $2, '08222222222', 'admin', 'active')
       RETURNING id`,
      [cGraha.id, passwordHash]
    );

    // 8 Customers
    const customerData = [
      { nama: 'Hendra Wijaya',    email: 'hendra@email.com',    telp: '081300000001' },
      { nama: 'Rina Kusuma',      email: 'rina@email.com',       telp: '081300000002' },
      { nama: 'Agus Prasetyo',    email: 'agus@email.com',       telp: '081300000003' },
      { nama: 'Dewi Lestari',     email: 'dewi@email.com',       telp: '081300000004' },
      { nama: 'Fajar Nugroho',    email: 'fajar@email.com',      telp: '081300000005' },
      { nama: 'Maya Putri',       email: 'maya@email.com',       telp: '081300000006' },
      { nama: 'Roni Hermawan',    email: 'roni@email.com',       telp: '081300000007' },
      { nama: 'Lestari Anggraini',email: 'lestari@email.com',    telp: '081300000008' },
    ];
    const customers = [];
    for (const c of customerData) {
      const row = await qOne(client,
        `INSERT INTO users (nama, email, password_hash, nomor_telepon, role, status)
         VALUES ($1, $2, $3, $4, 'customer', 'active') RETURNING id`,
        [c.nama, c.email, passwordHash, c.telp]
      );
      customers.push({ id: row.id, ...c });
    }

    // ═══════════════════════════════════════════════
    // 4. PROJECTS (2 per company)
    // ═══════════════════════════════════════════════
    console.log('🏗️ Membuat data Projects...');

    const projects = [];
    const projectDef = [
      { cid: cMaju.id,  admId: admMaju.id,  nama: 'Lembah Asri Maju',      lok: 'Jakarta Selatan',  desk: 'Perumahan eksklusif di kawasan strategis Jakarta Selatan dengan akses tol dan pusat perbelanjaan.' },
      { cid: cMaju.id,  admId: admMaju.id,  nama: 'Maju Jaya Residence',   lok: 'Depok',             desk: 'Hunian modern di Depok dekat stasiun commuter line, cocok untuk keluarga muda.' },
      { cid: cGraha.id, admId: admGraha.id, nama: 'Graha Sejahtera Indah', lok: 'Bandung Barat',     desk: 'Perumahan nyaman di pegunungan Bandung Barat dengan udara segar dan view alam terbuka.' },
      { cid: cGraha.id, admId: admGraha.id, nama: 'Sejahtera Hills',       lok: 'Lembang',           desk: 'Kawasan premium di Lembang, ideal untuk second home maupun investasi jangka panjang.' },
    ];
    for (const p of projectDef) {
      const row = await qOne(client,
        `INSERT INTO projects (company_id, nama_proyek, lokasi, deskripsi, status, created_by)
         VALUES ($1, $2, $3, $4, 'active', $5) RETURNING id`,
        [p.cid, p.nama, p.lok, p.desk, p.admId]
      );
      projects.push({ id: row.id, ...p });
    }

    // ═══════════════════════════════════════════════
    // 5. CLUSTERS & UNITS
    //    2 cluster per project, 6 unit per cluster
    //    Total: 8 cluster, 48 unit
    // ═══════════════════════════════════════════════
    console.log('🏘️ Membuat data Clusters & Units...');

    // Definisi tipe rumah & harga
    const tipeRumah = [
      { tipe: 'Tipe 36', lt: 72,  lb: 36,  harga: 350_000_000 },
      { tipe: 'Tipe 45', lt: 90,  lb: 45,  harga: 500_000_000 },
      { tipe: 'Tipe 60', lt: 120, lb: 60,  harga: 650_000_000 },
      { tipe: 'Tipe 72', lt: 150, lb: 72,  harga: 850_000_000 },
    ];

    // Cluster per project
    const clusterDef = [
      { nama: 'Cluster Melati', proj: 0 },
      { nama: 'Cluster Mawar',  proj: 0 },
      { nama: 'Cluster Anggrek',proj: 1 },
      { nama: 'Cluster Dahlia', proj: 1 },
      { nama: 'Cluster Kenanga',proj: 2 },
      { nama: 'Cluster Bougenville', proj: 2 },
      { nama: 'Cluster Lavender',    proj: 3 },
      { nama: 'Cluster Jasmine',     proj: 3 },
    ];

    const allUnits = []; // { id, clusterIdx, unitIdx, tipe, harga, clusterId, projectId, companyId }

    for (let ci = 0; ci < clusterDef.length; ci++) {
      const cd = clusterDef[ci];
      const proj = projects[cd.proj];

      const clusterRow = await qOne(client,
        `INSERT INTO clusters (project_id, nama_cluster, jumlah_unit)
         VALUES ($1, $2, 6) RETURNING id`,
        [proj.id, cd.nama]
      );
      const clusterId = clusterRow.id;

      for (let u = 1; u <= 6; u++) {
        // Rotasi tipe rumah supaya satu cluster punya berbagai tipe
        const tipeIdx = (u - 1) % tipeRumah.length;
        const tipe = tipeRumah[tipeIdx];

        const unitRow = await qOne(client,
          `INSERT INTO units (cluster_id, nomor_unit, tipe_rumah, luas_tanah, luas_bangunan, status_pembangunan, progress_percentage)
           VALUES ($1, $2, $3, $4, $5, 'belum_mulai', 0) RETURNING id`,
          [clusterId, `Blok ${String.fromCharCode(64 + ci + 1)}-${u}`, tipe.tipe, tipe.lt, tipe.lb]
        );

        allUnits.push({
          id: unitRow.id,
          clusterIdx: ci,
          unitIdx: u,
          tipe: tipe.tipe,
          harga: tipe.harga,
          clusterId,
          projectId: proj.id,
          companyId: proj.cid,
          admId: proj.admId,
        });
      }
    }

    // ═══════════════════════════════════════════════
    // 6. PROPERTY ASSIGNMENTS & PAYMENT HISTORY
    //    6 unit terjual ke 6 customer berbeda
    //    Skenario pembayaran bervariasi
    // ═══════════════════════════════════════════════
    console.log('💰 Membuat data Property Assignments & Payment History...');

    /**
     * Skenario penjualan:
     * [0] Hendra  → unit A-1 (Cluster 0) — Cash Lunas, sudah lunas penuh
     * [1] Rina    → unit B-1 (Cluster 1) — KPR (BCA), DP sudah bayar 20%
     * [2] Agus    → unit C-1 (Cluster 2) — Cash Cicil 24 bulan, sudah 8 cicilan
     * [3] Dewi    → unit D-1 (Cluster 3) — KPR (Mandiri), DP sudah bayar 30%
     * [4] Fajar   → unit E-1 (Cluster 4) — Cash Lunas, sudah lunas penuh
     * [5] Maya    → unit F-1 (Cluster 5) — Cash Cicil 12 bulan, sudah 4 cicilan
     */
    const saleSkenario = [
      {
        custIdx: 0, unitArrIdx: 0,            // Hendra, Cluster 0 unit-1
        tipe: 'cash_lunas', tenor: 0, kpr: null,
        bayarBatches: [
          { jumlah: null /* harga penuh */, catatan: 'Pelunasan Cash Keras' },
        ],
      },
      {
        custIdx: 1, unitArrIdx: 6,             // Rina, Cluster 1 unit-1
        tipe: 'kredit_kpr', tenor: 180, kpr: 'KPR Bank BCA — Status: Approved',
        bayarBatches: [
          { jumlahPct: 0.20, catatan: 'DP KPR 20%' },
        ],
      },
      {
        custIdx: 2, unitArrIdx: 12,            // Agus, Cluster 2 unit-1
        tipe: 'cash_cicil', tenor: 24, kpr: null,
        // cicilan = harga / tenor, bayar 8x
        cicilanCount: 8,
        catatanCicilan: (n) => `Angsuran Cash Cicil ke-${n} dari 24`,
      },
      {
        custIdx: 3, unitArrIdx: 18,            // Dewi, Cluster 3 unit-1
        tipe: 'kredit_kpr', tenor: 120, kpr: 'KPR Bank Mandiri — Status: Approved',
        bayarBatches: [
          { jumlahPct: 0.30, catatan: 'DP KPR 30%' },
        ],
      },
      {
        custIdx: 4, unitArrIdx: 24,            // Fajar, Cluster 4 unit-1
        tipe: 'cash_lunas', tenor: 0, kpr: null,
        bayarBatches: [
          { jumlah: null, catatan: 'Pelunasan Cash Keras' },
        ],
      },
      {
        custIdx: 5, unitArrIdx: 30,            // Maya, Cluster 5 unit-1
        tipe: 'cash_cicil', tenor: 12, kpr: null,
        cicilanCount: 4,
        catatanCicilan: (n) => `Angsuran Cash Cicil ke-${n} dari 12`,
      },
    ];

    const assignmentIds = [];

    for (const sk of saleSkenario) {
      const unit = allUnits[sk.unitArrIdx];
      const cust = customers[sk.custIdx];

      const asgn = await qOne(client,
        `INSERT INTO property_assignments
           (user_id, unit_id, tipe_pembayaran, harga_total, tenor_bulan, keterangan_kpr, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [cust.id, unit.id, sk.tipe, unit.harga, sk.tenor, sk.kpr, unit.admId]
      );

      assignmentIds.push(asgn.id);

      // Masukkan payment_history sesuai skenario
      if (sk.bayarBatches) {
        for (const batch of sk.bayarBatches) {
          const jumlah = batch.jumlah === null
            ? unit.harga                           // Cash lunas = bayar harga penuh
            : Math.round(unit.harga * batch.jumlahPct); // % dari harga
          await q(client,
            `INSERT INTO payment_history (assignment_id, jumlah_bayar, catatan, created_by)
             VALUES ($1, $2, $3, $4)`,
            [asgn.id, jumlah, batch.catatan, unit.admId]
          );
        }
      }

      if (sk.cicilanCount) {
        const cicilan = Math.round(unit.harga / sk.tenor);
        for (let n = 1; n <= sk.cicilanCount; n++) {
          await q(client,
            `INSERT INTO payment_history (assignment_id, jumlah_bayar, catatan, created_by)
             VALUES ($1, $2, $3, $4)`,
            [asgn.id, cicilan, sk.catatanCicilan(n), unit.admId]
          );
        }
      }
    }

    // ═══════════════════════════════════════════════
    // 7. PROGRESS PEMBANGUNAN
    //    - Unit terjual (6 unit) punya history progress lengkap
    //    - Beberapa unit tidak terjual juga ada progress-nya
    //    - Progress sinkron dengan status_pembangunan unit
    // ═══════════════════════════════════════════════
    console.log('🚧 Membuat data Progress Pembangunan...');

    /**
     * Tahapan pembangunan:
     * Pondasi (20%) → Struktur Beton (40%) → Dinding & Plesteran (60%) → Atap (75%) → Finishing (100%)
     */
    const tahapan = [
      { tahap: 'Persiapan Lahan',          pct: 10,  catatan: 'Pembersihan lahan dan pemasangan pagar proyek selesai.' },
      { tahap: 'Pondasi',                  pct: 25,  catatan: 'Galian dan pengecoran pondasi batu kali selesai dikerjakan.' },
      { tahap: 'Struktur Beton',           pct: 45,  catatan: 'Kolom, balok, dan pelat lantai selesai dicor. Curing berjalan.' },
      { tahap: 'Dinding & Plesteran',      pct: 65,  catatan: 'Pemasangan bata merah dan plesteran dinding selesai 100%.' },
      { tahap: 'Atap & Rangka Baja',       pct: 80,  catatan: 'Rangka baja ringan dan pemasangan genteng morando selesai.' },
      { tahap: 'Finishing & Pengecatan',   pct: 95,  catatan: 'Pengecatan interior & eksterior, pemasangan keramik selesai.' },
      { tahap: 'Serah Terima Unit (STU)',  pct: 100, catatan: 'Unit telah selesai 100% dan siap untuk serah terima ke pembeli.' },
    ];

    /**
     * Skenario progress untuk tiap unit yang dijual:
     * [0] Hendra  (cash lunas) → 100% Selesai (STU sudah)
     * [1] Rina    (KPR)        → 80% (sampai Atap)
     * [2] Agus    (cash cicil) → 65% (sampai Dinding)
     * [3] Dewi    (KPR)        → 45% (sampai Struktur Beton)
     * [4] Fajar   (cash lunas) → 100% Selesai (STU sudah)
     * [5] Maya    (cash cicil) → 25% (sampai Pondasi)
     */
    const progressSkenario = [
      { unitArrIdx: 0,  sampaiIdx: 6, admIdx: 0 }, // Hendra  → 100%
      { unitArrIdx: 6,  sampaiIdx: 4, admIdx: 0 }, // Rina    → 80%
      { unitArrIdx: 12, sampaiIdx: 3, admIdx: 2 }, // Agus    → 65%
      { unitArrIdx: 18, sampaiIdx: 2, admIdx: 2 }, // Dewi    → 45%
      { unitArrIdx: 24, sampaiIdx: 6, admIdx: 1 }, // Fajar   → 100%
      { unitArrIdx: 30, sampaiIdx: 1, admIdx: 1 }, // Maya    → 25%
    ];

    // Tambah juga 4 unit TIDAK TERJUAL yang sedang dalam pembangunan
    const extraProgress = [
      { unitArrIdx: 1,  sampaiIdx: 3, admIdx: 0 }, // Cluster 0 unit-2, sampai Dinding 65%
      { unitArrIdx: 7,  sampaiIdx: 2, admIdx: 0 }, // Cluster 1 unit-2, sampai Struktur 45%
      { unitArrIdx: 13, sampaiIdx: 1, admIdx: 2 }, // Cluster 2 unit-2, sampai Pondasi 25%
      { unitArrIdx: 25, sampaiIdx: 4, admIdx: 1 }, // Cluster 4 unit-2, sampai Atap 80%
    ];

    const allProgressSkenario = [...progressSkenario, ...extraProgress];

    for (const sk of allProgressSkenario) {
      const unit    = allUnits[sk.unitArrIdx];
      const admId   = sk.admIdx === 0 ? admMaju.id : admGraha.id;
      const maxIdx  = sk.sampaiIdx; // 0-based index di array tahapan

      for (let t = 0; t <= maxIdx; t++) {
        const th = tahapan[t];
        await q(client,
          `INSERT INTO progress (unit_id, tahap, progress_percentage, catatan, created_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [unit.id, th.tahap, th.pct, th.catatan, admId]
        );
      }

      // Sinkronkan status_pembangunan & progress_percentage di tabel units
      // (trigger fn_sync_unit_progress otomatis update progress_percentage,
      //  tapi status_pembangunan harus kita update manual)
      const finalPct = tahapan[maxIdx].pct;
      const statusBangunan = finalPct === 100
        ? 'selesai'
        : finalPct > 0
          ? 'dalam_pembangunan'
          : 'belum_mulai';

      await q(client,
        `UPDATE units SET status_pembangunan = $1 WHERE id = $2`,
        [statusBangunan, unit.id]
      );
    }

    // ═══════════════════════════════════════════════
    // COMMIT
    // ═══════════════════════════════════════════════
    await client.query('COMMIT');

    // ─── RINGKASAN HASIL ──────────────────────────
    console.log('\n✅ Seeding BERHASIL! Berikut ringkasan data:\n');
    console.log('  🏢 Companies     : 2');
    console.log('  👤 Super Admin   : 1');
    console.log('  👔 Admin         : 2  (1 per PT)');
    console.log('  👥 Customers     : 8');
    console.log('  🏗️ Projects      : 4  (2 per PT)');
    console.log('  🏘️ Clusters      : 8  (2 per Project)');
    console.log('  🏠 Units         : 48 (6 per Cluster)');
    console.log('  📄 Assignments   : 6  (unit terjual ke 6 customer)');
    console.log('  💳 Payments      :');
    console.log('       Hendra  → Cash Lunas   (100% lunas)');
    console.log('       Rina    → KPR BCA      (DP 20% terbayar)');
    console.log('       Agus    → Cash Cicil   (8/24 cicilan)');
    console.log('       Dewi    → KPR Mandiri  (DP 30% terbayar)');
    console.log('       Fajar   → Cash Lunas   (100% lunas)');
    console.log('       Maya    → Cash Cicil   (4/12 cicilan)');
    console.log('  🚧 Progress      : 10 unit punya history pembangunan');
    console.log('       Hendra  unit → 100% Selesai (STU)');
    console.log('       Fajar   unit → 100% Selesai (STU)');
    console.log('       Rina    unit → 80%  (Atap selesai)');
    console.log('       Agus    unit → 65%  (Dinding selesai)');
    console.log('       Dewi    unit → 45%  (Struktur Beton)');
    console.log('       Maya    unit → 25%  (Pondasi selesai)');
    console.log('       + 4 unit non-assign juga dalam pembangunan\n');
    console.log('  🔐 Password semua akun : password123\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seeding GAGAL — rollback dijalankan.');
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runSeed();