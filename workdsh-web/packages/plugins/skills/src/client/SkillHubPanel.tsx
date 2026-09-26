import * as React from 'react';
import { useEffect, useState } from 'react';
import { Button } from 'workdsh-ui';

type SkillHubCard = {
  slug: string;
  name: string;
  description: string;
  categoryLabel?: string;
  version?: string;
  owner?: string;
  installed?: boolean;
};

type SearchResponse = { ok: boolean; items?: SkillHubCard[]; total?: number; error?: string };

async function skillHub<T extends { ok: boolean; error?: string }>(method: string, payload: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(new URL('./skillhub', document.baseURI), {
    method: 'POST', credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ method, ...payload }), signal,
  });
  const result = await response.json() as T;
  if (!response.ok || !result.ok) throw new Error(result.error || `SkillHub 请求失败 (${response.status})`);
  return result;
}

/** Reuse the installed DSH plugin's search and verified installation path. */
export function SkillHubPanel({ query, onInstalled }: { query: string; onInstalled: () => Promise<void> }) {
  const [cards, setCards] = useState<SkillHubCard[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [installing, setInstalling] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setBusy(true); setError('');
      void skillHub<SearchResponse>('search', { query: query.trim(), limit: 24 }, controller.signal)
        .then(result => { setCards([...new Map((result.items ?? []).map(item => [item.slug, item])).values()]); setTotal(result.total ?? 0); })
        .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'SkillHub 暂不可用'); })
        .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, revision]);

  const install = async (card: SkillHubCard) => {
    setInstalling(card.slug); setError('');
    try {
      await skillHub('install', { slug: card.slug });
      await onInstalled();
      setRevision(value => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '安装失败，请重试。'); }
    finally { setInstalling(''); }
  };

  return <section className="skillhub-market" aria-label="SkillHub 技能目录">
    <div className="market-head"><h2>SkillHub <span className="market-count">{total}</span></h2><span className="muted">来源：SkillHub · 安装到本机 DSH 技能目录</span></div>
    {error && <p className="catalog-note" role="alert">{error}</p>}
    {busy ? <p className="muted" role="status">正在读取 SkillHub…</p> : cards.length ? <div className="grid">{cards.map(card =>
      <article className="card market-card" key={card.slug}>
        <div className="card-top"><a className="card-open" href={`https://skillhub.cn/skills/${encodeURIComponent(card.slug)}`} target="_blank" rel="noopener noreferrer" aria-label={`查看 ${card.name} 的来源页`}><span className="skill-mark" aria-hidden>{card.name.slice(0, 1).toUpperCase()}</span><span className="card-title"><strong title={card.name}>{card.name}</strong><small>{card.categoryLabel || card.owner || card.slug}</small></span></a>
          <Button className="install" disabled={card.installed || Boolean(installing)} aria-label={card.installed ? `已安装 ${card.name}` : `安装 ${card.name}`} onClick={() => void install(card)}>{card.installed ? '✓' : installing === card.slug ? '…' : '＋'}</Button></div>
        <p className="muted">{card.description}</p>
        <small className="skillhub-meta">版本 {card.version || '未标注'} · 许可证请查看来源页</small>
      </article>)}</div> : <p className="muted">没有找到匹配的技能。</p>}
  </section>;
}
