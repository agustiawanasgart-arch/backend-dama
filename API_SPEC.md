# PropTrack — API Specification

Base URL: `http://localhost:3001/api`  
Format: JSON  
Auth: Bearer JWT (kecuali endpoint yang ditandai 🔓)

---

## Konvensi

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Response Format (sukses)
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 }  // hanya untuk list
}
```

### Response Format (error)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token tidak valid atau sudah expired"
  }
}
```

### Error Codes
| Code | HTTP | Keterangan |
|------|------|------------|
| `UNAUTHORIZED` | 401 | Token tidak ada atau invalid |
| `FORBIDDEN` | 403 | Role tidak punya akses |
| `NOT_FOUND` | 404 | Resource tidak ditemukan |
| `VALIDATION_ERROR` | 422 | Input tidak valid |
| `CONFLICT` | 409 | Data duplikat |
| `INTERNAL_ERROR` | 500 | Server error |

### Query Params Umum (untuk endpoint list)
| Param | Type | Default | Keterangan |
|-------|------|---------|------------|
| `page` | number | 1 | Halaman |
| `limit` | number | 20 | Item per halaman |
| `search` | string | - | Full-text search |
| `sort` | string | `created_at` | Kolom sort |
| `order` | `asc`\|`desc` | `desc` | Urutan sort |

---

## 1. AUTH 🔓

### POST `/auth/register`
Registrasi pelanggan baru (role otomatis `customer`).

**Request:**
```json
{
  "nama":           "Budi Santoso",
  "email":          "budi@email.com",
  "password":       "Password123!",
  "nomor_telepon":  "081234567890"    // opsional
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id":            "uuid",
      "nama":          "Budi Santoso",
      "email":         "budi@email.com",
      "nomor_telepon": "081234567890",
      "role":          "customer",
      "status":        "active",
      "created_at":    "2024-01-15T08:00:00Z"
    },
    "access_token":   "eyJhbGci...",
    "refresh_token":  "eyJhbGci...",
    "expires_in":     900
  }
}
```

**Validasi:**
- `nama`: required, min 2 karakter
- `email`: required, format email, unik
- `password`: required, min 8 karakter
- `nomor_telepon`: opsional, format angka

---

### POST `/auth/login` 🔓
Login untuk semua role.

**Request:**
```json
{
  "email":    "budi@email.com",
  "password": "Password123!"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id":     "uuid",
      "nama":   "Budi Santoso",
      "email":  "budi@email.com",
      "role":   "customer",
      "status": "active"
    },
    "access_token":  "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "expires_in":    900
  }
}
```

**Error Cases:**
- 401 → email/password salah
- 403 → akun nonaktif

---

### POST `/auth/refresh` 🔓
Perbarui access token menggunakan refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGci..."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token":  "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "expires_in":    900
  }
}
```

---

### POST `/auth/logout`
Revoke refresh token (invalidasi sesi).

**Request:**
```json
{
  "refresh_token": "eyJhbGci..."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "Logout berhasil" }
}
```

---

### GET `/auth/me`
Ambil profil user yang sedang login.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id":            "uuid",
    "nama":          "Budi Santoso",
    "email":         "budi@email.com",
    "nomor_telepon": "081234567890",
    "role":          "customer",
    "status":        "active",
    "created_at":    "2024-01-15T08:00:00Z"
  }
}
```

---

### PATCH `/auth/me`
Update profil sendiri (nama, telepon, password).

**Request:**
```json
{
  "nama":            "Budi Santoso Baru",   // opsional
  "nomor_telepon":   "089876543210",        // opsional
  "password_lama":   "Password123!",        // wajib jika ganti password
  "password_baru":   "NewPassword456!"      // opsional
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id":    "uuid",
    "nama":  "Budi Santoso Baru",
    "email": "budi@email.com"
  }
}
```

---

## 2. USERS
> Akses: **super_admin** saja (kecuali GET /users/me → semua role)

### GET `/users`
List semua user.

