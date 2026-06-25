import type { NextConfig } from "next";

const BACKEND = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.29.172.7', '192.168.137.1', 'sga.intranet'],

  eslint: {
    // TODO: activar (poner en false) una vez se corrijan los errores de lint.
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
