import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  /** Controls visibility. The dialog is only mounted in the DOM while true. */
  open: boolean;
  /** Called for every dismissal route: Escape, backdrop click, and the close button. */
  onClose: () => void;
  /** Accessible name for the dialog. Rendered in the header unless `hideHeader`. */
  title: string;
  children: React.ReactNode;
  /** Optional action row pinned below the scrollable body. */
  footer?: React.ReactNode;
  maxWidth?: number | string;
  /** Set false for destructive or long forms where a stray click shouldn't discard input. */
  closeOnBackdrop?: boolean;
  /** Hide the default header when the body supplies its own chrome. */
  hideHeader?: boolean;
  className?: string;
  /** Extra classes for the scrollable body, so call sites keep their style hooks. */
  bodyClassName?: string;
  /** Extra classes for the footer action row. */
  footerClassName?: string;
  /**
   * When supplied, the body and footer are wrapped in a <form> with this
   * handler. Form modals need their submit button (which lives in the footer)
   * inside the same form as the fields, so the wrapper has to span both.
   */
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
}

/**
 * Shared modal built on the native <dialog> element.
 *
 * Using showModal() rather than a hand-rolled overlay means the browser gives us
 * focus trapping, Escape handling, the top-layer stacking context, and inert
 * background content for free — all of which the previous `.modal-overlay` divs
 * and daisyUI `modal modal-open` dialogs were missing.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 600,
  closeOnBackdrop = true,
  hideHeader = false,
  className = '',
  bodyClassName = '',
  footerClassName = '',
  onSubmit,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Drive the native dialog from the `open` prop. showModal() is what grants the
  // focus trap and top-layer placement; setting the `open` attribute does not.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // showModal() makes the background inert but still lets it scroll behind the
  // dialog, so the scroll lock stays our responsibility.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={`app-modal ${className}`}
      aria-label={title}
      // Escape fires `cancel`; prevent the default close so React state stays
      // the single source of truth for whether the modal is open.
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClose={onClose}
      onClick={(e) => {
        if (!closeOnBackdrop) return;
        // A click landing on the <dialog> itself is the backdrop — the content
        // sits inside .app-modal-content and stops the event there.
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="app-modal-content" style={{ maxWidth }}>
        {!hideHeader && (
          <div className="modal-header">
            <h2 className="app-modal-title">{title}</h2>
            <button
              type="button"
              className="modal-close-btn"
              aria-label="Close dialog"
              onClick={onClose}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        {onSubmit ? (
          <form onSubmit={onSubmit} className="app-modal-form">
            <div className={`modal-body ${bodyClassName}`}>{children}</div>
            {footer && <div className={`modal-footer ${footerClassName}`}>{footer}</div>}
          </form>
        ) : (
          <>
            <div className={`modal-body ${bodyClassName}`}>{children}</div>
            {footer && <div className={`modal-footer ${footerClassName}`}>{footer}</div>}
          </>
        )}
      </div>
    </dialog>
  );
};
