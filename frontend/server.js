// Servidor de producción personalizado (sin dependencias externas).
//
// Los `rewrites` de next.config.ts proxean /api en modo desarrollo (next dev),
// pero NO reenvían la IP real del cliente al backend. Aquí, en producción,
// interceptamos /api y lo proxeamos manualmente con el módulo http nativo,
// inyectando X-Forwarded-For / X-Real-IP con la IP real de la conexión.
const { createServer, request: httpRequest } = require('http');
const { URL } = require('url');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';
const dev = process.env.NODE_ENV !== 'production';
const backend = process.env.INTERNAL_API_URL || 'http://localhost:3001';
const backendUrl = new URL(backend);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function proxyApi(req, res) {
  const clientIp = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  const prevXff = req.headers['x-forwarded-for'];
  const xff = prevXff ? `${prevXff}, ${clientIp}` : clientIp;

  const proxyReq = httpRequest(
    {
      hostname: backendUrl.hostname,
      port: backendUrl.port || 80,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: backendUrl.host,
        'x-forwarded-for': xff,
        'x-forwarded-proto': 'http',
        'x-real-ip': clientIp,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', () => {
    if (!res.headersSent) res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxyReq);
}

app.prepare().then(() => {
  createServer((req, res) => {
    if (req.url && req.url.startsWith('/api')) return proxyApi(req, res);
    return handle(req, res);
  }).listen(port, hostname, () => {
    console.log(`> Frontend listo en http://${hostname}:${port}`);
  });
});
