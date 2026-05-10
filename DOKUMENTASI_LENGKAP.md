# 📱 PropTrack - Dokumentasi Lengkap Backend

## 📋 Daftar Isi
1. [Pengenalan Proyek](#pengenalan-proyek)
2. [Struktur Folder](#struktur-folder)
3. [Teknologi & Dependencies](#teknologi--dependencies)
4. [Arsitektur Sistem](#arsitektur-sistem)
5. [Setup & Instalasi](#setup--instalasi)
6. [API Documentation](#api-documentation)
7. [Database Schema](#database-schema)
8. [Role & Permission](#role--permission)

---

## 🎯 Pengenalan Proyek

**PropTrack** adalah aplikasi backend untuk manajemen properti/real estate berbasis cloud. Sistem ini dirancang untuk:

- **Manajemen Proyek Properti**: Kelola multiple proyek real estate dari berbagai anak perusahaan
- **Tracking Unit/Rumah**: Monitor status pembangunan setiap unit dengan tracking progress real-time
- **Assignment Kepemilikan**: Kelola pembelian/assignment unit ke customer
- **Dokumentasi & Media**: Upload dan kelola foto, video, dokumen progress dengan Cloudinary
- **Multi-Tenant**: Mendukung multiple perusahaan dalam satu sistem dengan isolasi data

**Stack Teknologi:**
- **Framework**: Fastify 5.8.5 (Node.js Framework)
- **Database**: PostgreSQL 14+
- **Authentication**: JWT (JSON Web Token)
- **Cloud Storage**: Cloudinary
- **Validation**: Zod
- **Security**: bcryptjs, helmet, CORS, rate-limiting

---

## 📁 Struktur Folder & Fungsi

```
d:\PodoRukun/
├── src/                          # Source code utama
│   ├── config/                   # Konfigurasi eksternal
│   │   └── cloudinary.js         # Setup Cloudinary untuk upload file
│   │
│   ├── plugins/                  # Plugin custom Fastify
│   │   └── auth.plugin.js        # Plugin autentikasi JWT & role validation
│   │
│   ├── routes/                   # API Endpoints (Router)
│   │   ├── auth.route.js         # Registrasi & Login
│   │   ├── users.route.js        # Manajemen User (CRUD)
│   │   ├── companies.routes.js   # Manajemen Perusahaan (Super Admin)
│   │   ├── projects.route.js     # Manajemen Proyek
│   │   ├── clusters.route.js     # Manajemen Cluster/Grup Unit
│   │   ├── units.route.js        # Manajemen Unit/Rumah
│   │   ├── assignments.route.js  # Manajemen Assignment/Pembelian
│   │   ├── progress.route.js     # Tracking Progress Pembangunan
│   │   ├── documentation.route.js# Upload & Manajemen Dokumentasi
│   │   └── dashboard.route.js    # Dashboard & Statistik
│   │
│   └── schemas/                  # Validasi Input (Zod)
│       ├── auth.schema.js        # Skema register & login
│       ├── clusters.schema.js    # Skema validasi cluster
│       ├── units.schema.js       # Skema validasi unit
│       ├── assignments.schema.js # Skema validasi assignment
│       ├── progress.schema.js    # Skema validasi progress
│       └── documentation.schema.js# Skema validasi dokumentasi
│
├── server.js                     # Entry point aplikasi
├── package.json                  # Dependencies & scripts
├── schema.sql                    # Database schema SQL
├── seed.js                       # Data seeding (optional)
├── docker-compose.yml            # Docker configuration
├── API_SPEC.md                   # API Specification (existing)
└── .env                          # Environment variables (tidak di-track)
```

### 📄 Fungsi Setiap Folder:

#### **`src/config/`** - Konfigurasi Eksternal
- **cloudinary.js**: Inisialisasi Cloudinary SDK untuk upload media (foto, video, dokumen)

#### **`src/plugins/`** - Plugin Custom
- **auth.plugin.js**: 
  - `fastify.authenticate`: Middleware untuk verifikasi JWT token
  - `fastify.requireRole(['role'])`: Middleware untuk cek role-based access

#### **`src/routes/`** - API Endpoints
Setiap file route berisi endpoint HTTP (GET, POST, PATCH, DELETE) untuk resource tertentu:

1. **auth.route.js** - Authentikasi
   - `POST /auth/register` - Registrasi user baru
   - `POST /auth/login` - Login user
   - `POST /auth/refresh` - Refresh token

2. **users.route.js** - Manajemen User
   - `GET /users` - List semua user
   - `POST /users` - Buat user baru
   - `GET /users/:id` - Detail user
   - `PATCH /users/:id` - Update user
   - `DELETE /users/:id` - Hapus user

3. **companies.routes.js** - Manajemen Perusahaan
   - `GET /companies` - List perusahaan
   - `POST /companies` - Tambah perusahaan baru
   - `GET /companies/:id` - Detail perusahaan
   - `PATCH /companies/:id` - Update perusahaan

4. **projects.route.js** - Manajemen Proyek
   - `GET /projects` - List proyek
   - `POST /projects` - Buat proyek baru
   - `GET /projects/:id` - Detail proyek
   - `PATCH /projects/:id` - Update proyek
   - `DELETE /projects/:id` - Hapus proyek

5. **clusters.route.js** - Manajemen Cluster
   - `GET /clusters` - List cluster (dengan pagination)
   - `GET /clusters/:id` - Detail cluster
   - `POST /clusters` - Buat cluster baru
   - `PATCH /clusters/:id` - Update cluster
   - `DELETE /clusters/:id` - Hapus cluster
   - `GET /clusters/project/:projectId` - List cluster by project

6. **units.route.js** - Manajemen Unit
   - `GET /units` - List unit
   - `GET /units/:id` - Detail unit
   - `PATCH /units/:id` - Update unit
   - `POST /units/bulk` - Bulk upload unit

7. **assignments.route.js** - Manajemen Assignment
   - `GET /assignments` - List assignment
   - `POST /assignments` - Buat assignment
   - `GET /assignments/:id` - Detail assignment
   - `PATCH /assignments/:id` - Update status

8. **progress.route.js** - Tracking Progress
   - `GET /progress` - List progress
   - `POST /progress` - Tambah progress update
   - `PATCH /progress/:id` - Update progress

9. **documentation.route.js** - Dokumentasi & Media
   - `GET /documentation` - List dokumentasi
   - `POST /documentation` - Upload dokumen/foto
   - `PATCH /documentation/:id` - Update dokumentasi
   - `DELETE /documentation/:id` - Hapus dokumentasi

10. **dashboard.route.js** - Dashboard & Statistik
   - `GET /dashboard/stats` - Statistik overview

#### **`src/schemas/`** - Validasi Input (Zod)
Setiap file berisi skema validasi untuk request body menggunakan library **Zod**:
- Validasi tipe data
- Validasi format (email, URL, dll)
- Validasi constraints (min length, enum, dll)

---

## 🛠️ Teknologi & Dependencies

### Core Framework
```json
{
  "fastify": "^5.8.5",           // Web framework
  "@fastify/postgres": "^6.0.2", // PostgreSQL driver
  "@fastify/jwt": "^10.0.0",     // JWT authentication
  "@fastify/cors": "^11.2.0",    // Cross-Origin Resource Sharing
  "@fastify/helmet": "^13.0.2",  // Security headers
  "@fastify/rate-limit": "^10.3.0", // Rate limiting
  "@fastify/multipart": "^10.0.0"   // File upload
}
```

### Security & Validation
```json
{
  "bcryptjs": "^3.0.3",      // Password hashing
  "zod": "^4.4.3"            // Schema validation
}
```

### Cloud & Storage
```json
{
  "cloudinary": "^2.10.0"    // Cloud storage untuk media
}
```

### Development
```json
{
  "nodemon": "^3.1.14"       // Auto-restart server saat development
}
```

---

## 🏗️ Arsitektur Sistem

### Request Flow
```
HTTP Request
    ↓
[Authentication Plugin] → Verifikasi JWT
    ↓
[Role Check] → Validasi permission
    ↓
[Route Handler] → Process request
    ↓
[Database Query] → Query PostgreSQL
    ↓
[Response] → Return JSON
```

### Data Flow (Contoh: Create Unit)
```
POST /api/units/bulk
    ↓
Zod Validation (createUnitSchema)
    ↓
Database Connection (pg client)
    ↓
BEGIN Transaction
    ↓
Loop: INSERT INTO units
    ↓
COMMIT Transaction
    ↓
Response 201 Created
```

### Multi-Tenant Architecture
```
┌─────────────────────────────────┐
│   Sistem PropTrack (1)          │
├─────────────────────────────────┤
│  Companies (PT Induk/Anak)      │
│  ├─ PT A (company_id_1)         │
│  │  ├─ Proyek A1                │
│  │  │  ├─ Cluster A1.1          │
│  │  │  │  ├─ Unit A1.1.1        │
│  │  │  │  └─ Unit A1.1.2        │
│  │  └─ Proyek A2                │
│  └─ PT B (company_id_2)         │
│     └─ Proyek B1                │
│        └─ Cluster B1.1          │
│           └─ Unit B1.1.1        │
└─────────────────────────────────┘

User Roles:
- super_admin  → Akses semua company
- admin        → Akses 1 company (set di company_id)
- customer     → Akses assignment mereka sendiri
```

---

## 🚀 Setup & Instalasi

### Prerequisites
- Node.js v16+
- PostgreSQL 14+
- Cloudinary Account (untuk upload media)

### Installation Steps

1. **Clone & Install Dependencies**
   ```bash
   cd d:\PodoRukun
   npm install
   ```

2. **Setup Environment Variables**
   Create `.env` file:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=proptrack
   DB_USER=postgres
   DB_PASSWORD=your_password
   
   # JWT
   JWT_SECRET=your_super_secret_jwt_key
   BCRYPT_ROUNDS=12
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # Server
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```

3. **Setup Database**
   ```bash
   # Login ke PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE proptrack;
   \c proptrack
   
   # Import schema
   \i schema.sql
   
   # (Optional) Import seed data
   \i seed.js
   ```

4. **Run Server**
   ```bash
   npm start        # Production
   npm run dev      # Development (dengan auto-restart)
   ```

5. **Test API**
   ```bash
   curl http://localhost:3001/api/auth/register \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"nama":"Test User","email":"test@test.com","password":"Password123!"}'
   ```

---

## 📡 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication
Semua endpoint (kecuali `auth/register` dan `auth/login`) memerlukan JWT token di header:
```
Authorization: Bearer <access_token>
```

### Response Format

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nama": "Budi Santoso",
    "email": "budi@email.com"
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

#### Error Response (4xx/5xx)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token tidak valid atau sudah expired"
  }
}
```

---

### 1️⃣ AUTH - Autentikasi (🔓 = Public)

#### `POST /auth/register` 🔓
Registrasi user baru (customer)

**Request:**
```json
{
  "nama": "Budi Santoso",
  "email": "budi@email.com",
  "password": "Password123!",
  "nomor_telepon": "081234567890"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nama": "Budi Santoso",
      "email": "budi@email.com",
      "nomor_telepon": "081234567890",
      "role": "customer",
      "status": "active",
      "created_at": "2024-01-15T08:00:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
  }
}
```

**Validasi:**
- `nama`: min 2 karakter
- `email`: format email, unik
- `password`: min 8 karakter, harus mengandung huruf & angka

---

#### `POST /auth/login` 🔓
Login user existing

**Request:**
```json
{
  "email": "budi@email.com",
  "password": "Password123!"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nama": "Budi Santoso",
      "email": "budi@email.com",
      "role": "customer",
      "status": "active",
      "company_id": null
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
  }
}
```

---

### 2️⃣ USERS - Manajemen User

#### `GET /users`
List semua user (hanya super_admin & admin)

**Query Parameters:**
| Param | Type | Default | Keterangan |
|-------|------|---------|------------|
| `page` | number | 1 | Halaman |
| `limit` | number | 20 | Item per halaman |
| `search` | string | - | Cari nama/email |
| `sort` | string | `created_at` | Kolom sort |
| `order` | `asc`\|`desc` | `desc` | Urutan |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nama": "Budi Santoso",
      "email": "budi@email.com",
      "nomor_telepon": "081234567890",
      "role": "customer",
      "status": "active",
      "company_id": "company-uuid",
      "created_at": "2024-01-15T08:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

---

#### `POST /users`
Buat user baru (hanya super_admin & admin)

**Request:**
```json
{
  "nama": "Ahmad Wijaya",
  "email": "ahmad@email.com",
  "password": "SecurePass123!",
  "nomor_telepon": "081987654321",
  "role": "customer",
  "company_id": "company-uuid"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "nama": "Ahmad Wijaya",
    "email": "ahmad@email.com",
    "role": "customer",
    "company_id": "company-uuid",
    "created_at": "2024-01-15T09:00:00Z"
  }
}
```

---

#### `GET /users/:id`
Detail user tertentu

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nama": "Budi Santoso",
    "email": "budi@email.com",
    "nomor_telepon": "081234567890",
    "role": "customer",
    "status": "active",
    "company_id": "company-uuid",
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2024-01-15T08:00:00Z"
  }
}
```

---

#### `PATCH /users/:id`
Update user

**Request:**
```json
{
  "nama": "Budi Santoso Jaya",
  "nomor_telepon": "081234567891",
  "status": "active"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nama": "Budi Santoso Jaya",
    "email": "budi@email.com",
    "nomor_telepon": "081234567891",
    "role": "customer",
    "status": "active",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

---

#### `DELETE /users/:id`
Hapus user

**Response 200:**
```json
{
  "success": true,
  "message": "User berhasil dihapus"
}
```

---

### 3️⃣ COMPANIES - Manajemen Perusahaan

#### `GET /companies`
List semua perusahaan (hanya super_admin)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "company-uuid-1",
      "nama_pt": "PT Golden Raya",
      "kode_pt": "GR-A",
      "alamat": "Jakarta, Indonesia",
      "logo_url": "https://cdn.example.com/logo.png",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `POST /companies`
Tambah perusahaan baru (hanya super_admin)

**Request:**
```json
{
  "nama_pt": "PT Maju Jaya Utama",
  "kode_pt": "MJU",
  "alamat": "Bandung, Indonesia",
  "logo_url": "https://cdn.example.com/mju-logo.png"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "company-uuid-2",
    "nama_pt": "PT Maju Jaya Utama",
    "kode_pt": "MJU",
    "alamat": "Bandung, Indonesia",
    "logo_url": "https://cdn.example.com/mju-logo.png",
    "created_at": "2024-01-15T11:00:00Z"
  }
}
```

---

### 4️⃣ PROJECTS - Manajemen Proyek

#### `GET /projects`
List semua proyek

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "project-uuid-1",
      "company_id": "company-uuid-1",
      "nama_proyek": "Grand Central 2024",
      "lokasi": "Jakarta Timur",
      "deskripsi": "Kompleks perumahan modern dengan 500 unit",
      "developer": "PT Constructor Indonesia",
      "status": "active",
      "created_by": "user-uuid",
      "created_at": "2024-01-10T08:00:00Z"
    }
  ]
}
```

---

#### `POST /projects`
Buat proyek baru

**Request:**
```json
{
  "nama_proyek": "Emerald Heights 2024",
  "lokasi": "Bandung",
  "deskripsi": "Kompleks perumahan premium dengan 300 unit",
  "developer": "PT Maju Jaya Utama",
  "status": "active"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "project-uuid-2",
    "company_id": "company-uuid-2",
    "nama_proyek": "Emerald Heights 2024",
    "lokasi": "Bandung",
    "status": "active",
    "created_at": "2024-01-15T12:00:00Z"
  }
}
```

---

#### `GET /projects/:id`
Detail proyek

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "project-uuid-1",
    "company_id": "company-uuid-1",
    "nama_proyek": "Grand Central 2024",
    "lokasi": "Jakarta Timur",
    "deskripsi": "Kompleks perumahan modern dengan 500 unit",
    "developer": "PT Constructor Indonesia",
    "status": "active",
    "created_at": "2024-01-10T08:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

---

#### `PATCH /projects/:id`
Update proyek

**Request:**
```json
{
  "nama_proyek": "Grand Central 2024 - Phase 2",
  "status": "completed",
  "deskripsi": "Fase 2 sedang berlangsung"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "project-uuid-1",
    "nama_proyek": "Grand Central 2024 - Phase 2",
    "status": "completed",
    "updated_at": "2024-01-15T12:30:00Z"
  }
}
```

---

### 5️⃣ CLUSTERS - Manajemen Cluster

#### `GET /clusters`
List semua cluster (dengan pagination)

**Query Parameters:**
| Param | Type | Default | Keterangan |
|-------|------|---------|------------|
| `page` | number | 1 | Halaman |
| `limit` | number | 20 | Item per halaman |
| `project_id` | string | - | Filter by project |
| `search` | string | - | Cari nama cluster |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cluster-uuid-1",
      "nama_cluster": "Cluster Utama",
      "jumlah_unit": 50,
      "project": {
        "id": "project-uuid-1",
        "nama_proyek": "Grand Central 2024",
        "lokasi": "Jakarta Timur"
      },
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-15T12:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

---

#### `GET /clusters/:id`
Detail cluster

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "cluster-uuid-1",
    "nama_cluster": "Cluster Utama",
    "jumlah_unit": 50,
    "project": {
      "id": "project-uuid-1",
      "nama_proyek": "Grand Central 2024",
      "lokasi": "Jakarta Timur"
    },
    "created_at": "2024-01-10T08:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

---

#### `POST /clusters`
Buat cluster baru (hanya super_admin & admin)

**Request:**
```json
{
  "project_id": "project-uuid-1",
  "nama_cluster": "Cluster Premium",
  "jumlah_unit": 75
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "cluster-uuid-2",
    "nama_cluster": "Cluster Premium",
    "jumlah_unit": 75,
    "project": {
      "id": "project-uuid-1",
      "nama_proyek": "Grand Central 2024",
      "lokasi": "Jakarta Timur"
    },
    "created_at": "2024-01-15T13:00:00Z",
    "updated_at": "2024-01-15T13:00:00Z"
  }
}
```

---

#### `PATCH /clusters/:id`
Update cluster (hanya super_admin & admin)

**Request:**
```json
{
  "nama_cluster": "Cluster Premium Plus",
  "jumlah_unit": 80
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "cluster-uuid-2",
    "nama_cluster": "Cluster Premium Plus",
    "jumlah_unit": 80,
    "project": {
      "id": "project-uuid-1",
      "nama_proyek": "Grand Central 2024",
      "lokasi": "Jakarta Timur"
    },
    "created_at": "2024-01-15T13:00:00Z",
    "updated_at": "2024-01-15T13:30:00Z"
  }
}
```

---

#### `DELETE /clusters/:id`
Hapus cluster (hanya super_admin & admin)

**Catatan:** Cluster hanya bisa dihapus jika tidak ada unit yang terikat. Jika ada unit, akan return error 409 CONFLICT.

**Response 200:**
```json
{
  "success": true,
  "message": "Cluster berhasil dihapus"
}
```

**Response 409 (Conflict):**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Tidak bisa menghapus cluster karena masih ada unit yang terikat"
  }
}
```

