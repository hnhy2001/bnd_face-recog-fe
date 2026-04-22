import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'bnd_face-recog',
  webDir: 'out',
  server: {
    // Cho phép Android gọi các địa chỉ HTTP/HTTPS bên ngoài thoải mái
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: ['*']
  },
  // Nếu bạn dùng Capacitor Http Plugin để tránh lỗi CORS
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;