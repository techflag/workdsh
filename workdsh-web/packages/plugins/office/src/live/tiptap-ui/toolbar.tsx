// MIT — Tiptap UI Components; see LICENSE and SOURCE.md.
import * as React from "react"


const cn = (...values: (string | undefined)[]) => values.filter(Boolean).join(" ")

import { useComposedRef } from "./use-composed-ref.js"

type BaseProps = React.HTMLAttributes<HTMLDivElement>

interface ToolbarProps extends BaseProps {
  variant?: "floating" | "fixed"
}

// Adapted from the official toolbar: native inputs keep their own keyboard behavior.
const useToolbarNavigation = (ref: React.RefObject<HTMLDivElement | null>) => {
  React.useEffect(() => {
    const toolbar = ref.current;
    if (!toolbar) return;
    const handle = (event: KeyboardEvent) => {
      if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement) return;
      const items = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      if (!items.length || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
      event.preventDefault();
      items[next].focus();
    };
    toolbar.addEventListener('keydown', handle);
    return () => toolbar.removeEventListener('keydown', handle);
  }, [ref]);
};

export const Toolbar = React.forwardRef<HTMLDivElement, ToolbarProps>(
  ({ children, className, variant = "fixed", ...props }, ref) => {
    const toolbarRef = React.useRef<HTMLDivElement>(null)
    const composedRef = useComposedRef(toolbarRef, ref)
    useToolbarNavigation(toolbarRef)

    return (
      <div
        ref={composedRef}
        role="toolbar"
        aria-label="toolbar"
        data-variant={variant}
        className={cn("tiptap-toolbar", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Toolbar.displayName = "Toolbar"

export const ToolbarGroup = React.forwardRef<HTMLDivElement, BaseProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      className={cn("tiptap-toolbar-group", className)}
      {...props}
    >
      {children}
    </div>
  )
)
ToolbarGroup.displayName = "ToolbarGroup"

export const ToolbarSeparator = React.forwardRef<HTMLDivElement, BaseProps>(
  ({ ...props }, ref) => (
    <div ref={ref} className="tiptap-separator" role="presentation" {...props} />
  )
)
ToolbarSeparator.displayName = "ToolbarSeparator"