---

#### `GET /clusters/project/:projectId`
List cluster by project ID

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cluster-uuid-1",
      "nama_cluster": "Cluster Utama",
      "jumlah_unit": 50,
      "project": {
        "id": "project-uuid-1",
        "nama_proyek": "Grand Central 2024",
        "lokasi": "Jakarta Timur"
      },
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-15T12:00:00Z"
    },
    {
      "id": "cluster-uuid-2",
      "nama_cluster": "Cluster Premium",
      "jumlah_unit": 75,
      "project": {
        "id": "project-uuid-1",
        "nama_proyek": "Grand Central 2024",
        "lokasi": "Jakarta Timur"
      },
      "created_at": "2024-01-15T13:00:00Z",
      "updated_at": "2024-01-15T13:00:00Z"
    }
  ]
}
```

---

### 6️⃣ UNITS - Manajemen Unit/Rumah

#### `GET /units`
List semua unit

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "unit-uuid-1",
      "nomor_unit": "A-001",
      "tipe_rumah": "Type A (70m²)",
      "luas_tanah": 70.00,
      "luas_bangunan": 70.00,
      "status_pembangunan": "dalam_pembangunan",
      "progress_percentage": 45,
      "cluster": {
        "id": "cluster-uuid-1",
        "nama_cluster": "Cluster Utama",
        "project": {
          "id": "project-uuid-1",
          "nama_proyek": "Grand Central 2024"
        }
      }
    }
  ]
}
```

