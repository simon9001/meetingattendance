import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { X, Printer, FileText, Undo, Redo } from 'lucide-react';
// @ts-ignore — mammoth ships browser remaps via package.json browser field
import mammoth from 'mammoth';
import { useSelector } from 'react-redux';
import { useCorrectAttendanceRecordMutation } from '../../features/apis/apiSlice';
import { selectCurrentToken } from '../../features/slice/authSlice';
import { BASE_URL } from '../../backendcomnnect/domin';
import { printRegisterPdf } from './downloadRegister';
import {
  buildRegisterHtml,
  buildPrintDocument,
  getAttendanceDates,
  getPageMetrics,
  getRowMetrics,
} from './registerDocument';
import type {
  RegisterInput,
  Orientation,
  MarginSize,
  MeetingData,
  StaffAttendee,
  VisitorAttendee,
} from './registerDocument';
interface PrintEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: MeetingData;
  staff: StaffAttendee[];
  visitors: VisitorAttendee[];
  showToast?: (m: string, t?: 'success' | 'error') => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const execCmd = (cmd: string, value?: string) =>
  document.execCommand(cmd, false, value ?? undefined);

// ─── Toolbar Button ────────────────────────────────────────────────────────────
const ToolbarBtn = ({ onClick, title, children, active = false, danger = false }: {
  onClick: () => void; title: string; children: React.ReactNode; active?: boolean; danger?: boolean;
}) => (
  <button type="button" title={title} onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    padding: '4px 8px', borderRadius: 4, border: '1px solid',
    borderColor: danger ? '#fca5a5' : active ? '#facc15' : '#d1d5db',
    background: danger ? '#fef2f2' : active ? '#fef9c3' : '#fff',
    color: danger ? '#dc2626' : active ? '#854d0e' : '#374151',
    cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400, transition: 'all .12s', whiteSpace: 'nowrap',
    height: 28,
  }}>{children}</button>
);


