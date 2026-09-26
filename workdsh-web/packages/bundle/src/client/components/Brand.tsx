import * as React from 'react';
import { LogoMark } from 'workdsh-ui';

export function BrandName() {
  return <span data-testid="workdsh-brand">WorkDSH</span>;
}

export function BrandMark() {
  return <LogoMark size={22} />;
}

export function DiagnosticsMark() {
  return <span aria-hidden>W</span>;
}
