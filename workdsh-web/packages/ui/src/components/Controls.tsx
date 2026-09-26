import * as React from 'react';
import { Button as NativeButton, Input as NativeInput } from '@deepseek-ai/dsh-client-ui-primitives';

// The native alpha.1 API does not forward refs. Resolve the rendered element by
// its stable React id, retaining native controls and working with React 18/19.
export const Button = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof NativeButton> & { tone?: 'danger' }>(
  function Button({ variant = 'outline', type = 'button', tone, size = 'md', id: suppliedId, ...props }, ref) {
    const generatedId = React.useId();
    const id = suppliedId ?? generatedId;
    React.useImperativeHandle(ref, () => document.getElementById(id) as HTMLButtonElement, [id]);
    return <NativeButton id={id} type={type} variant={variant} size={size} data-wd-control="button" data-size={size} data-tone={tone} {...props} />;
  },
);

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof NativeInput>>(
  function Input({ className = '', id: suppliedId, ...props }, ref) {
    const generatedId = React.useId();
    const id = suppliedId ?? generatedId;
    React.useImperativeHandle(ref, () => document.getElementById(id) as HTMLInputElement, [id]);
    return <NativeInput id={id} data-wd-control="input" className={`wd-form-input ${className}`} {...props} />;
  },
);

export function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select data-wd-control="select" className={`wd-form-select ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea data-wd-control="textarea" className={`wd-form-textarea ${className}`} {...props} />;
}
