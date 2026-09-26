/** Presentation links carry an object id, never a publish proof or authority. */
export function expertDraftUrl(expertId: string): string {
  return `?${new URLSearchParams({ 'workdsh-view': 'experts', 'expert-draft': expertId })}`;
}

export function expertDraftId(search: string): string | undefined {
  const id = new URLSearchParams(search).get('expert-draft');
  return id && id.length <= 256 ? id : undefined;
}
