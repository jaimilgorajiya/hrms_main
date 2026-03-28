// API base URL is loaded from .env (EXPO_PUBLIC_API_URL)
// Expo automatically exposes variables prefixed with EXPO_PUBLIC_ to the JS bundle
export const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  console.warn('[config] EXPO_PUBLIC_API_URL is not set in .env');
}

export const ENDPOINTS = {
  login: '/api/auth/login',
  otpLogin: '/api/auth/otp-login',
  checkPhone: '/api/auth/check-phone',
  verify: '/api/auth/verify',
  changePassword: '/api/auth/change-password',
  employeeStats: '/api/employee-dashboard/stats',
  company: '/api/company',
  attendanceToday: '/api/attendance/today',
  togglePunch: '/api/attendance/toggle-punch',
  toggleBreak: '/api/attendance/toggle-break',
  attendanceHistory: '/api/attendance/history',
  notifications: '/api/notifications/my',
  readNotification: (id) => `/api/notifications/read/${id}`,
  readAllNotifications: '/api/notifications/read-all',
};
