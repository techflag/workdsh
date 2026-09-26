import type { ReactNode } from 'react';

/** dshmarket explicitly provides its complete panel for embedding by a host. */
export interface MarketHost {
  readonly version: number;
  readonly render: (props?: Record<string, never>) => ReactNode;
  readonly setSettingsVisible: (visible: boolean) => void;
}

export function communityMarketView(market: MarketHost) {
  return function CommunityMarket({ view }: { readonly view: 'summary' | 'page' }): ReactNode {
    if (view === 'summary') return '浏览、搜索和安装 DSH 社区插件；由第三方 dsh-market 提供。';
    return market.render();
  };
}
