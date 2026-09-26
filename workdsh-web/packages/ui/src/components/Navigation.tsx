import * as React from 'react';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon.js';

export type NavItemProps = {
  readonly label: string;
  readonly icon: IconName;
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly reason?: string;
  readonly onClick?: () => void;
  readonly compact?: boolean;
};

export function NavItem({ label, icon, active, disabled, reason, onClick, compact = false }: NavItemProps) {
  return (
    <button type="button" className={`wd-nav-item${active ? ' is-active' : ''}`} disabled={disabled} title={disabled ? reason : label} onClick={onClick} aria-label={label} aria-current={active ? 'page' : undefined}>
      <span className="wd-icon-slot"><Icon name={icon} /></span>
      {!compact && <span>{label}</span>}
      {!compact && disabled && <small>待开放</small>}
    </button>
  );
}

export type IconButtonProps = {
  readonly label: string;
  readonly icon: IconName;
  readonly onClick: () => void;
};

export function IconButton({ label, icon, onClick }: IconButtonProps) {
  return <button type="button" className="wd-icon-button" title={label} aria-label={label} onClick={onClick}><Icon name={icon} /></button>;
}

export type NavGroupProps = {
  readonly label: string;
  readonly count?: number;
  readonly children: ReactNode;
};

export function NavGroup({ label, count, children }: NavGroupProps) {
  return <details className="wd-nav-group" open><summary>{label}{count === undefined ? '' : ` (${count})`}<Icon name="chevron" size={12} /></summary>{children}</details>;
}
