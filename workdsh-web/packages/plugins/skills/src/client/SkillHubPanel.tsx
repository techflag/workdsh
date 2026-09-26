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
  iconUrl?: string;
  pageUrl?: string;
  installed?: boolean;
};

type SearchResponse = { ok: boolean; items?: SkillHubCard[]; total?: number; error?: string };
const PAGE_SIZE = 24;

function SkillHubIcon({ card }: { card: SkillHubCard }) {
  const iconUrl = card.iconUrl && /^https:\/\//i.test(card.iconUrl) ? card.iconUrl : undefined;
  return <span className="skillhub-icon" aria-hidden="true">{card.name.slice(0, 1).toUpperCase()}{iconUrl && <img src={iconUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true; }} />}</span>;
}

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
export function SkillHubPanel({ query, onInstalled, onOpenInstalled }: { query: string; onInstalled: () => Promise<void>; onOpenInstalled: () => void }) {
  const [cards, setCards] = useState<SkillHubCard[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [installing, setInstalling] = useState('');
  const [installedName, setInstalledName] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setBusy(true); setError('');
      void skillHub<SearchResponse>('search', { query: query.trim(), limit: PAGE_SIZE, offset: page * PAGE_SIZE }, controller.signal)
        .then(result => { setCards([...new Map((result.items ?? []).map(item => [item.slug, item])).values()]); setTotal(result.total ?? 0); })
        .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'SkillHub 暂不可用'); })
        .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, page]);

  const install = async (card: SkillHubCard) => {
    setInstalling(card.slug); setError('');
    try {
      await skillHub('install', { slug: card.slug });
      setCards(current => current.map(item => item.slug === card.slug ? { ...item, installed: true } : item));
      setInstalledName(card.name);
      void onInstalled();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '安装失败，请重试。'); }
    finally { setInstalling(''); }
  };

  const pageCount = Math.ceil(total / PAGE_SIZE);
  const firstPage = Math.max(0, Math.min(page - 2, pageCount - 5));
  const pageNumbers = Array.from({ length: Math.min(5, pageCount) }, (_, index) => firstPage + index);

  return <section className="skillhub-market" aria-label="SkillHub 技能目录">
    <div className="market-head"><h2>SkillHub <span className="market-count">{total}</span></h2><span className="muted">来源：SkillHub · 安装到本机 DSH 技能目录</span></div>
    {installedName && <div className="skillhub-success" role="status"><span>已安装「{installedName}」。</span><Button onClick={onOpenInstalled}>查看已安装</Button><button className="skillhub-dismiss" aria-label="关闭安装提示" onClick={() => setInstalledName('')}>×</button></div>}
    {error && <p className="catalog-note" role="alert">{error}</p>}
    {busy ? <p className="muted" role="status">正在读取 SkillHub…</p> : cards.length ? <div className="grid">{cards.map(card =>
      <article className="card market-card" key={card.slug}>
        <div className="card-top"><a className="card-open" href={card.pageUrl?.startsWith('https://skillhub.cn/skills/') ? card.pageUrl : `https://skillhub.cn/skills/${encodeURIComponent(card.slug)}`} target="_blank" rel="noopener noreferrer" aria-label={`查看 ${card.name} 的来源页`}><SkillHubIcon card={card} /><span className="card-title"><strong title={card.name}>{card.name}</strong><small>{card.categoryLabel || card.owner || card.slug}</small></span></a>
          <Button className={`install${card.installed || installing === card.slug ? ' is-status' : ''}${card.installed ? ' is-installed' : ''}`} disabled={card.installed || Boolean(installing)} aria-label={card.installed ? `已安装 ${card.name}` : `安装 ${card.name}`} onClick={() => void install(card)}>{card.installed ? '已安装' : installing === card.slug ? '安装中…' : '＋'}</Button></div>
        <p className="muted">{card.description}</p>
        <small className="skillhub-meta">版本 {card.version || '未标注'} · 许可证请查看来源页</small>
      </article>)}</div> : !error && <p className="muted">没有找到匹配的技能。</p>}
    {!busy && pageCount > 1 && <nav className="skillhub-pagination" aria-label="SkillHub 分页"><Button disabled={page === 0} onClick={() => setPage(value => value - 1)}>上一页</Button>{firstPage > 0 && <span aria-hidden="true">…</span>}{pageNumbers.map(number => <button key={number} aria-current={page === number ? 'page' : undefined} className={page === number ? 'active' : ''} onClick={() => setPage(number)}>{number + 1}</button>)}{firstPage + pageNumbers.length < pageCount && <span aria-hidden="true">…</span>}<Button disabled={page + 1 >= pageCount} onClick={() => setPage(value => value + 1)}>下一页</Button><span className="muted">第 {page + 1} / {pageCount} 页</span></nav>}
  </section>;
}
