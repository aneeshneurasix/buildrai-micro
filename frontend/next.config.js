/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for S3 deployment
  output: process.env.BUILD_MODE === 'static' ? 'export' : 'standalone',

  // Image optimization
  images: {
    unoptimized: process.env.BUILD_MODE === 'static',
    domains: ['codstack-static-assets.s3.ap-south-1.amazonaws.com'],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.codstack.com',
    NEXT_PUBLIC_AI_SERVICE_URL: process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'https://api.codstack.com',
  },

  // Webpack configuration
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
