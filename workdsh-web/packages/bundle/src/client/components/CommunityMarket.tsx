import { useEffect, useRef, type ReactNode } from 'react';

const discoverySeenKey = 'workdsh.community-market.discovery-seen';

function DiscoverySummary(): ReactNode {
  const badge = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = badge.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try { if (window.localStorage.getItem(discoverySeenKey)) return; }
    catch { return; }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      node.animate([
        { transform: 'scale(1)', boxShadow: '0 0 0 0 var(--dsw-alias-state-business-primary)' },
        { transform: 'scale(1.08)', boxShadow: '0 0 0 7px transparent', offset: 0.5 },
        { transform: 'scale(1)', boxShadow: '0 0 0 0 transparent' },
      ], { duration: 1000, easing: 'ease-out' });
      try { window.localStorage.setItem(discoverySeenKey, '1'); } catch { /* Storage is optional. */ }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: '100%', whiteSpace: 'nowrap' }}>
    <span ref={badge} style={{ display: 'inline-block', flex: 'none', padding: '1px 7px', borderRadius: 999, color: 'var(--dsw-alias-state-business-primary)', background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 15%, transparent)', fontWeight: 600 }}>第三方市场 →</span>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>搜索并安装 DSH 社区插件</span>
  </span>;
}

/** dshmarket explicitly provides its complete panel for embedding by a host. */
export interface MarketHost {
  readonly version: number;
  readonly render: (props?: Record<string, never>) => ReactNode;
  readonly setSettingsVisible: (visible: boolean) => void;
}

export function communityMarketView(market: MarketHost) {
  return function CommunityMarket({ view }: { readonly view: 'summary' | 'page' }): ReactNode {
    if (view === 'summary') return <DiscoverySummary />;
    return market.render();
  };
}
