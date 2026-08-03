import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  X, Printer, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Type, FileDown,
  Upload, ChevronDown, Loader2, FileText, Plus,
} from 'lucide-react';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle,
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
    <div style={{ width: '210mm', minHeight: '297mm', background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,.12)', borderRadius: 4, padding: '20mm 22mm' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <SkeletonBlock w="120px" h={28} mb={8} />
        <SkeletonBlock w="220px" h={12} mb={6} />
        <SkeletonBlock w="320px" h={16} mb={0} />
      </div>
      {/* Details table */}
      <SkeletonBlock w="100%" h={100} mb={20} />
      {/* Section heading */}
      <SkeletonBlock w="280px" h={18} mb={12} />
      {/* Staff table */}
      <SkeletonBlock w="100%" h={160} mb={24} />
      {/* Section heading */}
      <SkeletonBlock w="260px" h={18} mb={12} />
      {/* Visitors table */}
      <SkeletonBlock w="100%" h={120} mb={24} />
      {/* Notes */}
      <SkeletonBlock w="120px" h={14} mb={8} />
      <SkeletonBlock w="100%" h={60} mb={0} />
    </div>
  </>
);

// ─── Toolbar Button ────────────────────────────────────────────────────────────
const ToolbarBtn = ({ onClick, title, children, active = false, danger = false }: {
  onClick: () => void; title: string; children: React.ReactNode; active?: boolean; danger?: boolean;
}) => (
  <button type="button" title={title} onClick={onClick} style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    padding: '5px 8px', borderRadius: 6, border: '1px solid',
    borderColor: danger ? '#fca5a5' : active ? '#d97706' : '#e2e8f0',
    background: danger ? '#fef2f2' : active ? '#fef3c7' : '#fff',
    color: danger ? '#dc2626' : active ? '#92400e' : '#374151',
    cursor: 'pointer', fontSize: 12, transition: 'all .15s', whiteSpace: 'nowrap',
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

  const openTime = new Date(meeting.attendance_open_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  const closeTime = new Date(meeting.attendance_close_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  const staffTableHtml = `<table style="width:100%;border-collapse:collapse;font-size:11px;margin:8px 0">
    <thead><tr style="background:#1a3a5c;color:#fff">
      <th style="border:1px solid #2d5185;padding:6px;text-align:center">#</th>
      <th style="border:1px solid #2d5185;padding:6px">Full Name</th>
      <th style="border:1px solid #2d5185;padding:6px">Designation</th>
      <th style="border:1px solid #2d5185;padding:6px">Department</th>
      <th style="border:1px solid #2d5185;padding:6px">Time Signed</th>
      <th style="border:1px solid #2d5185;padding:6px">Signature</th>
    </tr></thead>
    <tbody>${staff.map((a, i) => `<tr>
      <td style="border:1px solid #ddd;padding:5px;text-align:center">${i + 1}</td>
      <td style="border:1px solid #ddd;padding:5px;font-weight:600">${a.full_name}</td>
      <td style="border:1px solid #ddd;padding:5px">${a.designation}</td>
      <td style="border:1px solid #ddd;padding:5px">${a.departments?.name || 'Internal'}</td>
      <td style="border:1px solid #ddd;padding:5px">${new Date(a.submitted_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</td>
      <td style="border:1px solid #ddd;padding:2px"><img src="${a.signature_data}" style="height:32px;max-width:100px;object-fit:contain"/></td>
    </tr>`).join('') || '<tr><td colspan="6" style="padding:8px;text-align:center;color:#9ca3af;border:1px solid #ddd">No staff recorded</td></tr>'}</tbody>
  </table>`;

  const visitorsTableHtml = `<table style="width:100%;border-collapse:collapse;font-size:11px;margin:8px 0">
    <thead><tr style="background:#1a3a5c;color:#fff">
      <th style="border:1px solid #2d5185;padding:6px;text-align:center">#</th>
      <th style="border:1px solid #2d5185;padding:6px">Full Name</th>
      <th style="border:1px solid #2d5185;padding:6px">Organisation</th>
      <th style="border:1px solid #2d5185;padding:6px">Position</th>
      <th style="border:1px solid #2d5185;padding:6px">Purpose</th>
      <th style="border:1px solid #2d5185;padding:6px">Time</th>
      <th style="border:1px solid #2d5185;padding:6px">Signature</th>
    </tr></thead>
    <tbody>${visitors.map((a, i) => `<tr>
      <td style="border:1px solid #ddd;padding:5px;text-align:center">${i + 1}</td>
      <td style="border:1px solid #ddd;padding:5px;font-weight:600">${a.full_name}</td>
      <td style="border:1px solid #ddd;padding:5px">${a.organization}</td>
      <td style="border:1px solid #ddd;padding:5px">${a.position_title || 'N/A'}</td>
      <td style="border:1px solid #ddd;padding:5px">${a.purpose}</td>
      <td style="border:1px solid #ddd;padding:5px">${new Date(a.submitted_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</td>
      <td style="border:1px solid #ddd;padding:2px"><img src="${a.signature_data}" style="height:32px;max-width:100px;object-fit:contain"/></td>
    </tr>`).join('') || '<tr><td colspan="7" style="padding:8px;text-align:center;color:#9ca3af;border:1px solid #ddd">No visitors recorded</td></tr>'}</tbody>
  </table>`;

  const items = [
    { label: '📌 Meeting Title', html: `<strong>${meeting.title}</strong>` },
    { label: '📅 Meeting Date', html: meeting.meeting_date },
    { label: '⏰ Time (Start–End)', html: `${meeting.start_time} – ${meeting.end_time}` },
    { label: '📍 Venue', html: meeting.venue || 'Virtual / N/A' },
    { label: '🏢 Department', html: meeting.departments?.name || 'KeNHA' },
    { label: '👤 Organizer', html: meeting.profiles?.email || '' },
    { label: '🔓 Sign-in Window', html: `${openTime} – ${closeTime}` },
    { label: '👥 Staff Count', html: `<strong>${staff.length}</strong>` },
    { label: '🌐 Visitor Count', html: `<strong>${visitors.length}</strong>` },
    { label: '📊 Total Attendees', html: `<strong>${staff.length + visitors.length}</strong>` },
    { label: '─────────────────', html: '', divider: true },
    { label: '📋 Full Staff Table', html: staffTableHtml },
    { label: '📋 Full Visitors Table', html: visitorsTableHtml },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <ToolbarBtn onClick={() => setOpen(o => !o)} title="Insert meeting data at cursor" active={open}>
        <Plus size={13} /> Insert Data <ChevronDown size={11} />
      </ToolbarBtn>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 999,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', minWidth: 220, overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#9ca3af' }}>
            Click to insert at cursor
          </div>
          {items.map((item, i) =>
            (item as any).divider ? (
              <div key={i} style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => insert(item.html)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 14px', border: 'none', background: 'transparent',
                  fontSize: 13, color: '#374151', cursor: 'pointer',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {item.label}
              </button>
            )
          )}
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
  const printStyleRef = useRef<HTMLStyleElement | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [templateMode, setTemplateMode] = useState(false); // true = user uploaded a template

  // ── Print CSS injected once ──
  useEffect(() => {
    if (!isOpen) return;
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body > *:not(#print-editor-root) { display: none !important; }
        #print-editor-root { display: block !important; position: static !important; }
        #print-editor-toolbar, .no-print { display: none !important; }
        #print-doc-canvas {
          box-shadow: none !important; border: none !important;
          margin: 0 !important; padding: 15mm 20mm !important;
          width: 100% !important; min-height: unset !important;
          font-size: 11pt !important;
        }
        table { border-collapse: collapse !important; page-break-inside: avoid; }
        th, td { border: 1px solid #555 !important; padding: 4px 7px !important; }
        img { max-height: 36px !important; }
      }
    `;
    document.head.appendChild(style);
    printStyleRef.current = style;
    return () => {
      if (printStyleRef.current) { document.head.removeChild(printStyleRef.current); printStyleRef.current = null; }
    };
  }, [isOpen]);

  // ── Build default content ──
  const buildDefaultContent = useCallback((): string => {
    const dept = meeting.departments?.name || 'KeNHA Department';
    const organizer = meeting.profiles?.email || 'Organizing Office';
    const openTime = new Date(meeting.attendance_open_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    const closeTime = new Date(meeting.attendance_close_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

    const staffRows = staff.length > 0
      ? staff.map((a, i) => `<tr>
          <td style="border:1px solid #ddd;padding:5px;text-align:center">${i + 1}</td>
          <td contenteditable="true" style="border:1px solid #ddd;padding:5px;font-weight:600">${a.full_name}</td>
          <td contenteditable="true" style="border:1px solid #ddd;padding:5px">${a.designation}</td>
          <td contenteditable="true" style="border:1px solid #ddd;padding:5px">${a.departments?.name || 'Internal'}</td>
          <td contenteditable="true" style="border:1px solid #ddd;padding:5px">${new Date(a.submitted_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</td>
          <td style="border:1px solid #ddd;padding:2px;width:110px"><img src="${a.signature_data}" style="height:34px;max-width:105px;object-fit:contain"/></td>
        </tr>`).join('')
      : `<tr><td colspan="6" style="border:1px solid #ddd;padding:10px;text-align:center;color:#9ca3af;font-style:italic">No staff attendees recorded.</td></tr>`;

    const visitorRows = visitors.length > 0
      ? visitors.map((a, i) => `<tr>
          <td style="border:1px solid #ddd;padding:5px;text-align:center">${i + 1}</td>
          <td contenteditable="true" style="border:1px solid #ddd;padding:5px;font-weight:600">${a.full_name}</td>
          <td contenteditable="true" style="border:1px solid #ddd;padding:5px">${a.organization}</td>
          <td contenteditable="true" style="border:1px solid #ddd;padding:5px">${a.position_title || 'N/A'}</td>
          <td contenteditable="true" style="border:1px solid #ddd;padding:5px">${a.purpose}</td>
          <td contenteditable="true" style="border:1px solid #ddd;padding:5px">${new Date(a.submitted_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</td>
          <td style="border:1px solid #ddd;padding:2px;width:110px"><img src="${a.signature_data}" style="height:34px;max-width:105px;object-fit:contain"/></td>
        </tr>`).join('')
      : `<tr><td colspan="7" style="border:1px solid #ddd;padding:10px;text-align:center;color:#9ca3af;font-style:italic">No external visitors recorded.</td></tr>`;

    return `
<div style="text-align:center;margin-bottom:20px;padding-bottom:14px;border-bottom:3px double #1a3a5c">
  <div style="font-size:26px;font-weight:900;letter-spacing:2px;color:#1a3a5c">KeNHA</div>
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#374151;margin-bottom:6px">Kenya National Highways Authority</div>
  <div contenteditable="true" style="font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#1a3a5c">
    Official Meeting &amp; Training Attendance Register
  </div>
</div>

<table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px">
  <tr>
    <td style="border:1px solid #ddd;padding:7px 10px;background:#f8fafc;font-weight:600;width:22%">Meeting Title</td>
    <td contenteditable="true" style="border:1px solid #ddd;padding:7px 10px;font-weight:700;color:#1a3a5c">${meeting.title}</td>
    <td style="border:1px solid #ddd;padding:7px 10px;background:#f8fafc;font-weight:600;width:22%">Department</td>
    <td contenteditable="true" style="border:1px solid #ddd;padding:7px 10px">${dept}</td>
  </tr>
  <tr>
    <td style="border:1px solid #ddd;padding:7px 10px;background:#f8fafc;font-weight:600">Date</td>
    <td contenteditable="true" style="border:1px solid #ddd;padding:7px 10px">${meeting.meeting_date}</td>
    <td style="border:1px solid #ddd;padding:7px 10px;background:#f8fafc;font-weight:600">Meeting Type</td>
    <td contenteditable="true" style="border:1px solid #ddd;padding:7px 10px;text-transform:capitalize">${meeting.meeting_type}</td>
  </tr>
  <tr>
    <td style="border:1px solid #ddd;padding:7px 10px;background:#f8fafc;font-weight:600">Time</td>
    <td contenteditable="true" style="border:1px solid #ddd;padding:7px 10px">${meeting.start_time} – ${meeting.end_time}</td>
    <td style="border:1px solid #ddd;padding:7px 10px;background:#f8fafc;font-weight:600">Venue</td>
    <td contenteditable="true" style="border:1px solid #ddd;padding:7px 10px">${meeting.venue || 'Virtual / N/A'}</td>
  </tr>
  <tr>
    <td style="border:1px solid #ddd;padding:7px 10px;background:#f8fafc;font-weight:600">Organizer</td>
    <td contenteditable="true" style="border:1px solid #ddd;padding:7px 10px">${organizer}</td>
    <td style="border:1px solid #ddd;padding:7px 10px;background:#f8fafc;font-weight:600">Sign-in Window</td>
    <td contenteditable="true" style="border:1px solid #ddd;padding:7px 10px">${openTime} – ${closeTime}</td>
  </tr>
</table>

<div contenteditable="true" style="font-size:13px;font-weight:700;text-transform:uppercase;padding:7px 0;border-bottom:2px solid #1a3a5c;margin-bottom:10px;color:#1a3a5c">
  Section 1: KeNHA Internal Staff Attendance (${staff.length})
</div>
<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:24px">
  <thead><tr style="background:#1a3a5c;color:#fff">
    <th style="border:1px solid #2d5185;padding:7px;text-align:center;width:36px">#</th>
    <th style="border:1px solid #2d5185;padding:7px;text-align:left">Full Name</th>
    <th style="border:1px solid #2d5185;padding:7px;text-align:left">Designation</th>
    <th style="border:1px solid #2d5185;padding:7px;text-align:left">Department</th>
    <th style="border:1px solid #2d5185;padding:7px;text-align:left">Time Signed</th>
    <th style="border:1px solid #2d5185;padding:7px;text-align:left">Digital Signature</th>
  </tr></thead>
  <tbody>${staffRows}</tbody>
</table>

<div contenteditable="true" style="font-size:13px;font-weight:700;text-transform:uppercase;padding:7px 0;border-bottom:2px solid #1a3a5c;margin-bottom:10px;color:#1a3a5c">
  Section 2: External Visitors Register (${visitors.length})
</div>
<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:32px">
  <thead><tr style="background:#1a3a5c;color:#fff">
    <th style="border:1px solid #2d5185;padding:7px;text-align:center;width:36px">#</th>
    <th style="border:1px solid #2d5185;padding:7px;text-align:left">Full Name</th>
    <th style="border:1px solid #2d5185;padding:7px;text-align:left">Organisation</th>
    <th style="border:1px solid #2d5185;padding:7px;text-align:left">Position</th>
    <th style="border:1px solid #2d5185;padding:7px;text-align:left">Purpose</th>
    <th style="border:1px solid #2d5185;padding:7px;text-align:left">Time Signed</th>
    <th style="border:1px solid #2d5185;padding:7px;text-align:left">Digital Signature</th>
  </tr></thead>
  <tbody>${visitorRows}</tbody>
</table>

<div style="margin-top:24px">
  <div contenteditable="true" style="font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:6px">Notes / Remarks</div>
  <div contenteditable="true" style="min-height:56px;border:1px dashed #d1d5db;padding:10px;border-radius:4px;font-size:11px;color:#374151;line-height:1.6">
    Click here to add notes or remarks...
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:40px;margin-top:48px">
  <div>
    <div style="border-top:1.5px solid #374151;padding-top:6px">
      <div contenteditable="true" style="font-size:11px;font-weight:700">Chairperson Name</div>
      <div contenteditable="true" style="font-size:10px;color:#6b7280">Title / Designation</div>
    </div>
    <div style="font-size:9px;color:#9ca3af;margin-top:3px">Signature &amp; Date</div>
  </div>
  <div>
    <div style="border-top:1.5px solid #374151;padding-top:6px">
      <div contenteditable="true" style="font-size:11px;font-weight:700">Secretary Name</div>
      <div contenteditable="true" style="font-size:10px;color:#6b7280">Title / Designation</div>
    </div>
    <div style="font-size:9px;color:#9ca3af;margin-top:3px">Signature &amp; Date</div>
  </div>
  <div>
    <div style="border-top:1.5px solid #374151;padding-top:6px">
      <div contenteditable="true" style="font-size:11px;font-weight:700">ICT Representative</div>
      <div contenteditable="true" style="font-size:10px;color:#6b7280">Title / Designation</div>
    </div>
    <div style="font-size:9px;color:#9ca3af;margin-top:3px">Signature &amp; Date</div>
  </div>
</div>

<div style="margin-top:28px;padding-top:10px;border-top:1px solid #e5e7eb;text-align:center">
  <div contenteditable="true" style="font-size:9px;color:#9ca3af;font-style:italic">
    Generated by KMTAMS — KeNHA Meeting &amp; Training Attendance Management System | ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}
  </div>
</div>`;
  }, [meeting, staff, visitors]);

  // ── Inject placeholders into converted HTML ──────────────────────────────────
  const injectMeetingData = useCallback((html: string): string => {
    const dept = meeting.departments?.name || 'KeNHA Department';
    const organizer = meeting.profiles?.email || '';
    const openTime = new Date(meeting.attendance_open_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    const closeTime = new Date(meeting.attendance_close_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

    const replacements: [RegExp, string][] = [
      [/\{\{?\s*meeting_?title\s*\}?\}/gi, `<strong>${meeting.title}</strong>`],
      [/\{\{?\s*title\s*\}?\}/gi, `<strong>${meeting.title}</strong>`],
      [/\{\{?\s*date\s*\}?\}/gi, meeting.meeting_date],
      [/\{\{?\s*meeting_?date\s*\}?\}/gi, meeting.meeting_date],
      [/\{\{?\s*venue\s*\}?\}/gi, meeting.venue || 'Virtual / N/A'],
      [/\{\{?\s*department\s*\}?\}/gi, dept],
      [/\{\{?\s*dept\s*\}?\}/gi, dept],
      [/\{\{?\s*organizer\s*\}?\}/gi, organizer],
      [/\{\{?\s*start_?time\s*\}?\}/gi, meeting.start_time],
      [/\{\{?\s*end_?time\s*\}?\}/gi, meeting.end_time],
      [/\{\{?\s*open_?time\s*\}?\}/gi, openTime],
      [/\{\{?\s*close_?time\s*\}?\}/gi, closeTime],
      [/\{\{?\s*meeting_?type\s*\}?\}/gi, meeting.meeting_type],
      [/\{\{?\s*staff_?count\s*\}?\}/gi, String(staff.length)],
      [/\{\{?\s*visitor_?count\s*\}?\}/gi, String(visitors.length)],
      [/\{\{?\s*total_?attendees?\s*\}?\}/gi, String(staff.length + visitors.length)],
      // Bracket-style
      [/\[MEETING[_ ]TITLE\]/gi, `<strong>${meeting.title}</strong>`],
      [/\[DATE\]/gi, meeting.meeting_date],
      [/\[VENUE\]/gi, meeting.venue || 'Virtual / N/A'],
      [/\[DEPARTMENT\]/gi, dept],
      [/\[ORGANIZER\]/gi, organizer],
    ];

    let result = html;
    for (const [pattern, value] of replacements) {
      result = result.replace(pattern, value);
    }
    return result;
  }, [meeting, staff, visitors]);

  // ── Load initial content with skeleton ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setIsBuilding(true);
    setTemplateMode(false);
    // Small delay so the skeleton is visible and feels natural
    const timer = setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.innerHTML = buildDefaultContent();
      }
      setIsBuilding(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [isOpen, buildDefaultContent]);

  // ── Handle template upload ──────────────────────────────────────────────────
  const handleTemplateUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Please select a .docx Word file.');
      return;
    }
    setIsTemplateLoading(true);

    // Use FileReader — more reliable cross-browser than file.arrayBuffer()
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const arrayBuffer = ev.target?.result as ArrayBuffer;
        if (!arrayBuffer) throw new Error('Could not read file contents.');

        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            styleMap: [
              "p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh",
              "p[style-name='Heading 3'] => h3:fresh",
              "p[style-name='Title'] => h1:fresh",
            ],
          }
        );

        if (!result || !result.value) {
          throw new Error('mammoth returned empty output.');
        }

        // Log any conversion warnings so you can see them in the console
        if (result.messages && result.messages.length > 0) {
          console.info('[Template] mammoth messages:', result.messages);
        }

        // Inject real meeting data into placeholders found in the template
        const injected = injectMeetingData(result.value);

        if (canvasRef.current) {
          canvasRef.current.innerHTML = injected || '<p>(Template converted but produced no visible content. Try a simpler .docx file.)</p>';
          setTemplateMode(true);
        }
      } catch (err: any) {
        console.error('[Template] conversion error:', err);
        alert(`Failed to load template: ${err?.message || 'Unknown error'}. Make sure it is a valid .docx Word document (not .doc or .odt).`);
      } finally {
        setIsTemplateLoading(false);
        if (templateInputRef.current) templateInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      alert('Could not read the file. Please try again.');
      setIsTemplateLoading(false);
      if (templateInputRef.current) templateInputRef.current.value = '';
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const staffRows: TableRow[] = [
      new TableRow({ children: ['#','Full Name','Designation','Department','Time Signed'].map(h =>
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })], shading: { fill: '1a3a5c' } })) }),
      ...(staff.length > 0 ? staff.map((a, i) => new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ text: String(i+1), alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: a.full_name, bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ text: a.designation })] }),
        new TableCell({ children: [new Paragraph({ text: a.departments?.name || 'Internal' })] }),
        new TableCell({ children: [new Paragraph({ text: new Date(a.submitted_at).toLocaleTimeString('en-KE', { hour:'2-digit', minute:'2-digit' }) })] }),
      ]})) : [new TableRow({ children: [new TableCell({ columnSpan: 5, children: [new Paragraph({ text: 'No staff attendees recorded.', alignment: AlignmentType.CENTER })] })] })]),
    ];

    const visitorRows: TableRow[] = [
      new TableRow({ children: ['#','Full Name','Organisation','Position','Purpose','Time'].map(h =>
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })], shading: { fill: '1a3a5c' } })) }),
      ...(visitors.length > 0 ? visitors.map((a, i) => new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ text: String(i+1), alignment: AlignmentType.CENTER })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: a.full_name, bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ text: a.organization })] }),
        new TableCell({ children: [new Paragraph({ text: a.position_title || 'N/A' })] }),
        new TableCell({ children: [new Paragraph({ text: a.purpose })] }),
        new TableCell({ children: [new Paragraph({ text: new Date(a.submitted_at).toLocaleTimeString('en-KE', { hour:'2-digit', minute:'2-digit' }) })] }),
      ]})) : [new TableRow({ children: [new TableCell({ columnSpan: 6, children: [new Paragraph({ text: 'No visitors recorded.', alignment: AlignmentType.CENTER })] })] })]),
    ];

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
        children: [
          new Paragraph({ children: [new TextRun({ text: 'KeNHA', bold: true, size: 48, color: '1a3a5c' })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: 'Kenya National Highways Authority', size: 18, color: '374151' })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: 'Official Meeting & Training Attendance Register', bold: true, size: 24, color: '1a3a5c' })], alignment: AlignmentType.CENTER, spacing: { after: 300 }, border: { bottom: { color: '1a3a5c', size: 6, style: BorderStyle.DOUBLE } } }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
            new TableRow({ children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Meeting Title', bold: true })] })], shading: { fill: 'F8FAFC' }, width: { size: 22, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: meeting.title, bold: true, color: '1a3a5c' })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Department', bold: true })] })], shading: { fill: 'F8FAFC' }, width: { size: 22, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ text: meeting.departments?.name || 'KeNHA' })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true })] })], shading: { fill: 'F8FAFC' } }),
              new TableCell({ children: [new Paragraph({ text: meeting.meeting_date })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Venue', bold: true })] })], shading: { fill: 'F8FAFC' } }),
              new TableCell({ children: [new Paragraph({ text: meeting.venue || 'Virtual / N/A' })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Time', bold: true })] })], shading: { fill: 'F8FAFC' } }),
              new TableCell({ children: [new Paragraph({ text: `${meeting.start_time} – ${meeting.end_time}` })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Type', bold: true })] })], shading: { fill: 'F8FAFC' } }),
              new TableCell({ children: [new Paragraph({ text: meeting.meeting_type })] }),
            ]}),
          ]}),
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: `Section 1: KeNHA Internal Staff Attendance (${staff.length})`, bold: true, color: '1a3a5c', size: 24 })], border: { bottom: { color: '1a3a5c', size: 4, style: BorderStyle.SINGLE } }, spacing: { after: 100 } }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: staffRows }),
          new Paragraph({ text: '', spacing: { after: 300 } }),
          new Paragraph({ children: [new TextRun({ text: `Section 2: External Visitors Register (${visitors.length})`, bold: true, color: '1a3a5c', size: 24 })], border: { bottom: { color: '1a3a5c', size: 4, style: BorderStyle.SINGLE } }, spacing: { after: 100 } }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: visitorRows }),
          new Paragraph({ text: '', spacing: { after: 600 } }),
          new Paragraph({ children: [new TextRun({ text: '______________________          ______________________          ______________________' })], spacing: { after: 80 } }),
          new Paragraph({ children: [new TextRun({ text: 'Chairperson                              Secretary                                   ICT Representative', bold: true })], spacing: { after: 400 } }),
          new Paragraph({ children: [new TextRun({ text: `Generated by KMTAMS | ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}`, color: '9CA3AF', size: 16, italics: true })], alignment: AlignmentType.CENTER }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const safeName = meeting.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    saveAs(blob, `${safeName}_attendance_${meeting.meeting_date}.docx`);
  }, [meeting, staff, visitors]);

  if (!isOpen) return null;

  return (
    <div id="print-editor-root" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>

      {/* ── Hidden template file input ── */}
      <input
        ref={templateInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={handleTemplateUpload}
      />

      {/* ── Toolbar ── */}
      <div id="print-editor-toolbar" style={{
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        padding: '8px 14px', background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 6px rgba(0,0,0,.07)',
      }}>
        {/* Close */}
        <button type="button" onClick={onClose} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
          borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc',
          color: '#374151', cursor: 'pointer', fontSize: 13, fontWeight: 500, marginRight: 4,
        }}>
          <X size={14} /> Close
        </button>

        <div style={{ width: 1, height: 26, background: '#e2e8f0', margin: '0 2px' }} />

        {/* Formatting */}
        <ToolbarBtn onClick={() => execCmd('bold')} title="Bold"><Bold size={13} /></ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd('italic')} title="Italic"><Italic size={13} /></ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd('underline')} title="Underline"><Underline size={13} /></ToolbarBtn>

        <div style={{ width: 1, height: 26, background: '#e2e8f0', margin: '0 2px' }} />

        <ToolbarBtn onClick={() => execCmd('justifyLeft')} title="Left"><AlignLeft size={13} /></ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd('justifyCenter')} title="Center"><AlignCenter size={13} /></ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd('justifyRight')} title="Right"><AlignRight size={13} /></ToolbarBtn>

        <div style={{ width: 1, height: 26, background: '#e2e8f0', margin: '0 2px' }} />

        {/* Font size */}
        <Type size={12} style={{ color: '#9ca3af' }} />
        <select onChange={e => execCmd('fontSize', e.target.value)} defaultValue="3"
          style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 6px', fontSize: 12, background: '#fff', color: '#374151', cursor: 'pointer' }}>
          <option value="1">8pt</option>
          <option value="2">10pt</option>
          <option value="3">12pt</option>
          <option value="4">14pt</option>
          <option value="5">18pt</option>
          <option value="6">24pt</option>
          <option value="7">36pt</option>
        </select>

        {/* Text colour */}
        <input type="color" defaultValue="#000000" onChange={e => execCmd('foreColor', e.target.value)} title="Text colour"
          style={{ width: 26, height: 26, border: '1px solid #e2e8f0', borderRadius: 4, padding: 2, cursor: 'pointer' }} />
        <input type="color" defaultValue="#ffffff" onChange={e => execCmd('backColor', e.target.value)} title="Highlight colour"
          style={{ width: 26, height: 26, border: '1px solid #e2e8f0', borderRadius: 4, padding: 2, cursor: 'pointer' }} />

        <div style={{ width: 1, height: 26, background: '#e2e8f0', margin: '0 2px' }} />

        {/* Insert data dropdown */}
        <InsertDataDropdown meeting={meeting} staff={staff} visitors={visitors} />

        <div style={{ width: 1, height: 26, background: '#e2e8f0', margin: '0 2px' }} />

        {/* Upload template */}
        <ToolbarBtn onClick={() => templateInputRef.current?.click()} title="Upload your own .docx template" active={templateMode}>
          {isTemplateLoading
            ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</>
            : <><Upload size={13} /> {templateMode ? 'Change Template' : 'Use My Template (.docx)'}</>
          }
        </ToolbarBtn>

        {templateMode && (
          <ToolbarBtn onClick={resetToDefault} title="Go back to the default layout" danger>
            <FileText size={13} /> Reset to Default
          </ToolbarBtn>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Export */}
        <button type="button" onClick={handleDownloadWord} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
          borderRadius: 7, border: 'none', background: '#2563eb', color: '#fff',
          cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 1px 4px rgba(37,99,235,.25)',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')}
          onMouseLeave={e => (e.currentTarget.style.background = '#2563eb')}
        >
          <FileDown size={14} /> Download Word
        </button>

        <button type="button" onClick={handlePrint} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
          borderRadius: 7, border: 'none', background: '#d97706', color: '#fff',
          cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 1px 4px rgba(217,119,6,.25)',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = '#b45309')}
          onMouseLeave={e => (e.currentTarget.style.background = '#d97706')}
        >
          <Printer size={14} /> Print / PDF
        </button>
      </div>

      {/* ── Hint bar ── */}
      {!isBuilding && !isTemplateLoading && (
        <div className="no-print" style={{
          textAlign: 'center', padding: '5px 16px',
          background: templateMode ? '#ecfdf5' : '#eff6ff',
          borderBottom: `1px solid ${templateMode ? '#6ee7b7' : '#bfdbfe'}`,
          fontSize: 12, color: templateMode ? '#065f46' : '#1d4ed8',
        }}>
          {templateMode
            ? '✅ Your template is loaded. Use <strong>Insert Data</strong> to add meeting fields anywhere. Click any text to edit.'
            : '✏️ Click any text in the document to edit it. Use <strong>Insert Data</strong> to add fields, or upload your own template.'
          }
        </div>
      )}

      {/* ── Canvas area ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '28px 16px', background: '#f1f5f9' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {(isBuilding || isTemplateLoading) ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', background: '#fff', borderRadius: 30,
              boxShadow: '0 2px 12px rgba(0,0,0,.08)',
              fontSize: 13, color: '#374151', fontWeight: 500,
            }}>
              <Loader2 size={18} style={{ color: '#d97706', animation: 'spin 1s linear infinite' }} />
              {isTemplateLoading ? 'Reading your template and merging meeting data…' : 'Building your document…'}
            </div>
            <DocumentSkeleton />
          </div>
        ) : (
          <div
            id="print-doc-canvas"
            ref={canvasRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            style={{
              width: '210mm', minHeight: '297mm',
              background: '#fff',
              boxShadow: '0 4px 24px rgba(0,0,0,.12)',
              borderRadius: 4,
              padding: '18mm 22mm',
              fontSize: '11pt',
              fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
              lineHeight: 1.5, color: '#1f2937', outline: 'none',
            }}
          />
        )}
      </div>
    </div>
  );
};
