import type { ReactNode } from 'react';

/** dshmarket explicitly provides its complete panel for embedding by a host. */
export interface MarketHost {
  readonly version: number;
  readonly render: (props?: Record<string, never>) => ReactNode;
  readonly setSettingsVisible: (visible: boolean) => void;
}

export function communityMarketView(market: MarketHost) {
  return function CommunityMarket({ view }: { readonly view: 'summary' | 'page' }): ReactNode {
    if (view === 'summary') return '进入 dsh-market 插件市场，搜索并安装 DSH 社区插件。';
    return market.render();
  };
}
