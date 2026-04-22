import axios from 'axios';

// Base URL cho API
// export const API_BASE_URL = 'http://localhost:8000';
// export const API_BASE_URL = 'https://hrm.benhnhietdoi.vn';
export const API_BASE_URL = 'http://192.168.12.13:8084';

// Helper function để tạo full API URL
export const getApiUrl = (path: string) => {
  // Nếu path đã có http/https thì return luôn
  if (path.startsWith('http')) return path;
  // Nếu path không bắt đầu bằng / thì thêm vào
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

// Helper function để tạo full Image URL
export const getImageUrl = (path?: string | null) => {
  if (!path || path === 'null' || path.trim() === '') return '';
  // Nếu đã là full URL thì return luôn
  if (path.startsWith('http')) return path;
  // Nếu là relative path thì thêm base URL
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || API_BASE_URL,
});

// "Mặt nạ" đánh chặn phản hồi từ Server
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Xóa token cũ nếu có
      localStorage.removeItem('token');
      // Đẩy người dùng về trang login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;