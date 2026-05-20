import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

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

    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #0A192F 0%, #142840 50%, #0A192F 100%)',
          fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        }}
      >
        {/* Decorative gold rays - very subtle */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] opacity-[0.04]"
            style={{
              background:
                'radial-gradient(circle, #C5A572 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-[400px] h-[400px] opacity-[0.03]"
            style={{
              background:
                'radial-gradient(circle, #C5A572 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Subtle pattern - legal seal motif */}
        <div className="absolute top-8 right-8 text-[120px] opacity-[0.03] pointer-events-none select-none">
          ⚖
        </div>
        <div className="absolute bottom-8 left-8 text-[80px] opacity-[0.03] pointer-events-none select-none">
          ⚜
        </div>

        <div className="relative w-full max-w-xl">
          {/* Main card */}
          <div
            className="relative rounded-2xl p-10 lg:p-14 text-center"
            style={{
              background: 'rgba(253, 251, 247, 0.98)',
              boxShadow:
                '0 30px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(197, 165, 114, 0.2)',
            }}
          >
            {/* Top accent line - gold */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-32 rounded-b-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent, #C5A572, transparent)',
              }}
            />

            {/* Crest / emblem */}
            <div className="mb-8 flex justify-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(135deg, #0A192F 0%, #1a3652 100%)',
                  boxShadow:
                    '0 8px 24px rgba(10, 25, 47, 0.3), inset 0 0 0 2px #C5A572',
                }}
              >
                <span className="text-3xl" style={{ color: '#C5A572' }}>
                  ⚖
                </span>
              </div>
            </div>

            {/* Eyebrow label */}
            <div
              className="text-xs uppercase tracking-[0.3em] mb-4 font-semibold"
              style={{ color: '#C5A572' }}
            >
              إشعار من النظام
            </div>

            {/* Title */}
            <h1
              className="text-3xl lg:text-4xl font-bold mb-4 leading-tight"
              style={{ color: '#0A192F' }}
            >
              تعذّر إتمام العملية
            </h1>

            {/* Description */}
            <p
              className="text-base leading-relaxed mb-2 max-w-md mx-auto"
              style={{ color: '#5a5a5a' }}
            >
              نواجه حالياً اضطراباً مؤقتاً في النظام. تم تسجيل الواقعة وإحالتها إلى
              الفريق التقني.
            </p>
            <p className="text-sm" style={{ color: '#8a8a8a' }}>
              يُرجى تحديث الصفحة، أو العودة لاحقاً.
            </p>

            {/* Divider */}
            <div className="my-8 flex items-center justify-center gap-3">
              <div
                className="h-px w-16"
                style={{ background: 'rgba(197, 165, 114, 0.3)' }}
              />
              <span className="text-xs" style={{ color: '#C5A572' }}>
                ⚜
              </span>
              <div
                className="h-px w-16"
                style={{ background: 'rgba(197, 165, 114, 0.3)' }}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-8 py-3 rounded-lg font-semibold transition-all hover:translate-y-[-1px]"
                style={{
                  background:
                    'linear-gradient(135deg, #0A192F 0%, #142840 100%)',
                  color: '#FDFBF7',
                  boxShadow: '0 4px 14px rgba(10, 25, 47, 0.3)',
                }}
              >
                تحديث الصفحة
              </button>

              <button
                onClick={this.handleHome}
                className="px-8 py-3 rounded-lg font-semibold transition-all border-2"
                style={{
                  borderColor: 'rgba(10, 25, 47, 0.15)',
                  color: '#0A192F',
                  background: 'transparent',
                }}
              >
                الصفحة الرئيسية
              </button>
            </div>

            {/* Error ID / Timestamp (subtle) */}
            <div
              className="mt-10 pt-6 border-t text-[11px] tabular-nums tracking-wider"
              style={{
                borderColor: 'rgba(197, 165, 114, 0.15)',
                color: '#a8a8a8',
              }}
            >
              مرجع الواقعة: {new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}
            </div>

            {/* Dev-only error details */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary
                  className="cursor-pointer text-xs select-none hover:underline"
                  style={{ color: '#8a8a8a' }}
                >
                  تفاصيل تقنية (وضع التطوير فقط)
                </summary>
                <pre
                  className="mt-3 text-[10px] p-4 rounded-lg overflow-auto max-h-48 leading-relaxed text-left"
                  style={{
                    background: '#0A192F',
                    color: '#ff8a8a',
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

          {/* Footer brand */}
          <div
            className="text-center mt-6 text-xs tracking-wider"
            style={{ color: 'rgba(197, 165, 114, 0.6)' }}
          >
            الرائد لإدارة المحاماة
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
