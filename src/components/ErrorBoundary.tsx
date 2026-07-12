import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * حاجز الأخطاء العام — بنفس لغة صفحة 404 البصرية (NotFound.tsx):
 * خلفية كحلية متدرّجة بملء الشاشة، علامة تحذير عملاقة باهتة بالخلفية،
 * هالتان ذهبيتان، عنوان فرعي ذهبي، عنوان، وصف، وأزرار حبّة (pill).
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const incidentRef = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);

    return (
      <div
        dir="rtl"
        style={{
          position: 'fixed',
          inset: 0,
          minHeight: '100vh',
          width: '100%',
          background:
            'radial-gradient(ellipse at 30% 20%, #1a3652 0%, #0A192F 50%, #060f1e 100%)',
          fontFamily: "'IBM Plex Sans Arabic', sans-serif",
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          color: '#FDFBF7',
          zIndex: 9999,
        }}
      >
        {/* علامة تحذير عملاقة باهتة بالخلفية — نظير الرقم 404 */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'clamp(280px, 55vw, 720px)',
            height: 'clamp(280px, 55vw, 720px)',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        >
          <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="eb-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(197, 165, 114, 0.13)" />
                <stop offset="60%" stopColor="rgba(197, 165, 114, 0.035)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            {/* مثلث التحذير */}
            <path
              d="M50 14 L88 82 L12 82 Z"
              stroke="url(#eb-fade)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <line x1="50" y1="40" x2="50" y2="63" stroke="url(#eb-fade)" strokeWidth="4" strokeLinecap="round" />
            <circle cx="50" cy="72" r="2.4" fill="url(#eb-fade)" />
          </svg>
        </div>

        {/* هالة ذهبية باهتة أعلى اليمين */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-200px',
            width: '600px',
            height: '600px',
            background:
              'radial-gradient(circle, rgba(197, 165, 114, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* هالة ذهبية باهتة أسفل اليسار */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-150px',
            width: '500px',
            height: '500px',
            background:
              'radial-gradient(circle, rgba(197, 165, 114, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* المحتوى */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            maxWidth: '560px',
          }}
        >
          {/* عنوان فرعي */}
          <div
            style={{
              fontSize: '11px',
              letterSpacing: '0.4em',
              color: '#C5A572',
              fontWeight: 600,
              marginBottom: '1.5rem',
            }}
          >
            إشعار من النظام
          </div>

          {/* العنوان */}
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: '1.25rem',
              color: '#FDFBF7',
              letterSpacing: '-0.01em',
            }}
          >
            تعذّر إتمام العملية
          </h1>

          {/* الوصف */}
          <p
            style={{
              fontSize: '1rem',
              lineHeight: 1.7,
              color: 'rgba(253, 251, 247, 0.65)',
              marginBottom: '0.75rem',
              maxWidth: '440px',
              marginInline: 'auto',
            }}
          >
            نواجه حالياً اضطراباً مؤقتاً في النظام. تم تسجيل الواقعة وإحالتها إلى الفريق التقني.
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'rgba(253, 251, 247, 0.4)',
              marginBottom: '2.5rem',
            }}
          >
            يُرجى تحديث الصفحة، أو العودة لاحقاً.
          </p>

          {/* الأزرار */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.875rem 2rem',
                borderRadius: '999px',
                background: '#C5A572',
                color: '#0A192F',
                fontWeight: 600,
                fontSize: '0.95rem',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow:
                  '0 8px 24px rgba(197, 165, 114, 0.25), 0 0 0 1px rgba(197, 165, 114, 0.5)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow =
                  '0 12px 32px rgba(197, 165, 114, 0.35), 0 0 0 1px rgba(197, 165, 114, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 8px 24px rgba(197, 165, 114, 0.25), 0 0 0 1px rgba(197, 165, 114, 0.5)';
              }}
            >
              تحديث الصفحة
            </button>

            <button
              type="button"
              onClick={this.handleHome}
              style={{
                padding: '0.875rem 2rem',
                borderRadius: '999px',
                background: 'rgba(253, 251, 247, 0.05)',
                color: '#FDFBF7',
                fontWeight: 600,
                fontSize: '0.95rem',
                border: '1px solid rgba(253, 251, 247, 0.15)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                transition: 'background 0.2s ease, border-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(253, 251, 247, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(253, 251, 247, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(253, 251, 247, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(253, 251, 247, 0.15)';
              }}
            >
              الصفحة الرئيسية
            </button>
          </div>

          {/* مرجع الواقعة */}
          <div
            style={{
              marginTop: '2.5rem',
              fontSize: '11px',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.15em',
              color: 'rgba(197, 165, 114, 0.55)',
            }}
          >
            مرجع الواقعة: {incidentRef}
          </div>

          {/* تفاصيل تقنية — وضع التطوير فقط */}
          {import.meta.env.DEV && this.state.error && (
            <details style={{ marginTop: '1.75rem', textAlign: 'right' }}>
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: '12px',
                  userSelect: 'none',
                  color: 'rgba(253, 251, 247, 0.5)',
                }}
              >
                تفاصيل تقنية (وضع التطوير فقط)
              </summary>
              <pre
                style={{
                  marginTop: '0.75rem',
                  fontSize: '10px',
                  padding: '1rem',
                  borderRadius: '10px',
                  overflow: 'auto',
                  maxHeight: '12rem',
                  lineHeight: 1.7,
                  textAlign: 'left',
                  background: 'rgba(0, 0, 0, 0.35)',
                  color: '#ff8a8a',
                  border: '1px solid rgba(197, 165, 114, 0.15)',
                  direction: 'ltr',
                }}
              >
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>

        {/* تذييل الهوية */}
        <div
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: '12px',
            letterSpacing: '0.2em',
            color: 'rgba(197, 165, 114, 0.5)',
            zIndex: 1,
          }}
        >
          الرائد لإدارة المحاماة
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
