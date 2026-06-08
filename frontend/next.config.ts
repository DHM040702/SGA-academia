import type { NextConfig } from "next";
import path from "path";

const BACKEND = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.29.172.7'],

  // Fijar la raíz de Turbopack al directorio del frontend para evitar
  // el warning de múltiples lockfiles en el workspace de pnpm.
  turbopack: {
    root: path.resolve(__dirname),
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
