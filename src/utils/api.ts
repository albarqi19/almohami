// API Configuration and HTTP Client
export const API_BASE_URL = 'https://api.alraedlaw.com/api/v1';

// HTTP Client with token management
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  /**
   * Phase 3: Listener يُستدعى عند ملاحظة X-Permissions-Version في response header
   * مختلف عن النسخة المحلية. يُسجَّل من PermissionContext.
   */
  private versionListener: ((version: number) => void) | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Get token from localStorage on initialization
    this.token = localStorage.getItem('authToken');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  /**
   * تسجيل listener لمراقبة تغيّر permissions_version في كل response.
   * يُستدعى من PermissionProvider مرة واحدة.
   */
  setPermissionsVersionListener(listener: ((version: number) => void) | null) {
    this.versionListener = listener;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // DEBUG: Track API calls
    console.log(`🔵 API CALL: ${options.method || 'GET'} ${endpoint}`, new Date().toISOString());

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': '69420', // Skip ngrok browser warning
      ...(options.headers as Record<string, string> || {}),
    };

    // Content-Type يُضاف حين يوجد جسم فعلاً وليس FormData (المتصفح يضبطه للـFormData).
    //
    // كان يُضاف لكل طلب بما فيها GET بلا جسم — وذلك يُخرج الطلب من «الطلبات
    // البسيطة» فيُلزم المتصفح بـOPTIONS preflight قبل كل نداء: رحلتان بدل واحدة
    // على كل نداء في التطبيق، ومضاعفةُ سطح الفشل الشبكي (خاصةً على النطاقات
    // المخصّصة والفرعية عبر الشبكات المتذبذبة).
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
      mode: 'cors',
      // credentials: 'include', // Removed for token-based auth
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}));

          // حماية: 401 قد تأتي من تكامل خارجي (OneDrive/…) لا من انتهاء جلسة التطبيق.
          // في هذه الحالة لا نطرد المستخدم — نمرّر الخطأ كطلب إعادة ربط ليعالجه المكوّن.
          if (errorData.reconnect_required || errorData.code === 'onedrive_reconnect_required') {
            const error = new Error(errorData.message || 'انتهت جلسة الربط، أعد المحاولة') as Error & {
              reconnectRequired?: boolean;
              provider?: string;
            };
            error.reconnectRequired = true;
            error.provider = errorData.provider || 'onedrive';
            throw error;
          }

          // انتهاء جلسة التطبيق الحقيقي: امسح التوكن ووجّه لصفحة الدخول.
          this.setToken(null);
          window.location.href = '/login';
          throw new Error('انتهت جلسة الدخول، يرجى تسجيل الدخول من جديد');
        }

        // 409 Conflict — أبرز استخدامها: تكامل خارجي يتطلب إعادة الربط (OneDrive).
        // لا يطرد المستخدم؛ يحمل reconnectRequired ليعرض المكوّن زر «إعادة الربط».
        if (response.status === 409) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.message || 'تعذّر إتمام العملية، حاول لاحقاً') as Error & {
            reconnectRequired?: boolean;
            provider?: string;
            errors?: Record<string, string[]>;
          };
          if (errorData.reconnect_required || errorData.code === 'onedrive_reconnect_required') {
            error.reconnectRequired = true;
            error.provider = errorData.provider || 'onedrive';
          }
          error.errors = errorData.errors;
          throw error;
        }

        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API Forbidden Response:', response.status, JSON.stringify(errorData, null, 2));

          // للمحامين - عدم redirect هنا، سيتم التعامل معه في ProtectedRoute
          if (errorData.account_suspended && errorData.is_lawyer) {
            const error = new Error(errorData.message || 'تم تعليق الحساب') as Error & {
              accountSuspended?: boolean;
              isLawyer?: boolean;
            };
            error.accountSuspended = true;
            error.isLawyer = true;
            throw error;
          }

          // للمالكين - عرض رسالة بدون redirect (سيتم التعامل معها في المكونات)
          if (errorData.subscription_expired) {
            console.warn('Subscription action blocked:', errorData.message);
            const error = new Error(errorData.message || 'الاشتراك منتهي') as Error & {
              errors?: Record<string, string[]>;
              subscriptionExpired?: boolean;
              actionRequired?: string;
            };
            error.subscriptionExpired = true;
            error.actionRequired = errorData.action_required;
            throw error;
          }

          // خطأ 403 عام — نمرّر error_code كي تميّز المكوّنات حالات بعينها
          // (مثل NAJIZ_ACCESS_REVOKED: قضية انقطعت علاقة المكتب بها في ناجز).
          const error = new Error(errorData.message || 'غير مصرح بهذا الإجراء') as Error & {
            errors?: Record<string, string[]>;
            errorCode?: string;
          };
          error.errors = errorData.errors;
          error.errorCode = errorData.error_code;
          throw error;
        }

        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', response.status, JSON.stringify(errorData, null, 2));
        // Create error with full details
        const error = new Error(errorData.message || `HTTP ${response.status}`) as Error & { errors?: Record<string, string[]> };
        error.errors = errorData.errors;
        throw error;
      }

      // Phase 3: راقب version header للـ permissions live refresh
      const versionHeader = response.headers.get('X-Permissions-Version');
      if (versionHeader && this.versionListener) {
        const v = parseInt(versionHeader, 10);
        if (!Number.isNaN(v)) {
          this.versionListener(v);
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    });
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': '69420', // Skip ngrok browser warning
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          // حماية: لا تطرد المستخدم إن كانت 401 من تكامل خارجي يتطلب إعادة الربط.
          if (errorData.reconnect_required || errorData.code === 'onedrive_reconnect_required') {
            const error = new Error(errorData.message || 'انتهت جلسة الربط، أعد المحاولة') as Error & {
              reconnectRequired?: boolean;
              provider?: string;
            };
            error.reconnectRequired = true;
            error.provider = errorData.provider || 'onedrive';
            throw error;
          }
          this.setToken(null);
          window.location.href = '/login';
          throw new Error('انتهت جلسة الدخول، يرجى تسجيل الدخول من جديد');
        }

        if (response.status === 409 && (errorData.reconnect_required || errorData.code === 'onedrive_reconnect_required')) {
          const error = new Error(errorData.message || 'تعذّر إتمام العملية، حاول لاحقاً') as Error & {
            reconnectRequired?: boolean;
            provider?: string;
          };
          error.reconnectRequired = true;
          error.provider = errorData.provider || 'onedrive';
          throw error;
        }

        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API FormData Request failed:', error);
      throw error;
    }
  }
}

// Create and export API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// No hardcoded token - authentication will be handled via login flow

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}
