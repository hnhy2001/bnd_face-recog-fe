/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // Khi Frontend gọi đến bất cứ gì bắt đầu bằng /api
        source: '/api/:path*',
        // Nó sẽ âm thầm chuyển hướng sang Backend thật của bạn
        destination: 'http://127.0.0.1:8000/api/:path*', 
      },
    ];
  },
};

export default nextConfig;