**Query Params Tambahan:**
| Param | Type | Keterangan |
|-------|------|------------|
| `role` | `super_admin`\|`admin`\|`customer` | Filter by role |
| `status` | `active`\|`inactive` | Filter by status |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id":            "uuid",
      "nama":          "Budi Santoso",
      "email":         "budi@email.com",
      "nomor_telepon": "081234567890",
      "role":          "customer",
      "status":        "active",
      "created_at":    "2024-01-15T08:00:00Z",
      "updated_at":    "2024-01-15T08:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 45 }
}
```

---

### POST `/users`
Buat user baru (admin/customer) oleh Super Admin.

**Request:**
```json
{
  "nama":           "Jane Admin",
  "email":          "jane@company.com",
  "password":       "TempPassword123!",
  "nomor_telepon":  "082345678901",
  "role":           "admin"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id":     "uuid",
    "nama":   "Jane Admin",
    "email":  "jane@company.com",
    "role":   "admin",
    "status": "active"
  }
}
```

---

### GET `/users/:id`
Detail satu user.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id":            "uuid",
    "nama":          "Jane Admin",
    "email":         "jane@company.com",
    "nomor_telepon": "082345678901",
    "role":          "admin",
    "status":        "active",
    "created_at":    "2024-01-15T08:00:00Z",
    "updated_at":    "2024-01-15T08:00:00Z",
    "assignments": [              // hanya jika role = customer
      {
        "unit_id":    "uuid",
        "nomor_unit": "A-01",
        "nama_proyek":"Grand Residence"
      }
    ]
  }
}
```

---

### PATCH `/users/:id`
Update data user.

**Request:**
```json
{
  "nama":           "Jane Admin Updated",
  "nomor_telepon":  "082345678901",
  "role":           "admin",
  "status":         "active"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id":     "uuid",
    "nama":   "Jane Admin Updated",
    "role":   "admin",
    "status": "active"
  }
}
```

---

### PATCH `/users/:id/password`
Reset password user oleh Super Admin.

**Request:**
```json
{
  "password_baru": "NewPassword789!"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "Password berhasil diperbarui" }
}
```

---

### DELETE `/users/:id`
Hapus user permanen. Semua assignment ikut terhapus (cascade).

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "User berhasil dihapus" }
}
```

---

## 3. PROJECTS
> GET: semua role | POST/PATCH/DELETE: **super_admin**

### GET `/projects`
List semua proyek.

**Query Params Tambahan:**
| Param | Type | Keterangan |
|-------|------|------------|
| `status` | `active`\|`completed`\|`on_hold` | Filter status |
| `include` | `clusters,units_count` | Sertakan data relasi |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id":          "uuid",
      "nama_proyek": "Grand Residence",
      "lokasi":      "Malang, Jawa Timur",
      "deskripsi":   "Perumahan premium di pusat kota",
      "developer":   "PT. Graha Sejahtera",
      "status":      "active",
      "created_at":  "2024-01-10T00:00:00Z",
      "updated_at":  "2024-01-15T00:00:00Z",
      "clusters_count": 3,         // jika include=clusters
      "units_count":    48         // jika include=units_count
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```

---

### POST `/projects`
Buat proyek baru.

**Request:**
```json
{
  "nama_proyek": "Grand Residence",
  "lokasi":      "Malang, Jawa Timur",
  "deskripsi":   "Perumahan premium di pusat kota",
  "developer":   "PT. Graha Sejahtera",
  "status":      "active"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id":          "uuid",
    "nama_proyek": "Grand Residence",
    "lokasi":      "Malang, Jawa Timur",
    "status":      "active",
    "created_at":  "2024-01-15T08:00:00Z"
  }
}
```

---

### GET `/projects/:id`
Detail proyek beserta semua cluster-nya.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id":          "uuid",
    "nama_proyek": "Grand Residence",
    "lokasi":      "Malang, Jawa Timur",
    "deskripsi":   "...",
    "developer":   "PT. Graha Sejahtera",
    "status":      "active",
    "clusters": [
      {
        "id":           "uuid",
        "nama_cluster": "Cluster A",
        "jumlah_unit":  16,
        "units_count":  16
      }
    ]
  }
}
```

---

### PATCH `/projects/:id`
Update proyek.

**Request:**
```json
{
  "nama_proyek": "Grand Residence Phase 2",
  "status":      "on_hold"
}
```

**Response 200:** _(sama seperti GET /:id)_

---

### DELETE `/projects/:id`
Hapus proyek. Cascade ke clusters → units → progress → docs.

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "Proyek berhasil dihapus" }
}
```

