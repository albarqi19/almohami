import { Link, useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

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
      {/* Massive 404 in background */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(280px, 55vw, 720px)',
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '-0.05em',
          background:
            'linear-gradient(180deg, rgba(197, 165, 114, 0.12) 0%, rgba(197, 165, 114, 0.03) 60%, transparent 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontVariantNumeric: 'tabular-nums',
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          zIndex: 0,
        }}
      >
        404
      </div>

      {/* Faint gold orb top-right */}
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

      {/* Faint gold orb bottom-left */}
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

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          maxWidth: '560px',
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: '#C5A572',
            fontWeight: 600,
            marginBottom: '1.5rem',
          }}
        >
          الصفحة غير موجودة
        </div>

        {/* Title */}
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
          المسار الذي تبحث عنه غير متاح
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '1rem',
            lineHeight: 1.7,
            color: 'rgba(253, 251, 247, 0.65)',
            marginBottom: '2.5rem',
            maxWidth: '420px',
            marginInline: 'auto',
          }}
        >
          ربما تم نقل الصفحة، أو أن الرابط الذي اتبعته لم يعد ساري المفعول. تحقق من
          العنوان أو عُد للصفحة الرئيسية.
        </p>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'center',
          }}
        >
          <Link
            to="/"
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
              textDecoration: 'none',
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
            الصفحة الرئيسية
          </Link>

          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: '0.875rem 2rem',
              borderRadius: '999px',
              background: 'rgba(253, 251, 247, 0.05)',
              color: '#FDFBF7',
              fontWeight: 600,
              fontSize: '0.95rem',
              border: '1px solid rgba(253, 251, 247, 0.15)',
              cursor: 'pointer',
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
            العودة للخلف
          </button>
        </div>
      </div>

      {/* Footer brand */}
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
};

export default NotFound;
