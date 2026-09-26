/** Read-only presentation seam; identities never grant execution authority. */
export interface ActivityIdentity { readonly key?: string; readonly name: string; readonly profession?: string; readonly avatar?: string; readonly kind?: 'assistant' | 'expert' | 'team'; readonly teamName?: string; readonly members?: readonly ActivityIdentity[]; }
export interface ActivityPresentation {
  registerIdentity(resolver: (sessionId: string, signal: AbortSignal) => Promise<ActivityIdentity | undefined>): () => void;
  resolveIdentity(sessionId: string, signal: AbortSignal): Promise<ActivityIdentity | undefined>;
  registerSkillLabels(resolver: () => Promise<ReadonlyMap<string, string>>): () => void;
  resolveSkillLabels(): Promise<ReadonlyMap<string, string>>;
  subscribe(listener: () => void): () => void;
  getRevision(): number;
}
