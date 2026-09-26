import * as React from 'react';
import { useEffect, useRef, type ReactNode } from 'react';

export type ModalProps = {
  readonly open: boolean;
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly onClose: () => void;
};

/** Shared accessible dialog shell. Domain plugins own dialog content and actions. */
export function Modal({ open, label, children, className = '', onClose }: ModalProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => dialog.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab' || !dialog.current) return;
      const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) { event.preventDefault(); dialog.current.focus(); return; }
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = previousOverflow;
      returnFocus.current?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="wd-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialog} className={`wd-dialog ${className}`.trim()} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        <button type="button" className="wd-dialog-close" aria-label="关闭" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
        {children}
      </div>
    </div>
  );
}
