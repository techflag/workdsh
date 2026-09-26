import type { ProjectCapabilityKind, ProjectCapabilityRef } from 'workdsh-contracts/projects';

export interface CapabilityChoice {
  readonly id: string;
  readonly label: string;
  readonly kind: ProjectCapabilityKind;
  readonly scope?: 'personal' | 'public';
  readonly revision?: string;
}

export function mergeCapabilitySelection(
  existing: readonly ProjectCapabilityRef[],
  available: readonly CapabilityChoice[],
  picked: ReadonlySet<string>,
  explicitUpgrades: ReadonlySet<string>,
): readonly ProjectCapabilityRef[] {
  const byId = new Map(existing.map(row => [row.id, row]));
  return available.filter(row => picked.has(row.id)).map(row => {
    const current = byId.get(row.id);
    if (current && !explicitUpgrades.has(row.id)) return current;
    return {
      kind: row.kind,
      id: row.id,
      label: row.label,
      ...(row.scope ? { scope: row.scope } : {}),
      ...(row.revision ? { revision: row.revision } : {}),
    };
  });
}