---

#### `GET /units/:id`
Detail unit

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "unit-uuid-1",
    "nomor_unit": "A-001",
    "tipe_rumah": "Type A (70m²)",
    "luas_tanah": 70.00,
    "luas_bangunan": 70.00,
    "status_pembangunan": "dalam_pembangunan",
    "progress_percentage": 45,
    "cluster": {
      "id": "cluster-uuid-1",
      "nama_cluster": "Cluster Utama",
      "project": {
        "id": "project-uuid-1",
        "nama_proyek": "Grand Central 2024"
      }
    }
  }
}
```

---

#### `PATCH /units/:id`
Update unit

**Request:**
```json
{
  "status_pembangunan": "selesai",
  "progress_percentage": 100
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "unit-uuid-1",
    "nomor_unit": "A-001",
    "status_pembangunan": "selesai",
    "progress_percentage": 100,
    "updated_at": "2024-01-15T13:00:00Z"
  }
}
```

---

#### `POST /units/bulk`
Upload unit dalam jumlah besar (bulk)

**Request:**
```json
[
  {
    "cluster_id": "cluster-uuid-1",
    "nomor_unit": "A-001",
    "tipe_rumah": "Type A (70m²)",
    "luas_tanah": 70.00,
    "luas_bangunan": 70.00
  },
  {
    "cluster_id": "cluster-uuid-1",
    "nomor_unit": "A-002",
    "tipe_rumah": "Type A (70m²)",
    "luas_tanah": 70.00,
    "luas_bangunan": 70.00
  }
]
```

**Response 200:**
```json
{
  "success": true,
  "message": "2 unit berhasil ditambahkan"
}
```

---

### 7️⃣ ASSIGNMENTS - Manajemen Assignment/Pembelian

#### `GET /assignments`
List semua assignment (hanya super_admin & admin)

**Query Parameters:**
| Param | Type | Default | Keterangan |
|-------|------|---------|------------|
| `page` | number | 1 | Halaman |
| `limit` | number | 20 | Item per halaman |
| `user_id` | string | - | Filter by user |
| `unit_id` | string | - | Filter by unit |
| `status` | string | - | Filter by status |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "assignment-uuid-1",
      "tanggal_pembelian": "2024-01-01",
      "status_kepemilikan": "active",
      "created_at": "2024-01-01T08:00:00Z",
      "user": {
        "id": "user-uuid-1",
        "nama": "Budi Santoso",
        "email": "budi@email.com",
        "nomor_telepon": "081234567890"
      },
      "unit": {
        "id": "unit-uuid-1",
        "nomor_unit": "A-001",
        "tipe_rumah": "Type A (70m²)",
        "status_pembangunan": "dalam_pembangunan",
        "progress_percentage": 45,
        "cluster": {
          "nama_cluster": "Cluster Utama",
          "project": {
            "nama_proyek": "Grand Central 2024",
            "lokasi": "Jakarta Timur"
          }
        }
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

---

#### `POST /assignments`
Buat assignment baru (beli unit)

**Request:**
```json
{
  "user_id": "user-uuid-1",
  "unit_id": "unit-uuid-1",
  "tanggal_pembelian": "2024-01-15",
  "status_kepemilikan": "active"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "assignment-uuid-2",
    "user_id": "user-uuid-1",
    "unit_id": "unit-uuid-1",
    "tanggal_pembelian": "2024-01-15",
    "status_kepemilikan": "active",
    "created_at": "2024-01-15T14:00:00Z"
  }
}
```

---

#### `GET /assignments/:id`
Detail assignment

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "assignment-uuid-1",
    "tanggal_pembelian": "2024-01-01",
    "status_kepemilikan": "active",
    "created_at": "2024-01-01T08:00:00Z",
    "user": {
      "id": "user-uuid-1",
      "nama": "Budi Santoso",
      "email": "budi@email.com"
    },
    "unit": {
      "id": "unit-uuid-1",
      "nomor_unit": "A-001",
      "status_pembangunan": "dalam_pembangunan",
      "progress_percentage": 45
    }
  }
}
```

