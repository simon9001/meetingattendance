// =============================================================================
// One-click attendance register download
// -----------------------------------------------------------------------------
// No template, format or scope to choose: the register is built from the same
// source the preview and the printer use, rendered to PDF server-side, and
// saved. The organiser presses one button.
// =============================================================================
import { buildRegisterHtml, buildPrintDocument } from './registerDocument';
import type { RegisterInput } from './registerDocument';

// The PDF renderer runs with every network request blocked, so any image the
// document still points at by URL would silently vanish. Fetch them here and
// fold them into the markup as data: URIs before the document leaves the browser.
const inlineImages = async (html: string): Promise<string> => {
  const sources = Array.from(new Set(
    Array.from(html.matchAll(/src="([^"]+)"/g))
      .map(m => m[1])
      .filter(src => src && !src.startsWith('data:')),
  ));

  const encoded = await Promise.all(sources.map(async src => {
    try {
      const res = await fetch(src);
      if (!res.ok) return null;
      const blob = await res.blob();
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      return [src, dataUri] as const;
    } catch {
      return null;
    }
  }));

  let out = html;
  for (const pair of encoded) {
    if (!pair) continue;
    const [src, dataUri] = pair;
    out = out.split(`src="${src}"`).join(`src="${dataUri}"`);
  }
  return out;
};

const fileNameFor = (input: RegisterInput) => {
  const title = (input.meeting?.title || 'meeting').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const scope = input.attendeeFilter === 'all' ? '' : `-${input.attendeeFilter}`;
  const date = input.meeting?.meeting_date || 'register';
  return `${title}${scope}-attendance-register-${date}.pdf`;
};

/**
 * Builds the register, renders it to PDF and saves it.
 *
 * `previewHtml` lets the print editor hand over exactly what is on screen —
 * including any corrections just made. Callers without a preview omit it and
 * the register is built fresh from the meeting data.
 */
export const downloadRegisterPdf = async (
  input: RegisterInput,
  opts: { token?: string | null; apiBaseUrl: string; previewHtml?: string },
): Promise<void> => {
  const blob = await renderRegisterPdfBlob(input, opts);
  saveBlob(blob, fileNameFor(input));
};

/**
 * Prints the register from the rendered PDF rather than from the web page.
 *
 * A browser printing a web page may add its own date, title, URL and page
 * number in the margins, and the print dialog's margin setting (which it
 * remembers between prints) can override the document's. A PDF prints exactly
 * as rendered, with none of that furniture. "Save as PDF" in the same dialog
 * still works.
 */
export const printRegisterPdf = async (
  input: RegisterInput,
  opts: { token?: string | null; apiBaseUrl: string; previewHtml?: string },
): Promise<void> => {
  const blob = await renderRegisterPdfBlob(input, opts);
  const url = URL.createObjectURL(blob);

  document.getElementById('kenha-pdf-print-frame')?.remove();
  const frame = document.createElement('iframe');
  frame.id = 'kenha-pdf-print-frame';
  // Kept rendered (not display:none / visibility:hidden), or the browser's PDF
  // viewer never loads inside it and print() does nothing.
  Object.assign(frame.style, {
    position: 'fixed', right: '0', bottom: '0', width: '1px', height: '1px', border: '0', opacity: '0',
  });
  frame.src = url;

  await new Promise<void>((resolve, reject) => {
    frame.onload = () => {
      // The PDF viewer finishes initialising slightly after the load event.
      setTimeout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 400);
    };
    frame.onerror = () => reject(new Error('The PDF could not be opened for printing.'));
    document.body.appendChild(frame);
  });

  // Leave the frame and URL alive while the print dialog is open.
  setTimeout(() => {
    frame.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
};

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Give the browser a moment to start the save before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
};

const renderRegisterPdfBlob = async (
  input: RegisterInput,
  opts: { token?: string | null; apiBaseUrl: string; previewHtml?: string },
): Promise<Blob> => {
  const bodyHtml = opts.previewHtml?.trim() || buildRegisterHtml(input);
  const document_ = buildPrintDocument(bodyHtml, input);
  const selfContained = await inlineImages(document_);

  const res = await fetch(
    `${opts.apiBaseUrl}/documents/register-pdf/${input.meeting.meeting_id}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: JSON.stringify({ html: selfContained, orientation: input.orientation }),
    },
  );

  if (!res.ok) {
    let message = 'Could not build the register PDF.';
    try {
      const body = await res.json();
      message = body?.message || body?.error || message;
    } catch {
      // Non-JSON error body; keep the default wording.
    }
    throw new Error(message);
  }

  return res.blob();
};
