export const librarySelectionChangedEvent = 'workdsh:library-selection-changed';
export const libraryPickerRequestedEvent = 'workdsh:library-picker-requested';

export function notifyLibrarySelectionChanged(sessionId: string): void {
  window.dispatchEvent(new CustomEvent(librarySelectionChangedEvent, { detail: { sessionId } }));
}

export function requestLibraryPicker(): void {
  window.dispatchEvent(new Event(libraryPickerRequestedEvent));
}

export function listenForLibrarySelection(sessionId: string, refresh: () => void): () => void {
  const listener = (event: Event) => {
    if ((event as CustomEvent<{ sessionId?: string }>).detail?.sessionId === sessionId) refresh();
  };
  window.addEventListener(librarySelectionChangedEvent, listener);
  return () => window.removeEventListener(librarySelectionChangedEvent, listener);
}
