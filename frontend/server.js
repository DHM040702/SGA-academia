// Servidor de producción personalizado.
//
// next.config.ts usa `rewrites` para proxear /api en modo desarrollo (next dev),
// pero ese mecanismo NO reenvía la IP real del cliente al backend. Aquí, en
// producción, interceptamos /api antes de que Next lo maneje y lo proxeamos con
// http-proxy-middleware (xfwd: true), que sí agrega X-Forwarded-For con la IP real.
const { createServer } = require('http');
const next = require('next');
const { createProxyMiddleware } = require('http-proxy-middleware');

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';
const dev = process.env.NODE_ENV !== 'production';
const backend = process.env.INTERNAL_API_URL || 'http://localhost:3001';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const apiProxy = createProxyMiddleware({
  target: backend,
  changeOrigin: true,
  xfwd: true, // agrega X-Forwarded-For / -Port / -Proto con los datos reales de la conexión
});

app.prepare().then(() => {
  createServer((req, res) => {
    if (req.url && req.url.startsWith('/api')) {
      return apiProxy(req, res);
    }
    return handle(req, res);
  }).listen(port, hostname, () => {
    console.log(`> Frontend listo en http://${hostname}:${port}`);
  });
});