---

#### `PATCH /assignments/:id`
Update status assignment

**Request:**
```json
{
  "status_kepemilikan": "completed"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "assignment-uuid-1",
    "status_kepemilikan": "completed",
    "updated_at": "2024-01-15T14:30:00Z"
  }
}
```

---

### 8️⃣ PROGRESS - Tracking Progress Pembangunan

#### `GET /progress`
List progress updates

**Query Parameters:**
| Param | Type | Keterangan |
|-------|------|------------|
| `page` | number | Halaman |
| `unit_id` | string | Filter by unit |
| `tahap` | string | Filter by tahap |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "progress-uuid-1",
      "tahap": "Pondasi",
      "progress_percentage": 45,
      "tanggal_update": "2024-01-15",
      "catatan": "Pondasi 45% sudah selesai",
      "created_at": "2024-01-15T08:00:00Z",
      "unit": {
        "id": "unit-uuid-1",
        "nomor_unit": "A-001",
        "cluster": {
          "id": "cluster-uuid-1",
          "nama_cluster": "Cluster Utama",
          "project": {
            "id": "project-uuid-1",
            "nama_proyek": "Grand Central 2024"
          }
        }
      },
      "created_by": {
        "id": "user-uuid-2",
        "nama": "Ahmad Wijaya"
      }
    }
  ]
}
```

---

#### `POST /progress`
Tambah progress update (hanya super_admin & admin)

**Request:**
```json
{
  "unit_id": "unit-uuid-1",
  "tahap": "Struktur Beton",
  "progress_percentage": 65,
  "tanggal_update": "2024-01-15",
  "catatan": "Struktur beton sudah mencapai 65%"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "progress-uuid-2",
    "tahap": "Struktur Beton",
    "progress_percentage": 65,
    "tanggal_update": "2024-01-15",
    "catatan": "Struktur beton sudah mencapai 65%",
    "unit_id": "unit-uuid-1",
    "created_by_id": "user-uuid-2",
    "created_at": "2024-01-15T09:00:00Z"
  }
}
```

---

#### `PATCH /progress/:id`
Update progress

**Request:**
```json
{
  "progress_percentage": 75,
  "catatan": "Update: Struktur sudah 75%"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "progress-uuid-1",
    "progress_percentage": 75,
    "catatan": "Update: Struktur sudah 75%",
    "updated_at": "2024-01-15T15:00:00Z"
  }
}
```

---

### 9️⃣ DOCUMENTATION - Dokumentasi & Media

#### `GET /documentation`
List dokumentasi (foto, video, dokumen)

**Query Parameters:**
| Param | Type | Keterangan |
|-------|------|------------|
| `unit_id` | string | Filter by unit |
| `progress_id` | string | Filter by progress |
| `jenis` | string | Filter by type (foto/video/dokumen) |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "doc-uuid-1",
      "jenis": "foto",
      "url": "https://res.cloudinary.com/...",
      "public_id": "proptrack/unit-001/photo-001",
      "deskripsi": "Foto pondasi tahap awal",
      "uploaded_at": "2024-01-15T08:00:00Z",
      "unit": {
        "id": "unit-uuid-1",
        "nomor_unit": "A-001"
      },
      "progress": {
        "id": "progress-uuid-1",
        "tahap": "Pondasi",
        "progress_percentage": 45
      }
    }
  ]
}
```

