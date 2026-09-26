import type { ActivityIdentity, ActivityPresentation } from 'workdsh-contracts/activity';
/** Optional identity/title adapters. This registry stores no session or task facts. */
export function createPresentationRegistry(): ActivityPresentation {
  const identities = new Set<Parameters<ActivityPresentation['registerIdentity']>[0]>();
  const labels = new Set<Parameters<ActivityPresentation['registerSkillLabels']>[0]>();
  const listeners = new Set<() => void>(); let revision = 0;
  const changed = () => { revision++; for (const listener of listeners) { try { listener(); } catch { /* isolate subscribers */ } } };
  return {
    registerIdentity(resolver) { identities.add(resolver); changed(); return () => { if (identities.delete(resolver)) changed(); }; },
    async resolveIdentity(id, signal): Promise<ActivityIdentity | undefined> { for (const resolver of identities) { signal.throwIfAborted(); try { const value = await resolver(id, signal); if (value) return value; } catch { signal.throwIfAborted(); } } },
    registerSkillLabels(resolver) { labels.add(resolver); changed(); return () => { if (labels.delete(resolver)) changed(); }; },
    async resolveSkillLabels() { const map = new Map<string, string>(); for (const resolver of labels) { try { for (const [id, title] of await resolver()) map.set(id, title); } catch { /* optional metadata */ } } return map; },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getRevision() { return revision; },
  };
}
