/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. THAY ĐỔI QUAN TRỌNG: Phải dùng 'export' để xuất ra file tĩnh cho mobile
  // output: 'export',
  output: 'standalone',

  // 2. THÊM MỚI: Bắt buộc tắt tối ưu ảnh vì tính năng này cần Node.js server
  images: {
    unoptimized: true,
  },

  // Giữ nguyên các config bỏ qua lỗi của bạn
  typescript: {
    ignoreBuildErrors: true,
  },
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  logging: {
    fetches: {
      fullUrl: false,
    },
  },

  // 3. XÓA BỎ redirects() VÀ rewrites()
  // Lộ trình tĩnh (export) không hỗ trợ 2 hàm này.
};

export default nextConfig;