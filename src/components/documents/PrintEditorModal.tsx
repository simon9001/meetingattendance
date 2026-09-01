import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  X, Printer, Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, FileDown,
  Upload, ChevronDown, Loader2, FileText, Plus, Undo, Redo,
  Layout, Eye, Layers, ZoomIn, ZoomOut, Image as ImageIcon,
  Heading1, PanelBottom, Sparkles, Trash2, Lock, Unlock,
} from 'lucide-react';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, ImageRun, AlignmentType, WidthType, VerticalAlign,
  Header, Footer, PageOrientation, BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';
// @ts-ignore — mammoth ships browser remaps via package.json browser field
import mammoth from 'mammoth';
import { parseMeetingFormConfig, getDynamicRegisterColumns, aggregateMultiDayAttendees, formatAttendanceDate, resolveDepartmentDisplay } from '../../types/formConfig';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StaffAttendee {
  attendance_id: string;
  full_name: string;
  designation: string;
  departments?: { name: string };
  submitted_at: string;
  signature_data: string;
}
interface VisitorAttendee {
  attendance_id: string;
  full_name: string;
  organization: string;
  position_title?: string;
  purpose: string;
  submitted_at: string;
  signature_data: string;
}
interface MeetingData {
  meeting_id: string;
  title: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  venue?: string;
  meeting_type: string;
  attendance_open_time: string;
  attendance_close_time: string;
  departments?: { name: string };
  profiles?: { email: string };
}
interface PrintEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: MeetingData;
  staff: StaffAttendee[];
  visitors: VisitorAttendee[];
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
    borderColor: danger ? '#fca5a5' : active ? '#5645d4' : '#d1d5db',
    background: danger ? '#fef2f2' : active ? '#f2effc' : '#fff',
    color: danger ? '#dc2626' : active ? '#4534b3' : '#374151',
    cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400, transition: 'all .12s', whiteSpace: 'nowrap',
    height: 28,
  }}>{children}</button>
);

