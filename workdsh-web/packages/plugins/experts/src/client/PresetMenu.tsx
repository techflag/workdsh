import * as React from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { ExpertManagementClient } from './management.js';
import { isNativePreset, nativePresetRows, requireNativePreset } from './preset-policy.js';

/** A summoned expert is already bound; this surface names it without offering a preset swap. */
function SummonedExpertSeat(props: any) {
  const state = props.useAgentPresetSeat((snapshot: any) => snapshot);
  // A fresh slot callback must not turn a roster update into another roster request.
  const loadRef = React.useRef(props.load);
  loadRef.current = props.load;
  React.useEffect(() => { void loadRef.current(); }, [state.current]);
  const name = state.options.find((row: any) => row.id === state.current)?.name;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, font: 'inherit', color: 'inherit' }} title={name || '已召唤专家'}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="6" r="3"/><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M10 9 6.5 14M14 9l3.5 5M8 17h8"/></svg>
    {name || '已召唤专家'}
  </span>;
}

/** Keep the native mount loader stable while always invoking the latest injected callback. */
function StableNativePresetSeat(props: any) {
  const { Native, ...seatProps } = props;
  const loadRef = React.useRef(props.load);
  loadRef.current = props.load;
  const load = React.useCallback(() => loadRef.current(), []);
  return <Native {...seatProps} load={load}/>;
}

/**
 * Native controllers stay owned by Harness; expert execution uses the binding-aware summon path.
 *
 * Only the new-session control is wrapped: `conversation.hero.agentPreset` is a single-seat
 * slot, so a later registration takes the seat over. `settings.section` is an additive list
 * slot (every registration is its own page with no replacement semantics), so wrapping it
 * only produced a duplicate "Agent 预设" page next to the Harness-owned one. The settings
 * page stays the Harness owner's; expert presets remain guarded by the Host-side preset
 * checks, not by a second client page.
 */
export function installExpertPresetMenu(ctx: Context, _management: ExpertManagementClient): void {
  const install = (key: string) => {
    let dispose: (() => void) | undefined;
    const ready = () => {
      if (dispose) return;
      const original = ctx.slots.entriesOfSlot(key as any).find((entry: any) => !!entry.inject);
      if (!original?.inject) return;
      const Native = original.component as React.ComponentType<any>;
      const projected = new WeakMap<object, any>();
      const project = (state: any, field: 'options') => {
        let value = projected.get(state);
        if (!value) { value = { ...state, [field]: nativePresetRows(state[field]) }; projected.set(state, value); }
        return value;
      };
      function PublicPresets(props: any) {
        const current = props.useAgentPresetSeat((state: any) => state.current);
        if (current && !isNativePreset(current)) return <SummonedExpertSeat {...props}/>;
        const useSeat = (selector: (state: any) => unknown) => props.useAgentPresetSeat((state: any) => selector(project(state, 'options')));
        return <StableNativePresetSeat Native={Native} {...props} useAgentPresetSeat={useSeat} select={async (id: string) => { requireNativePreset(id); return props.select(id); }} />;
      }
      dispose = ctx.slots.register({ name: key, priority: -10, locale: 'settings.agentPreset', inject: original.inject } as any, PublicPresets);
    };
    ctx.effect(() => { const stop = ctx.slots.subscribe(key as any, ready); ready(); return () => { stop(); dispose?.(); }; }, 'workdsh.expert-preset-menu.seat');
  };
  install('conversation.hero.agentPreset');
}