---

#### `POST /documentation`
Upload dokumentasi (foto/video/dokumen)

**Request (multipart/form-data):**
```
- file: <binary file>
- unit_id: unit-uuid-1
- progress_id: progress-uuid-1 (optional)
- jenis: foto
- deskripsi: Foto fondasi 45% selesai
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "doc-uuid-2",
    "jenis": "foto",
    "url": "https://res.cloudinary.com/...",
    "public_id": "proptrack/unit-001/photo-002",
    "deskripsi": "Foto fondasi 45% selesai",
    "uploaded_at": "2024-01-15T16:00:00Z"
  }
}
```

---

#### `PATCH /documentation/:id`
Update dokumentasi

**Request:**
```json
{
  "deskripsi": "Foto fondasi - update keterangan"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "doc-uuid-1",
    "deskripsi": "Foto fondasi - update keterangan",
    "updated_at": "2024-01-15T16:30:00Z"
  }
}
```

---

#### `DELETE /documentation/:id`
Hapus dokumentasi

**Response 200:**
```json
{
  "success": true,
  "message": "Dokumentasi berhasil dihapus"
}
```

---

### 🔟 DASHBOARD - Dashboard & Statistik

#### `GET /dashboard/stats`
Statistik overview (hanya super_admin & admin)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "units": {
      "total": 500,
      "selesai": 125,
      "dalam_pembangunan": 300,
      "belum_mulai": 75
    },
    "projects": {
      "total": 5,
      "active": 3,
      "completed": 1,
      "on_hold": 1
    },
    "customers": {
      "active": 180,
      "total": 200
    },
    "assignments": {
      "total": 200,
      "active": 180
    }
  }
}
```

---

## 🗄️ Database Schema

### Entity Relationship Diagram (ERD)

```
companies (1)
    ↓ (1:N)
