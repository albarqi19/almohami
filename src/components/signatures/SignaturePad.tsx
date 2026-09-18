import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';

interface Props {
  /** يُستدعى بصورة PNG (data URL) بعد كل ضربة، وبـnull عند المسح. */
  onChange: (dataUrl: string | null) => void;
  height?: number;
  disabled?: boolean;
}

/**
 * لوحة رسم التوقيع — canvas بأحداث المؤشّر (فأرة/لمس/قلم) بلا مكتبة خارجية.
 * تُخرج PNG بخلفية شفافة، وتحترم كثافة الشاشة كي لا يظهر الخط مكسّراً.
 */
export default function SignaturePad({ onChange, height = 180, disabled = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const width = canvas.clientWidth || 400;
    // إعادة الضبط تمسح المحتوى — تُستدعى عند التركيب وتغيير الحجم فقط.
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0A192F';
    setEmpty(true);
    onChange(null);
  }, [height, onChange]);

  useEffect(() => {
    setup();
    const onResize = () => setup();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const ctx = e.currentTarget.getContext('2d');
    const p = point(e);
    if (!ctx || !last.current) return;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (empty) setEmpty(false);
  };

  const end = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* لا شيء */ }
    const canvas = canvasRef.current;
    if (canvas && !empty) onChange(canvas.toDataURL('image/png'));
    else if (canvas) {
      // ضربة واحدة قصيرة قد لا تغيّر `empty` قبل الإفلات.
      const url = canvas.toDataURL('image/png');
      setEmpty(false);
      onChange(url);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setEmpty(true);
    onChange(null);
  };

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height,
          display: 'block',
          touchAction: 'none',
          borderRadius: 8,
          border: '1px dashed var(--quiet-gray-300, #cbd5e1)',
          background: '#fff',
          cursor: disabled ? 'not-allowed' : 'crosshair',
        }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
        aria-label="لوحة رسم التوقيع"
      />
      {empty && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: 'var(--quiet-gray-400, #9ca3af)', fontSize: 13 }}>
          ارسم توقيعك هنا بالإصبع أو الفأرة
        </div>
      )}
      <button
        type="button"
        onClick={clear}
        disabled={disabled || empty}
        style={{ position: 'absolute', top: 8, left: 8, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--quiet-gray-200, #e5e7eb)', background: '#fff', fontSize: 12, cursor: 'pointer', opacity: empty ? 0.5 : 1 }}
      >
        <Eraser size={13} /> مسح
      </button>
    </div>
  );
}
