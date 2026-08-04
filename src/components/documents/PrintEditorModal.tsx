import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  X, Printer, Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, FileDown,
  Upload, ChevronDown, Loader2, FileText, Plus, Undo, Redo,
  Layout, Eye, Layers, ZoomIn, ZoomOut, Image as ImageIcon,
  Heading1, PanelBottom, Sparkles
} from 'lucide-react';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, VerticalAlign,
} from 'docx';
import { saveAs } from 'file-saver';
// @ts-ignore — mammoth ships browser remaps via package.json browser field
import mammoth from 'mammoth';

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

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
const SkeletonBlock = ({ w = '100%', h = 16, mb = 8 }: { w?: string; h?: number; mb?: number }) => (
  <div style={{
    width: w, height: h, marginBottom: mb,
    background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
    backgroundSize: '200% 100%',
    borderRadius: 4,
    animation: 'shimmer 1.4s infinite linear',
  }} />
);

const DocumentSkeleton = () => (
  <>
    <style>{`@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}`}</style>
    <div style={{ width: '210mm', minHeight: '297mm', background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,.12)', borderRadius: 2, padding: '15mm 20mm' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <SkeletonBlock w="120px" h={28} mb={8} />
        <SkeletonBlock w="220px" h={12} mb={6} />
        <SkeletonBlock w="320px" h={16} mb={0} />
      </div>
      <SkeletonBlock w="100%" h={80} mb={20} />
      <SkeletonBlock w="280px" h={18} mb={12} />
      <SkeletonBlock w="100%" h={260} mb={24} />
      <SkeletonBlock w="100%" h={40} mb={0} />
    </div>
  </>
);

// ─── Toolbar Button ────────────────────────────────────────────────────────────
const ToolbarBtn = ({ onClick, title, children, active = false, danger = false }: {
  onClick: () => void; title: string; children: React.ReactNode; active?: boolean; danger?: boolean;
}) => (
  <button type="button" title={title} onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    padding: '4px 8px', borderRadius: 4, border: '1px solid',
    borderColor: danger ? '#fca5a5' : active ? '#2563eb' : '#d1d5db',
    background: danger ? '#fef2f2' : active ? '#eff6ff' : '#fff',
    color: danger ? '#dc2626' : active ? '#1d4ed8' : '#374151',
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
    { label: '📌 Meeting Title', html: `<strong>${meeting.title}</strong>` },
    { label: '📅 Meeting Date', html: meeting.meeting_date },
    { label: '⏰ Time (Start–End)', html: `${meeting.start_time} – ${meeting.end_time}` },
    { label: '📍 Venue', html: meeting.venue || 'Virtual / N/A' },
    { label: '🏢 Department', html: meeting.departments?.name || 'KeNHA' },
    { label: '👤 Organizer', html: meeting.profiles?.email || '' },
    { label: '👥 Staff Count', html: `<strong>${staff.length}</strong>` },
    { label: '🌐 Visitor Count', html: `<strong>${visitors.length}</strong>` },
    { label: '✍️ Signature Box', html: `<div style="border-bottom:1px solid #000; width:150px; height:30px; margin:5px 0;"></div>` },
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
  const [isBuilding, setIsBuilding] = useState(false);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [templateMode, setTemplateMode] = useState(false);
  
  // Word Editor States
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'layout' | 'view'>('home');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [marginSize, setMarginSize] = useState<'normal' | 'narrow' | 'wide'>('normal');

  // ── Print CSS injected once ──
  useEffect(() => {
    if (!isOpen) return;
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm 15mm;
        }
        body > *:not(#print-editor-root) { display: none !important; }
        #print-editor-root { display: block !important; position: static !important; background: #fff !important; }
        #print-editor-ribbon, #print-editor-ruler-top, #print-editor-ruler-left, .no-print, .word-guide-tag, .word-guide-line { display: none !important; }
        #print-doc-canvas {
          box-shadow: none !important; border: none !important;
          margin: 0 !important; padding: 0 !important;
          width: 100% !important; min-height: unset !important;
          transform: none !important;
        }
        table { border-collapse: collapse !important; page-break-inside: avoid; }
        th, td { border: 1px solid #000 !important; }
        img { max-height: 55px !important; }
      }
    `;
    document.head.appendChild(style);
    printStyleRef.current = style;
    return () => {
      if (printStyleRef.current) { document.head.removeChild(printStyleRef.current); printStyleRef.current = null; }
    };
  }, [isOpen]);

  // ── Helper to calculate 5 training dates ──
  const getTrainingDates = useCallback(() => {
    const baseDateStr = meeting?.meeting_date;
    const dates: string[] = [];
    let startDate = new Date(baseDateStr);
    if (isNaN(startDate.getTime())) {
      startDate = new Date();
    }
    for (let i = 0; i < 5; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      dates.push(`${dd}/${mm}/${yyyy}`);
    }
    return dates;
  }, [meeting?.meeting_date]);

  // ── Build default KeNHA Attendance Register (Matching official KeNHA/DG/F01 document) ──
  const buildDefaultContent = useCallback((): string => {
    const dates = getTrainingDates();
    const allAttendees = [...staff, ...visitors];
    const totalRowsNeeded = Math.max(15, allAttendees.length);

    // Render table rows (minimum 15 rows)
    const rowsHtml = Array.from({ length: totalRowsNeeded }).map((_, index) => {
      const attendee = allAttendees[index];
      const rowNum = index + 1;
      const isRow1 = index === 0;

      const name = attendee ? attendee.full_name : '';
      const designation = attendee
        ? ('designation' in attendee ? attendee.designation : (attendee as VisitorAttendee).organization)
        : '';
      const sigImg = attendee?.signature_data
        ? `<img src="${attendee.signature_data}" style="height:26px; max-width:65px; object-fit:contain; display:block; margin:0 auto;" />`
        : '';

      return `
        <tr style="height:32px;">
          <td style="border:1px solid #000; padding:4px; text-align:center; font-weight:600; font-size:10px;">${rowNum}.</td>
          <td contenteditable="true" style="border:1px solid #000; padding:4px 8px; font-size:10px; font-weight:${name ? '600' : '400'}; color:#000;">${name}</td>
          <td contenteditable="true" style="border:1px solid #000; padding:4px 8px; font-size:10px; color:#000;">${designation}</td>
          ${isRow1 && !attendee ? `
            <td colspan="5" style="border:1px solid #000; padding:2px; text-align:center; font-size:10px; font-weight:700; color:#374151; vertical-align:middle; background:#fafafa;">
              Travelling to Venue
            </td>
          ` : `
            <td contenteditable="true" style="border:1px solid #000; padding:2px; text-align:center; font-size:9px;">${sigImg}</td>
            <td contenteditable="true" style="border:1px solid #000; padding:2px; text-align:center; font-size:9px;"></td>
            <td contenteditable="true" style="border:1px solid #000; padding:2px; text-align:center; font-size:9px;"></td>
            <td contenteditable="true" style="border:1px solid #000; padding:2px; text-align:center; font-size:9px;"></td>
            <td contenteditable="true" style="border:1px solid #000; padding:2px; text-align:center; font-size:9px;"></td>
          `}
        </tr>
      `;
    }).join('');

    return `
<div class="kenha-page-wrapper" style="position:relative; font-family:Arial, 'Helvetica Neue', sans-serif; color:#000; background:#fff; min-height:100%; display:flex; flex-direction:column; justify-content:space-between;">

  <!-- ==================== EDITABLE HEADER REGION ==================== -->
  <header contenteditable="true" style="margin-bottom:12px; border:1px transparent solid; outline:none; transition:border .2s;" title="Header Region - Click to edit authority logo, slogan, address or form code">
    <!-- Document Reference Code Top Right -->
    <div style="text-align:right; font-size:11px; font-weight:700; color:#000; font-family:Arial, sans-serif; margin-bottom:4px; letter-spacing:0.3px;">
      KeNHA/DG/F01
    </div>

    <!-- Black KeNHA Header Box -->
    <div style="background:#0a0a0a; border-radius:4px; padding:8px 16px; display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:16px;">
        <img src="/kenhalogo.png" alt="KeNHA Logo" style="height:55px; max-width:180px; object-fit:contain;" />
        <div>
          <div style="font-size:21px; font-weight:800; color:#ffffff; font-family:Calibri, Arial, sans-serif; letter-spacing:0.3px; line-height:1.15;">
            Kenya National Highways Authority
          </div>
          <div style="font-size:14px; font-weight:700; font-style:italic; color:#facc15; font-family:Georgia, serif; margin-top:3px;">
            Quality Highways, Better Connections
          </div>
        </div>
      </div>
    </div>

    <!-- Address Block -->
    <div style="text-align:center; font-size:9.5px; color:#111827; font-weight:600; margin-top:6px; line-height:1.35;">
      Barabara Plaza, Block A &amp; C, Jomo Kenyatta International Airport (JKIA), Off Airport South Road, along Mazao Road,<br/>
      P.O Box 49712 - 00100 Nairobi, Tel 020 - 4954000 / 0700 423 606 Email dg@kenha.co.ke / Website www.kenha.co.ke
    </div>
  </header>

  <!-- ==================== BODY CONTENT ==================== -->
  <main style="flex:1;">
    <!-- Title Section -->
    <div style="text-align:center; margin:14px 0 12px;">
      <div contenteditable="true" style="font-size:13px; font-weight:800; text-transform:uppercase; color:#000; line-height:1.4; letter-spacing:0.2px;">
        ${meeting.title || 'PROVISION OF SUPPORT SERVICES FOR MICROSOFT DYNAMICS 365 FINANCE AND OPERATIONS (KeNHA/2678/2023) - ERP TRAINING FOR ICT STAFF'}
      </div>
      <div contenteditable="true" style="font-size:12.5px; font-weight:800; text-transform:uppercase; color:#000; margin-top:6px; letter-spacing:0.4px;">
        ATTENDANCE REGISTER – GROUP II
      </div>
    </div>

    <!-- Attendance Register Table -->
    <table style="width:100%; border-collapse:collapse; font-size:10px; table-layout:fixed; border:1.5px solid #000; margin-bottom:12px;">
      <thead>
        <tr style="background:#fff; text-align:left; font-weight:700; color:#000;">
          <th rowspan="2" style="border:1px solid #000; padding:6px 4px; text-align:center; width:6%;">S/NO</th>
          <th rowspan="2" style="border:1px solid #000; padding:6px 8px; width:28%;">NAME</th>
          <th rowspan="2" style="border:1px solid #000; padding:6px 8px; width:22%;">DESIGNATION</th>
          <th colspan="5" style="border:1px solid #000; padding:6px 4px; text-align:center; width:44%;">SIGNATURE</th>
        </tr>
        <tr style="background:#fff; text-align:center; font-weight:700; color:#000;">
          <th style="border:1px solid #000; padding:4px 2px; width:8.8%; font-size:9.5px;">${dates[0]}</th>
          <th style="border:1px solid #000; padding:4px 2px; width:8.8%; font-size:9.5px;">${dates[1]}</th>
          <th style="border:1px solid #000; padding:4px 2px; width:8.8%; font-size:9.5px;">${dates[2]}</th>
          <th style="border:1px solid #000; padding:4px 2px; width:8.8%; font-size:9.5px;">${dates[3]}</th>
          <th style="border:1px solid #000; padding:4px 2px; width:8.8%; font-size:9.5px;">${dates[4]}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </main>

  <!-- ==================== EDITABLE FOOTER REGION ==================== -->
  <footer contenteditable="true" style="margin-top:16px; border:1px transparent solid; outline:none; transition:border .2s;" title="Footer Region - Click to edit Vision, Mission, Core Values, Social Media handles or ISO certification">
    <!-- Dual Top Accent Line -->
    <div style="border-top:3px solid #000; margin-bottom:1px;"></div>
    <div style="border-top:2px solid #eab308; margin-bottom:6px;"></div>

    <!-- Vision, Mission, Core Values -->
    <div style="text-align:center; font-size:8.5px; color:#000; line-height:1.3; font-weight:500;">
      <div><strong>Vision:</strong> A quality National Trunk Road Network to all for prosperity</div>
      <div style="margin-top:1px;"><strong>Mission:</strong> To develop and manage resilient, safe, and adequate National Trunk Roads for sustainable development through innovation and optimal utilization of resources</div>
      <div style="margin-top:2px; font-size:8.5px;">
        <span style="font-weight:700;">Core Values:</span> &nbsp;&nbsp;
        <span>Accountability</span> &nbsp;|&nbsp;
        <span>Sustainability</span> &nbsp;|&nbsp;
        <span>Innovation</span> &nbsp;|&nbsp;
        <span>Teamwork</span>
      </div>
    </div>

    <!-- Social Media bar -->
    <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-top:5px; font-size:8px; font-weight:600; color:#1f2937;">
      <span><strong>𝕏</strong> @KeNHAKenya</span>
      <span><strong style="color:#1877f2;">f</strong> Kenya National Highways Authority</span>
      <span><strong style="color:#ff0000;">▶</strong> Kenya National Highways Authority</span>
      <span><strong style="color:#0a66c2;">in</strong> Kenya National Highways Authority</span>
      <span><strong style="color:#e4405f;">📷</strong> kenha_kenya</span>
      <span><strong>🎵</strong> @kenhaofficial</span>
    </div>

    <!-- Yellow ISO Badge -->
    <div style="display:flex; justify-content:center; margin-top:4px;">
      <div style="background:#ebd107; color:#000; padding:2px 24px; border-radius:10px; font-size:9px; font-weight:800; letter-spacing:0.5px; border:1px solid #ca8a04;">
        ISO 9001 : 2015 Certified
      </div>
    </div>
  </footer>

</div>
`;
  }, [meeting, staff, visitors, getTrainingDates]);

  // ── Inject placeholders into uploaded template ──────────────────────────────────
  const injectMeetingData = useCallback((html: string): string => {
    const dept = meeting.departments?.name || 'KeNHA Department';
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

  // ── Load initial content with skeleton ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setIsBuilding(true);
    setTemplateMode(false);
    const timer = setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.innerHTML = buildDefaultContent();
      }
      setIsBuilding(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [isOpen, buildDefaultContent]);

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
      const imgHtml = `<img src="${dataUrl}" style="max-width:180px; height:auto; display:inline-block; margin:4px; vertical-align:middle; border:1px solid #cbd5e1; padding:2px; border-radius:2px;" alt="Inserted image" />`;
      document.execCommand('insertHTML', false, imgHtml);
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
      (header as HTMLElement).style.border = '2px dashed #2563eb';
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
      (footer as HTMLElement).style.border = '2px dashed #2563eb';
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
    setIsBuilding(true);
    setTimeout(() => {
      if (canvasRef.current) canvasRef.current.innerHTML = buildDefaultContent();
      setIsBuilding(false);
      setTemplateMode(false);
    }, 400);
  }, [buildDefaultContent]);

  // ── Print ────────────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => window.print(), []);

  // ── Download Word ────────────────────────────────────────────────────────────
  const handleDownloadWord = useCallback(async () => {
    const dates = getTrainingDates();
    const allAttendees = [...staff, ...visitors];
    const totalRowsNeeded = Math.max(15, allAttendees.length);

    const tableHeaderRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'S/NO', bold: true })], alignment: AlignmentType.CENTER })], rowSpan: 2, verticalAlign: VerticalAlign.CENTER }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'NAME', bold: true })] })], rowSpan: 2, verticalAlign: VerticalAlign.CENTER }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'DESIGNATION', bold: true })] })], rowSpan: 2, verticalAlign: VerticalAlign.CENTER }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'SIGNATURE', bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 5 }),
        ],
      }),
      new TableRow({
        children: dates.map(d =>
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: d, bold: true, size: 16 })], alignment: AlignmentType.CENTER })] })
        ),
      }),
    ];

    const bodyRows: TableRow[] = Array.from({ length: totalRowsNeeded }).map((_, index) => {
      const attendee = allAttendees[index];
      const name = attendee ? attendee.full_name : '';
      const designation = attendee
        ? ('designation' in attendee ? attendee.designation : (attendee as VisitorAttendee).organization)
        : '';
      const isRow1 = index === 0 && !attendee;

      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: `${index + 1}.`, alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: name, bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ text: designation })] }),
          ...(isRow1 ? [
            new TableCell({ columnSpan: 5, children: [new Paragraph({ children: [new TextRun({ text: 'Travelling to Venue', bold: true })], alignment: AlignmentType.CENTER })] })
          ] : [
            new TableCell({ children: [new Paragraph({ text: '' })] }),
            new TableCell({ children: [new Paragraph({ text: '' })] }),
            new TableCell({ children: [new Paragraph({ text: '' })] }),
            new TableCell({ children: [new Paragraph({ text: '' })] }),
            new TableCell({ children: [new Paragraph({ text: '' })] }),
          ]),
        ],
      });
    });

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
        children: [
          new Paragraph({ children: [new TextRun({ text: 'KeNHA/DG/F01', bold: true, size: 20 })], alignment: AlignmentType.RIGHT }),
          new Paragraph({ children: [new TextRun({ text: 'Kenya National Highways Authority', bold: true, size: 36, color: '000000' })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: 'Quality Highways, Better Connections', italics: true, bold: true, size: 24, color: 'D97706' })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: 'Barabara Plaza, Block A & C, JKIA, Off Airport South Road, Nairobi', size: 18 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: meeting.title, bold: true, size: 26 })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: 'ATTENDANCE REGISTER – GROUP II', bold: true, size: 24 })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [...tableHeaderRows, ...bodyRows] }),
          new Paragraph({ text: '', spacing: { after: 300 } }),
          new Paragraph({ children: [new TextRun({ text: 'Vision: A quality National Trunk Road Network to all for prosperity', size: 18, bold: true })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: 'Mission: To develop and manage resilient, safe, and adequate National Trunk Roads', size: 18 })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: 'Core Values: Accountability | Sustainability | Innovation | Teamwork', size: 18, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 150 } }),
          new Paragraph({ children: [new TextRun({ text: 'ISO 9001 : 2015 Certified', bold: true, color: '000000', size: 20 })], alignment: AlignmentType.CENTER }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const safeName = meeting.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    saveAs(blob, `${safeName}_attendance_${meeting.meeting_date}.docx`);
  }, [meeting, staff, visitors, getTrainingDates]);

  if (!isOpen) return null;

  const marginPaddingMap = {
    normal: '18mm 22mm',
    narrow: '10mm 12mm',
    wide: '25mm 30mm',
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', background: '#0f2442', borderBottom: '1px solid #2d486d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#2b579a', padding: 4, borderRadius: 4, display: 'flex' }}>
              <FileText size={16} style={{ color: '#fff' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', letterSpacing: 0.2 }}>
              {meeting.title || 'KeNHA Document Editor'} - Microsoft Word
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={handleDownloadWord} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 4, border: 'none', background: '#2563eb', color: '#fff',
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
        <div style={{ display: 'flex', gap: 2, padding: '0 12px', background: '#1e3a8a', borderBottom: '1px solid #1d4ed8' }}>
          {[
            { id: 'home', label: 'Home' },
            { id: 'insert', label: 'Insert' },
            { id: 'layout', label: 'Page Layout' },
            { id: 'view', label: 'View' },
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
                <select onChange={e => execCmd('fontName', e.target.value)} defaultValue="Arial"
                  style={{ height: 26, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, padding: '0 6px', background: '#fff', color: '#334151' }}>
                  <option value="Arial">Arial</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Segoe UI">Segoe UI</option>
                  <option value="Georgia">Georgia</option>
                </select>

                <select onChange={e => execCmd('fontSize', e.target.value)} defaultValue="2"
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
                <Layout size={13} style={{ color: '#475569' }} /> Margins:
                <select value={marginSize} onChange={e => setMarginSize(e.target.value as any)}
                  style={{ height: 26, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, padding: '0 6px', background: '#fff' }}>
                  <option value="normal">Normal (22mm)</option>
                  <option value="narrow">Narrow (12mm)</option>
                  <option value="wide">Wide (30mm)</option>
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

        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── MS WORD PAGE CANVAS & RULER ───────────────────────────────────────── */}
      {/* ========================================================================= */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#334155', position: 'relative' }}>
        
        {/* Top Horizontal Ruler */}
        {showRulers && (
          <div id="print-editor-ruler-top" style={{
            width: '210mm', height: 20, background: '#e2e8f0', borderBottom: '1px solid #cbd5e1',
            marginTop: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            padding: '0 20px', fontSize: 9, color: '#64748b', userSelect: 'none', position: 'sticky', top: 0, zIndex: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} style={{ borderLeft: '1px solid #94a3b8', height: i % 2 === 0 ? 10 : 5, paddingLeft: 2 }}>{i}</span>
            ))}
          </div>
        )}

        {/* Main Paper Container */}
        <div style={{ padding: '24px 16px 48px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          
          {(isBuilding || isTemplateLoading) ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px', background: '#fff', borderRadius: 30,
                boxShadow: '0 2px 12px rgba(0,0,0,.15)',
                fontSize: 13, color: '#374151', fontWeight: 500,
              }}>
                <Loader2 size={18} style={{ color: '#2563eb', animation: 'spin 1s linear infinite' }} />
                {isTemplateLoading ? 'Merging meeting data into template...' : 'Preparing KeNHA Document Editor...'}
              </div>
              <DocumentSkeleton />
            </div>
          ) : (
            <div style={{ position: 'relative' }}>

              {/* MS Word Header Guide Tag */}
              {showGuides && (
                <div className="word-guide-tag" onClick={handleFocusHeader} style={{
                  position: 'absolute', top: 12, left: -95, background: '#eff6ff', color: '#1d4ed8',
                  border: '1px dashed #3b82f6', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', zIndex: 5, display: 'flex', alignItems: 'center', gap: 4,
                }} title="Click to edit Header">
                  <Sparkles size={11} /> Header
                </div>
              )}

              {/* MS Word Footer Guide Tag */}
              {showGuides && (
                <div className="word-guide-tag" onClick={handleFocusFooter} style={{
                  position: 'absolute', bottom: 20, left: -90, background: '#eff6ff', color: '#1d4ed8',
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
                  width: '210mm', minHeight: '297mm',
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
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
