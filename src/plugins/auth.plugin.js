import fp from 'fastify-plugin';

export default fp(async function (fastify, opts) {
  
  // Middleware: Verifikasi JWT dan lampirkan data user ke request
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
      // Hasil verify akan masuk ke request.user
      // Payload: { sub: user_id, role: 'admin', company_id: 'uuid' }
    } catch (err) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Sesi tidak valid atau expired' }
      });
    }
  });

  // Middleware: Proteksi Role
  fastify.decorate('requireRole', function (allowedRoles) {
    return async function (request, reply) {
      if (!request.user || !allowedRoles.includes(request.user.role)) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Role tidak punya akses ke endpoint ini' }
        });
      }
    };
  });
});