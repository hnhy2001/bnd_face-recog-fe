import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
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