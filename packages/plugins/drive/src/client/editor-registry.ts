import type { DriveEditorHandle, DriveEditorMount, DriveEditorRegistry } from 'workdsh-contracts/drive';

/** 按扩展名（不含前导点、小写）路由在线编辑器；无匹配即视为不可编辑。 */
const extensionOf = (name: string): string => {
  const at = name.lastIndexOf('.');
  return at < 0 ? '' : name.slice(at + 1).trim().toLowerCase();
};
const keyOf = (extension: string): string => extension.trim().replace(/^\./, '').toLowerCase();

export function createDriveEditorRegistry(): DriveEditorRegistry {
  const handlers = new Map<string, DriveEditorMount>();
  const listeners = new Set<() => void>(); let revision = 0;
  const changed = () => { revision += 1; for (const listener of listeners) listener(); };
  return {
    register(extensions, mount) {
      const keys = [...new Set(extensions.map(keyOf).filter(Boolean))];
      for (const key of keys) handlers.set(key, mount); changed();
      return () => { for (const key of keys) if (handlers.get(key) === mount) handlers.delete(key); changed(); };
    },
    canEdit(name) { return handlers.has(extensionOf(name)); },
    async mount(target, input): Promise<DriveEditorHandle> {
      const handler = handlers.get(extensionOf(input.name));
      if (!handler) throw new Error('drive/editor-unavailable');
      return handler(target, input);
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getRevision() { return revision; },
  };
}
