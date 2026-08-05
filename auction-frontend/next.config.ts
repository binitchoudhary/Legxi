import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/socket.io',
        destination: 'http://localhost:8080/socket.io/',
      },
      {
        source: '/api/proxy/socket.io/:path*',
        destination: 'http://localhost:8080/socket.io/:path*',
      },
      {
        source: '/api/proxy/:path*',
        destination: process.env.BACKEND_API_URL || 'http://localhost:8080/api/v1/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
    ],
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
