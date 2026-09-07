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

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileNameFor(input);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Give the browser a moment to start the save before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
};
