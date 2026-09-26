export interface TeamMemberView { readonly id: string; readonly name: string; readonly role: 'lead' | 'teammate'; readonly status: 'running' | 'idle' | 'inactive' | 'provisioning' | 'failed'; readonly description?: string; readonly diagnostics: readonly string[]; }
export interface TeamTaskView { readonly id: string; readonly revision: number; readonly subject: string; readonly description: string; readonly status: 'pending' | 'in_progress' | 'completed' | 'deleted'; readonly ownerName?: string; readonly blockedBy: readonly string[]; readonly writeScopes: readonly string[]; readonly ready: boolean; readonly writeScopeWarnings: readonly string[]; }
export interface TeamView { readonly members: readonly TeamMemberView[]; readonly tasks: readonly TeamTaskView[]; }

export interface TeamActivitySummary {
  readonly member?: TeamMemberView;
  readonly task?: TeamTaskView;
  readonly focus?: string;
  readonly message: string;
  readonly runningCount: number;
  readonly phase?: 'failed' | 'interrupted';
}

/** Project only official Team view facts; never infer work from model prose. */
export function summarizeTeamActivity(view: TeamView | undefined, currentSessionId: string, fallback: string, memberTerminalPhases: ReadonlyMap<string, 'failed' | 'interrupted'> = new Map()): TeamActivitySummary {
  const members = view?.members ?? [], tasks = view?.tasks ?? [];
  const ownedTasks = (member: TeamMemberView) => tasks.filter(task => task.ownerName === member.name && task.status !== 'deleted');
  // Official member Sessions can remain `running` briefly after their shared
  // task completed. Once a teammate has task history, the task state is the
  // stronger signal; otherwise a finished teammate would mask the active lead.
  const running = members.filter(member => member.status === 'running' && (member.role === 'lead' || ownedTasks(member).length === 0 || ownedTasks(member).some(task => task.status === 'in_progress')));
  const activeTasks = tasks.filter(task => task.status === 'in_progress' && running.some(member => member.name === task.ownerName));
  const activeTask = activeTasks.reduce<TeamTaskView | undefined>((latest, row) => !latest || row.revision >= latest.revision ? row : latest, undefined);
  // The public Session Controller deliberately does not materialize unopened
  // child Sessions. An inactive Team member that still owns an in-progress
  // task is therefore the official cross-session recovery signal: the member
  // is not working and the durable task was not completed.
  const attentionTasks = tasks.filter(task => task.status === 'in_progress' && members.some(member => member.name === task.ownerName && (member.status === 'failed' || member.status === 'inactive' || memberTerminalPhases.has(String(member.id)))));
  const attentionTask = attentionTasks.reduce<TeamTaskView | undefined>((latest, row) => !latest || row.revision >= latest.revision ? row : latest, undefined);
  const task = activeTask ?? attentionTask;
  const selected = (task ? members.find(member => member.name === task.ownerName) : undefined)
    ?? running.find(member => String(member.id) === currentSessionId)
    ?? running.find(member => member.role === 'lead')
    ?? running[0];
  const selectedTask = selected && tasks.find(row => row.ownerName === selected.name && row.status === 'in_progress');
  const phase = selected ? memberTerminalPhases.get(String(selected.id)) ?? (selected.status === 'failed' || (selected.status === 'inactive' && !!selectedTask) ? 'failed' : undefined) : undefined;
  const focus = phase === 'failed' && selectedTask
    ? `${selectedTask.subject} · 本轮未完成`
    : phase === 'interrupted' && selectedTask
      ? `${selectedTask.subject} · 已停止，可继续`
      : selectedTask?.subject || selected?.description || (selected ? '正在处理' : undefined);
  const extra = selected && running.includes(selected) && running.length > 1 ? ` · 另 ${running.length - 1} 位专家处理中` : '';
  return { member: selected, task: selectedTask, focus, runningCount: running.length, phase, message: selected ? `${selected.name} · ${focus}${extra}` : fallback };
}
