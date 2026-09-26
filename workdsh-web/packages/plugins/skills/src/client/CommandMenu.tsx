import * as React from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { SkillManagementClient } from './management.js';

/** Project display labels only; native pick routes still receive original source/index and command token. */
export function installSkillCommandMenu(ctx: Context, management: SkillManagementClient): void {
  const key = 'conversation.input.overlay';
  let dispose: (() => void) | undefined;
  const install = () => {
    if (dispose) return;
    const original = ctx.slots.entriesOfSlot(key).find(entry => entry.options.id === 'slash-menu');
    if (!original?.inject) return;
    const Native = original.component as React.ComponentType<any>;
    function NamedCommands(props: any) {
      const [labels, setLabels] = React.useState<ReadonlyMap<string, string>>(new Map());
      React.useEffect(() => {
        let active = true;
        void management.list().then(rows => { if (active) setLabels(new Map(rows.filter(row => row.title && /[\u3400-\u9fff]/.test(row.title)).map(row => [row.name, row.title!]))); }).catch(() => {});
        return () => { active = false; };
      }, []);
      const menu = React.useMemo(() => {
        let previous: unknown;
        let projected: unknown;
        return { subscribe: props.menu.subscribe, getSnapshot: () => {
          const state = props.menu.getSnapshot();
          if (state !== previous) {
            previous = state;
            projected = { ...state, groups: state.groups.map((group: any) => group.source !== 'skill' ? group : { ...group, items: group.items.map((item: any) => labels.has(item.name) ? { ...item, name: labels.get(item.name), hint: item.name } : item) }) };
          }
          return projected;
        } };
      }, [props.menu, labels]);
      return <Native {...props} menu={menu} />;
    }
    dispose = ctx.slots.register({ name: key, id: 'slash-menu', priority: -10, order: 0, locale: 'slash.menu', inject: original.inject } as any, NamedCommands);
  };
  ctx.effect(() => { const stop = ctx.slots.subscribe(key, install); install(); return () => { stop(); dispose?.(); }; }, 'workdsh.skill-command-menu');
}
