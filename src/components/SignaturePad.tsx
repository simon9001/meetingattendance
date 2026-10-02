import React, { useRef, useState, useEffect } from 'react';
import { PenLine, Type, Upload } from 'lucide-react';

interface SignaturePadProps {
  onChange: (signatureDataUrl: string | null) => void;
  className?: string;
}

type Mode = 'draw' | 'type' | 'upload';

const INK = '#1F2937';
const LINE_WIDTH = 2.5;
const SIGNATURE_FONT = '"Dancing Script", "Brush Script MT", "Segoe Script", cursive';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
// Uploaded signatures are scaled down to this box. The register prints them a
// few centimetres wide, so anything larger only bloats the stored record.
const UPLOAD_MAX_W = 600;
const UPLOAD_MAX_H = 200;

// Renders typed initials/name as a handwriting-style PNG.
const renderTypedSignature = async (text: string): Promise<string> => {
  const fontSize = 64;
  const font = `600 ${fontSize}px ${SIGNATURE_FONT}`;
  // Without this the first render can fall back to a system font while the
  // web font is still downloading.
  try { await document.fonts.load(font, text); } catch { /* fall back */ }

  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const width = Math.ceil(measure.measureText(text).width) + 40;
  const height = Math.round(fontSize * 1.6);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  ctx.fillStyle = INK;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 20, height / 2);
  return canvas.toDataURL('image/png');
};

// Scales an uploaded image down and drops its paper background, so a photo of
// a signature on white paper sits cleanly in the register's signature cell.
const processUploadedSignature = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.onload = () => {
        const scale = Math.min(1, UPLOAD_MAX_W / img.width, UPLOAD_MAX_H / img.height);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);

        const pixels = ctx.getImageData(0, 0, w, h);
        const d = pixels.data;
        for (let i = 0; i < d.length; i += 4) {
          const luminance = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (luminance > 200) d[i + 3] = 0;
        }
        ctx.putImageData(pixels, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 6px',
  fontSize: 12.5,
  fontWeight: active ? 700 : 500,
  border: 'none',
  borderBottom: active ? '2px solid #EAB308' : '2px solid transparent',
  background: 'transparent',
  color: active ? 'var(--text-main)' : 'var(--text-muted)',
  cursor: 'pointer',
});

