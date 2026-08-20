import React, { useState } from 'react';
import { X, FileText, Download, CheckCircle2, FileType, FileCode, Hash, Sparkles, Users, UserCheck, UserPlus } from 'lucide-react';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, ImageRun, AlignmentType, WidthType, VerticalAlign,
  Header, Footer,
} from 'docx';
import { saveAs } from 'file-saver';
import { useGetTemplatesQuery, useRenderDocumentMutation } from '../../features/apis/documentsApi';
import {
  useGetMeetingQuery,
  useGetMeetingAttendanceQuery,
} from '../../features/apis/apiSlice';
import { AlertError, InlineSpinner } from '../shared/Feedback';
import { parseMeetingFormConfig, getDynamicRegisterColumns, aggregateMultiDayAttendees, formatAttendanceDate } from '../../types/formConfig';

interface GenerateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onOpenEditor?: () => void;
  meeting?: any;
  staff?: any[];
  visitors?: any[];
}

export const GenerateDocumentModal: React.FC<GenerateDocumentModalProps> = ({
  isOpen,
  onClose,
  meetingId,
  showToast,
  onOpenEditor,
  meeting: propMeeting,
  staff: propStaff,
  visitors: propVisitors,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');
  const [attendeeScope, setAttendeeScope] = useState<'all' | 'staff' | 'visitors'>('all');
  const [documentNumber, setDocumentNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadInfo, setDownloadInfo] = useState<{ url?: string; format: string; isLocalBlob?: boolean; blob?: Blob; filename?: string } | null>(null);

  // Queries
  const { data: templatesRes, isLoading: isTemplatesLoading } = useGetTemplatesQuery();
  const { data: meetingQueryRes } = useGetMeetingQuery(meetingId, { skip: !meetingId || Boolean(propMeeting) });
  const { data: attendanceQueryRes } = useGetMeetingAttendanceQuery(meetingId, { skip: !meetingId || (Boolean(propStaff) && Boolean(propVisitors)) });
  const [renderDocument, { isLoading: isGenerating }] = useRenderDocumentMutation();

  const meeting = propMeeting || meetingQueryRes?.data;
  const staff = propStaff || attendanceQueryRes?.data?.staff || [];
  const visitors = propVisitors || attendanceQueryRes?.data?.visitors || [];

  const BUILTIN_TEMPLATE_ID = '__builtin__';

  // Auto select default template on load
  React.useEffect(() => {
    if (!selectedTemplate) {
      if (templatesRes?.data && templatesRes.data.length > 0) {
        const defaultTpl = templatesRes.data.find(t => t.is_default) || templatesRes.data[0];
        setSelectedTemplate(defaultTpl.template_id);
      } else if (templatesRes && (!templatesRes.data || templatesRes.data.length === 0)) {
        // No uploaded templates — use built-in
        setSelectedTemplate(BUILTIN_TEMPLATE_ID);
      }
    }
  }, [templatesRes, selectedTemplate]);

    // ── Helper to calculate signed attendance dates ──
  const getAttendanceDates = () => {
    const formConfig = parseMeetingFormConfig(meeting);
    if (formConfig.isMultiDay && formConfig.sessionDates && formConfig.sessionDates.length > 0) {
      return formConfig.sessionDates;
    }

    const targetAttendees = attendeeScope === 'staff' ? staff : attendeeScope === 'visitors' ? visitors : [...staff, ...visitors];
    const dateSet = new Set<string>();
    
    for (const a of targetAttendees) {
      if (a.submitted_at) {
        const formatted = formatAttendanceDate(a.submitted_at);
        if (formatted) dateSet.add(formatted);
      }
    }

    if (dateSet.size === 0 && meeting?.meeting_date) {
      const formatted = formatAttendanceDate(meeting.meeting_date);
      if (formatted) dateSet.add(formatted);
    }

    if (dateSet.size === 0) {
      dateSet.add(formatAttendanceDate(new Date().toISOString()));
    }

    return Array.from(dateSet);
  };

  // ── Build client-side merged .docx file ──
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

  const generateMergedWordDocument = async () => {
    const dates = getAttendanceDates();
    const isMultiDay = dates.length > 1;
    const formConfig = parseMeetingFormConfig(meeting);
    const dynamicCols = getDynamicRegisterColumns(formConfig, attendeeScope as any);
    const totalColWeight = dynamicCols.reduce((sum, c) => sum + c.widthPercent, 0) || 1;

    const allAttendeesRaw = attendeeScope === 'staff' ? staff : attendeeScope === 'visitors' ? visitors : [...staff, ...visitors];
    const allAttendees = isMultiDay ? aggregateMultiDayAttendees(allAttendeesRaw, dates) : allAttendeesRaw;
    const totalRowsNeeded = Math.max(12, allAttendees.length);

    // Format single attendee submitted date
    const getAttendeeDateStr = (attendee: any) => {
      if (!attendee?.submitted_at) return dates[0] || '';
      return formatAttendanceDate(attendee.submitted_at) || dates[0] || '';
    };

    let tableHeaderRows: TableRow[];

    if (!isMultiDay) {
      // Single Day Header with dynamic columns
      const dynamicColWidths = dynamicCols.map(c => Math.round((c.widthPercent / totalColWeight) * 73));
      tableHeaderRows = [
        new TableRow({
          children: [
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: '0F172A' }, children: [new Paragraph({ children: [new TextRun({ text: 'S/NO', bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })] }),
            ...dynamicCols.map((col, idx) =>
              new TableCell({
                width: { size: dynamicColWidths[idx], type: WidthType.PERCENTAGE },
                shading: { fill: '0F172A' },
                children: [new Paragraph({ children: [new TextRun({ text: col.header, bold: true, color: 'FFFFFF', size: 18 })] })],
              })
            ),
            new TableCell({ width: { size: 11, type: WidthType.PERCENTAGE }, shading: { fill: '0F172A' }, children: [new Paragraph({ children: [new TextRun({ text: 'DATE SIGNED', bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 11, type: WidthType.PERCENTAGE }, shading: { fill: '0F172A' }, children: [new Paragraph({ children: [new TextRun({ text: 'SIGNATURE', bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })] }),
          ],
        }),
      ];
    } else {
      // Multi-Day Header
      const dynamicColWidths = dynamicCols.map(c => Math.round((c.widthPercent / totalColWeight) * 67));
      tableHeaderRows = [
        new TableRow({
          children: [
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: '0F172A' }, children: [new Paragraph({ children: [new TextRun({ text: 'S/NO', bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })], rowSpan: 2, verticalAlign: VerticalAlign.CENTER }),
            ...dynamicCols.map((col, idx) =>
              new TableCell({
                width: { size: dynamicColWidths[idx], type: WidthType.PERCENTAGE },
                shading: { fill: '0F172A' },
                children: [new Paragraph({ children: [new TextRun({ text: col.header, bold: true, color: 'FFFFFF', size: 18 })] })],
                rowSpan: 2,
                verticalAlign: VerticalAlign.CENTER,
              })
            ),
            new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, shading: { fill: '0F172A' }, children: [new Paragraph({ children: [new TextRun({ text: 'SIGNATURE', bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })], columnSpan: dates.length }),
          ],
        }),
        new TableRow({
          children: dates.map(d =>
            new TableCell({ shading: { fill: '1E293B' }, children: [new Paragraph({ children: [new TextRun({ text: d, bold: true, size: 16, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })] })
          ),
        }),
      ];
    }

    const bodyRows: TableRow[] = Array.from({ length: totalRowsNeeded }).map((_, index) => {
      const attendee = allAttendees[index];
      const signedDateStr = attendee ? getAttendeeDateStr(attendee) : '';
      const isEven = index % 2 === 1;
      const cellShading = isEven ? { fill: 'F8FAFC' } : undefined;
      const sigBytes = base64ToUint8(attendee?.signature_data);

      if (!isMultiDay) {
        const dynamicColWidths = dynamicCols.map(c => Math.round((c.widthPercent / totalColWeight) * 73));
        return new TableRow({
          children: [
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: cellShading, children: [new Paragraph({ text: `${index + 1}.`, alignment: AlignmentType.CENTER })] }),
            ...dynamicCols.map((col, idx) => {
              const val = attendee ? col.getValue(attendee) : '';
              const isName = col.key === 'name';
              return new TableCell({
                width: { size: dynamicColWidths[idx], type: WidthType.PERCENTAGE },
                shading: cellShading,
                children: [new Paragraph({ children: [new TextRun({ text: val, bold: isName && Boolean(val), size: 18 })] })],
              });
            }),
            new TableCell({ width: { size: 11, type: WidthType.PERCENTAGE }, shading: cellShading, children: [new Paragraph({ children: [new TextRun({ text: signedDateStr, size: 18 })], alignment: AlignmentType.CENTER })] }),
            new TableCell({
              width: { size: 11, type: WidthType.PERCENTAGE },
              shading: cellShading,
              children: [
                sigBytes
                  ? new Paragraph({
                      children: [
                        new ImageRun({
                          data: sigBytes,
                          transformation: { width: 55, height: 20 },
                          type: 'png',
                        } as any),
                      ],
                      alignment: AlignmentType.CENTER,
                    })
                  : new Paragraph({
                      children: [new TextRun({ text: attendee ? 'Signed' : '', italics: true, size: 16 })],
                      alignment: AlignmentType.CENTER,
                    }),
              ],
            }),
          ],
        });
      }

      const dynamicColWidths = dynamicCols.map(c => Math.round((c.widthPercent / totalColWeight) * 67));
      return new TableRow({
        children: [
          new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: cellShading, children: [new Paragraph({ text: `${index + 1}.`, alignment: AlignmentType.CENTER })] }),
          ...dynamicCols.map((col, idx) => {
            const val = attendee ? col.getValue(attendee) : '';
            const isName = col.key === 'name';
            return new TableCell({
              width: { size: dynamicColWidths[idx], type: WidthType.PERCENTAGE },
              shading: cellShading,
              children: [new Paragraph({ children: [new TextRun({ text: val, bold: isName && Boolean(val), size: 18 })] })],
            });
          }),
          ...dates.map(d => {
            const rawSigDate = attendee?.signaturesByDate?.[d] || (dates.length === 1 ? attendee?.signature_data : undefined);
            const dateSigBytes = base64ToUint8(rawSigDate);
            return new TableCell({
              shading: cellShading,
              children: [
                dateSigBytes
                  ? new Paragraph({
                      children: [
                        new ImageRun({
                          data: dateSigBytes,
                          transformation: { width: 55, height: 20 },
                          type: 'png',
                        } as any),
                      ],
                      alignment: AlignmentType.CENTER,
                    })
                  : new Paragraph({
                      children: [new TextRun({ text: rawSigDate ? 'Signed' : '', italics: true })],
                      alignment: AlignmentType.CENTER,
                    }),
              ],
            });
          }),
        ],
      });
    });

    const registerTitle = attendeeScope === 'staff'
      ? `STAFF ATTENDANCE REGISTER ${meeting?.departments?.name ? `– ${meeting.departments.name.toUpperCase()}` : ''}`
      : attendeeScope === 'visitors'
      ? 'VISITORS ATTENDANCE REGISTER'
      : `ATTENDANCE REGISTER ${meeting?.departments?.name ? `– ${meeting.departments.name.toUpperCase()}` : ''}`;

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
      sections: [{
        properties: {
          page: {
            margin: { top: 1200, right: 720, bottom: 1000, left: 720, header: 360, footer: 360 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({ children: [new TextRun({ text: documentNumber || 'KeNHA/DG/F01', bold: true, size: 18 })], alignment: AlignmentType.RIGHT }),
              bannerUint8
                ? new Paragraph({
                    children: [
                      new ImageRun({
                        data: bannerUint8,
                        transformation: { width: 620, height: 75 },
                        type: 'png',
                      } as any),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 20 },
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
                        transformation: { width: 620, height: 55 },
                        type: 'png',
                      } as any),
                    ],
                    alignment: AlignmentType.CENTER,
                  })
                : new Paragraph({
                    children: [
                      new TextRun({ text: 'ISO 9001 : 2015 Certified', bold: true, size: 16 }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
            ],
          }),
        },
        children: [
          new Paragraph({ children: [new TextRun({ text: meeting?.title || 'CS MEETING PROGRAM', bold: true, size: 24, color: '000000' })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: registerTitle, bold: true, size: 20, color: '000000' })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: `Date: ${dates.join(', ')}  |  Venue: ${meeting?.venue || 'KeNHA Auditorium'}  |  Time: ${meeting?.start_time || ''} - ${meeting?.end_time || ''}`, size: 16, color: '475569' })], alignment: AlignmentType.CENTER, spacing: { after: 150 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [...tableHeaderRows, ...bodyRows],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const scopeTag = attendeeScope === 'staff' ? '_staff' : attendeeScope === 'visitors' ? '_visitors' : '_all';
    const safeTitle = (meeting?.title || 'meeting').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeTitle}_attendance${scopeTag}_${meeting?.meeting_date || 'doc'}.docx`;
    return { blob, filename };
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setDownloadInfo(null);

    try {
      if (format === 'docx') {
        const { blob, filename } = await generateMergedWordDocument();
        saveAs(blob, filename);

        // Also notify backend server
        renderDocument({
          meetingId,
          data: {
            template_id: selectedTemplate === BUILTIN_TEMPLATE_ID ? undefined : selectedTemplate || undefined,
            format: 'docx',
            document_number: documentNumber || undefined,
            scope: attendeeScope,
          },
        }).unwrap().catch(() => {});

        showToast('Word (.docx) document generated & downloaded successfully!', 'success');
        setDownloadInfo({
          format: 'docx',
          isLocalBlob: true,
          blob,
          filename,
        });
      } else {
        // PDF Format
        const res = await renderDocument({
          meetingId,
          data: {
            template_id: selectedTemplate === BUILTIN_TEMPLATE_ID ? undefined : selectedTemplate || undefined,
            format: 'pdf',
            document_number: documentNumber || undefined,
            scope: attendeeScope,
          },
        }).unwrap();

        if (res?.success) {
          showToast('Official PDF document generated successfully!', 'success');
          setDownloadInfo({ url: res.data.downloadUrl, format: 'pdf' });
        } else {
          // If server returns fallback, open editor
          if (onOpenEditor) {
            showToast('Document merged! Opening printable register...', 'success');
            resetAndClose();
            onOpenEditor();
          }
        }
      }
    } catch (err: any) {
      console.warn('[Document Generation Note]', err);
      // Fallback: If PDF rendering encountered backend delay, seamlessly open the Word/Print editor
      if (format === 'docx') {
        const { blob, filename } = await generateMergedWordDocument();
        saveAs(blob, filename);
        setDownloadInfo({ format: 'docx', isLocalBlob: true, blob, filename });
        showToast('Document generated successfully!', 'success');
      } else if (onOpenEditor) {
        showToast('Meeting data merged! Opening printable register...', 'success');
        resetAndClose();
        onOpenEditor();
      } else {
        setErrorMsg(err.data?.message || err.error || 'Failed to generate document');
      }
    }
  };

  const resetAndClose = () => {
    setSelectedTemplate('');
    setFormat('pdf');
    setAttendeeScope('all');
    setDocumentNumber('');
    setErrorMsg('');
    setDownloadInfo(null);
    onClose();
  };

  if (!isOpen) return null;

  const templates = templatesRes?.data || [];

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-11/12 max-w-lg bg-base-100 shadow-2xl rounded-2xl p-7 relative border border-base-200/80">
        
        {/* Close Button */}
        <button
          onClick={resetAndClose}
          type="button"
          className="btn btn-sm btn-circle btn-ghost absolute right-5 top-5 text-base-content/50 hover:text-base-content hover:bg-base-200"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-11 h-11 bg-amber-400/15 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs border border-amber-400/20">
            <Sparkles size={22} className="text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-base-content leading-tight">
              Generate Official Document
            </h3>
            <p className="text-xs text-base-content/60 font-medium mt-0.5">
              Export meeting attendance report formatted for KeNHA archives
            </p>
          </div>
        </div>

        {downloadInfo ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/15 text-emerald-600 rounded-full flex items-center justify-center mb-1 border border-emerald-500/20">
              <CheckCircle2 size={34} />
            </div>
            <div className="text-center">
              <h4 className="text-lg font-bold text-base-content">Document Ready</h4>
              <p className="text-xs text-base-content/70 mt-1 max-w-xs">
                Your report has been compiled and saved to the document store.
              </p>
            </div>

            <div className="w-full space-y-2.5 mt-3">
              {downloadInfo.isLocalBlob && downloadInfo.blob ? (
                <button
                  type="button"
                  onClick={() => saveAs(downloadInfo.blob!, downloadInfo.filename || 'attendance_register.docx')}
                  className="btn bg-amber-400 hover:bg-amber-500 text-slate-900 border-none w-full rounded-xl font-bold gap-2 shadow-md shadow-amber-400/20"
                >
                  <Download size={18} />
                  Download {downloadInfo.format.toUpperCase()} Report
                </button>
              ) : downloadInfo.url ? (
                <a 
                  href={downloadInfo.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn bg-amber-400 hover:bg-amber-500 text-slate-900 border-none w-full rounded-xl font-bold gap-2 shadow-md shadow-amber-400/20"
                  download
                >
                  <Download size={18} />
                  Download {downloadInfo.format.toUpperCase()} Report
                </a>
              ) : null}
              
              {onOpenEditor && (
                <button
                  type="button"
                  className="btn btn-secondary border-base-300 hover:bg-base-200 w-full rounded-xl font-semibold gap-2"
                  onClick={() => {
                    resetAndClose();
                    onOpenEditor();
                  }}
                >
                  <FileText size={18} className="text-amber-500" />
                  Open &amp; Edit / Print in MS Word Editor
                </button>
              )}
              
              <button 
                type="button" 
                className="btn btn-ghost w-full rounded-xl text-xs font-semibold text-base-content/60 hover:text-base-content" 
                onClick={resetAndClose}
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-5">
            {errorMsg && <AlertError message={errorMsg} />}

            {/* Template Selection */}
            <div className="form-control w-full">
              <label className="block text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Document Template
              </label>
              <div className="relative">
                <select
                  className="select select-bordered w-full h-11 rounded-xl text-sm font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none bg-base-100 transition-all"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  disabled={isTemplatesLoading}
                >
                  <option value={BUILTIN_TEMPLATE_ID}>
                    KeNHA Official Template — KeNHA/DG/F01 (Built-in)
                  </option>
                  {templates.map(t => (
                    <option key={t.template_id} value={t.template_id}>
                      {t.name} {t.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-base-content/50 mt-1 font-medium">
                Uses the official KeNHA/DG/F01 attendance register format by default
              </p>
            </div>

            {/* Attendee Scope Selector */}
            <div className="form-control w-full">
              <label className="block text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Attendee Scope <span className="text-amber-500 font-bold">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAttendeeScope('all')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    attendeeScope === 'all'
                      ? 'border-amber-400 bg-amber-500/10 text-base-content ring-2 ring-amber-400/30'
                      : 'border-base-300 bg-base-200/40 text-base-content/70 hover:bg-base-200'
                  }`}
                >
                  <Users size={16} className={attendeeScope === 'all' ? 'text-amber-500' : 'text-base-content/60'} />
                  <span className="text-xs font-bold mt-1">Merged (All)</span>
                  <span className="text-[10px] text-base-content/50">Staff &amp; Visitors ({staff.length + visitors.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendeeScope('staff')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    attendeeScope === 'staff'
                      ? 'border-amber-400 bg-amber-500/10 text-base-content ring-2 ring-amber-400/30'
                      : 'border-base-300 bg-base-200/40 text-base-content/70 hover:bg-base-200'
                  }`}
                >
                  <UserCheck size={16} className={attendeeScope === 'staff' ? 'text-amber-500' : 'text-base-content/60'} />
                  <span className="text-xs font-bold mt-1">Staff Only</span>
                  <span className="text-[10px] text-base-content/50">KeNHA Staff ({staff.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendeeScope('visitors')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    attendeeScope === 'visitors'
                      ? 'border-amber-400 bg-amber-500/10 text-base-content ring-2 ring-amber-400/30'
                      : 'border-base-300 bg-base-200/40 text-base-content/70 hover:bg-base-200'
                  }`}
                >
                  <UserPlus size={16} className={attendeeScope === 'visitors' ? 'text-amber-500' : 'text-base-content/60'} />
                  <span className="text-xs font-bold mt-1">Visitors Only</span>
                  <span className="text-[10px] text-base-content/50">External ({visitors.length})</span>
                </button>
              </div>
            </div>

            {/* Output Format Selector — Visual Cards */}
            <div className="form-control w-full">
              <label className="block text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Output Format <span className="text-amber-500 font-bold">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                
                {/* PDF Option */}
                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    format === 'pdf'
                      ? 'border-amber-400 bg-amber-500/10 text-base-content ring-2 ring-amber-400/30'
                      : 'border-base-300 bg-base-200/40 text-base-content/70 hover:bg-base-200 hover:border-base-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    format === 'pdf' ? 'bg-rose-500 text-white shadow-2xs' : 'bg-base-300/60 text-base-content/60'
                  }`}>
                    <FileType size={18} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold leading-tight">PDF Document</span>
                    <span className="text-[10px] text-base-content/50 mt-0.5 truncate">Fixed print format</span>
                  </div>
                </button>

                {/* Word DOCX Option */}
                <button
                  type="button"
                  onClick={() => setFormat('docx')}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    format === 'docx'
                      ? 'border-amber-400 bg-amber-500/10 text-base-content ring-2 ring-amber-400/30'
                      : 'border-base-300 bg-base-200/40 text-base-content/70 hover:bg-base-200 hover:border-base-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    format === 'docx' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-base-300/60 text-base-content/60'
                  }`}>
                    <FileCode size={18} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold leading-tight">Word (.docx)</span>
                    <span className="text-[10px] text-base-content/50 mt-0.5 truncate">Editable document</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Document Reference Number Input */}
            <div className="form-control w-full">
              <label className="block text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1.5">
                Document Reference Number <span className="text-base-content/40 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative">
                <Hash size={16} className="absolute left-3.5 top-3.5 text-base-content/40 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. KeNHA/HR/2026/001"
                  className="input input-bordered w-full h-11 pl-10 rounded-xl text-sm font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none transition-all"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-base-200/80 mt-6">
              <button
                type="button"
                className="btn btn-ghost rounded-xl px-5 text-xs font-bold text-base-content/70 hover:bg-base-200"
                onClick={resetAndClose}
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn bg-amber-400 hover:bg-amber-500 text-slate-900 border-none font-bold rounded-xl px-6 text-xs gap-2 shadow-md shadow-amber-400/20" 
                disabled={isGenerating || !selectedTemplate}
              >
                {isGenerating ? <InlineSpinner /> : (
                  <>
                    <Sparkles size={15} />
                    Generate Document
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="modal-backdrop bg-neutral/40 backdrop-blur-xs" onClick={resetAndClose}></div>
    </dialog>
  );
};