users (many)
projects (many)
    ↓ (1:N)
clusters (many)
    ↓ (1:N)
units (many)
    ↓ (1:N)
assignments (many)
progress (many)
documentation (many)
```

### Tabel Utama

#### `companies` - Anak Perusahaan
```sql
id          UUID PRIMARY KEY
nama_pt     TEXT NOT NULL (contoh: "PT Golden Raya")
kode_pt     TEXT NOT NULL UNIQUE (contoh: "GR-A")
alamat      TEXT
logo_url    TEXT
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

#### `users` - User/Pengguna
```sql
id             UUID PRIMARY KEY
company_id     UUID REFERENCES companies (NULL untuk super_admin)
nama           TEXT NOT NULL
email          TEXT NOT NULL UNIQUE
password_hash  TEXT NOT NULL
nomor_telepon  TEXT
role           user_role ENUM ('super_admin', 'admin', 'customer')
status         user_status ENUM ('active', 'inactive')
created_at     TIMESTAMPTZ
updated_at     TIMESTAMPTZ
```

#### `projects` - Proyek Properti
```sql
id           UUID PRIMARY KEY
company_id   UUID NOT NULL REFERENCES companies
nama_proyek  TEXT NOT NULL
lokasi       TEXT NOT NULL
deskripsi    TEXT
developer    TEXT
status       project_status ENUM ('active', 'completed', 'on_hold')
created_by   UUID REFERENCES users
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```