export const SignaturePad: React.FC<SignaturePadProps> = ({ onChange, className = '' }) => {
  const [mode, setMode] = useState<Mode>('draw');

  // ── Draw ──
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasInkRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // ── Type ──
  const [typedText, setTypedText] = useState('');

  // ── Upload ──
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Size the canvas to its box at device resolution. Runs on mount and when the
  // box itself changes size — never in the middle of a stroke, since resizing a
  // canvas wipes it (which is what used to break the start of the first line).
  useEffect(() => {
    if (mode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (!w || !h || (canvas.width === w && canvas.height === h)) return;

      // Copy any ink synchronously so it survives the resize.
      let snapshot: HTMLCanvasElement | null = null;
      if (hasInkRef.current) {
        snapshot = document.createElement('canvas');
        snapshot.width = canvas.width;
        snapshot.height = canvas.height;
        snapshot.getContext('2d')!.drawImage(canvas, 0, 0);
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = LINE_WIDTH;
      ctx.strokeStyle = INK;
      ctx.fillStyle = INK;
      if (snapshot) {
        ctx.drawImage(snapshot, 0, 0, snapshot.width, snapshot.height, 0, 0, rect.width, rect.height);
      }
    };

    setup();
    const observer = new ResizeObserver(() => {
      if (!drawingRef.current) setup();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [mode]);

  const pointFrom = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;

    // A dot where the pen lands, so the line starts exactly where it touched.
    const p = pointFrom(e);
    ctx.beginPath();
    ctx.arc(p.x, p.y, LINE_WIDTH / 2, 0, Math.PI * 2);
    ctx.fill();
    lastPointRef.current = p;
    hasInkRef.current = true;
    setIsEmpty(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    e.preventDefault();

    // Coalesced events carry the points the browser batched between frames;
    // using them keeps fast strokes smooth instead of jagged.
    const native = e.nativeEvent;
    const events = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const points = (events.length ? events : [native]).map(pointFrom);

    for (const p of points) {
      const last = lastPointRef.current ?? p;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastPointRef.current = p;
    }
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (hasInkRef.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    hasInkRef.current = false;
    setIsEmpty(true);
  };

  // Rendering waits on the web font, so a quick typist can have several renders
  // in flight; only the latest keystroke's result is kept.
  const typedRenderRef = useRef(0);
  const handleTypedChange = async (value: string) => {
    setTypedText(value);
    const ticket = ++typedRenderRef.current;
    const text = value.trim();
    const dataUrl = text ? await renderTypedSignature(text) : null;
    if (ticket === typedRenderRef.current) onChange(dataUrl);
  };

  const handleFile = async (file: File | undefined) => {
    setUploadError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file (PNG or JPG).');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('That image is larger than 5 MB. Please choose a smaller one.');
      return;
    }
    try {
      const dataUrl = await processUploadedSignature(file);
      setUploadPreview(dataUrl);
      onChange(dataUrl);
    } catch (err: any) {
      setUploadError(err?.message || 'Could not use that image.');
    }
  };

  const clearAll = () => {
    clearCanvas();
    typedRenderRef.current++;
    setTypedText('');
    setUploadPreview(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onChange(null);
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    clearAll();
    setMode(next);
  };

  return (
    <div className={`signature-pad-container ${className}`}>
      <div className="signature-pad-header">
        <label className="signature-label">Digital Signature</label>
        <button type="button" onClick={clearAll} className="signature-clear-btn">
          Clear
        </button>
      </div>

      <div role="tablist" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: 8 }}>
        <button type="button" role="tab" aria-selected={mode === 'draw'} style={tabStyle(mode === 'draw')} onClick={() => switchMode('draw')}>
          <PenLine size={14} /> Draw
        </button>
        <button type="button" role="tab" aria-selected={mode === 'type'} style={tabStyle(mode === 'type')} onClick={() => switchMode('type')}>
          <Type size={14} /> Type
        </button>
        <button type="button" role="tab" aria-selected={mode === 'upload'} style={tabStyle(mode === 'upload')} onClick={() => switchMode('upload')}>
          <Upload size={14} /> Upload
        </button>
      </div>

      {mode === 'draw' && (
        <div className="signature-canvas-wrapper">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="signature-canvas"
            style={{ touchAction: 'none', display: 'block' }}
          />
          {isEmpty && (
            <div className="signature-placeholder">
              <span>Sign here using finger or mouse</span>
            </div>
          )}
        </div>
      )}

      {mode === 'type' && (
        <div>
          <input
            type="text"
            className="form-input"
            placeholder="Type your initials or name"
            value={typedText}
            maxLength={40}
            onChange={e => handleTypedChange(e.target.value)}
          />
          <div className="signature-canvas-wrapper" style={{ marginTop: 8, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
            {typedText.trim() ? (
              <span style={{ fontFamily: SIGNATURE_FONT, fontWeight: 600, fontSize: 40, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {typedText}
              </span>
            ) : (
              <span style={{ color: '#9CA3AF', fontSize: 13 }}>Your typed signature appears here</span>
            )}
          </div>
        </div>
      )}

      {mode === 'upload' && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            className="signature-canvas-wrapper"
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '100%', height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', padding: 8 }}
          >
            {uploadPreview ? (
              <img src={uploadPreview} alt="Uploaded signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <>
                <Upload size={22} color="#9CA3AF" />
                <span style={{ color: '#6B7280', fontSize: 13 }}>Tap to choose a photo or image of your signature</span>
                <span style={{ color: '#9CA3AF', fontSize: 11 }}>PNG or JPG, up to 5 MB — sign on white paper for best results</span>
              </>
            )}
          </button>
          {uploadError && (
            <div style={{ color: '#DC2626', fontSize: 12, marginTop: 6 }}>{uploadError}</div>
          )}
        </div>
      )}
    </div>
  );
};
