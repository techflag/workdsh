export type Phase = 'idle' | 'working' | 'waiting' | 'completed' | 'interrupted' | 'failed';
export interface ActivityState { phase: Phase; startedAt?: number; lastProgressAt?: number; skill?: string; tool?: string; delivered: boolean; children: readonly { id: string; label?: string }[]; }
export interface Entry { readonly event: { readonly type: string; readonly time: number; readonly data: unknown }; }
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const parse = (value: unknown) => { try { return record(typeof value === 'string' ? JSON.parse(value) : value); } catch { return {}; } };
/** Fold structured events, never reasoning prose. No network, execution or persisted state. */
export function projectActivity(entries: readonly Entry[], running: boolean): ActivityState {
  let phase: Phase = 'idle', startedAt: number | undefined, lastProgressAt: number | undefined, skill: string | undefined, tool: string | undefined, delivered = false;
  const children = new Map<string, { id: string; label?: string }>();
  const calls = new Map<string, string>();
  const skills = new Map<string, string>();
  for (const {event} of entries) {
    const data = record(event.data);
    if (event.type === 'turn/start') { phase = 'working'; startedAt = event.time; lastProgressAt = event.time; skill = undefined; tool = undefined; delivered = false; calls.clear(); skills.clear(); children.clear(); }
    if (event.type === 'tool/call') {
      tool = typeof data.name === 'string' ? data.name : undefined;
      if (typeof data.callId === 'string' && tool) calls.set(data.callId, tool);
      if (tool === 'skill' && typeof data.callId === 'string') { const args = parse(data.arguments); if (typeof args.name === 'string') skills.set(data.callId, args.name); }
      if (tool === 'ask_user_question') phase = 'waiting';
    }
    if (event.type === 'tool/result') {
      const message = record(data.message), source = record(message.source);
      const result = typeof message.toolCallId === 'string' ? message : Array.isArray(message.content) ? message.content.map(record).find(block => block.type === 'tool-result') : undefined;
      const callId = String(message.toolCallId ?? source.callId);
      if (skills.has(callId) && result && !result.isError) skill = skills.get(callId);
      if (calls.get(callId) === 'ask_user_question') phase = 'working';
      tool = undefined;
    }
    if (event.type === 'subagent/catalog' && typeof data.childId === 'string') children.set(data.childId, { id: data.childId, ...(typeof data.label === 'string' && !data.label.startsWith('delegation-') ? { label: data.label } : {}) });
    if (event.type === 'deliverables/presented') delivered = true;
    if (event.type === 'turn/end') {
      const kind = record(data.reason).kind;
      phase = kind === 'completed' ? 'completed' : kind === 'interrupted' || kind === 'cancelled' ? 'interrupted' : 'failed';
      tool = undefined;
    }
    if (['assistant/live-chunk','assistant/message','tool/call','tool/result'].includes(event.type)) lastProgressAt = event.time;
  }
  // Host lifecycle wins over old terminal events, including reconnect windows.
  if (running && phase !== 'waiting') phase = 'working';
  if (!running && (phase === 'working' || phase === 'waiting')) phase = 'interrupted';
  return { phase, startedAt, lastProgressAt, skill, tool, delivered, children: [...children.values()] };
}
export function activityMessage(state: ActivityState): string {
  if (state.phase === 'waiting') return '需要你确认';
  if (state.phase === 'interrupted') return '任务已中断，已有成果保留';
  if (state.phase === 'failed') return '本轮未完成，请查看原始过程';
  if (state.phase === 'completed') return state.delivered ? '本轮结束 · 已交付文件' : '本轮已结束';
  if (state.phase === 'idle') return '准备好了';
  if (state.tool === 'spawn_teammate' || state.tool?.startsWith('team_task_')) return '正在处理专家协作';
  if (state.tool) return '正在执行工具';
  return '正在处理';
}
