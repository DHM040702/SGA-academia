import type { NextConfig } from "next";

const BACKEND = process.env.INTERNAL_API_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.29.172.7'],
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