---

## 4. CLUSTERS
> GET: semua role | POST/PATCH/DELETE: **super_admin**

### GET `/clusters`
List semua cluster.

**Query Params Tambahan:**
| Param | Type | Keterangan |
|-------|------|------------|
| `project_id` | uuid | Filter by proyek |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id":           "uuid",
      "nama_cluster": "Cluster A",
      "jumlah_unit":  16,
      "project_id":   "uuid",
      "project": {
        "id":          "uuid",
        "nama_proyek": "Grand Residence"
      },
      "created_at": "2024-01-10T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 8 }
}
```

---

### POST `/clusters`
Buat cluster baru.

**Request:**
```json
{
  "nama_cluster": "Cluster B",
  "project_id":   "uuid",
  "jumlah_unit":  20
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id":           "uuid",
    "nama_cluster": "Cluster B",
    "project_id":   "uuid",
    "jumlah_unit":  20
  }
}
```

---

### PATCH `/clusters/:id`
Update cluster.

**Request:**
```json
{
  "nama_cluster": "Cluster B Premium",
  "jumlah_unit":  24
}
```

---

### DELETE `/clusters/:id`
Hapus cluster. Cascade ke units.

---

## 5. UNITS
> GET: semua role | POST/PATCH/DELETE: **super_admin**

### GET `/units`
List semua unit.

**Query Params Tambahan:**
| Param | Type | Keterangan |
|-------|------|------------|
| `cluster_id` | uuid | Filter by cluster |
| `project_id` | uuid | Filter by proyek |
| `status` | `belum_mulai`\|`dalam_pembangunan`\|`selesai` | Filter status |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id":                  "uuid",
      "nomor_unit":          "A-01",
      "tipe_rumah":          "Tipe 45",
      "luas_tanah":          72.00,
      "luas_bangunan":       45.00,
      "status_pembangunan":  "dalam_pembangunan",
      "progress_percentage": 60,
      "cluster_id":          "uuid",
      "cluster": {
        "id":           "uuid",
        "nama_cluster": "Cluster A",
        "project": {
          "id":          "uuid",
          "nama_proyek": "Grand Residence"
        }
      },
      "created_at": "2024-01-10T00:00:00Z",
      "updated_at": "2024-01-20T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 48 }
}
```

---

### POST `/units`
Buat unit baru.

**Request:**
```json
{
  "nomor_unit":          "A-01",
  "tipe_rumah":          "Tipe 45",
  "cluster_id":          "uuid",
  "luas_tanah":          72.00,
  "luas_bangunan":       45.00,
  "status_pembangunan":  "belum_mulai",
  "progress_percentage": 0
}
```

**Response 201:** _(sama seperti item di GET list)_

---

