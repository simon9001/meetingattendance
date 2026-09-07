// =============================================================================
// KeNHA Attendance Register — document source of truth
// -----------------------------------------------------------------------------
// One builder feeds the on-screen preview, the printed page and the downloaded
// PDF. Keeping them in the same file is what stops the three from drifting:
// every earlier mismatch (stretched banners, a footer left floating, a Word
// export that laid itself out differently) came from a second renderer.
// =============================================================================
import {
  parseMeetingFormConfig,
  getDynamicRegisterColumns,
  aggregateMultiDayAttendees,
  formatAttendanceDate,
  resolveDepartmentDisplay,
} from '../../types/formConfig';

// ─── Page geometry ────────────────────────────────────────────────────────────
// Every printed sheet carries exactly this many attendees, so a register is the
// same shape whether it holds 3 people or 300.
// A signature row has to be comfortable to write in by hand, so the row height
// is what is fixed and the number of rows per sheet follows from it — not the
// other way round. Portrait therefore fits roughly twice as many people as
// landscape, which is simply how much paper each has.
const TARGET_ROW_MM = 10;

// The canvas padding on screen doubles as the @page margin when printing, so
// what the organiser sees is what comes out of the printer.
const PAGE_MARGIN_MAP: Record<MarginSize, Record<Orientation, { css: string; vertical: number; horizontal: number }>> = {
  normal: {
    landscape: { css: '12mm 18mm', vertical: 12, horizontal: 18 },
    portrait: { css: '18mm 22mm', vertical: 18, horizontal: 22 },
  },
  narrow: {
    landscape: { css: '8mm 10mm', vertical: 8, horizontal: 10 },
    portrait: { css: '10mm 12mm', vertical: 10, horizontal: 12 },
  },
  wide: {
    landscape: { css: '18mm 24mm', vertical: 18, horizontal: 24 },
    portrait: { css: '25mm 30mm', vertical: 25, horizontal: 30 },
  },
};

// Fallback ratios only. The letterhead is measured from the actual file
// wherever possible, so dropping in a replacement banner never squashes it —
// a hardcoded height is what made the printed header look stretched.
// The footer is still supplied artwork, so its printed height is dictated by
// its own proportions. The header is markup and is measured below instead.
const FOOTER_BANNER_ASPECT = 1005 / 94;


// Vertical budget of the fixed furniture on each page, in millimetres. Whatever
// is left over is divided evenly between the 15 body rows.
const PAGE_CHROME_MM = {
  // Everything in the header except the banner: the KeNHA/DG/F01 reference line
  // plus the surrounding margins.
  title: 24,
  theadSingle: 11,
  theadMulti: 15,
  tableGap: 2,
};

type Orientation = 'landscape' | 'portrait';
type MarginSize = 'normal' | 'narrow' | 'wide';

