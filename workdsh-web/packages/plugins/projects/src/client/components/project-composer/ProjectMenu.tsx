import * as React from 'react';
import { Input } from 'workdsh-ui';

export type ProjectMenuKind = 'file' | 'mode' | 'expert' | 'skill' | 'connector';
export type ProjectMenuItem = { id: string; label: string; description?: string; selected?: boolean; disabled?: boolean };
export type ProjectMenuProps = {
  items: Partial<Record<ProjectMenuKind, readonly ProjectMenuItem[]>>;
  pick: (kind: ProjectMenuKind, item: ProjectMenuItem) => Promise<void> | void;
  close: () => void;
  loading?: boolean;
};
const labels: Record<ProjectMenuKind,string> = { file:'添加文件', mode:'模式与命令', expert:'专家', skill:'技能', connector:'连接器' };
const paths: Record<ProjectMenuKind,string> = {file:'m8 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9 M7 13l7-7',mode:'M4 20 8 8 20 3l-5 12-11 5 M8 16l8-8',expert:'M8 4h8l4 6-2 9-6 3-6-3-2-9 4-6 M8 11h1 M15 11h1 M9 16h6',skill:'m8 5-6 7 6 7 M16 5l6 7-6 7 M14 3l-4 18',connector:'m9 14 6-6 M8 16l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 5 0 M13 8l2-2a4 4 0 0 1 7 5l-5 5a4 4 0 0 1-5 0'};
export function ProjectMenu({items,pick,close,loading}:ProjectMenuProps) {
  const [kind,setKind]=React.useState<ProjectMenuKind>(),[query,setQuery]=React.useState(''),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
  const root=React.useRef<HTMLDivElement>(null);
  React.useEffect(()=>{root.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus()},[]);
  const choose=(next:ProjectMenuKind)=>{setKind(next);setQuery('');setError('')};
  React.useEffect(()=>{const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))close()};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape,true);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape,true)}},[close]);
  const run=async(item:ProjectMenuItem)=>{if(!kind||busy)return;setBusy(true);setError('');try{await pick(kind,item)}catch(e){setError(e instanceof Error?e.message:'操作失败，请重试')}finally{setBusy(false)}};
  const rows=kind?(items[kind]??[]).filter(x=>(x.label+' '+(x.description??'')).toLowerCase().includes(query.toLowerCase())):[];
  return <div ref={root} className={`wd-project-menu${kind?' has-submenu':''}`} onKeyDown={e=>{if(e.key==='ArrowLeft'){setKind(undefined);root.current?.querySelector<HTMLButtonElement>('[aria-expanded="true"]')?.focus();e.preventDefault()}if(e.key==='ArrowDown'||e.key==='ArrowUp'){const group=(e.target as HTMLElement).closest('[role="menu"]');const buttons=group?Array.from(group.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')):[];const index=buttons.indexOf(e.target as HTMLButtonElement);if(index>=0){buttons[(index+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length]?.focus();e.preventDefault()}}}}>
    <style>{projectMenuCss}</style>
    <div className="wd-project-menu-main" role="menu" aria-label="项目添加菜单">
      {(Object.keys(labels) as ProjectMenuKind[]).filter(k=>k!=='mode'||items.mode!==undefined).map(k=><button type="button" role="menuitem" key={k} aria-haspopup="menu" aria-expanded={kind===k} onMouseEnter={()=>{if(window.innerWidth>700&&!busy)choose(k)}} onClick={()=>choose(k)} onKeyDown={e=>{if(e.key==='ArrowRight'){choose(k);e.preventDefault()}}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[k]}/></svg><span>{labels[k]}</span><span aria-hidden="true">›</span></button>)}
    </div>
    {kind&&<section className="wd-project-menu-sub" aria-label={`${labels[kind]}选择`}>
      <header><button type="button" className="wd-project-menu-back" onClick={()=>setKind(undefined)}>‹ 返回</button><span>{labels[kind]}</span></header>
      {(items[kind]?.length??0)>4&&<Input aria-label={`搜索${labels[kind]}`} placeholder={`搜索${labels[kind]}`} value={query} onChange={e=>setQuery(e.target.value)}/>}
      {error&&<p role="alert" className="wd-project-menu-error">{error}</p>}
      <div className="wd-project-menu-options" role="menu" aria-label={labels[kind]}>{loading?<p role="status">正在加载…</p>:rows.length?rows.map(item=><button type="button" role={kind==='connector'?'menuitemcheckbox':'menuitem'} aria-checked={kind==='connector'?Boolean(item.selected):undefined} disabled={busy||item.disabled} key={item.id} onClick={()=>void run(item)}><span className="wd-project-menu-avatar" aria-hidden="true">{item.label.slice(0,1)}</span><span className="wd-project-menu-copy"><strong>{item.label}</strong>{item.description&&<small>{item.description}</small>}</span>{item.selected&&<span className="wd-project-menu-check">✓</span>}</button>):<div className="wd-project-menu-empty">{query?'没有匹配结果':`暂无可用${labels[kind]}`}<small>{query?'请尝试其他关键词':'请在项目配置中添加'}</small></div>}</div>
      {kind==='expert'&&rows.length>0&&<footer>选择专家将创建关联的新任务</footer>}
      {kind==='connector'&&rows.length>0&&<footer>仅用于当前任务</footer>}
    </section>}
  </div>;
}
export const projectMenuCss=`
.wd-project-menu{position:absolute;left:8px;bottom:calc(100% + 10px);z-index:80;display:flex;align-items:flex-end;gap:6px;color:var(--dsw-alias-label-primary);font:14px/20px var(--dsw-font-family,sans-serif);max-width:calc(100vw - 32px)}
.wd-project-menu *{box-sizing:border-box}.wd-project-menu-main,.wd-project-menu-sub{background:var(--dsw-alias-bg-layer-1);box-shadow:var(--dsw-elevation-panel);border-radius:16px;padding:8px}.wd-project-menu-main{width:200px;flex:none}.wd-project-menu button{border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:9px}.wd-project-menu button:hover,.wd-project-menu button:focus-visible,.wd-project-menu button[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.wd-project-menu button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.wd-project-menu button:disabled{opacity:.5;cursor:default}.wd-project-menu-main>button{width:100%;display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:42px}.wd-project-menu-main>button:first-child{margin-bottom:7px}.wd-project-menu-main>button>span:first-of-type{flex:1}.wd-project-menu svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex:none}.wd-project-menu-sub{width:320px;max-width:calc(100vw - 40px)}.wd-project-menu-sub header{padding:4px 8px 8px;font-size:12px;color:var(--dsw-alias-label-secondary)}.wd-project-menu-sub input{width:100%}.wd-project-menu-options{max-height:min(340px,50vh);overflow:auto}.wd-project-menu-options>button{display:flex;align-items:center;gap:10px;width:100%;padding:10px 8px;min-height:46px}.wd-project-menu-copy{min-width:0;flex:1}.wd-project-menu-copy strong{display:block;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wd-project-menu-copy small{display:block;font-size:12px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wd-project-menu-avatar{display:grid;place-items:center;width:28px;height:28px;flex:none;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent);color:var(--dsw-alias-state-business-primary)}.wd-project-menu-check{color:var(--dsw-alias-state-business-primary)}.wd-project-menu-empty{text-align:center;padding:20px 12px;color:var(--dsw-alias-label-secondary)}.wd-project-menu-empty small{display:block;margin-top:6px;font-size:12px}.wd-project-menu-sub footer{padding:8px;border-top:.5px solid var(--dsw-alias-border-l2);font-size:11px;color:var(--dsw-alias-label-secondary)}.wd-project-menu-error{font-size:12px;padding:8px;white-space:normal}.wd-project-menu-back{display:none}
@media(max-width:700px){.wd-project-menu{width:calc(100% - 16px);max-width:none}.wd-project-menu-sub{min-width:0}.wd-project-menu.has-submenu .wd-project-menu-main{display:none}.wd-project-menu-back{display:inline-block;margin-right:12px}.wd-project-menu-sub{width:100%;max-width:100%}}
`;
