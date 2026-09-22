import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client';
import * as React from 'react';
import { GeWordmark } from './GeWordmark.js';

export function BrandName() {
  return <span data-testid="workdsh-brand">DSH JOB AI</span>;
}

/** The owner supplies the box edge; the wordmark keeps its own aspect ratio. */
export function BrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return <GeWordmark height={size} />;
}

export function DiagnosticsMark() {
  return <span aria-hidden>W</span>;
}