// ─── Insert Data Dropdown ─────────────────────────────────────────────────────
const InsertDataDropdown = ({ meeting, staff, visitors }: {
  meeting: MeetingData; staff: StaffAttendee[]; visitors: VisitorAttendee[];
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const insert = (html: string) => {
    setOpen(false);
    const canvas = document.getElementById('print-doc-canvas');
    if (!canvas) return;
    canvas.focus();
    document.execCommand('insertHTML', false, html);
  };

  const items = [
    { label: 'Meeting Title', html: `<strong>${meeting.title}</strong>` },
    { label: 'Meeting Date', html: meeting.meeting_date },
    { label: 'Time (Start–End)', html: `${meeting.start_time} – ${meeting.end_time}` },
    { label: 'Venue', html: meeting.venue || 'Virtual / N/A' },
    { label: 'Department', html: resolveDepartmentDisplay(meeting, 'KeNHA') },
    { label: 'Organizer', html: meeting.profiles?.email || '' },
    { label: 'Staff Count', html: `<strong>${staff.length}</strong>` },
    { label: 'Visitor Count', html: `<strong>${visitors.length}</strong>` },
    { label: 'Signature Box', html: `<div style="border-bottom:1px solid #000; width:150px; height:30px; margin:5px 0;"></div>` },
  ];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <ToolbarBtn onClick={() => setOpen(o => !o)} title="Insert field at cursor" active={open}>
        <Plus size={13} /> Insert Field <ChevronDown size={11} />
      </ToolbarBtn>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 999,
          background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,.15)', minWidth: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#9ca3af' }}>
            Click to insert at cursor
          </div>
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => insert(item.html)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 12px', border: 'none', background: 'transparent',
                fontSize: 12, color: '#374151', cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const PrintEditorModal: React.FC<PrintEditorModalProps> = ({
  isOpen, onClose, meeting, staff, visitors,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const printStyleRef = useRef<HTMLStyleElement | null>(null);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [templateMode, setTemplateMode] = useState(false);
  
  // Word Editor States
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'layout' | 'view' | 'picture'>('home');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [marginSize, setMarginSize] = useState<'normal' | 'narrow' | 'wide'>('normal');

  // ── Image Selection & Word-Style Resizing State ──
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [imgOverlay, setImgOverlay] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ startX: number; startY: number; origW: number; origH: number; ratio: number } | null>(null);
  const [lockAspect, setLockAspect] = useState<boolean>(true);

  // ── Print CSS injected dynamically based on orientation ──
  useEffect(() => {
    if (!isOpen) return;
    const style = document.createElement('style');
    style.id = 'print-editor-dynamic-style';
    style.innerHTML = `
      @media print {
        @page {
          size: A4 ${orientation};
          margin: 8mm 10mm;
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
        .word-guide-tag,
        .word-guide-line {
          display: none !important;
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
  }, [isOpen, orientation]);

  // ── Attendee Scope State (all / staff / visitors) ──
  const [attendeeFilter, setAttendeeFilter] = useState<'all' | 'staff' | 'visitors'>('all');

  // ── Helper to calculate signed attendance dates ──
  const getAttendanceDates = useCallback(() => {
    const formConfig = parseMeetingFormConfig(meeting);
    if (formConfig.isMultiDay && formConfig.sessionDates && formConfig.sessionDates.length > 0) {
      return formConfig.sessionDates.map(d => formatAttendanceDate(d));
    }

    const targetAttendees = attendeeFilter === 'staff' ? staff : attendeeFilter === 'visitors' ? visitors : [...staff, ...visitors];
    const dateSet = new Set<string>();
    
    for (const a of targetAttendees) {
      if (a.submitted_at) {
        const formatted = formatAttendanceDate(a.submitted_at);
        if (formatted) dateSet.add(formatted);
      }
    }

    // Fallback to meeting date if no signed dates found
    if (dateSet.size === 0 && meeting?.meeting_date) {
      const formatted = formatAttendanceDate(meeting.meeting_date);
      if (formatted) dateSet.add(formatted);
    }

    if (dateSet.size === 0) {
      dateSet.add(formatAttendanceDate(new Date().toISOString()));
    }

    return Array.from(dateSet);
  }, [meeting, staff, visitors, attendeeFilter]);

  // ── Build default KeNHA Attendance Register (Matching official KeNHA/DG/F01 document) ──
  const buildDefaultContent = useCallback((): string => {
    const dates = getAttendanceDates();
    const isMultiDay = dates.length > 1;
    const formConfig = parseMeetingFormConfig(meeting);
    const dynamicCols = getDynamicRegisterColumns(formConfig, attendeeFilter);

    const allAttendeesRaw = attendeeFilter === 'staff' ? staff : attendeeFilter === 'visitors' ? visitors : [...staff, ...visitors];
    const allAttendees = isMultiDay ? aggregateMultiDayAttendees(allAttendeesRaw, dates) : allAttendeesRaw;
    const totalRowsNeeded = Math.max(12, allAttendees.length);

    // Deterministic column widths so the table always fits the page width
    const totalColWeight = dynamicCols.reduce((sum, c) => sum + c.widthPercent, 0) || 1;
    const dynamicColsPool = isMultiDay ? 60 : 73;
    const dynamicColWidths = dynamicCols.map(c => Math.round((c.widthPercent / totalColWeight) * dynamicColsPool));
    const signatureBlockWidth = isMultiDay ? 35 : 11;
    const perDateWidth = isMultiDay ? Math.max(5, Math.floor(signatureBlockWidth / Math.max(dates.length, 1))) : 0;
    const registerTitle = attendeeFilter === 'staff'
      ? `STAFF ATTENDANCE REGISTER ${resolveDepartmentDisplay(meeting, '') ? `– ${resolveDepartmentDisplay(meeting, '').toUpperCase()}` : ''}`
      : attendeeFilter === 'visitors'
      ? 'VISITORS ATTENDANCE REGISTER'
      : `ATTENDANCE REGISTER ${resolveDepartmentDisplay(meeting, '') ? `– ${resolveDepartmentDisplay(meeting, '').toUpperCase()}` : ''}`;

    // Format single attendee submitted date
    const getAttendeeDateStr = (attendee: any) => {
      if (!attendee?.submitted_at) return dates[0] || '';
      return formatAttendanceDate(attendee.submitted_at) || dates[0] || '';
    };

    // Render table rows
    const rowsHtml = Array.from({ length: totalRowsNeeded }).map((_, index) => {
      const attendee = allAttendees[index];
      const rowNum = index + 1;

      const sigImg = attendee?.signature_data
        ? `<img src="${attendee.signature_data}" style="height:18px; max-width:${isMultiDay ? '45px' : '60px'}; object-fit:contain; display:block; margin:0 auto;" />`
        : '';
      const signedDateStr = attendee ? getAttendeeDateStr(attendee) : '';

      if (!isMultiDay) {
        // Single Day Layout: S/NO | [DYNAMIC COLUMNS] | DATE SIGNED | SIGNATURE
        const cellsHtml = dynamicCols.map((col, idx) => {
          const val = attendee ? col.getValue(attendee) : '';
          const isName = col.key === 'name';
          return `<td contenteditable="true" style="border:1px solid #000; padding:2px 6px; font-size:10.5px; font-weight:${isName && val ? '600' : '400'}; color:#000; width:${dynamicColWidths[idx]}%; word-wrap:break-word;">${val}</td>`;
        }).join('');

        return `
          <tr style="height:22px;">
            <td contenteditable="true" style="border:1px solid #000; padding:2px; text-align:center; font-weight:600; font-size:10.5px; width:5%;">${rowNum}.</td>
            ${cellsHtml}
            <td contenteditable="true" style="border:1px solid #000; padding:2px; text-align:center; font-size:10px; color:#000; width:11%;">${signedDateStr}</td>
            <td contenteditable="true" style="border:1px solid #000; padding:1px; text-align:center; width:11%;">${sigImg}</td>
          </tr>
        `;
      }

      // Multi-Day Layout
      const cellsHtml = dynamicCols.map((col, idx) => {
        const val = attendee ? col.getValue(attendee) : '';
        const isName = col.key === 'name';
        return `<td contenteditable="true" style="border:1px solid #000; padding:2px 4px; font-size:9.5px; font-weight:${isName && val ? '600' : '400'}; color:#000; width:${dynamicColWidths[idx]}%; word-wrap:break-word;">${val}</td>`;
      }).join('');

      return `
        <tr style="height:21px;">
          <td contenteditable="true" style="border:1px solid #000; padding:2px; text-align:center; font-weight:600; font-size:9.5px; width:5%;">${rowNum}.</td>
          ${cellsHtml}
          ${dates.map(d => {
            const sig = (attendee as any)?.signaturesByDate?.[d] || (dates.length === 1 ? attendee?.signature_data : undefined);
            const sigItem = sig
              ? `<img src="${sig}" style="height:17px; max-width:38px; object-fit:contain; display:block; margin:0 auto;" />`
              : '';
            return `<td contenteditable="true" style="border:1px solid #000; padding:1px; text-align:center; width:${perDateWidth}%;">${sigItem}</td>`;
          }).join('')}
        </tr>
      `;
    }).join('');

    return `
<div class="kenha-page-wrapper" style="position:relative; font-family:'Times New Roman', Times, serif; font-size:11px; color:#000; background:#fff; min-height:${orientation === 'landscape' ? '180mm' : '265mm'}; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">

  <!-- ==================== EDITABLE HEADER REGION (WORD STYLE) ==================== -->
  <header contenteditable="true" style="margin-bottom:4px; border:1px transparent solid; outline:none; transition:border .2s;" title="Header Region - Click to edit or replace">
    <!-- Document Reference Code Top Right -->
    <div style="text-align:right; font-size:12px; font-weight:800; color:#000000; font-family:'Times New Roman', Times, serif; margin-bottom:2px; letter-spacing:0.3px;">
      KeNHA/DG/F01
    </div>

    <!-- Full-Width Stretched KeNHA Header Banner Image -->
    <div style="width:100%; margin-bottom:2px; overflow:hidden;">
      <img src="/kenha_header_banner.png" alt="Kenya National Highways Authority Header" style="width:100%; height:auto; max-height:58px; object-fit:fill; display:block;" />
    </div>
  </header>

  <!-- ==================== BODY CONTENT ==================== -->
  <main style="flex:1; display:flex; flex-direction:column;">
    <!-- Title Section -->
    <div style="text-align:center; margin:6px 0 8px;">
      <div contenteditable="true" style="font-size:14px; font-weight:800; text-transform:uppercase; color:#000; line-height:1.25; letter-spacing:0.2px;">
        ${meeting?.title || 'MEETING & TRAINING ATTENDANCE REGISTER'}
      </div>
      <div contenteditable="true" style="font-size:12px; font-weight:800; text-transform:uppercase; color:#000; margin-top:2px; letter-spacing:0.3px;">
        ${registerTitle}
      </div>
    </div>

    <!-- Attendance Register Table with Dynamic Configured Columns -->
    <table id="main-attendance-table" class="main-attendance-table" border="1" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; font-size:10.5px; table-layout:fixed; border:1.5px solid #000; margin-bottom:6px; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important;">
      <thead>
        ${!isMultiDay ? `
          <tr style="background:#ffffff; text-align:left; font-weight:700; color:#000; height:24px;">
            <th contenteditable="true" style="border:1px solid #000; padding:3px; text-align:center; width:5%; word-wrap:break-word;">S/NO</th>
            ${dynamicCols.map((col, idx) => `
              <th contenteditable="true" style="border:1px solid #000; padding:3px 6px; width:${dynamicColWidths[idx]}%; word-wrap:break-word;">${col.header}</th>
            `).join('')}
            <th contenteditable="true" style="border:1px solid #000; padding:3px; text-align:center; width:11%; word-wrap:break-word;">DATE SIGNED</th>
            <th contenteditable="true" style="border:1px solid #000; padding:3px; text-align:center; width:11%; word-wrap:break-word;">SIGNATURE</th>
          </tr>
        ` : `
          <tr style="background:#ffffff; text-align:left; font-weight:700; color:#000; height:20px;">
            <th rowspan="2" contenteditable="true" style="border:1px solid #000; padding:3px; text-align:center; width:5%; word-wrap:break-word;">S/NO</th>
            ${dynamicCols.map((col, idx) => `
              <th rowspan="2" contenteditable="true" style="border:1px solid #000; padding:3px 4px; width:${dynamicColWidths[idx]}%; word-wrap:break-word;">${col.header}</th>
            `).join('')}
            <th colspan="${dates.length}" contenteditable="true" style="border:1px solid #000; padding:2px; text-align:center; width:${signatureBlockWidth}%; word-wrap:break-word;">SIGNATURE</th>
          </tr>
          <tr style="background:#ffffff; text-align:center; font-weight:700; color:#000; height:18px;">
            ${dates.map(d => {
              return `<th contenteditable="true" style="border:1px solid #000; padding:2px 1px; width:${perDateWidth}%; font-size:8.5px; word-wrap:break-word; white-space:nowrap;">${d}</th>`;
            }).join('')}
          </tr>
        `}
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </main>

  <!-- ==================== EDITABLE FOOTER REGION (PINNED TO LOWEST PART) ==================== -->
  <footer contenteditable="true" style="margin-top:auto; padding-top:4px; border:1px transparent solid; outline:none; transition:border .2s; width:100%;" title="Footer Region - Click any text or section to edit directly like in Microsoft Word">
    <!-- Top Double Accent Line (High Contrast Black + Gold) -->
    <div style="border-top:2px solid #1f2937; width:100%; margin-bottom:1px;"></div>
    <div style="border-top:1.5px solid #EAB308; width:100%; margin-bottom:3px;"></div>

    <!-- Vision & Mission (Crisp, Sleek High-Contrast Text) -->
    <div style="text-align:center; font-size:7.5px; color:#1e293b; line-height:1.25; font-family:Arial, sans-serif;">
      <div><strong style="color:#0f172a; font-weight:800;">Vision:</strong> A quality National Trunk Road Network to all for prosperity</div>
      <div style="margin-top:1px;"><strong style="color:#0f172a; font-weight:800;">Mission:</strong> To develop and manage resilient, safe, and adequate National Trunk Roads for sustainable development through innovation and optimal utilization of resources</div>
    </div>

    <!-- Core Values Segmented Matrix -->
    <div id="footer-core-values" style="margin:2px auto; display:flex; justify-content:center;">
      <table class="footer-values-table" style="border-collapse:collapse; font-size:7.5px; text-align:center; color:#1e293b; background:#ffffff; border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1;">
        <tbody>
          <tr>
            <td style="padding:1px 8px; font-weight:800; color:#0f172a; border-right:1px solid #cbd5e1;">Core Values:</td>
            <td style="padding:1px 8px; font-weight:600; border-right:1px solid #cbd5e1;">Accountability</td>
            <td style="padding:1px 8px; font-weight:600; border-right:1px solid #cbd5e1;">Sustainability</td>
            <td style="padding:1px 8px; font-weight:600; border-right:1px solid #cbd5e1;">Innovation</td>
            <td style="padding:1px 8px; font-weight:600;">Teamwork</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Social Media Bar (Strictly Single Line, Non-Wrapping) -->
    <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin-top:2px; font-size:6.8px; font-weight:600; color:#1e293b; font-family:Arial, sans-serif; white-space:nowrap; overflow:hidden;">
      <span style="display:inline-flex; align-items:center; gap:2px;"><strong style="font-weight:900; font-size:7.5px;">𝕏</strong> @KeNHAKenya</span>
      <span style="display:inline-flex; align-items:center; gap:2px;"><span style="background:#1877F2; color:#fff; font-size:6.5px; font-weight:900; padding:0 2px; border-radius:2px;">f</span> Kenya National Highways Authority</span>
      <span style="display:inline-flex; align-items:center; gap:2px;"><span style="color:#FF0000; font-size:7px;">▶</span> Kenya National Highways Authority</span>
      <span style="display:inline-flex; align-items:center; gap:2px;"><span style="background:#0A66C2; color:#fff; font-size:6.5px; font-weight:900; padding:0 2px; border-radius:2px;">in</span> Kenya National Highways Authority</span>
      <span style="display:inline-flex; align-items:center; gap:2px;"><span style="background:linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color:#fff; font-size:6.5px; font-weight:900; padding:0 2px; border-radius:2px;">📷</span> kenha_kenya</span>
      <span style="display:inline-flex; align-items:center; gap:2px;"><strong style="font-weight:900; font-size:7.5px;">🎵</strong> @kenhaofficial</span>
    </div>

    <!-- Tapered Yellow ISO 9001:2015 Ribbon Badge -->
    <div style="display:flex; justify-content:center; margin-top:2px;">
      <div style="background:#FEE75C; color:#000000; padding:1px 24px; font-size:7.5px; font-weight:800; letter-spacing:0.5px; border:1px solid #E6B800; clip-path:polygon(3% 0%, 97% 0%, 100% 50%, 97% 100%, 3% 100%, 0% 50%); display:inline-block;">
        ISO 9001 : 2015 Certified
      </div>
    </div>
  </footer>

</div>
`;
  }, [meeting, staff, visitors, getAttendanceDates, orientation]);

  // ── Inject placeholders into uploaded template ──────────────────────────────────
  const injectMeetingData = useCallback((html: string): string => {
    const dept = resolveDepartmentDisplay(meeting, 'KeNHA Department');
    const organizer = meeting.profiles?.email || '';
    const replacements: [RegExp, string][] = [
      [/\{\{?\s*meeting_?title\s*\}?\}/gi, `<strong>${meeting.title}</strong>`],
      [/\{\{?\s*title\s*\}?\}/gi, `<strong>${meeting.title}</strong>`],
      [/\{\{?\s*date\s*\}?\}/gi, meeting.meeting_date],
      [/\{\{?\s*venue\s*\}?\}/gi, meeting.venue || 'Virtual / N/A'],
      [/\{\{?\s*department\s*\}?\}/gi, dept],
      [/\{\{?\s*organizer\s*\}?\}/gi, organizer],
    ];
    let result = html;
    for (const [pattern, value] of replacements) {
      result = result.replace(pattern, value);
    }
    return result;
  }, [meeting]);

  // ── Load initial content ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setTemplateMode(false);
    if (canvasRef.current) {
      canvasRef.current.innerHTML = buildDefaultContent();
    }
  }, [isOpen, buildDefaultContent]);

  // ── Update overlay position when selectedImg changes or on scroll/resize ──
  const updateOverlayPos = useCallback(() => {
    if (!selectedImg || !canvasRef.current) {
      setImgOverlay(null);
      return;
    }
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const imgRect = selectedImg.getBoundingClientRect();
    const scale = zoomLevel / 100;

    // Position relative to canvas
    const left = (imgRect.left - canvasRect.left) / scale;
    const top = (imgRect.top - canvasRect.top) / scale;
    const width = imgRect.width / scale;
    const height = imgRect.height / scale;

    setImgOverlay({ top, left, width, height });
  }, [selectedImg, zoomLevel]);

  // ── Attach canvas image click listener ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleCanvasClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.stopPropagation();
        setSelectedImg(target as HTMLImageElement);
        setActiveTab('picture');
      } else if (!target.closest('#image-resize-overlay') && !target.closest('#image-toolbar')) {
        setSelectedImg(null);
      }
    };

    canvas.addEventListener('click', handleCanvasClick);
    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, []);

  useEffect(() => {
    updateOverlayPos();
  }, [selectedImg, zoomLevel, updateOverlayPos]);

  // ── Drag Resizing Logic (Microsoft Word 8 Handles) ──
  const startResize = (handle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImg) return;

    const origW = selectedImg.clientWidth || selectedImg.offsetWidth;
    const origH = selectedImg.clientHeight || selectedImg.offsetHeight;
    const ratio = origW / (origH || 1);

    setActiveHandle(handle);
    setDragState({
      startX: e.clientX,
      startY: e.clientY,
      origW,
      origH,
      ratio,
    });
  };

  useEffect(() => {
    if (!activeHandle || !dragState || !selectedImg) return;

    const handleMouseMove = (e: MouseEvent) => {
      const scale = zoomLevel / 100;
      const deltaX = (e.clientX - dragState.startX) / scale;
      const deltaY = (e.clientY - dragState.startY) / scale;

      let newW = dragState.origW;
      let newH = dragState.origH;

      switch (activeHandle) {
        case 'se':
          newW = Math.max(30, dragState.origW + deltaX);
          newH = lockAspect ? newW / dragState.ratio : Math.max(20, dragState.origH + deltaY);
          break;
        case 'sw':
          newW = Math.max(30, dragState.origW - deltaX);
          newH = lockAspect ? newW / dragState.ratio : Math.max(20, dragState.origH + deltaY);
          break;
        case 'ne':
          newW = Math.max(30, dragState.origW + deltaX);
          newH = lockAspect ? newW / dragState.ratio : Math.max(20, dragState.origH - deltaY);
          break;
        case 'nw':
          newW = Math.max(30, dragState.origW - deltaX);
          newH = lockAspect ? newW / dragState.ratio : Math.max(20, dragState.origH - deltaY);
          break;
        case 'e':
          newW = Math.max(30, dragState.origW + deltaX);
          break;
        case 'w':
          newW = Math.max(30, dragState.origW - deltaX);
          break;
        case 's':
          newH = Math.max(20, dragState.origH + deltaY);
          break;
        case 'n':
          newH = Math.max(20, dragState.origH - deltaY);
          break;
      }

      selectedImg.style.width = `${Math.round(newW)}px`;
      selectedImg.style.height = `${Math.round(newH)}px`;
      selectedImg.setAttribute('width', String(Math.round(newW)));
      selectedImg.setAttribute('height', String(Math.round(newH)));
      updateOverlayPos();
    };

    const handleMouseUp = () => {
      setActiveHandle(null);
      setDragState(null);
      updateOverlayPos();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeHandle, dragState, selectedImg, lockAspect, zoomLevel, updateOverlayPos]);

  // ── Image Quick Actions ──
  const setImgPresetSize = (widthPx: number) => {
    if (!selectedImg) return;
    const ratio = (selectedImg.naturalWidth || selectedImg.clientWidth) / (selectedImg.naturalHeight || selectedImg.clientHeight || 1);
    const heightPx = Math.round(widthPx / ratio);
    selectedImg.style.width = `${widthPx}px`;
    selectedImg.style.height = `${heightPx}px`;
    selectedImg.setAttribute('width', String(widthPx));
    selectedImg.setAttribute('height', String(heightPx));
    updateOverlayPos();
  };

  const setImgFullWidth = () => {
    if (!selectedImg) return;
    selectedImg.style.width = '100%';
    selectedImg.style.height = 'auto';
    selectedImg.removeAttribute('height');
    updateOverlayPos();
  };

  const setImgAlign = (align: 'left' | 'center' | 'right') => {
    if (!selectedImg) return;
    if (align === 'center') {
      selectedImg.style.display = 'block';
      selectedImg.style.margin = '8px auto';
    } else if (align === 'left') {
      selectedImg.style.display = 'block';
      selectedImg.style.margin = '8px auto 8px 0';
    } else {
      selectedImg.style.display = 'block';
      selectedImg.style.margin = '8px 0 8px auto';
    }
    updateOverlayPos();
  };

  const deleteSelectedImg = () => {
    if (!selectedImg) return;
    selectedImg.remove();
    setSelectedImg(null);
    setImgOverlay(null);
  };

  // ── Handle image upload and insert ──────────────────────────────────────────
  const handleImageInsert = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      const canvas = document.getElementById('print-doc-canvas');
      if (!canvas) return;
      canvas.focus();
      const imgId = `user-img-${Date.now()}`;
      const imgHtml = `<img id="${imgId}" src="${dataUrl}" style="max-width:240px; height:auto; display:inline-block; margin:6px; vertical-align:middle; cursor:pointer;" alt="Inserted image" />`;
      document.execCommand('insertHTML', false, imgHtml);

      // Auto-select the newly added image so user can immediately resize
      setTimeout(() => {
        const newImg = document.getElementById(imgId) as HTMLImageElement;
        if (newImg) {
          setSelectedImg(newImg);
          setActiveTab('picture');
        }
      }, 100);
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
  }, []);

  // ── Focus & Edit Header Handler ─────────────────────────────────────────────
  const handleFocusHeader = useCallback(() => {
    const canvas = document.getElementById('print-doc-canvas');
    const header = canvas?.querySelector('header');
    if (header) {
      (header as HTMLElement).focus();
      header.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (header as HTMLElement).style.border = '2px dashed #5645d4';
      setTimeout(() => { (header as HTMLElement).style.border = '1px transparent solid'; }, 2500);
    }
  }, []);

  // ── Focus & Edit Footer Handler ─────────────────────────────────────────────
  const handleFocusFooter = useCallback(() => {
    const canvas = document.getElementById('print-doc-canvas');
    const footer = canvas?.querySelector('footer');
    if (footer) {
      (footer as HTMLElement).focus();
      footer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (footer as HTMLElement).style.border = '2px dashed #5645d4';
      setTimeout(() => { (footer as HTMLElement).style.border = '1px transparent solid'; }, 2500);
    }
  }, []);

  // ── Handle template upload ──────────────────────────────────────────────────
  const handleTemplateUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Please select a .docx Word file.');
      return;
    }
    setIsTemplateLoading(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const arrayBuffer = ev.target?.result as ArrayBuffer;
        if (!arrayBuffer) throw new Error('Could not read file contents.');

        const result = await mammoth.convertToHtml({ arrayBuffer });
        const injected = injectMeetingData(result.value || '');

        if (canvasRef.current) {
          canvasRef.current.innerHTML = injected || '<p>(Template produced no content.)</p>';
          setTemplateMode(true);
        }
      } catch (err: any) {
        alert(`Failed to load template: ${err?.message || 'Unknown error'}`);
      } finally {
        setIsTemplateLoading(false);
        if (templateInputRef.current) templateInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }, [injectMeetingData]);

  // ── Reset to default layout ──────────────────────────────────────────────────
  const resetToDefault = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.innerHTML = buildDefaultContent();
    }
    setTemplateMode(false);
  }, [buildDefaultContent]);

  // ── Print using isolated print frame ─────────────────────────────────────────
  const handlePrint = useCallback(() => {
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

    // Check if rawContent already contains the wrapper to avoid duplicate nesting
    const hasWrapper = rawContent.includes('kenha-page-wrapper');
    const bodyHtml = hasWrapper
      ? rawContent
      : `<div class="kenha-page-wrapper" style="position:relative; font-family:'Times New Roman', Times, serif; font-size:11px; color:#000; background:#fff; min-height:${orientation === 'landscape' ? '180mm' : '265mm'}; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">${rawContent}</div>`;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${meeting?.title || 'KeNHA Official Attendance Register'}</title>
        <style>
          @page {
            size: A4 ${orientation};
            margin: 6mm 8mm;
          }
          * {
            box-sizing: border-box !important;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Times New Roman', Times, serif;
            font-size: 11px;
            line-height: 1.2;
          }
          .kenha-page-wrapper {
            width: 100%;
            min-height: ${orientation === 'landscape' ? '180mm' : '265mm'};
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            font-family: 'Times New Roman', Times, serif;
          }
          header {
            margin-bottom: 4px;
            width: 100%;
            flex-shrink: 0;
          }
          header img {
            width: 100%;
            height: auto;
            max-height: 58px;
            object-fit: fill;
            display: block;
          }
          main {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
          }
          table, .main-attendance-table, #main-attendance-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            border: 1.5px solid #000000 !important;
            margin-bottom: 6px;
            table-layout: fixed;
          }
          table th, table td, .main-attendance-table th, .main-attendance-table td {
            border: 1px solid #000000 !important;
            word-wrap: break-word;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .footer-values-table {
            border-collapse: collapse !important;
            border: none !important;
          }
          .footer-values-table td {
            border: none !important;
            border-right: 1px solid #cbd5e1 !important;
          }
          .footer-values-table td:last-child {
            border-right: none !important;
          }
          footer {
            margin-top: auto !important;
            padding-top: 4px;
            width: 100%;
            flex-shrink: 0;
          }
          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            max-width: 100%;
          }
          .word-guide-tag, .word-guide-line, .no-print, #image-resize-overlay, #image-toolbar {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${bodyHtml}
      </body>
      </html>
    `);
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
  }, [buildDefaultContent, orientation, meeting]);

  // ── Helper to convert base64 data URL to Uint8Array ──
  const base64ToUint8 = (base64Str?: string): Uint8Array | null => {
    if (!base64Str || typeof base64Str !== 'string') return null;
    try {
      const clean = base64Str.replace(/^data:image\/\w+;base64,/, '').trim();
      if (!clean) return null;
      const binary = atob(clean);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch {
      return null;
    }
  };

  // ── Download Word (.docx) — Faithful mirror of the live canvas in landscape ──
  const handleDownloadWord = useCallback(async () => {
    const dates = getAttendanceDates();
    const isMultiDay = dates.length > 1;

    // 1. Build signature map from props & live canvas
    const sigMap: Record<string, string> = {};
    [...staff, ...visitors].forEach((a: any) => {
      if (a.full_name && a.signature_data) {
        sigMap[a.full_name.trim().toLowerCase()] = a.signature_data;
      }
    });

    const canvas = document.getElementById('print-doc-canvas');

    // 2. Extract Document Reference & Title text from live canvas
    let docRef = 'KeNHA/DG/F01';
    let docTitle = meeting?.title || 'MEETING & TRAINING ATTENDANCE REGISTER';
    let docSubtitle = attendeeFilter === 'staff'
      ? `STAFF ATTENDANCE REGISTER ${resolveDepartmentDisplay(meeting, '') ? `– ${resolveDepartmentDisplay(meeting, '').toUpperCase()}` : ''}`
      : attendeeFilter === 'visitors'
      ? 'VISITORS ATTENDANCE REGISTER'
      : `ATTENDANCE REGISTER ${resolveDepartmentDisplay(meeting, '') ? `– ${resolveDepartmentDisplay(meeting, '').toUpperCase()}` : ''}`;

    if (canvas) {
      const headerDiv = canvas.querySelector('header div');
      if (headerDiv?.textContent?.trim()) {
        docRef = headerDiv.textContent.trim();
      }

      const titleElements = canvas.querySelectorAll('main > div:first-child div[contenteditable="true"]');
      if (titleElements.length >= 1 && titleElements[0]?.textContent?.trim()) {
        docTitle = titleElements[0].textContent.trim();
      }
      if (titleElements.length >= 2 && titleElements[1]?.textContent?.trim()) {
        docSubtitle = titleElements[1].textContent.trim();
      }
    }

    const formConfig = parseMeetingFormConfig(meeting);
    const dynamicCols = getDynamicRegisterColumns(formConfig, attendeeFilter);
    const totalColWeight = dynamicCols.reduce((sum, c) => sum + c.widthPercent, 0) || 1;
    const dynamicColsPool = isMultiDay ? 60 : 73;
    const dynamicColWidths = dynamicCols.map(c => Math.round((c.widthPercent / totalColWeight) * dynamicColsPool));
    const signatureBlockWidth = isMultiDay ? 35 : 11;
    const perDateWidth = isMultiDay ? Math.max(5, Math.floor(signatureBlockWidth / Math.max(dates.length, 1))) : 0;

    // Target ONLY the main attendance table (avoiding footer core values table)
    const mainTable = canvas ? (canvas.querySelector('#main-attendance-table') || canvas.querySelector('main table') || canvas.querySelector('table')) : null;

    // 3. Extract Column Headers from live canvas table
    const customHeaders: string[] = [];
    if (mainTable) {
      const thList = mainTable.querySelectorAll('thead tr:first-child th');
      if (thList.length > 0) {
        thList.forEach((th, idx) => {
          if (idx >= 1 && idx <= dynamicCols.length) {
            customHeaders.push(th.textContent?.trim() || dynamicCols[idx - 1]?.header || '');
          }
        });
      }
    }

    // 4. Extract Table Rows & Cells from live canvas main table
    interface LiveAttendeeRow {
      sno: string;
      cells: string[];
      dateSigned?: string;
      signatureData?: string;
      multiDaySignatures?: Record<string, string>;
    }

    const liveRows: LiveAttendeeRow[] = [];

    if (mainTable) {
      const trList = mainTable.querySelectorAll('tbody tr');
      trList.forEach((tr, index) => {
        const cells = tr.querySelectorAll('td');
        if (cells.length > 0) {
          const sno = cells[0]?.textContent?.trim() || `${index + 1}.`;
          const rowCells: string[] = [];
          
          for (let c = 0; c < dynamicCols.length; c++) {
            const cellEl = cells[c + 1];
            rowCells.push(cellEl?.textContent?.trim() || '');
          }

          if (!isMultiDay) {
            const dateCellIdx = dynamicCols.length + 1;
            const sigCellIdx = dynamicCols.length + 2;
            const dateSigned = cells[dateCellIdx]?.textContent?.trim() || '';
            const sigImg = cells[sigCellIdx]?.querySelector('img');
            const signatureData = sigImg?.src?.startsWith('data:image') ? sigImg.src : undefined;

            const hasAnyData = rowCells.some(v => v.length > 0) || Boolean(dateSigned) || Boolean(signatureData);
            if (hasAnyData) {
              liveRows.push({ sno, cells: rowCells, dateSigned, signatureData });
            }
          } else {
            const multiDaySigs: Record<string, string> = {};
            dates.forEach((d, dIdx) => {
              const sigCellIdx = dynamicCols.length + 1 + dIdx;
              const sigImg = cells[sigCellIdx]?.querySelector('img');
              if (sigImg?.src?.startsWith('data:image')) {
                multiDaySigs[d] = sigImg.src;
              }
            });

            const hasAnyData = rowCells.some(v => v.length > 0) || Object.keys(multiDaySigs).length > 0;
            if (hasAnyData) {
              liveRows.push({ sno, cells: rowCells, multiDaySignatures: multiDaySigs });
            }
          }
        }
      });
    }

    const allAttendeesRaw = attendeeFilter === 'staff' ? staff : attendeeFilter === 'visitors' ? visitors : [...staff, ...visitors];
    const allAttendeesList = isMultiDay ? aggregateMultiDayAttendees(allAttendeesRaw, dates) : allAttendeesRaw;
    const totalRowsCount = Math.max(12, Math.max(liveRows.length, allAttendeesList.length));

    // Format single attendee submitted date helper
    const getAttendeeDateStr = (attendee: any) => {
      if (!attendee?.submitted_at) return dates[0] || '';
      return formatAttendanceDate(attendee.submitted_at) || dates[0] || '';
    };

    // Table Border Styling for Microsoft Word
    const singleBorder = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
    const innerBorder = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
    const tableBorders = {
      top: singleBorder,
      bottom: singleBorder,
      left: singleBorder,
      right: singleBorder,
      insideHorizontal: innerBorder,
      insideVertical: innerBorder,
    };

    let tableHeaderRows: TableRow[];

    if (!isMultiDay) {
      tableHeaderRows = [
        new TableRow({
          children: [
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: tableBorders, shading: { fill: 'FFFFFF' }, children: [new Paragraph({ children: [new TextRun({ text: 'S/NO', bold: true, color: '000000', size: 20 })], alignment: AlignmentType.CENTER })] }),
            ...dynamicCols.map((col, idx) =>
              new TableCell({
                width: { size: dynamicColWidths[idx], type: WidthType.PERCENTAGE },
                borders: tableBorders,
                shading: { fill: 'FFFFFF' },
                children: [new Paragraph({ children: [new TextRun({ text: customHeaders[idx] || col.header, bold: true, color: '000000', size: 20 })] })],
              })
            ),
            new TableCell({ width: { size: 11, type: WidthType.PERCENTAGE }, borders: tableBorders, shading: { fill: 'FFFFFF' }, children: [new Paragraph({ children: [new TextRun({ text: 'DATE SIGNED', bold: true, color: '000000', size: 20 })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 11, type: WidthType.PERCENTAGE }, borders: tableBorders, shading: { fill: 'FFFFFF' }, children: [new Paragraph({ children: [new TextRun({ text: 'SIGNATURE', bold: true, color: '000000', size: 20 })], alignment: AlignmentType.CENTER })] }),
          ],
        }),
      ];
    } else {
      tableHeaderRows = [
        new TableRow({
          children: [
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: tableBorders, shading: { fill: 'FFFFFF' }, children: [new Paragraph({ children: [new TextRun({ text: 'S/NO', bold: true, color: '000000', size: 18 })], alignment: AlignmentType.CENTER })], rowSpan: 2, verticalAlign: VerticalAlign.CENTER }),
            ...dynamicCols.map((col, idx) =>
              new TableCell({
                width: { size: dynamicColWidths[idx], type: WidthType.PERCENTAGE },
                borders: tableBorders,
                shading: { fill: 'FFFFFF' },
                children: [new Paragraph({ children: [new TextRun({ text: customHeaders[idx] || col.header, bold: true, color: '000000', size: 18 })] })],
                rowSpan: 2,
                verticalAlign: VerticalAlign.CENTER,
              })
            ),
            new TableCell({ width: { size: signatureBlockWidth, type: WidthType.PERCENTAGE }, borders: tableBorders, shading: { fill: 'FFFFFF' }, children: [new Paragraph({ children: [new TextRun({ text: 'SIGNATURE', bold: true, color: '000000', size: 18 })], alignment: AlignmentType.CENTER })], columnSpan: dates.length }),
          ],
        }),
        new TableRow({
          children: dates.map(d => {
            return new TableCell({
              width: { size: perDateWidth, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              shading: { fill: 'FFFFFF' },
              children: [new Paragraph({ children: [new TextRun({ text: d, bold: true, size: 14, color: '000000' })], alignment: AlignmentType.CENTER })],
            });
          }),
        }),
      ];
    }

    const bodyRows: TableRow[] = Array.from({ length: totalRowsCount }).map((_, index) => {
      const liveRow = liveRows[index];
      const attendee = allAttendeesList[index];
      const sno = liveRow?.sno || `${index + 1}.`;
      const isEven = index % 2 === 1;
      const cellShading = isEven ? { fill: 'F8FAFC' } : undefined;

      if (!isMultiDay) {
        const valName = liveRow?.cells?.[0] !== undefined ? liveRow.cells[0] : (attendee?.full_name || '');
        const dateSigned = liveRow?.dateSigned !== undefined ? liveRow.dateSigned : (attendee ? getAttendeeDateStr(attendee) : '');
        const rawSig = liveRow?.signatureData || attendee?.signature_data || sigMap[valName.trim().toLowerCase()];
        const sigBytes = base64ToUint8(rawSig);

        return new TableRow({
          children: [
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: tableBorders, shading: cellShading, children: [new Paragraph({ text: sno, alignment: AlignmentType.CENTER })] }),
            ...dynamicCols.map((col, idx) => {
              const val = liveRow?.cells?.[idx] !== undefined ? liveRow.cells[idx] : (attendee ? col.getValue(attendee) : '');
              const isName = col.key === 'name';
              return new TableCell({
                width: { size: dynamicColWidths[idx], type: WidthType.PERCENTAGE },
                borders: tableBorders,
                shading: cellShading,
                children: [new Paragraph({ children: [new TextRun({ text: val, bold: isName && Boolean(val), size: 18 })] })],
              });
            }),
            new TableCell({ width: { size: 11, type: WidthType.PERCENTAGE }, borders: tableBorders, shading: cellShading, children: [new Paragraph({ children: [new TextRun({ text: dateSigned, size: 18 })], alignment: AlignmentType.CENTER })] }),
            new TableCell({
              width: { size: 11, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              shading: cellShading,
              children: [
                sigBytes
                  ? new Paragraph({
                      children: [
                        new ImageRun({
                          data: sigBytes,
                          transformation: { width: 45, height: 16 },
                          type: 'png',
                        } as any),
                      ],
                      alignment: AlignmentType.CENTER,
                    })
                  : new Paragraph({
                      children: [new TextRun({ text: (dateSigned || valName) ? 'Signed' : '', italics: true, size: 18 })],
                      alignment: AlignmentType.CENTER,
                    }),
              ],
            }),
          ],
        });
      }

      const valName = liveRow?.cells?.[0] !== undefined ? liveRow.cells[0] : (attendee?.full_name || '');

      return new TableRow({
        children: [
          new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: tableBorders, shading: cellShading, children: [new Paragraph({ text: sno, alignment: AlignmentType.CENTER })] }),
          ...dynamicCols.map((col, idx) => {
            const val = liveRow?.cells?.[idx] !== undefined ? liveRow.cells[idx] : (attendee ? col.getValue(attendee) : '');
            const isName = col.key === 'name';
            return new TableCell({
              width: { size: dynamicColWidths[idx], type: WidthType.PERCENTAGE },
              borders: tableBorders,
              shading: cellShading,
              children: [new Paragraph({ children: [new TextRun({ text: val, bold: isName && Boolean(val), size: 16 })] })],
            });
          }),
          ...dates.map(d => {
            const rawSigDate = liveRow?.multiDaySignatures?.[d] || (attendee as any)?.signaturesByDate?.[d] || (dates.length === 1 ? (attendee?.signature_data || sigMap[valName.trim().toLowerCase()]) : undefined);
            const dateSigBytes = base64ToUint8(rawSigDate);
            return new TableCell({
              width: { size: perDateWidth, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              shading: cellShading,
              children: [
                dateSigBytes
                  ? new Paragraph({
                      children: [
                        new ImageRun({
                          data: dateSigBytes,
                          transformation: { width: 35, height: 14 },
                          type: 'png',
                        } as any),
                      ],
                      alignment: AlignmentType.CENTER,
                    })
                  : new Paragraph({
                      children: [new TextRun({ text: rawSigDate ? 'Signed' : '', italics: true, size: 14 })],
                      alignment: AlignmentType.CENTER,
                    }),
              ],
            });
          }),
        ],
      });
    });

    // Fetch KeNHA banner image and footer image buffer for Word document
    let bannerUint8: Uint8Array | null = null;
    let footerUint8: Uint8Array | null = null;
    try {
      const [bannerRes, footerRes] = await Promise.all([
        fetch('/kenha_header_banner.png'),
        fetch('/kenha_footer_banner.png'),
      ]);
      if (bannerRes.ok) {
        bannerUint8 = new Uint8Array(await bannerRes.arrayBuffer());
      }
      if (footerRes.ok) {
        footerUint8 = new Uint8Array(await footerRes.arrayBuffer());
      }
    } catch {}

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Times New Roman', size: 20, color: '000000' },
          },
        },
      },
      sections: [{
        properties: {
          page: {
            size: orientation === 'landscape' ? {
              orientation: PageOrientation.LANDSCAPE,
              width: 16838,
              height: 11906,
            } : {
              orientation: PageOrientation.PORTRAIT,
              width: 11906,
              height: 16838,
            },
            margin: { top: 576, right: 576, bottom: 576, left: 576, header: 288, footer: 288 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({ children: [new TextRun({ text: docRef, bold: true, size: 20 })], alignment: AlignmentType.RIGHT }),
              bannerUint8
                ? new Paragraph({
                    children: [
                      new ImageRun({
                        data: bannerUint8,
                        transformation: { width: orientation === 'landscape' ? 780 : 540, height: 60 },
                        type: 'png',
                      } as any),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 10 },
                  })
                : new Paragraph({ text: '' }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              footerUint8
                ? new Paragraph({
                    children: [
                      new ImageRun({
                        data: footerUint8,
                        transformation: { width: orientation === 'landscape' ? 780 : 540, height: 45 },
                        type: 'png',
                      } as any),
                    ],
                    alignment: AlignmentType.CENTER,
                  })
                : new Paragraph({
                    children: [
                      new TextRun({ text: 'ISO 9001 : 2015 Certified', bold: true, size: 14 }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
            ],
          }),
        },
        children: [
          new Paragraph({ children: [new TextRun({ text: docTitle, bold: true, size: 26, color: '000000' })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: docSubtitle, bold: true, size: 22, color: '000000' })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: [...tableHeaderRows, ...bodyRows],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const scopeTag = attendeeFilter === 'staff' ? '_staff' : attendeeFilter === 'visitors' ? '_visitors' : '_all';
    const safeName = (docTitle || 'meeting').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    saveAs(blob, `${safeName}_attendance${scopeTag}_${meeting?.meeting_date || 'doc'}.docx`);
  }, [meeting, staff, visitors, getAttendanceDates, attendeeFilter, orientation]);

  // ── Keyboard shortcuts (Ctrl+P for Print, Ctrl+S for Save Word) ─────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleDownloadWord();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrint, handleDownloadWord]);

  if (!isOpen) return null;

  const marginPaddingMap = {
    normal: orientation === 'landscape' ? '12mm 18mm' : '18mm 22mm',
    narrow: orientation === 'landscape' ? '8mm 10mm' : '10mm 12mm',
    wide: orientation === 'landscape' ? '18mm 24mm' : '25mm 30mm',
  };

  return (
    <div id="print-editor-root" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#2c3e50', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>

      {/* Hidden file input for custom .docx upload */}
      <input
        ref={templateInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={handleTemplateUpload}
      />

      {/* Hidden file input for image insertion */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageInsert}
      />

      {/* ========================================================================= */}
      {/* ── MS WORD HEADER BAR ────────────────────────────────────────────────── */}
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
                background: attendeeFilter === 'all' ? '#5645d4' : 'transparent',
                color: attendeeFilter === 'all' ? '#ffffff' : '#cbd5e1',
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
                background: attendeeFilter === 'staff' ? '#5645d4' : 'transparent',
                color: attendeeFilter === 'staff' ? '#ffffff' : '#cbd5e1',
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
                background: attendeeFilter === 'visitors' ? '#5645d4' : 'transparent',
                color: attendeeFilter === 'visitors' ? '#ffffff' : '#cbd5e1',
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
            <button type="button" onClick={handleDownloadWord} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 4, border: 'none', background: '#5645d4', color: '#fff',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'background .15s',
            }} title="Export as Microsoft Word .docx">
              <FileDown size={14} /> Save .docx
            </button>

            <button type="button" onClick={handlePrint} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 4, border: 'none', background: '#d97706', color: '#fff',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'background .15s',
            }} title="Print or save as PDF">
              <Printer size={14} /> Print / PDF
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

        {/* Word Ribbon Tab Bar */}
        <div style={{ display: 'flex', gap: 2, padding: '0 12px', background: '#1e3a8a', borderBottom: '1px solid #4534b3' }}>
          {[
            { id: 'home', label: 'Home' },
            { id: 'insert', label: 'Insert' },
            { id: 'layout', label: 'Page Layout' },
            { id: 'view', label: 'View' },
            ...(selectedImg ? [{ id: 'picture', label: '🖼️ Picture Format' }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '6px 16px', border: 'none', background: activeTab === tab.id ? '#ffffff' : 'transparent',
                color: activeTab === tab.id ? '#1e3a8a' : '#e2e8f0',
                fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 12,
                borderRadius: '4px 4px 0 0', cursor: 'pointer', transition: 'all .1s',
                boxShadow: activeTab === tab.id ? '0 -2px 6px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Word Ribbon Tools Panel */}
        <div style={{ padding: '6px 14px', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#334155', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minHeight: 44 }}>
          
          {activeTab === 'home' && (
            <>
              {/* Undo / Redo */}
              <div style={{ display: 'flex', gap: 2 }}>
                <ToolbarBtn onClick={() => execCmd('undo')} title="Undo (Ctrl+Z)"><Undo size={13} /></ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('redo')} title="Redo (Ctrl+Y)"><Redo size={13} /></ToolbarBtn>
              </div>

              <div style={{ width: 1, height: 22, background: '#cbd5e1' }} />

              {/* Font Family & Size */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <select onChange={e => execCmd('fontName', e.target.value)} defaultValue="Times New Roman"
                  style={{ height: 26, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, padding: '0 6px', background: '#fff', color: '#334151' }}>
                  <option value="Arial">Arial</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Segoe UI">Segoe UI</option>
                  <option value="Georgia">Georgia</option>
                </select>

                <select onChange={e => execCmd('fontSize', e.target.value)} defaultValue="4"
                  style={{ height: 26, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, padding: '0 6px', background: '#fff', color: '#334151' }}>
                  <option value="1">8pt</option>
                  <option value="2">10pt</option>
                  <option value="3">12pt</option>
                  <option value="4">14pt</option>
                  <option value="5">18pt</option>
                  <option value="6">24pt</option>
                </select>
              </div>

              <div style={{ width: 1, height: 22, background: '#cbd5e1' }} />

              {/* Formatting */}
              <div style={{ display: 'flex', gap: 2 }}>
                <ToolbarBtn onClick={() => execCmd('bold')} title="Bold (Ctrl+B)"><Bold size={13} /></ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('italic')} title="Italic (Ctrl+I)"><Italic size={13} /></ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('underline')} title="Underline (Ctrl+U)"><Underline size={13} /></ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('strikeThrough')} title="Strikethrough"><Strikethrough size={13} /></ToolbarBtn>
              </div>

              <div style={{ width: 1, height: 22, background: '#cbd5e1' }} />

              {/* Text / Highlight Color */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <label title="Text Color" style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', fontSize: 11 }}>
                  <Type size={13} />
                  <input type="color" defaultValue="#000000" onChange={e => execCmd('foreColor', e.target.value)}
                    style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                </label>
                <label title="Highlight Color" style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', fontSize: 11 }}>
                  <span style={{ background: '#fef08a', padding: '0 4px', borderRadius: 2, fontWeight: 700 }}>H</span>
                  <input type="color" defaultValue="#ffffff" onChange={e => execCmd('backColor', e.target.value)}
                    style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                </label>
              </div>

              <div style={{ width: 1, height: 22, background: '#cbd5e1' }} />

              {/* Alignment */}
              <div style={{ display: 'flex', gap: 2 }}>
                <ToolbarBtn onClick={() => execCmd('justifyLeft')} title="Align Left"><AlignLeft size={13} /></ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('justifyCenter')} title="Align Center"><AlignCenter size={13} /></ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('justifyRight')} title="Align Right"><AlignRight size={13} /></ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('justifyFull')} title="Justify"><AlignJustify size={13} /></ToolbarBtn>
              </div>

              <div style={{ width: 1, height: 22, background: '#cbd5e1' }} />

              {/* Image & Header / Footer Actions */}
              <div style={{ display: 'flex', gap: 4 }}>
                <ToolbarBtn onClick={() => imageInputRef.current?.click()} title="Insert picture from device">
                  <ImageIcon size={13} /> Insert Image
                </ToolbarBtn>

                <ToolbarBtn onClick={handleFocusHeader} title="Edit Header text & logo">
                  <Heading1 size={13} /> Edit Header
                </ToolbarBtn>

                <ToolbarBtn onClick={handleFocusFooter} title="Edit Footer & Vision/Mission">
                  <PanelBottom size={13} /> Edit Footer
                </ToolbarBtn>
              </div>
            </>
          )}

          {activeTab === 'insert' && (
            <>
              <InsertDataDropdown meeting={meeting} staff={staff} visitors={visitors} />
              
              <div style={{ width: 1, height: 22, background: '#cbd5e1' }} />

              <ToolbarBtn onClick={() => imageInputRef.current?.click()} title="Insert picture from device">
                <ImageIcon size={13} /> Insert Picture / Stamp
              </ToolbarBtn>

              <ToolbarBtn onClick={handleFocusHeader} title="Edit Header region">
                <Heading1 size={13} /> Add / Edit Header
              </ToolbarBtn>

              <ToolbarBtn onClick={handleFocusFooter} title="Edit Footer region">
                <PanelBottom size={13} /> Add / Edit Footer
              </ToolbarBtn>

              <div style={{ width: 1, height: 22, background: '#cbd5e1' }} />

              <ToolbarBtn onClick={() => templateInputRef.current?.click()} title="Upload custom .docx template" active={templateMode}>
                {isTemplateLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={13} />}
                {templateMode ? 'Change Template' : 'Upload .docx Template'}
              </ToolbarBtn>

              {templateMode && (
                <ToolbarBtn onClick={resetToDefault} title="Reset to default KeNHA layout" danger>
                  <FileText size={13} /> Reset Layout
                </ToolbarBtn>
              )}
            </>
          )}

          {activeTab === 'layout' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <Layout size={13} style={{ color: '#475569' }} /> Orientation:
                <select
                  value={orientation}
                  onChange={e => setOrientation(e.target.value as any)}
                  style={{ height: 26, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, padding: '0 6px', background: '#fff', fontWeight: 600, color: '#1e3a8a' }}
                >
                  <option value="landscape">Landscape (Recommended / Default)</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>

              <div style={{ width: 1, height: 22, background: '#cbd5e1' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <Layout size={13} style={{ color: '#475569' }} /> Margins:
                <select value={marginSize} onChange={e => setMarginSize(e.target.value as any)}
                  style={{ height: 26, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, padding: '0 6px', background: '#fff' }}>
                  <option value="normal">Normal ({orientation === 'landscape' ? '18mm' : '22mm'})</option>
                  <option value="narrow">Narrow ({orientation === 'landscape' ? '10mm' : '12mm'})</option>
                  <option value="wide">Wide ({orientation === 'landscape' ? '24mm' : '30mm'})</option>
                </select>
              </div>

              <div style={{ width: 1, height: 22, background: '#cbd5e1' }} />

              <ToolbarBtn onClick={handleFocusHeader} title="Focus Header">
                <Heading1 size={13} /> Header Options
              </ToolbarBtn>

              <ToolbarBtn onClick={handleFocusFooter} title="Focus Footer">
                <PanelBottom size={13} /> Footer Options
              </ToolbarBtn>
            </>
          )}

          {activeTab === 'view' && (
            <>
              <ToolbarBtn onClick={() => setShowRulers(r => !r)} active={showRulers} title="Toggle Rulers">
                <Layers size={13} /> Rulers
              </ToolbarBtn>

              <ToolbarBtn onClick={() => setShowGuides(g => !g)} active={showGuides} title="Toggle Header/Footer Guides">
                <Eye size={13} /> Header/Footer Guides
              </ToolbarBtn>

              <div style={{ width: 1, height: 22, background: '#cbd5e1' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <ZoomOut size={13} style={{ cursor: 'pointer' }} onClick={() => setZoomLevel(z => Math.max(50, z - 10))} />
                <span>{zoomLevel}%</span>
                <ZoomIn size={13} style={{ cursor: 'pointer' }} onClick={() => setZoomLevel(z => Math.min(150, z + 10))} />
              </div>
            </>
          )}

          {activeTab === 'picture' && selectedImg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1e3a8a' }}>Picture Tools:</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" onClick={() => setImgPresetSize(120)} style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4, background: '#fff', fontSize: 11, cursor: 'pointer' }}>Small (120px)</button>
                <button type="button" onClick={() => setImgPresetSize(240)} style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4, background: '#fff', fontSize: 11, cursor: 'pointer' }}>Medium (240px)</button>
                <button type="button" onClick={() => setImgPresetSize(400)} style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4, background: '#fff', fontSize: 11, cursor: 'pointer' }}>Large (400px)</button>
                <button type="button" onClick={setImgFullWidth} style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4, background: '#fff', fontSize: 11, cursor: 'pointer' }}>Full Width (100%)</button>
              </div>
              <div style={{ width: 1, height: 22, background: '#cbd5e1' }} />
              <div style={{ display: 'flex', gap: 2 }}>
                <ToolbarBtn onClick={() => setImgAlign('left')} title="Align Left"><AlignLeft size={13} /></ToolbarBtn>
                <ToolbarBtn onClick={() => setImgAlign('center')} title="Align Center"><AlignCenter size={13} /></ToolbarBtn>
                <ToolbarBtn onClick={() => setImgAlign('right')} title="Align Right"><AlignRight size={13} /></ToolbarBtn>
              </div>
              <div style={{ width: 1, height: 22, background: '#cbd5e1' }} />
              <button type="button" onClick={() => setLockAspect(!lockAspect)} style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4, background: lockAspect ? '#f2effc' : '#fff', color: lockAspect ? '#5645d4' : '#334155', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                {lockAspect ? <Lock size={12} /> : <Unlock size={12} />} {lockAspect ? 'Aspect Ratio Locked' : 'Aspect Ratio Free'}
              </button>
              <button type="button" onClick={deleteSelectedImg} style={{ padding: '4px 8px', border: '1px solid #fca5a5', borderRadius: 4, background: '#fef2f2', color: '#dc2626', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Trash2 size={12} /> Delete Picture
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── MS WORD PAGE CANVAS & RULER ───────────────────────────────────────── */}
      {/* ========================================================================= */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#334155', position: 'relative' }}>
        
        {/* Top Horizontal Ruler */}
        {showRulers && (
          <div id="print-editor-ruler-top" style={{
            width: orientation === 'landscape' ? '297mm' : '210mm', height: 20, background: '#e2e8f0', borderBottom: '1px solid #cbd5e1',
            marginTop: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            padding: '0 20px', fontSize: 9, color: '#64748b', userSelect: 'none', position: 'sticky', top: 0, zIndex: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          }}>
            {Array.from({ length: orientation === 'landscape' ? 14 : 9 }).map((_, i) => (
              <span key={i} style={{ borderLeft: '1px solid #94a3b8', height: i % 2 === 0 ? 10 : 5, paddingLeft: 2 }}>{i * 2}</span>
            ))}
          </div>
        )}

        {/* Main Paper Container */}
        <div style={{ padding: '24px 16px 48px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          {isTemplateLoading && (
            <div style={{
              position: 'fixed', top: 90, zIndex: 100,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', background: '#fff', borderRadius: 30,
              boxShadow: '0 4px 20px rgba(0,0,0,.25)',
              fontSize: 13, color: '#374151', fontWeight: 500,
            }}>
              <Loader2 size={18} style={{ color: '#5645d4', animation: 'spin 1s linear infinite' }} />
              Merging meeting data into template...
            </div>
          )}

          <div style={{ position: 'relative' }}>
            {/* MS Word Header Guide Tag */}
            {showGuides && (
              <div className="word-guide-tag" onClick={handleFocusHeader} style={{
                position: 'absolute', top: 12, left: -95, background: '#f2effc', color: '#4534b3',
                border: '1px dashed #3b82f6', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', zIndex: 5, display: 'flex', alignItems: 'center', gap: 4,
              }} title="Click to edit Header">
                <Sparkles size={11} /> Header
              </div>
            )}

            {/* MS Word Footer Guide Tag */}
            {showGuides && (
              <div className="word-guide-tag" onClick={handleFocusFooter} style={{
                position: 'absolute', bottom: 20, left: -90, background: '#f2effc', color: '#4534b3',
                border: '1px dashed #3b82f6', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', zIndex: 5, display: 'flex', alignItems: 'center', gap: 4,
              }} title="Click to edit Footer">
                <Sparkles size={11} /> Footer
              </div>
            )}

            {/* A4 Paper Canvas */}
            <div
              id="print-doc-canvas"
              ref={canvasRef}
              contentEditable
              suppressContentEditableWarning
              spellCheck
              style={{
                width: orientation === 'landscape' ? '297mm' : '210mm',
                minHeight: orientation === 'landscape' ? '210mm' : '297mm',
                background: '#ffffff',
                boxShadow: '0 12px 36px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05)',
                borderRadius: 2,
                padding: marginPaddingMap[marginSize],
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease, padding 0.15s ease',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {/* Microsoft Word Interactive Image Resizing Overlay */}
            {selectedImg && imgOverlay && (
              <div
                id="image-resize-overlay"
                style={{
                  position: 'absolute',
                  top: imgOverlay.top,
                  left: imgOverlay.left,
                  width: imgOverlay.width,
                  height: imgOverlay.height,
                  border: '2px solid #5645d4',
                  pointerEvents: 'none',
                  zIndex: 30,
                  boxSizing: 'border-box',
                }}
              >
                {/* Floating Word Picture Toolbar */}
                <div
                  id="image-toolbar"
                  style={{
                    position: 'absolute',
                    top: -42,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#0f172a',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    pointerEvents: 'auto',
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    zIndex: 35,
                    border: '1px solid #334155',
                  }}
                >
                  <span style={{ color: '#93c5fd', fontSize: 10, fontWeight: 700 }}>
                    {Math.round(imgOverlay.width)} × {Math.round(imgOverlay.height)}px
                  </span>
                  <div style={{ width: 1, height: 14, background: '#475569' }} />
                  <button type="button" onClick={() => setImgPresetSize(120)} style={{ border: 'none', background: '#1e293b', color: '#f8fafc', padding: '2px 6px', borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>Small</button>
                  <button type="button" onClick={() => setImgPresetSize(240)} style={{ border: 'none', background: '#1e293b', color: '#f8fafc', padding: '2px 6px', borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>Med</button>
                  <button type="button" onClick={() => setImgPresetSize(400)} style={{ border: 'none', background: '#1e293b', color: '#f8fafc', padding: '2px 6px', borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>Large</button>
                  <button type="button" onClick={setImgFullWidth} style={{ border: 'none', background: '#1e293b', color: '#f8fafc', padding: '2px 6px', borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>100%</button>
                  <div style={{ width: 1, height: 14, background: '#475569' }} />
                  <button type="button" onClick={() => setImgAlign('left')} title="Align Left" style={{ border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', padding: 2 }}><AlignLeft size={13} /></button>
                  <button type="button" onClick={() => setImgAlign('center')} title="Align Center" style={{ border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', padding: 2 }}><AlignCenter size={13} /></button>
                  <button type="button" onClick={() => setImgAlign('right')} title="Align Right" style={{ border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', padding: 2 }}><AlignRight size={13} /></button>
                  <div style={{ width: 1, height: 14, background: '#475569' }} />
                  <button type="button" onClick={() => setLockAspect(!lockAspect)} title={lockAspect ? 'Lock Aspect Ratio (Active)' : 'Unlock Aspect Ratio'} style={{ border: 'none', background: lockAspect ? '#5645d4' : '#334155', color: '#fff', padding: '3px 6px', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
                    {lockAspect ? <Lock size={11} /> : <Unlock size={11} />} {lockAspect ? 'Locked' : 'Free'}
                  </button>
                  <button type="button" onClick={deleteSelectedImg} title="Delete Image" style={{ border: 'none', background: '#dc2626', color: '#fff', padding: '3px 6px', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
                    <Trash2 size={11} /> Delete
                  </button>
                </div>

                {/* 8 Resize Dots (Microsoft Word Style) */}
                {[
                  { id: 'nw', top: -5, left: -5, cursor: 'nwse-resize' },
                  { id: 'n', top: -5, left: 'calc(50% - 5px)', cursor: 'ns-resize' },
                  { id: 'ne', top: -5, right: -5, cursor: 'nesw-resize' },
                  { id: 'e', top: 'calc(50% - 5px)', right: -5, cursor: 'ew-resize' },
                  { id: 'se', bottom: -5, right: -5, cursor: 'nwse-resize' },
                  { id: 's', bottom: -5, left: 'calc(50% - 5px)', cursor: 'ns-resize' },
                  { id: 'sw', bottom: -5, left: -5, cursor: 'nesw-resize' },
                  { id: 'w', top: 'calc(50% - 5px)', left: -5, cursor: 'ew-resize' },
                ].map(h => (
                  <div
                    key={h.id}
                    onMouseDown={e => startResize(h.id, e)}
                    style={{
                      position: 'absolute',
                      top: (h as any).top,
                      bottom: (h as any).bottom,
                      left: (h as any).left,
                      right: (h as any).right,
                      width: 10,
                      height: 10,
                      background: '#ffffff',
                      border: '2px solid #5645d4',
                      borderRadius: 2,
                      cursor: h.cursor,
                      pointerEvents: 'auto',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
