import type { NextConfig } from "next";

const BACKEND = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.29.172.7', '192.168.137.1', 'sga.intranet'],

  eslint: {
    // TEMPORAL: en true mientras se verifica que `pnpm run lint` pasa limpio
    // (la config de ESLint ya está arreglada con FlatCompat). Poner en false
    // para activar el gate una vez confirmado que no hay errores.
    ignoreDuringBuilds: true,
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