### GET `/units/:id`
Detail unit + progress terbaru + dokumentasi terbaru.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id":                  "uuid",
    "nomor_unit":          "A-01",
    "tipe_rumah":          "Tipe 45",
    "luas_tanah":          72.00,
    "luas_bangunan":       45.00,
    "status_pembangunan":  "dalam_pembangunan",
    "progress_percentage": 60,
    "cluster": {
      "id":           "uuid",
      "nama_cluster": "Cluster A",
      "project": {
        "id":          "uuid",
        "nama_proyek": "Grand Residence",
        "developer":   "PT. Graha Sejahtera"
      }
    },
    "latest_progress": {
      "id":                  "uuid",
      "tahap":               "Dinding",
      "progress_percentage": 60,
      "tanggal_update":      "2024-01-20",
      "catatan":             "Pemasangan bata selesai 60%"
    },
    "docs_count": 12
  }
}
```

---

### PATCH `/units/:id`
Update data unit.

**Request:**
```json
{
  "tipe_rumah":          "Tipe 54",
  "status_pembangunan":  "dalam_pembangunan",
  "progress_percentage": 60
}
```

---

### DELETE `/units/:id`

---

## 6. ASSIGNMENTS
> GET: **super_admin** & **admin** | POST/PATCH/DELETE: **super_admin**  
> Customer: hanya bisa lihat via `/auth/me` + `/units/my`

### GET `/assignments`
List semua assignment.

**Query Params Tambahan:**
| Param | Type | Keterangan |
|-------|------|------------|
| `user_id` | uuid | Filter by customer |
| `unit_id` | uuid | Filter by unit |
| `status` | `active`\|`inactive` | Filter status kepemilikan |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id":                  "uuid",
      "tanggal_pembelian":   "2024-01-10",
      "status_kepemilikan":  "active",
      "user": {
        "id":            "uuid",
        "nama":          "Budi Santoso",
        "email":         "budi@email.com",
        "nomor_telepon": "081234567890"
      },
      "unit": {
        "id":                  "uuid",
        "nomor_unit":          "A-01",
        "tipe_rumah":          "Tipe 45",
        "status_pembangunan":  "dalam_pembangunan",
        "progress_percentage": 60,
        "cluster": {
          "nama_cluster": "Cluster A",
          "project": { "nama_proyek": "Grand Residence" }
        }
      },
      "created_at": "2024-01-10T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 30 }
}
```

---

### POST `/assignments`
Hubungkan customer ke unit.

**Request:**
```json
{
  "user_id":            "uuid",
  "unit_id":            "uuid",
  "tanggal_pembelian":  "2024-01-10",
  "status_kepemilikan": "active"
}
```

**Response 201:** _(sama seperti item GET list)_

**Error:** 409 jika `user_id + unit_id` sudah ada.

---

### PATCH `/assignments/:id`
Update assignment (ganti status kepemilikan / tanggal).

**Request:**
```json
{
  "tanggal_pembelian":  "2024-01-15",
  "status_kepemilikan": "inactive"
}
```

---

### DELETE `/assignments/:id`
Hapus assignment.

---

### GET `/units/my`
**Khusus customer** — ambil semua unit milik user yang sedang login.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "assignment_id":       "uuid",
      "tanggal_pembelian":   "2024-01-10",
      "status_kepemilikan":  "active",
      "unit": {
        "id":                  "uuid",
        "nomor_unit":          "A-01",
        "tipe_rumah":          "Tipe 45",
        "luas_tanah":          72.00,
        "luas_bangunan":       45.00,
        "status_pembangunan":  "dalam_pembangunan",
        "progress_percentage": 60,
        "cluster": {
          "nama_cluster": "Cluster A",
          "project": {
            "nama_proyek": "Grand Residence",
            "lokasi":      "Malang, Jawa Timur",
            "developer":   "PT. Graha Sejahtera"
          }
        }
      }
    }
  ]
}
```

---

## 7. CONSTRUCTION PROGRESS
> GET: semua role | POST/PATCH/DELETE: **super_admin** & **admin**

### GET `/progress`
List semua update progress.

**Query Params Tambahan:**
| Param | Type | Keterangan |
|-------|------|------------|
| `unit_id` | uuid | Filter by unit (wajib untuk customer) |
| `tahap` | string | Filter by nama tahap |
| `date_from` | date | Filter tanggal mulai (YYYY-MM-DD) |
| `date_to` | date | Filter tanggal akhir |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id":                  "uuid",
      "tahap":               "Pondasi",
      "progress_percentage": 100,
      "tanggal_update":      "2024-01-12",
      "catatan":             "Pondasi selesai 100%",
      "unit": {
        "id":         "uuid",
        "nomor_unit": "A-01",
        "cluster": {
          "nama_cluster": "Cluster A",
          "project": { "nama_proyek": "Grand Residence" }
        }
      },
      "created_by": {
        "id":   "uuid",
        "nama": "Admin Satu"
      },
      "created_at": "2024-01-12T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 120 }
}
```

---

### POST `/progress`
Tambah update progress. Otomatis update `units.progress_percentage` dan `units.status_pembangunan`.

