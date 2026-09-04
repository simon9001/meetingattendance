import React, { useId } from 'react';

/** Props FormField generates and the control must spread onto itself. */
export interface FieldControlProps {
  id: string;
  required?: boolean;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

interface FormFieldProps {
  label: string;
  /** Validation message. Its presence marks the control invalid. */
  error?: string | null;
  /** Static helper text shown under the control when there is no error. */
  hint?: string;
  required?: boolean;
  className?: string;
  /** Supply your own id to match an existing one; otherwise a stable id is generated. */
  id?: string;
  /**
   * Render prop receiving the wiring the control must spread. Using a render prop
   * rather than cloneElement keeps the association explicit and type-checked,
   * and works with the plain controlled inputs used across this app.
   */
  children: (field: FieldControlProps) => React.ReactNode;
}

/**
 * Labelled form control wrapper.
 *
 * Most fields in this codebase render a <label> as a sibling of their input with
 * no htmlFor and no id, which leaves the control programmatically unlabelled and
 * makes the label text unclickable. FormField owns that wiring — plus the
 * error/hint association via aria-describedby — so no call site has to remember it.
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  hint,
  required,
  className = '',
  id: providedId,
  children,
}) => {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  // Only describe by what is actually rendered, or screen readers announce a
  // reference to a non-existent element.
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={id} className="form-label">
        {label}
        {required && (
          <span className="form-label-required" aria-hidden="true"> *</span>
        )}
      </label>

      {children({
        id,
        required,
        ...(error ? { 'aria-invalid': true as const } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}

      {/* aria-live so a validation message that appears after submit is announced,
          not just rendered. */}
      {error ? (
        <p id={errorId} className="form-error" role="alert">{error}</p>
      ) : hint ? (
        <p id={hintId} className="form-hint">{hint}</p>
      ) : null}
    </div>
  );
};
