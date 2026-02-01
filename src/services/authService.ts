import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type {
  User,
  LoginForm,
  TwoFactorSetupResponse,
  TwoFactorConfirmResponse,
  TwoFactorStatusResponse,
  LoginWith2FAResponse,
  Verify2FAResponse
} from '../types';

export interface LoginResponse {
  user?: User;
  token?: string;
  requires_2fa?: boolean;
  temp_token?: string;
}

export interface RegisterData {
  name: string;
  national_id: string;
  email: string;
  pin: string;
  pin_confirmation: string;
  role: string;
  phone?: string;
}

export class AuthService {
  static async login(credentials: LoginForm): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', {
      national_id: credentials.nationalId,
      pin: credentials.pin,
    });

    // DEBUG: Log the full response
    console.log('🔐 Login API Response:', JSON.stringify(response, null, 2));

    if (response.success && response.data) {
      // Check if 2FA is required
      console.log('🔐 Checking 2FA:', {
        requires_2fa: response.data.requires_2fa,
        temp_token: response.data.temp_token ? 'exists' : 'missing'
      });

      if (response.data.requires_2fa && response.data.temp_token) {
        console.log('🔐 2FA Required! Returning temp_token');
        return {
          requires_2fa: true,
          temp_token: response.data.temp_token,
        };
      }

      // No 2FA - Set token in API client
      if (response.data.token) {
        apiClient.setToken(response.data.token);
      }
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في تسجيل الدخول');
    }
  }

  static async register(userData: RegisterData): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/register', userData);

    if (response.success && response.data) {
      // Set token in API client
      if (response.data.token) {
        apiClient.setToken(response.data.token);
      }
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في التسجيل');
    }
  }

  static async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear token regardless of API response
      apiClient.setToken(null);
    }
  }

  static async getProfile(): Promise<User> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');

    if (response.success && response.data && response.data.user) {
      return response.data.user;
    } else {
      throw new Error(response.message || 'فشل في جلب بيانات المستخدم');
    }
  }

  static async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await apiClient.put<ApiResponse<User>>('/auth/profile', userData);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في تحديث البيانات');
    }
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await apiClient.put<ApiResponse>('/auth/password', {
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: newPassword,
    });

    if (!response.success) {
      throw new Error(response.message || 'فشل في تغيير كلمة المرور');
    }
  }

  // ==================== Two-Factor Authentication ====================

  /**
   * الحصول على حالة المصادقة الثنائية
   */
  static async get2FAStatus(): Promise<TwoFactorStatusResponse> {
    const response = await apiClient.get<ApiResponse<TwoFactorStatusResponse>>('/auth/2fa/status');

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب حالة المصادقة الثنائية');
    }
  }

  /**
   * بدء إعداد المصادقة الثنائية (توليد QR code و secret)
   */
  static async setup2FA(): Promise<TwoFactorSetupResponse> {
    const response = await apiClient.post<ApiResponse<TwoFactorSetupResponse>>('/auth/2fa/setup');

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في إعداد المصادقة الثنائية');
    }
  }

  /**
   * تأكيد تفعيل المصادقة الثنائية
   */
  static async confirm2FA(code: string): Promise<TwoFactorConfirmResponse> {
    const response = await apiClient.post<ApiResponse<TwoFactorConfirmResponse>>('/auth/2fa/confirm', {
      code,
    });

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'رمز التحقق غير صحيح');
    }
  }

  /**
   * التحقق من رمز 2FA عند تسجيل الدخول
   */
  static async verify2FA(tempToken: string, code: string): Promise<Verify2FAResponse> {
    const response = await apiClient.post<ApiResponse<Verify2FAResponse>>('/auth/2fa/verify', {
      temp_token: tempToken,
      code,
    });

    if (response.success && response.data) {
      // Set the real token
      if (response.data.token) {
        apiClient.setToken(response.data.token);
      }
      return response.data;
    } else {
      throw new Error(response.message || 'رمز التحقق غير صحيح');
    }
  }

  /**
   * تعطيل المصادقة الثنائية
   */
  static async disable2FA(code: string): Promise<void> {
    const response = await apiClient.post<ApiResponse>('/auth/2fa/disable', {
      code,
    });

    if (!response.success) {
      throw new Error(response.message || 'فشل في تعطيل المصادقة الثنائية');
    }
  }

  /**
   * إعادة توليد أكواد الاسترداد
   */
  static async regenerateRecoveryCodes(code: string): Promise<string[]> {
    const response = await apiClient.post<ApiResponse<{ recovery_codes: string[] }>>('/auth/2fa/recovery-codes', {
      code,
    });

    if (response.success && response.data) {
      return response.data.recovery_codes;
    } else {
      throw new Error(response.message || 'فشل في إعادة توليد أكواد الاسترداد');
    }
  }
}
