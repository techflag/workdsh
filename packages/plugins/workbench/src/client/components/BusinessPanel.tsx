import * as React from 'react';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { Icon, type IconName } from 'workdsh-ui';
import { workbenchPanelCss } from '../styles.js';

/**
 * 未实现入口的待开放标记。
 *
 * 官方 `sidebar.panellist` 的公开注册面只有 `id` / `order` / `label`（见
 * @deepseek-ai/dsh-client-ui-sidebar 的 SidebarPanelMetadata），行按钮与它的
 * `ctx.layout.selectPanel(id)` 由官方 Sidebar owner 持有，公开契约没有 disabled
 * 语义。因此待开放状态只能通过注册标签和说明面板表达：侧栏标签追加本后缀，
 * 面板页面给出原因与当前可用的替代路径。
 */
export const pendingLabelSuffix = '（待开放）';

export type BusinessPanelDefinition = {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  readonly order: number;
  /**
   * 待开放项的功能说明、未实现原因与当前可用的下一步。workbench 只为待开放项
   * 注册说明用的 `main` 面板，并让侧栏标签追加待开放后缀。
   *
   * 已有真实页面的入口不由本表登记：页面所属插件自己注册 `main` 与同名
   * `sidebar.panellist` 行（例如资料库归 workdsh-plugin-library，能力中心归
   * workdsh-plugin-skills）。否则插件缺席时会出现「有入口、无页面」，点击即抛
   * `layout.selectPanel: main panel "…" is not registered`。
   * 规划状态以 docs/development-order.json 的步骤 ID 为准。
   */
  readonly pending: {
    readonly description: string;
    readonly boundary: string;
  };
};

export const businessPanels = [
  {
    id: 'workdsh-assistant',
    label: '助理',
    icon: 'assistant',
    order: 10,
    pending: {
      description: '创建和管理面向具体工作的 AI 助理。',
      boundary: '本入口待开放：助理尚未实现（开发顺序 D16 / P1-12），页面没有可读取的助理对象，不会返回任何数据。当前可用的路径：先到「专家 · 技能 · 连接器」创建专家，再用原生新任务开始对话。',
    },
  },
  {
    id: 'workdsh-automation',
    label: '定时任务',
    icon: 'automation',
    order: 40,
    pending: {
      description: '查看和管理周期性工作。',
      boundary: '本入口待开放：定时任务尚未实现（开发顺序 D12 / P2-03），页面没有可读取的周期任务或其运行记录。当前可用的路径：周期性工作仍需每次在原生会话里手动发起。',
    },
  },
  {
    id: 'workdsh-more',
    label: '更多',
    icon: 'more',
    order: 60,
    pending: {
      description: '进入 WorkDSH 的更多业务能力。',
      boundary: '本入口待开放：「更多」汇总的后续业务能力都未实现——行业应用 D08、企业后台 D09、团队部署 D14、在线表格与业务页面 D15。当前可用的路径：原生工作区与会话、「专家 · 技能 · 连接器」、资料库，以及 Office 文档能力。',
    },
  },
] as const satisfies readonly BusinessPanelDefinition[];

/** 侧栏注册标签：待开放项一律追加后缀，与面板内的状态徽标一致。 */
export function sidebarLabel(panel: BusinessPanelDefinition): string {
  return `${panel.label}${pendingLabelSuffix}`;
}

export type BusinessPanelProps = PropsRuntime<'main'> & InjectFace<{
  readonly label: string;
  readonly description: string;
  readonly boundary: string;
}>;

export function BusinessPanel({ label, description, boundary }: BusinessPanelProps) {
  return (
    <section className="wd-workbench-panel">
      <style>{workbenchPanelCss}</style>
      <p className="wd-workbench-eyebrow">WORKDSH</p>
      <h1>{label}</h1>
      <p className="wd-workbench-status">此入口待开放</p>
      <p className="wd-workbench-description">{description}</p>
      <p className="wd-workbench-boundary">{boundary}</p>
    </section>
  );
}

export type BusinessPanelIconProps = InjectFace<{ readonly icon: IconName }>;

export function BusinessPanelIcon({ icon }: BusinessPanelIconProps) {
  return <Icon name={icon} />;
}