#### `clusters` - Kelompok/Area dalam Proyek
```sql
id            UUID PRIMARY KEY
nama_cluster  TEXT NOT NULL
project_id    UUID NOT NULL REFERENCES projects
jumlah_unit   INTEGER DEFAULT 0
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
```

#### `units` - Unit Rumah/Properti
```sql
id                  UUID PRIMARY KEY
nomor_unit          TEXT NOT NULL
tipe_rumah          TEXT
cluster_id          UUID NOT NULL REFERENCES clusters
luas_tanah          NUMERIC(10,2)
luas_bangunan       NUMERIC(10,2)
status_pembangunan  unit_status ENUM ('belum_mulai', 'dalam_pembangunan', 'selesai')
progress_percentage SMALLINT DEFAULT 0
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

#### `assignments` - Pembelian/Kepemilikan Unit
```sql
id                 UUID PRIMARY KEY
user_id            UUID NOT NULL REFERENCES users
unit_id            UUID NOT NULL REFERENCES units
tanggal_pembelian  DATE
status_kepemilikan TEXT
created_at         TIMESTAMPTZ
updated_at         TIMESTAMPTZ
```

#### `progress` - Progress Pembangunan
```sql
id                  UUID PRIMARY KEY
unit_id             UUID NOT NULL REFERENCES units
tahap               TEXT (contoh: "Pondasi", "Struktur Beton")
progress_percentage SMALLINT
tanggal_update      DATE
catatan             TEXT
created_by          UUID REFERENCES users
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

