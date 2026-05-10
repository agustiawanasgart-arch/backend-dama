import Fastify from 'fastify';
import fastifyPostgres from '@fastify/postgres';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import dotenv from 'dotenv';
import fastifyMultipart from '@fastify/multipart';

import authRoutes from './src/routes/auth.route.js';
import authPlugin from './src/plugins/auth.plugin.js';
import projectRoutes from './src/routes/projects.route.js';
import clusterRoutes from './src/routes/clusters.route.js'; // NEW
import unitRoutes from './src/routes/units.route.js';
import assignmentRoutes from './src/routes/assignments.route.js';
import progressRoutes from './src/routes/progress.route.js';
import documentationRoutes from './src/routes/documentation.route.js';
import dashboardRoutes from './src/routes/dashboard.route.js';
import cloudinary from './src/config/cloudinary.js';
import userRoutes from './src/routes/users.route.js';
import companyRoutes from './src/routes/companies.routes.js';

// Load environment variables dari file .env
dotenv.config();

const fastify = Fastify({
  logger: true
});

// --- Register Plugins ---

// Security headers
fastify.register(fastifyHelmet);

// CORS setup mengarah ke FRONTEND_URL
fastify.register(fastifyCors, {
  origin: (origin, cb) => {
    const allowed = [
      'https://frontend-dama.vercel.app'
    ];

    if (!origin || allowed.includes(origin)) {
      cb(null, true);
      return;
    }

    cb(new Error("Not allowed by CORS"), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// Rate limiting dasar
fastify.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// JWT Setup
fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'super_secret'
});

// Koneksi PostgreSQL
fastify.register(fastifyPostgres, {
  connectionString: process.env.DATABASE_URL
});

// --- Routes Dasar ---
fastify.get('/api/health', async (request, reply) => {
  try {
    const client = await fastify.pg.connect();
    const { rows } = await client.query('SELECT NOW()');
    client.release();
    return { success: true, message: 'Server & Database ready!', db_time: rows[0].now };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500).send({ success: false, error: 'Database connection failed' });
  }
});

// Daftarkan plugin multipart dengan limit dari spesifikasi
fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // Maksimal 50 MB per file
    files: 10                   // Maksimal 10 file per request
  }
});

fastify.register(authPlugin);

fastify.register(authRoutes, { prefix: '/api/auth' });

fastify.register(projectRoutes, { prefix: '/api/projects' });

fastify.register(clusterRoutes, { prefix: '/api/clusters' }); // NEW

fastify.register(unitRoutes, { prefix: '/api/units' });

fastify.register(assignmentRoutes, { prefix: '/api/assignments' });

fastify.register(progressRoutes, { prefix: '/api/progress' });

fastify.register(documentationRoutes, { prefix: '/api/documentation' });

fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });

fastify.register(userRoutes, { prefix: '/api/users' });

fastify.register(companyRoutes, { prefix: '/api/companies' }); // NEW



// --- Start Server ---
const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    await fastify.listen({ port: port, host: '0.0.0.0' });
    console.log(`Server berjalan di http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();