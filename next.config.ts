/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output cho Docker
  output: 'standalone',
  
  // Tắt type check khi build (để build nhanh hơn)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Tắt ESLint check khi build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Tắt logging của Turbopack
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false, // Temporary redirect (307)
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Khi Frontend gọi đến bất cứ gì bắt đầu bằng /api
        source: '/api/:path*',
        // Nó sẽ âm thầm chuyển hướng sang Backend thật của bạn
        destination: 'https://hrm.benhnhietdoi.vn/api/:path*', 
      },
      {
        // Proxy cho ảnh và static files
        source: '/data/:path*',
        destination: 'https://hrm.benhnhietdoi.vn/data/:path*',
      },
    ];
  },
};

export default nextConfig;