**Request:**
```json
{
  "unit_id":             "uuid",
  "tahap":               "Dinding",
  "progress_percentage": 60,
  "tanggal_update":      "2024-01-20",
  "catatan":             "Pemasangan bata 60% selesai"
}
```

**Response 201:** _(sama seperti item GET list)_

**Side effect otomatis di backend:**
```
unit.progress_percentage = 60
unit.status_pembangunan  =
  0%   → "belum_mulai"
  1-99 → "dalam_pembangunan"
  100% → "selesai"
```

---

### GET `/progress/:id`
Detail satu record progress.

---

### PATCH `/progress/:id`
Update record progress.

**Request:**
```json
{
  "tahap":               "Dinding",
  "progress_percentage": 75,
  "catatan":             "Update: bata 75%"
}
```

---

### DELETE `/progress/:id`
Hapus record progress.

---

### GET `/progress/unit/:unitId`
Timeline progress untuk satu unit, diurutkan dari terlama ke terbaru.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "unit": {
      "id":                  "uuid",
      "nomor_unit":          "A-01",
      "status_pembangunan":  "dalam_pembangunan",
      "progress_percentage": 60
    },
    "timeline": [
      {
        "id":                  "uuid",
        "tahap":               "Persiapan Lahan",
        "progress_percentage": 100,
        "tanggal_update":      "2024-01-05",
        "catatan":             "Lahan siap",
        "docs": [
          {
            "id":    "uuid",
            "jenis": "foto",
            "url":   "https://res.cloudinary.com/..."
          }
        ]
      },
      {
        "id":                  "uuid",
        "tahap":               "Pondasi",
        "progress_percentage": 100,
        "tanggal_update":      "2024-01-12",
        "catatan":             "Pondasi selesai"
      }
    ]
  }
}
```

---

## 8. DOCUMENTATION
> GET: semua role | POST/DELETE: **super_admin** & **admin**

### GET `/documentation`
List semua dokumentasi.

**Query Params Tambahan:**
| Param | Type | Keterangan |
|-------|------|------------|
| `unit_id` | uuid | Filter by unit |
| `progress_id` | uuid | Filter by progress record |
| `jenis` | `foto`\|`video`\|`dokumen` | Filter jenis file |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id":                   "uuid",
      "jenis":                "foto",
      "url":                  "https://res.cloudinary.com/proptrack/...",
      "cloudinary_public_id": "proptrack/documentation/abc123",
      "nama_file":            "pondasi_1.jpg",
      "ukuran_bytes":         204800,
      "unit": {
        "id":         "uuid",
        "nomor_unit": "A-01"
      },
      "progress": {
        "id":    "uuid",
        "tahap": "Pondasi"
      },
      "created_by": {
        "id":   "uuid",
        "nama": "Admin Satu"
      },
      "created_at": "2024-01-12T10:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 84 }
}
```

---

### POST `/documentation`
Upload dokumentasi ke Cloudinary, simpan metadata ke DB.

**Request:** `multipart/form-data`

| Field | Type | Keterangan |
|-------|------|------------|
| `file` | File | File yang diupload (bisa multiple) |
| `unit_id` | string | UUID unit |
| `jenis` | string | `foto`\|`video`\|`dokumen` |
| `progress_id` | string | UUID progress (opsional) |

**Response 201:**
```json
{
  "success": true,
  "data": [
    {
      "id":                   "uuid",
      "jenis":                "foto",
      "url":                  "https://res.cloudinary.com/...",
      "cloudinary_public_id": "proptrack/documentation/abc123",
      "nama_file":            "pondasi_1.jpg",
      "ukuran_bytes":         204800
    }
  ]
}
```

**Limit:** Maks 10 file per request, maks 50 MB per file.

---

