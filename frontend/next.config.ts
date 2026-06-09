import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: true,
      },
      {
        source: '/results',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