const getPageMetrics = (orientation: Orientation, marginSize: MarginSize) => {
  const margin = PAGE_MARGIN_MAP[marginSize][orientation];
  const sheetHeight = orientation === 'landscape' ? 210 : 297; // A4
  const sheetWidth = orientation === 'landscape' ? 297 : 210;
  // 2mm of slack so a full-height page never spills onto a blank extra sheet.
  const contentHeightMm = sheetHeight - margin.vertical * 2 - 2;
  const contentWidthMm = sheetWidth - margin.horizontal * 2;
  // The banner spans the full text column, so its height is dictated by that.
  // Header furniture, in millimetres: the black bar (a 104px mark collapsed to
  // ~52px by its negative margins, plus padding), the KeNHA/DG/F01 reference
  // line, and the address strip — which wraps to twice as many lines once the
  // text column is narrower than about 200mm, i.e. on portrait.
  const addressLines = contentWidthMm >= 200 ? 2 : 4;
  const headerMm = 16.4 + 4.1 + 2 + addressLines * 4.1;
  // Footer artwork scales with the column width; the page-number line sits above it.
  const footerMm = contentWidthMm / FOOTER_BANNER_ASPECT + 4;
  // Printing with `@page { margin: 0 }` is what suppresses the browser's own
  // title/URL/date furniture, so the sheet carries the margin as padding
  // instead. Less the same 2mm of slack, the text box is identical either way.
  const printSheetHeightMm = sheetHeight - 2;
  return { margin: margin.css, contentHeightMm, contentWidthMm, headerMm, footerMm, printSheetHeightMm };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const participantTypeOf = (attendee: any): 'staff' | 'visitor' => {
  if (attendee?.participant_type === 'staff' || attendee?.participant_type === 'visitor') {
    return attendee.participant_type;
  }
  return attendee && 'designation' in attendee ? 'staff' : 'visitor';
};

// The database column a register cell corrects, or null when the cell is not
// correctable. Anything editable in the preview must land somewhere real —
// otherwise a typed correction silently disappears, which is the whole problem
// this replaces. Department is a foreign key and purpose is an enum, so neither
// can be set from free text; signature and date signed are evidence, not data.
const correctableField = (columnKey: string, type: 'staff' | 'visitor'): string | null => {
  if (columnKey === 'name') return 'full_name';
  if (columnKey === 'designation') return type === 'staff' ? 'designation' : 'position_title';
  if (columnKey === 'department_org') return type === 'visitor' ? 'organization' : null;
  if (columnKey.startsWith('custom_')) return `custom_responses.${columnKey.slice('custom_'.length)}`;
  return null;
};

// A cell is editable exactly when it is bound to a record we can write back to.
const cellBinding = (attendee: any, columnKey: string): string => {
  if (!attendee?.attendance_id) return ' contenteditable="false"';
  const type = participantTypeOf(attendee);
  const field = correctableField(columnKey, type);
  if (!field) return ' contenteditable="false"';
  return ` contenteditable="true" class="kenha-correctable" data-attendance-id="${attendee.attendance_id}" data-participant-type="${type}" data-field="${field}"`;
};

// Height of one body row (and the signature inside it) for a given page box.
// How many people fit on one sheet at a comfortable writing height. The table
// then stretches to fill, so the rows end up at least TARGET_ROW_MM tall and
// the last one still meets the footer.
export const getRowsPerPage = (
  page: { contentHeightMm: number; headerMm: number; footerMm: number },
  isMultiDay: boolean,
): number => {
  const theadMm = isMultiDay ? PAGE_CHROME_MM.theadMulti : PAGE_CHROME_MM.theadSingle;
  const bodyMm = page.contentHeightMm - page.headerMm - PAGE_CHROME_MM.title
    - theadMm - page.footerMm - PAGE_CHROME_MM.tableGap;
  return Math.max(1, Math.floor(bodyMm / TARGET_ROW_MM));
};

export const getRowMetrics = (
  page: { contentHeightMm: number; headerMm: number; footerMm: number },
  isMultiDay: boolean,
) => {
  const theadMm = isMultiDay ? PAGE_CHROME_MM.theadMulti : PAGE_CHROME_MM.theadSingle;
  const bodyMm = page.contentHeightMm - page.headerMm - PAGE_CHROME_MM.title
    - theadMm - page.footerMm - PAGE_CHROME_MM.tableGap;
  const rowMm = clamp(bodyMm / getRowsPerPage(page, isMultiDay), TARGET_ROW_MM, 20);
  return { rowMm, sigMm: clamp(rowMm - 1.8, 3.2, 16) };
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StaffAttendee {
  attendance_id: string;
  full_name: string;
  designation: string;
  departments?: { name: string };
  submitted_at: string;
  signature_data: string;
}
export interface VisitorAttendee {
  attendance_id: string;
  full_name: string;
  organization: string;
  position_title?: string;
  purpose: string;
  submitted_at: string;
  signature_data: string;
}
export interface MeetingData {
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

export type AttendeeFilter = 'all' | 'staff' | 'visitors';

export interface RegisterInput {
  meeting: MeetingData;
  staff: StaffAttendee[];
  visitors: VisitorAttendee[];
  attendeeFilter: AttendeeFilter;
  orientation: Orientation;
  marginSize: MarginSize;
}

export type { Orientation, MarginSize };
export { TARGET_ROW_MM, PAGE_MARGIN_MAP, getPageMetrics };

export const getAttendanceDates = (input: RegisterInput): string[] => {
  const { meeting, staff, visitors, attendeeFilter } = input;
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
};

export const buildRegisterHtml = (input: RegisterInput): string => {
  const { meeting, staff, visitors, attendeeFilter, orientation, marginSize } = input;
  const pageMetrics = getPageMetrics(orientation, marginSize);
  const dates = getAttendanceDates(input);
  const isMultiDay = dates.length > 1;
  const formConfig = parseMeetingFormConfig(meeting);
  const dynamicCols = getDynamicRegisterColumns(formConfig, attendeeFilter);

  const allAttendeesRaw = attendeeFilter === 'staff' ? staff : attendeeFilter === 'visitors' ? visitors : [...staff, ...visitors];
  const allAttendees = isMultiDay ? aggregateMultiDayAttendees(allAttendeesRaw, dates) : allAttendeesRaw;

  // Always fill whole sheets — trailing blanks double as walk-in lines.
  const rowsPerPage = getRowsPerPage(pageMetrics, isMultiDay);
  const pageCount = Math.max(1, Math.ceil(allAttendees.length / rowsPerPage));

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

  // Whatever height the fixed furniture leaves over is shared by the 15 rows,
  // so a sheet is properly filled in landscape and in portrait alike.
  const { sigMm } = getRowMetrics(pageMetrics, isMultiDay);
  const sigHeight = `${sigMm.toFixed(2)}mm`;

  // Format single attendee submitted date
  const getAttendeeDateStr = (attendee: any) => {
    if (!attendee?.submitted_at) return dates[0] || '';
    return formatAttendanceDate(attendee.submitted_at) || dates[0] || '';
  };

  // Render one body row (blank when there is no attendee at that index)
  const buildRow = (index: number): string => {
    const attendee = allAttendees[index];
    const rowNum = index + 1;

    const sigImg = attendee?.signature_data
      ? `<img class="kenha-sig" src="${attendee.signature_data}" style="height:${sigHeight}; max-width:96%; object-fit:contain; display:block; margin:0 auto;" />`
      : '';
    const signedDateStr = attendee ? getAttendeeDateStr(attendee) : '';

    if (!isMultiDay) {
      // Single Day Layout: S/NO | [DYNAMIC COLUMNS] | DATE SIGNED | SIGNATURE
      const cellsHtml = dynamicCols.map((col, idx) => {
        const val = attendee ? col.getValue(attendee) : '';
        const isName = col.key === 'name';
        return `<td${cellBinding(attendee, col.key)} style="border:1px solid #000; padding:3px 6px; font-size:12.5px; font-weight:${isName && val ? '600' : '400'}; color:#000; width:${dynamicColWidths[idx]}%; word-wrap:break-word;">${val}</td>`;
      }).join('');

      return `
        <tr>
          <td contenteditable="false" style="border:1px solid #000; padding:2px; text-align:center; font-weight:600; font-size:12.5px; width:5%;">${rowNum}.</td>
          ${cellsHtml}
          <td contenteditable="false" style="border:1px solid #000; padding:2px; text-align:center; font-size:11.5px; color:#000; width:11%;">${signedDateStr}</td>
          <td contenteditable="false" style="border:1px solid #000; padding:1px; text-align:center; width:11%;">${sigImg}</td>
        </tr>
      `;
    }

    // Multi-Day Layout
    const cellsHtml = dynamicCols.map((col, idx) => {
      const val = attendee ? col.getValue(attendee) : '';
      const isName = col.key === 'name';
      return `<td${cellBinding(attendee, col.key)} style="border:1px solid #000; padding:3px 4px; font-size:11.5px; font-weight:${isName && val ? '600' : '400'}; color:#000; width:${dynamicColWidths[idx]}%; word-wrap:break-word;">${val}</td>`;
    }).join('');

    return `
      <tr>
        <td contenteditable="false" style="border:1px solid #000; padding:2px; text-align:center; font-weight:600; font-size:11.5px; width:5%;">${rowNum}.</td>
        ${cellsHtml}
        ${dates.map(d => {
          const sig = (attendee as any)?.signaturesByDate?.[d] || (dates.length === 1 ? attendee?.signature_data : undefined);
          const sigItem = sig
            ? `<img class="kenha-sig" src="${sig}" style="height:${sigHeight}; max-width:96%; object-fit:contain; display:block; margin:0 auto;" />`
            : '';
          return `<td contenteditable="false" style="border:1px solid #000; padding:1px; text-align:center; width:${perDateWidth}%;">${sigItem}</td>`;
        }).join('')}
      </tr>
    `;
  };

  // ── Table head, repeated on every sheet ─────────────────────────────────
  const theadHtml = !isMultiDay ? `
    <tr style="background:#ffffff; text-align:left; font-weight:700; color:#000; height:30px;">
      <th contenteditable="false" style="border:1px solid #000; padding:4px 3px; text-align:center; font-size:14px; width:5%; word-wrap:break-word;">S/NO</th>
      ${dynamicCols.map((col, idx) => `
        <th contenteditable="false" style="border:1px solid #000; padding:4px 6px; font-size:14px; width:${dynamicColWidths[idx]}%; word-wrap:break-word;">${col.header}</th>
      `).join('')}
      <th contenteditable="false" style="border:1px solid #000; padding:4px 3px; text-align:center; font-size:14px; width:11%; word-wrap:break-word;">DATE SIGNED</th>
      <th contenteditable="false" style="border:1px solid #000; padding:4px 3px; text-align:center; font-size:14px; width:11%; word-wrap:break-word;">SIGNATURE</th>
    </tr>
  ` : `
    <tr style="background:#ffffff; text-align:left; font-weight:700; color:#000; height:26px;">
      <th rowspan="2" contenteditable="false" style="border:1px solid #000; padding:4px 3px; text-align:center; font-size:14px; width:5%; word-wrap:break-word;">S/NO</th>
      ${dynamicCols.map((col, idx) => `
        <th rowspan="2" contenteditable="false" style="border:1px solid #000; padding:4px; font-size:14px; width:${dynamicColWidths[idx]}%; word-wrap:break-word;">${col.header}</th>
      `).join('')}
      <th colspan="${dates.length}" contenteditable="false" style="border:1px solid #000; padding:4px 2px; text-align:center; font-size:14px; width:${signatureBlockWidth}%; word-wrap:break-word;">SIGNATURE</th>
    </tr>
    <tr style="background:#ffffff; text-align:center; font-weight:700; color:#000; height:22px;">
      ${dates.map(d => `<th contenteditable="false" style="border:1px solid #000; padding:2px 1px; width:${perDateWidth}%; font-size:10px; word-wrap:break-word; white-space:nowrap;">${d}</th>`).join('')}
    </tr>
  `;

  // ── EDITABLE HEADER REGION (WORD STYLE), repeated on every sheet ────────
  const headerHtml = `
<header style="flex:0 0 auto; margin-bottom:4px; width:100%; font-family:'Times New Roman', Times, serif;">
  <!-- Document Reference Code Top Right -->
  <div style="text-align:right; font-size:12px; font-weight:800; color:#000000; margin-bottom:2px; letter-spacing:0.3px;">
    KeNHA/DG/F01
  </div>

  <!-- Black letterhead bar. Built in markup because the supplied artwork on
       disk is the grey variant; the KeNHA mark is the real asset, clipped to
       the ellipse measured from its own pixels so its white ground drops away. -->
  <div style="width:100%; background:#000000; display:flex; align-items:center; gap:12px; padding:5px 16px; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
    <img src="/kenhalogo.png" alt="KeNHA" style="width:104px; height:104px; margin:-26px 0; flex:0 0 auto; align-self:center; object-fit:contain; clip-path:ellipse(45% 26.6% at 49.9% 49.3%);" />
    <div style="flex:1 1 auto; min-width:0;">
      <div style="color:#ffffff; font-weight:700; font-size:25px; line-height:1.12; letter-spacing:0.2px;">
        Kenya National Highways Authority
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.6); margin:4px 0 3px;"></div>
      <div style="color:#F9D616; font-weight:700; font-size:14px; line-height:1.12;">
        Quality Highways, Better Connections
      </div>
    </div>
  </div>

  <!-- White address strip beneath the bar -->
  <div style="width:100%; background:#ffffff; padding:4px 2px 0; text-align:center; font-size:11.5px; line-height:1.35; color:#000000;">
    <div><strong>Barabara Plaza, Block A &amp; C,</strong> Jomo Kenyatta International Airport (JKIA), Off Airport South Road, along Mazao Road,</div>
    <div><strong>P.O Box</strong> 49712 - 00100 Nairobi, <strong>Tel</strong> 020 - 4954000 / 0700 423 606 <strong>Email</strong> dg@kenha.co.ke / <strong>Website</strong> www.kenha.co.ke</div>
  </div>
</header>`;

  // ── EDITABLE FOOTER REGION (PINNED TO THE BOTTOM OF EVERY SHEET) ────────
  // ── EDITABLE FOOTER REGION (PINNED TO THE BOTTOM OF EVERY SHEET) ────────
  // The vision / mission / core values / social / ISO strip is one supplied
  // artwork (kenha_footer_banner.png) rather than markup imitating it, so the
  // printed page, the .docx and the official letterhead cannot drift apart.
  const buildFooter = (pageNo: number) => `
<footer style="flex:0 0 auto; margin-top:auto; padding-top:2px; width:100%;">
  <div class="kenha-page-no" style="text-align:right; font-size:7.5px; font-weight:700; color:#1e293b; font-family:'Times New Roman', Times, serif; white-space:nowrap; margin-bottom:1px;">Page ${pageNo} of ${pageCount}</div>
  <div style="width:100%;">
    <img src="/kenha_footer_banner.png" alt="KeNHA Vision, Mission, Core Values and ISO 9001:2015 certification" style="width:100%; height:auto; display:block; opacity:1; -webkit-print-color-adjust:exact; print-color-adjust:exact;" />
  </div>
</footer>`;

  // ── Assemble one wrapper per printed sheet ──────────────────────────────
  const pagesHtml = Array.from({ length: pageCount }).map((_, pageIndex) => {
    const firstRow = pageIndex * rowsPerPage;
    const rowsHtml = Array.from({ length: rowsPerPage })
      .map((_, i) => buildRow(firstRow + i))
      .join('');

    return `
<div class="kenha-page-wrapper" style="position:relative; font-family:'Times New Roman', Times, serif; font-size:11px; color:#000; background:#fff; height:${pageMetrics.contentHeightMm}mm; min-height:${pageMetrics.contentHeightMm}mm; display:flex; flex-direction:column; justify-content:flex-start; box-sizing:border-box;">
${headerHtml}

<!-- ==================== BODY CONTENT ==================== -->
<main style="flex:1 1 auto; min-height:0; display:flex; flex-direction:column;">
  <!-- Title Section. A long procurement title runs to two or three lines, so it
       is set with room to breathe rather than squeezed against the table. -->
  <div style="flex:0 0 auto; text-align:center; margin:6mm 0 5mm; padding:0 8mm;">
    <div style="font-size:16px; font-weight:800; text-transform:uppercase; color:#000; line-height:1.4; letter-spacing:0.3px;">
      ${meeting?.title || 'MEETING &amp; TRAINING ATTENDANCE REGISTER'}
    </div>
    <div style="font-size:14px; font-weight:800; text-transform:uppercase; color:#000; margin-top:3.5mm; line-height:1.35; letter-spacing:0.4px;">
      ${registerTitle}${pageIndex > 0 ? ' (CONTINUED)' : ''}
    </div>
  </div>

  <!-- Attendance Register Table with Dynamic Configured Columns.
       The slot takes all height left under the title, and the table fills the
       slot, so the last row always meets the footer with no dead band. -->
  <div class="register-table-slot" style="flex:1 1 auto; min-height:0; display:flex;">
  <table class="main-attendance-table"${pageIndex === 0 ? ' id="main-attendance-table"' : ''} border="1" cellpadding="0" cellspacing="0" style="width:100%; height:100%; border-collapse:collapse; font-size:12.5px; table-layout:fixed; border:1.5px solid #000; margin-bottom:0; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important;">
    <thead>
      ${theadHtml}
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  </div>
</main>
${buildFooter(pageIndex + 1)}
</div>`;
  });

  // Screen-only marker between sheets; hidden by both print stylesheets.
  const separator = `
<div class="kenha-page-sep no-print" contenteditable="false" style="height:26px; display:flex; align-items:center; gap:8px; color:#94a3b8; font-family:Arial, sans-serif; font-size:9px; font-weight:700; letter-spacing:1px; text-transform:uppercase; user-select:none;">
<span style="flex:1; border-top:1px dashed #94a3b8;"></span>PAGE BREAK<span style="flex:1; border-top:1px dashed #94a3b8;"></span>
</div>`;

  return pagesHtml.join(separator);
};

// ── The standalone document handed to the printer or the PDF renderer ───────
// `bodyHtml` is the live preview markup, so what is printed or downloaded is
// exactly what the organiser was looking at.
export const buildPrintDocument = (bodyHtml: string, input: RegisterInput): string => {
  const { meeting, orientation, marginSize } = input;
  const pageMetrics = getPageMetrics(orientation, marginSize);
  const hasWrapper = bodyHtml.includes('kenha-page-wrapper');
  const wrapped = hasWrapper
    ? bodyHtml
    : `<div class="kenha-flow-wrapper" style="position:relative; font-family:'Times New Roman', Times, serif; font-size:11px; color:#000; background:#fff; min-height:${pageMetrics.printSheetHeightMm}mm; box-sizing:border-box;">${bodyHtml}</div>`;
  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${meeting?.title || 'KeNHA Official Attendance Register'}</title>
        <style>
          /* margin:0 leaves Chrome no gutter for its page title / URL / date. */
          @page {
            size: A4 ${orientation};
            margin: 0;
          }
          * {
            box-sizing: border-box !important;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body, body * {
            font-family: 'Times New Roman', Times, serif !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: auto;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Times New Roman', Times, serif;
            font-size: 11px;
            line-height: 1.2;
          }
          .kenha-page-wrapper {
            width: 100%;
            height: ${pageMetrics.printSheetHeightMm}mm !important;
            min-height: ${pageMetrics.printSheetHeightMm}mm !important;
            max-height: ${pageMetrics.printSheetHeightMm}mm !important;
            padding: ${pageMetrics.margin} !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            box-sizing: border-box !important;
            font-family: 'Times New Roman', Times, serif;
            break-inside: avoid;
            page-break-inside: avoid;
            break-after: page;
            page-break-after: always;
          }
          /* No trailing blank sheet after the last page. */
          .kenha-page-wrapper:last-of-type {
            break-after: auto;
            page-break-after: auto;
          }
          /* Uploaded templates are not paginated by us — let them flow. */
          .kenha-flow-wrapper {
            width: 100%;
            min-height: ${pageMetrics.printSheetHeightMm}mm;
            padding: ${pageMetrics.margin};
            box-sizing: border-box !important;
            font-family: 'Times New Roman', Times, serif;
          }
          header {
            margin-bottom: 4px;
            width: 100%;
            flex: 0 0 auto;
          }
          header img {
            opacity: 1;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          main {
            flex: 1 1 auto;
            min-height: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          /* Scoped to the register: the footer's core-values table must not stretch. */
          .register-table-slot {
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            overflow: hidden;
          }
          .main-attendance-table {
            height: 100% !important;
            margin-bottom: 0 !important;
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
          footer img {
            width: 100%;
            height: auto;
            display: block;
            opacity: 1;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          footer {
            margin-top: auto !important;
            padding-top: 4px;
            width: 100%;
            flex: 0 0 auto;
          }
          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            max-width: 100%;
          }
          .word-guide-tag, .word-guide-line, .no-print, .kenha-page-sep, #image-resize-overlay, #image-toolbar {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${wrapped}
      </body>
      </html>
    `;
};
