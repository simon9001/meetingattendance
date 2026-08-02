/**
 * Shared DaisyUI feedback components.
 * Use these everywhere instead of ad-hoc Loader2 / custom spinners.
 */

// ─── Spinner ──────────────────────────────────────────────────────────────────

/** Centered full-area loading spinner */
export const PageSpinner = ({ text = 'Loading...' }: { text?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4">
    <span className="loading loading-spinner loading-xl" />
    {text && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{text}</p>}
  </div>
);

/** Small inline spinner for inside buttons or tight areas */
export const InlineSpinner = () => (
  <span className="loading loading-spinner loading-sm" />
);

// ─── Alerts ───────────────────────────────────────────────────────────────────

/** Red error alert */
export const AlertError = ({ message }: { message: string }) => (
  <div role="alert" className="alert alert-error">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>{message}</span>
  </div>
);

/** Yellow warning alert */
export const AlertWarning = ({ message }: { message: string }) => (
  <div role="alert" className="alert alert-warning">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <span>{message}</span>
  </div>
);

/** Blue info alert */
export const AlertInfo = ({ message }: { message: string }) => (
  <div role="alert" className="alert alert-info">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-6 w-6 shrink-0 stroke-current">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>{message}</span>
  </div>
);