#### `documentation` - Dokumentasi/Media
```sql
id          UUID PRIMARY KEY
unit_id     UUID REFERENCES units
progress_id UUID REFERENCES progress
jenis       doc_type ENUM ('foto', 'video', 'dokumen')
url         TEXT (URL dari Cloudinary)
public_id   TEXT (Cloudinary public ID untuk delete)
deskripsi   TEXT
uploaded_at TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

---

## 👥 Role & Permission

### User Roles

| Role | Akses | Keterangan |
|------|-------|----------|
| **super_admin** | Semua | Kontrol penuh, kelola multiple company |
| **admin** | 1 Company | Mengelola user, proyek, unit di company tertentu |
| **customer** | Own Assignment | Hanya bisa lihat assignment mereka sendiri |

### Permission Matrix

| Endpoint | super_admin | admin | customer |
|----------|:-----------:|:-----:|:---------:|
| **AUTH** | | | |
| POST /auth/register | ✓ | ✓ | ✓ |
| POST /auth/login | ✓ | ✓ | ✓ |
| **USERS** | | | |
| GET /users | ✓ | ✓ (own company) | ✗ |
| POST /users | ✓ | ✓ | ✗ |
| PATCH /users/:id | ✓ | ✓ | ✓ (own profile) |
| DELETE /users/:id | ✓ | ✓ | ✗ |
| **COMPANIES** | | | |
| GET /companies | ✓ | ✗ | ✗ |
| POST /companies | ✓ | ✗ | ✗ |
| PATCH /companies/:id | ✓ | ✗ | ✗ |
| **PROJECTS** | | | |
| GET /projects | ✓ (all) | ✓ (own company) | ✗ |
| POST /projects | ✓ | ✓ | ✗ |
| PATCH /projects/:id | ✓ | ✓ | ✗ |
| DELETE /projects/:id | ✓ | ✓ | ✗ |
| **CLUSTERS** | | | |
| GET /clusters | ✓ (all) | ✓ (own company) | ✗ |
| GET /clusters/:id | ✓ (all) | ✓ (own company) | ✗ |
| POST /clusters | ✓ | ✓ | ✗ |
| PATCH /clusters/:id | ✓ | ✓ | ✗ |
| DELETE /clusters/:id | ✓ | ✓ | ✗ |
| GET /clusters/project/:id | ✓ (all) | ✓ (own company) | ✗ |
| **UNITS** | | | |
| GET /units | ✓ | ✓ | ✓ (assigned only) |
| PATCH /units/:id | ✓ | ✓ | ✗ |
| POST /units/bulk | ✓ | ✓ | ✗ |
| **ASSIGNMENTS** | | | |
| GET /assignments | ✓ | ✓ | ✓ (own) |
| POST /assignments | ✓ | ✓ | ✗ |
| PATCH /assignments/:id | ✓ | ✓ | ✗ |
| **PROGRESS** | | | |
| GET /progress | ✓ | ✓ | ✓ (own) |
| POST /progress | ✓ | ✓ | ✗ |
| PATCH /progress/:id | ✓ | ✓ | ✗ |
| **DOCUMENTATION** | | | |
| GET /documentation | ✓ | ✓ | ✓ (own) |
| POST /documentation | ✓ | ✓ | ✓ (own unit) |
| PATCH /documentation/:id | ✓ | ✓ | ✓ (own) |
| DELETE /documentation/:id | ✓ | ✓ | ✓ (own) |
| **DASHBOARD** | | | |
| GET /dashboard/stats | ✓ | ✓ | ✗ |

---

## 🔒 Security Features

1. **JWT Authentication** - Semua endpoint dilindungi token JWT
2. **Role-Based Access Control** - Permission berbasis role user
3. **Password Hashing** - Bcryptjs dengan 12 rounds
4. **CORS** - Konfigurasi origin dari FRONTEND_URL
5. **Helmet** - Security headers (XSS, CSRF, Clickjacking protection)
6. **Rate Limiting** - 100 request per menit per IP
7. **SQL Injection Prevention** - Parameterized queries
8. **Data Isolation** - Multi-tenant dengan company_id filtering

---

## 🐳 Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: proptrack
      POSTGRES_PASSWORD: postgres_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  proptrack-api:
    build: .
    ports:
      - "3001:3001"
    environment:
      DB_HOST: postgres
      DB_NAME: proptrack
      DB_PASSWORD: postgres_password
    depends_on:
      - postgres

volumes:
  postgres_data:
```

**Run:**
```bash
docker-compose up -d
```

---

## 📝 File Struktur Dalam Routes

Setiap route file mengikuti pola:

```javascript
// 1. Import dependencies
import { schema } from '../schemas/...js';

export default async function routeName(fastify, options) {
  
  // 2. (Optional) Define helper functions
  const mapResponse = (row) => ({ ... });
  
  // 3. Define routes
  
  // GET - List
  fastify.get('/', { preValidation: [...] }, async (request, reply) => {
    // Logic
  });
  
  // POST - Create
  fastify.post('/', { preValidation: [...] }, async (request, reply) => {
    // Logic
  });
  
  // PATCH - Update
  fastify.patch('/:id', { preValidation: [...] }, async (request, reply) => {
    // Logic
  });
  
  // DELETE - Remove
  fastify.delete('/:id', { preValidation: [...] }, async (request, reply) => {
    // Logic
  });
}
```

---

## 🧪 Testing dengan Postman

1. **Import** `PropTrack.postman_collection.json` ke Postman
2. **Set Environment Variables** di Postman:
   - `base_url`: `http://localhost:3001/api`
   - `access_token`: Dari response login
3. **Test Endpoints** satu per satu

---

## 🚨 Error Codes & Handling

| Code | HTTP | Penyebab |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Token tidak ada/invalid/expired |
| `FORBIDDEN` | 403 | Role tidak punya akses |
| `NOT_FOUND` | 404 | Resource tidak ditemukan |
| `VALIDATION_ERROR` | 422 | Input tidak sesuai skema |
| `CONFLICT` | 409 | Data duplikat (email sudah terdaftar) |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 📞 Support & Troubleshooting

### Masalah Umum:

**1. "Connection refused" saat connect ke database**
- Pastikan PostgreSQL running
- Cek `.env` configuration (host, port, credentials)

**2. "Token expired" atau "Invalid token"**
- Login ulang untuk mendapat token baru
- Atau gunakan refresh token endpoint

**3. "Permission denied" / 403 error**
- Pastikan role user sesuai dengan requirement endpoint
- Pastikan company_id cocok (untuk admin)

**4. Upload file gagal**
- Cek Cloudinary API credentials di `.env`
- Pastikan file size < 10MB

---

**Dokumentasi ini dibuat pada: Mei 2024**
**Versi API: v1.0**
**Status: Production Ready**

