import type { LibraryAssetKind, LibraryOriginalPreviewInput, LibraryOriginalPreviewRegistry } from 'workdsh-contracts/library';

export function createLibraryPreviewRegistry(): LibraryOriginalPreviewRegistry {
  const handlers = new Map<LibraryOriginalPreviewInput['kind'], (target: HTMLElement, input: LibraryOriginalPreviewInput) => void | (() => void) | Promise<void | (() => void)>>();
  const listeners = new Set<() => void>(); let revision = 0;
  const changed = () => { revision += 1; for (const listener of listeners) listener(); };
  return {
    register(kinds, mount) { for (const kind of kinds) handlers.set(kind, mount); changed(); return () => { for (const kind of kinds) if (handlers.get(kind) === mount) handlers.delete(kind); changed(); }; },
    canOpen(kind: LibraryAssetKind) { return kind === 'docx' || kind === 'pptx' ? handlers.has(kind) : false; },
    async mount(target, input) { const handler = handlers.get(input.kind); if (!handler) throw new Error('library/preview-unavailable'); return (await handler(target, input)) ?? (() => undefined); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getRevision() { return revision; },
  };
}