### DELETE `/documentation/:id`
Hapus dokumentasi dari DB **dan** Cloudinary.

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "Dokumentasi berhasil dihapus" }
}
```

---

## 9. UPLOAD
> Akses: **super_admin** & **admin**

### POST `/upload`
Upload file ke Cloudinary (standalone, tanpa langsung simpan ke DB).  
Gunakan untuk upload yang butuh fleksibilitas sebelum disimpan.

**Request:** `multipart/form-data`

| Field | Type | Default | Keterangan |
|-------|------|---------|------------|
| `file` | File | - | File yang diupload |
| `folder` | string | `proptrack/misc` | Folder di Cloudinary |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "url":           "https://res.cloudinary.com/proptrack/image/upload/v1/...",
    "public_id":     "proptrack/misc/abc123",
    "resource_type": "image",
    "format":        "jpg",
    "bytes":         204800,
    "width":         1920,
    "height":        1080
  }
}
```

---

## 10. DASHBOARD
> Akses: **super_admin** & **admin**

### GET `/dashboard/stats`
Statistik ringkasan untuk overview dashboard.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "projects": {
      "total":     5,
      "active":    3,
      "completed": 1,
      "on_hold":   1
    },
    "units": {
      "total":              48,
      "belum_mulai":        10,
      "dalam_pembangunan":  30,
      "selesai":            8,
      "avg_progress":       54
    },
    "customers": {
      "total":  38,
      "active": 36
    },
    "progress_updates_this_month": 24
  }
}
```

---

## Middleware & Authorization

### Role Matrix

| Endpoint Group | super_admin | admin | customer |
|----------------|:-----------:|:-----:|:--------:|
| Auth (semua)   | ✅ | ✅ | ✅ |
| Users (CRUD)   | ✅ | ❌ | ❌ |
| Projects (R)   | ✅ | ✅ | ✅ |
| Projects (CUD) | ✅ | ❌ | ❌ |
| Clusters (R)   | ✅ | ✅ | ✅ |
| Clusters (CUD) | ✅ | ❌ | ❌ |
| Units (R)      | ✅ | ✅ | ✅ |
| Units (CUD)    | ✅ | ❌ | ❌ |
| Assignments (R)| ✅ | ✅ | own only |
| Assignments (CUD)| ✅ | ❌ | ❌ |
| Progress (R)   | ✅ | ✅ | ✅ |
| Progress (CUD) | ✅ | ✅ | ❌ |
| Documentation (R)| ✅ | ✅ | ✅ |
| Documentation (CUD)| ✅ | ✅ | ❌ |
| Dashboard Stats| ✅ | ✅ | ❌ |

### JWT Payload
```json
{
  "sub":   "user-uuid",
  "email": "user@email.com",
  "role":  "admin",
  "iat":   1700000000,
  "exp":   1700000900
}
```

---

## Rekomendasi Library Node.js

```json
{
  "express":          "^4.18",
  "pg":               "^8.11",       // atau "knex" / "drizzle-orm"
  "bcryptjs":         "^2.4",
  "jsonwebtoken":     "^9.0",
  "multer":           "^1.4",        // multipart/form-data
  "cloudinary":       "^2.5",
  "zod":              "^3.22",       // validasi input
  "helmet":           "^7.0",        // security headers
  "cors":             "^2.8",
  "express-rate-limit":"^7.0"
}
```

---

## Contoh SQL Query yang Berguna

### Ambil semua unit milik satu customer
```sql
SELECT * FROM v_assignment_detail
WHERE user_id = $1
  AND status_kepemilikan = 'active';
```

### Timeline progress sebuah unit
```sql
SELECT * FROM v_progress_detail
WHERE unit_id = $1
ORDER BY tanggal_update ASC, created_at ASC;
```

### Statistik dashboard
```sql
SELECT
  COUNT(*)                                             AS total_units,
  COUNT(*) FILTER (WHERE status_pembangunan = 'selesai')           AS selesai,
  COUNT(*) FILTER (WHERE status_pembangunan = 'dalam_pembangunan') AS dalam_pembangunan,
  COUNT(*) FILTER (WHERE status_pembangunan = 'belum_mulai')       AS belum_mulai,
  ROUND(AVG(progress_percentage))                      AS avg_progress
FROM units;
```

### Revoke semua token lama saat logout semua device
```sql
UPDATE refresh_tokens
SET revoked = TRUE
WHERE user_id = $1 AND revoked = FALSE;
```
