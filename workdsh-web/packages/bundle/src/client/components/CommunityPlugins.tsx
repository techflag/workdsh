import type { ReactNode } from 'react';

/** This is a discovery link, not a second plugin installer or a copied catalog. */
export function CommunityPlugins({ view }: { readonly view: 'summary' | 'page' }): ReactNode {
  if (view === 'summary') return 'WorkDSH 提供的第三方 DSH 插件发现入口；不是 DSH 官方推荐。';
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 680, lineHeight: 1.65 }}>
      <p style={{ margin: 0 }}>在 dshmarket 浏览社区插件，确认作者、来源、版本及兼容性后，复制包名或仓库地址，再使用此页面右上角的“添加插件”安装。</p>
      <p style={{ margin: 0 }}>dshmarket 是独立的第三方网站。打开后适用该网站的内容和隐私政策；WorkDSH 不会自动安装其中的插件。</p>
      <a href="https://dshmarket.com/zh/" target="_blank" rel="noopener noreferrer" style={{ width: 'fit-content', padding: '10px 16px', borderRadius: 8, background: '#3679ed', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
        前往 dshmarket 浏览社区插件 ↗
      </a>
    </div>
  );
}