// ─── Main Component ────────────────────────────────────────────────────────────
export const PrintEditorModal: React.FC<PrintEditorModalProps> = ({
  isOpen, onClose, meeting, staff, visitors, showToast,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const printStyleRef = useRef<HTMLStyleElement | null>(null);
  
  // Word Editor States
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [marginSize, setMarginSize] = useState<MarginSize>('normal');

  // Printable page box for the current orientation + margin choice.
  const pageMetrics = useMemo(() => getPageMetrics(orientation, marginSize), [orientation, marginSize]);


  // ── Print CSS injected dynamically based on orientation ──
  useEffect(() => {
    if (!isOpen) return;
    const style = document.createElement('style');
    style.id = 'print-editor-dynamic-style';
    style.innerHTML = `
      @media print {
        /* margin:0 leaves Chrome no gutter for its page title / URL / date. */
        @page {
          size: A4 ${orientation};
          margin: 0;
        }
        html, body {
          background: #ffffff !important;
          color: #000000 !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body * {
          visibility: hidden !important;
        }
        #print-doc-canvas,
        #print-doc-canvas * {
          visibility: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        #print-editor-root {
          position: static !important;
          display: block !important;
          width: 100% !important;
          height: auto !important;
          background: transparent !important;
          overflow: visible !important;
        }
        #print-doc-canvas {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          min-height: unset !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          transform: none !important;
          background: #ffffff !important;
          display: block !important;
        }
        #print-editor-ribbon,
        #print-editor-ruler-top,
        #print-editor-ruler-left,
        .no-print,
        .kenha-page-sep,
        .word-guide-tag,
        .word-guide-line {
          display: none !important;
        }
        /* Each wrapper is exactly one sheet, so the footer lands on the same
           baseline on every page instead of drifting with the table. */
        .kenha-page-wrapper {
          height: ${pageMetrics.printSheetHeightMm}mm !important;
          min-height: ${pageMetrics.printSheetHeightMm}mm !important;
          max-height: ${pageMetrics.printSheetHeightMm}mm !important;
          width: 100% !important;
          padding: ${pageMetrics.margin} !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
          margin: 0 !important;
          border: none !important;
          box-shadow: none !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          break-after: page !important;
          page-break-after: always !important;
        }
        .kenha-page-wrapper:last-of-type {
          break-after: auto !important;
          page-break-after: auto !important;
        }
        .kenha-page-wrapper > header,
        .kenha-page-wrapper > footer {
          flex: 0 0 auto !important;
          width: 100% !important;
        }
        .kenha-page-wrapper > main {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
        }
        /* Scoped to the register: the footer's core-values table must not stretch. */
        .kenha-page-wrapper .register-table-slot {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          display: flex !important;
          overflow: hidden !important;
        }
        .kenha-page-wrapper .main-attendance-table {
          height: 100% !important;
          margin-bottom: 0 !important;
        }
        .kenha-page-wrapper > footer {
          margin-top: auto !important;
        }
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          page-break-inside: auto;
          border: 1.5px solid #000000 !important;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        th, td {
          border: 1px solid #000000 !important;
        }
        img {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(style);
    printStyleRef.current = style;
    return () => {
      if (printStyleRef.current) {
        document.head.removeChild(printStyleRef.current);
        printStyleRef.current = null;
      }
    };
  }, [isOpen, orientation, pageMetrics]);

  // ── Attendee Scope State (all / staff / visitors) ──
  const [attendeeFilter, setAttendeeFilter] = useState<'all' | 'staff' | 'visitors'>('all');


  // The register, the printed page and the downloaded PDF all come from
  // registerDocument.ts — one builder, so they cannot drift apart.
  const registerInput = useMemo<RegisterInput>(() => ({
    meeting, staff, visitors, attendeeFilter, orientation, marginSize,
  }), [meeting, staff, visitors, attendeeFilter, orientation, marginSize]);

  const buildDefaultContent = useCallback(
    () => buildRegisterHtml(registerInput),
    [registerInput],
  );


  // Held in a ref so a geometry change does not re-trigger a full rebuild.
  const buildDefaultContentRef = useRef(buildDefaultContent);
  useEffect(() => {
    buildDefaultContentRef.current = buildDefaultContent;
  });

  // A value-based key, because callers build these arrays inline
  // (`attendanceResponse?.data?.staff || []`), so their identity changes on every
  // parent render — keying the reload on identity would wipe the canvas constantly.
  const registerSignature = useMemo(() => JSON.stringify({
    meeting: meeting?.meeting_id ?? '',
    filter: attendeeFilter,
    staff: staff.map(a => `${a.attendance_id}:${a.submitted_at}`),
    visitors: visitors.map(a => `${a.attendance_id}:${a.submitted_at}`),
  }), [meeting?.meeting_id, staff, visitors, attendeeFilter]);

  // ── Load initial content ──────────────────────────────────────
  // Keyed on the register's data, not on the page geometry: switching
  // orientation or margins must not discard edits or an uploaded template.
  useEffect(() => {
    if (!isOpen) return;
    if (canvasRef.current) {
      canvasRef.current.innerHTML = buildDefaultContentRef.current();
    }
  }, [isOpen, registerSignature]);

  // ── Re-flow the existing sheets when the page geometry changes ─────────────
  // Only the measurements are re-stamped; the markup (and any edits to it) stays.
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wrappers = canvas.querySelectorAll<HTMLElement>('.kenha-page-wrapper');
    if (wrappers.length === 0) return;

    const { sigMm } = getRowMetrics(pageMetrics, getAttendanceDates(registerInput).length > 1);
    const sigHeight = `${sigMm.toFixed(2)}mm`;

    for (const wrapper of wrappers) {
      wrapper.style.minHeight = `${pageMetrics.contentHeightMm}mm`;
      wrapper.querySelectorAll<HTMLImageElement>('main table tbody tr img.kenha-sig').forEach(img => {
        img.style.height = sigHeight;
      });
    }
  }, [isOpen, pageMetrics, registerSignature]);


  // ── Attach canvas image click listener ──















  // ── Persist a corrected cell back to the attendance record ─────────────────
  // Every editable cell carries the record and column it writes to, so a fix
  // made here is saved rather than living only in this modal's DOM.
  const [correctAttendanceRecord] = useCorrectAttendanceRecordMutation();
  const originalCellText = useRef(new WeakMap<HTMLElement, string>());

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const remember = (e: Event) => {
      const cell = (e.target as HTMLElement)?.closest?.('.kenha-correctable') as HTMLElement | null;
      if (cell) originalCellText.current.set(cell, cell.textContent?.trim() ?? '');
    };

    const save = async (e: Event) => {
      const cell = (e.target as HTMLElement)?.closest?.('.kenha-correctable') as HTMLElement | null;
      if (!cell) return;

      const { attendanceId, participantType, field } = cell.dataset;
      if (!attendanceId || !participantType || !field) return;

      const before = originalCellText.current.get(cell);
      const after = cell.textContent?.trim() ?? '';
      if (before === undefined || before === after) return;

      if (!after) {
        cell.textContent = before;
        showToast?.('A register entry cannot be left blank.', 'error');
        return;
      }

      // custom_responses.<key> is a single JSON column, so send the whole object.
      const body: Record<string, unknown> = field.startsWith('custom_responses.')
        ? { custom_responses: { [field.slice('custom_responses.'.length)]: after } }
        : { [field]: after };

      try {
        await correctAttendanceRecord({ participantType, attendanceId, ...body }).unwrap();
        originalCellText.current.set(cell, after);
        showToast?.('Correction saved.', 'success');
      } catch (err: any) {
        cell.textContent = before;
        showToast?.(err?.data?.message || 'Could not save that correction.', 'error');
      }
    };

    canvas.addEventListener('focusin', remember, true);
    canvas.addEventListener('focusout', save, true);
    return () => {
      canvas.removeEventListener('focusin', remember, true);
      canvas.removeEventListener('focusout', save, true);
    };
  }, [isOpen, correctAttendanceRecord, showToast]);



  // ── Print from the rendered PDF ──────────────────────────────────────────────
  // Printing the PDF (not the web page) keeps the browser from adding its own
  // date, title, URL and page number, and from shifting the header and footer
  // with margins of its own. The page print below remains as a fallback.
  const authToken = useSelector(selectCurrentToken);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  const handlePrint = useCallback(async () => {
    if (isPreparingPrint) return;
    const canvas = document.getElementById('print-doc-canvas');
    setIsPreparingPrint(true);
    try {
      await printRegisterPdf(registerInput, {
        token: authToken,
        apiBaseUrl: BASE_URL,
        previewHtml: canvas?.innerHTML,
      });
    } catch (err: any) {
      console.error('PDF print failed, falling back to page print:', err);
      showToast?.('Could not prepare the PDF — printing the page instead. Untick "Headers and footers" in the print dialog.', 'error');
      printPage();
    } finally {
      setIsPreparingPrint(false);
    }
  }, [isPreparingPrint, registerInput, authToken, showToast]);

  // ── Fallback: print the page through an isolated frame ──────────────────────
  const printPage = useCallback(() => {
    const canvas = document.getElementById('print-doc-canvas');
    const rawContent = canvas ? canvas.innerHTML : buildDefaultContent();

    // Clean up old print frame if exists
    const oldIframe = document.getElementById('kenha-print-frame');
    if (oldIframe) {
      oldIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'kenha-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(buildPrintDocument(rawContent, registerInput));
    doc.close();

    // Ensure all images are loaded before invoking print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print frame error:', e);
      }
    }, 250);
  }, [buildDefaultContent, registerInput]);



  // ── Keyboard shortcut (Ctrl+P for Print) ────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrint]);

  if (!isOpen) return null;

  // Canvas padding is the same value the printed sheet uses, so the preview is to scale.

  return (
    <div id="print-editor-root" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#2c3e50', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>

      {/* ========================================================================= */}
      {/* ── ACTION BAR ────────────────────────────────────────────────────────── */}
      {/* ========================================================================= */}
      <div id="print-editor-ribbon" style={{ background: '#1b365d', color: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', flexShrink: 0 }}>
        
        {/* Top Window Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', background: '#0f2442', borderBottom: '1px solid #2d486d', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#2b579a', padding: 4, borderRadius: 4, display: 'flex' }}>
              <FileText size={16} style={{ color: '#fff' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', letterSpacing: 0.2 }}>
              {meeting.title || 'KeNHA Document Editor'} KMTAMS Editor
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              background: orientation === 'landscape' ? '#0e7490' : '#334155',
              color: orientation === 'landscape' ? '#cffafe' : '#cbd5e1',
              padding: '2px 8px',
              borderRadius: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              border: orientation === 'landscape' ? '1px solid #155e75' : '1px solid #475569',
            }}>
              {orientation.toUpperCase()}
            </span>
          </div>

          {/* Attendee Scope Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#0b192c', padding: '2px 4px', borderRadius: 6, border: '1px solid #2d486d', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', padding: '0 6px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Print Scope:</span>
            <button
              type="button"
              onClick={() => setAttendeeFilter('all')}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: attendeeFilter === 'all' ? 700 : 500,
                background: attendeeFilter === 'all' ? '#111827' : 'transparent',
                color: attendeeFilter === 'all' ? '#f9d616' : '#cbd5e1',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all .15s'
              }}
              title="Include both KeNHA Staff and Visitors in the same document"
            >
              👥 Merged (All: {staff.length + visitors.length})
            </button>
            <button
              type="button"
              onClick={() => setAttendeeFilter('staff')}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: attendeeFilter === 'staff' ? 700 : 500,
                background: attendeeFilter === 'staff' ? '#111827' : 'transparent',
                color: attendeeFilter === 'staff' ? '#f9d616' : '#cbd5e1',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all .15s'
              }}
              title="Only print or export KeNHA Staff"
            >
              👔 Staff Only ({staff.length})
            </button>
            <button
              type="button"
              onClick={() => setAttendeeFilter('visitors')}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: attendeeFilter === 'visitors' ? 700 : 500,
                background: attendeeFilter === 'visitors' ? '#111827' : 'transparent',
                color: attendeeFilter === 'visitors' ? '#f9d616' : '#cbd5e1',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all .15s'
              }}
              title="Only print or export Visitors"
            >
              🏷️ Visitors Only ({visitors.length})
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={handlePrint} disabled={isPreparingPrint} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 4, border: 'none', background: '#d97706', color: '#fff',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'background .15s',
            }} title="Print, or choose 'Save as PDF' as the destination — both match this preview exactly">
              <Printer size={14} /> {isPreparingPrint ? 'Preparing…' : 'Print / Save as PDF'}
            </button>

            <button type="button" onClick={onClose} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
              borderRadius: 4, border: '1px solid #475569', background: '#334155', color: '#f8fafc',
              cursor: 'pointer', fontSize: 12, marginLeft: 6,
            }} title="Close Editor">
              <X size={14} /> Close
            </button>
          </div>
        </div>

        {/* Page setup. Everything that formatted text like a word processor is
            gone: this is a register with a fixed statutory layout, and the only
            edit that means anything here is correcting a recorded value. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', background: '#f1f5f9', color: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Page setup</span>

          <select
            value={orientation}
            onChange={e => setOrientation(e.target.value as Orientation)}
            style={{ height: 26, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, padding: '0 6px', background: '#fff', color: '#334155' }}
            title="Sheet orientation"
          >
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </select>

          <select
            value={marginSize}
            onChange={e => setMarginSize(e.target.value as MarginSize)}
            style={{ height: 26, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, padding: '0 6px', background: '#fff', color: '#334155' }}
            title="Page margins"
          >
            <option value="normal">Normal margins</option>
            <option value="narrow">Narrow margins</option>
            <option value="wide">Wide margins</option>
          </select>

          <div style={{ width: 1, height: 22, background: '#cbd5e1' }} />

          <ToolbarBtn onClick={() => execCmd('undo')} title="Undo (Ctrl+Z)"><Undo size={13} /> Undo</ToolbarBtn>
          <ToolbarBtn onClick={() => execCmd('redo')} title="Redo (Ctrl+Y)"><Redo size={13} /> Redo</ToolbarBtn>

          <div style={{ width: 1, height: 22, background: '#cbd5e1' }} />

          <span style={{ fontSize: 11, color: '#475569' }}>
            Click a name, designation or organisation to correct it — changes are saved to the attendance record.
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── REGISTER PREVIEW ──────────────────────────────────────────────────── */}
      {/* ========================================================================= */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#334155', position: 'relative' }}>
        <div style={{ padding: '24px 16px 48px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div
            id="print-doc-canvas"
            ref={canvasRef}
            suppressContentEditableWarning
            spellCheck
            style={{
              width: orientation === 'landscape' ? '297mm' : '210mm',
              minHeight: orientation === 'landscape' ? '210mm' : '297mm',
              background: '#ffffff',
              boxShadow: '0 12px 36px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05)',
              borderRadius: 2,
              padding: pageMetrics.margin,
              transformOrigin: 'top center',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

    </div>
  );
};
