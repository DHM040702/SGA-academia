import type { NextConfig } from "next";

const BACKEND = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.29.172.7', '192.168.137.1', 'sga.intranet'],

  eslint: {
    // ESLint ACTIVO en el build: falla solo con ERRORES. Las reglas ruidosas
    // preexistentes están como "warn" (eslint.config.mjs) y no bloquean; los
    // bugs reales nuevos (hooks mal usados, etc.) sí romperán el build.
    ignoreDuringBuilds: false,
  },

  typescript: {
    // El build falla si hay errores de tipos — evita que bugs lleguen a producción.
    ignoreBuildErrors: false,
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
