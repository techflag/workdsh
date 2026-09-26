// Local SVG geometry: no icon fonts, bitmap scaling, CDN or runtime dependency.
const iconPaths = {
 recent:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6h5"/>',
 tablefile:'<path d="M5 2h10l5 5v15H5Z"/><path d="M15 2v6h5M8 12h9M8 16h9M12 12v7"/>',
 codefile:'<path d="M5 2h10l5 5v15H5Z"/><path d="M15 2v6h5m-10 4-3 3 3 3m5-6 3 3-3 3"/>',
 coffee:'<path d="M4 8h12v7a6 6 0 0 1-12 0Zm12 1h2a3 3 0 0 1 0 6h-2M7 2 5 5m6-3-2 3M2 22h18"/>',
 shield:'<path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5Z"/><path d="m8 12 3 3 5-6"/>',
 chart:'<path d="M12 3a9 9 0 1 0 9 9h-9Z"/><path d="M16 2v6h6a8 8 0 0 0-6-6Z"/>',
 wallet:'<path d="M4 6 17 2v4M4 6h16v15H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><path d="M20 11h-6v5h6m-3-2.5h.1"/>',
 more:'<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M18 2v8m-4-4h8"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
 code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
 palette:'<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4 2 2 0 0 1 1-4h3a3 3 0 0 0 3-3c0-4-4-7-9-7Z"/><circle cx="7" cy="10" r=".8"/><circle cx="11" cy="7" r=".8"/><circle cx="16" cy="8" r=".8"/>',
 chat:'<path d="M20 11.5a8 8 0 0 1-8 8H5l-3 3v-11a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z"/><path d="M7 11h8m-4-4v8"/>',
 project:'<circle cx="6" cy="12" r="3"/><circle cx="17" cy="5" r="3"/><circle cx="17" cy="19" r="3"/><path d="m8.5 10.5 6-4m-6 7 6 4"/>',
 expert:'<path d="M5 4h11a4 4 0 0 1 4 4v4a7 7 0 0 1-14 0V9H5a2.5 2.5 0 0 1 0-5Z"/><circle cx="10" cy="11" r="2"/><circle cx="16" cy="11" r="2"/><path d="M11 17h4"/>',
 book:'<path d="M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z"/>',
 clock:'<circle cx="12" cy="13" r="8"/><path d="M12 8v5l3 2M3 3 1 6m20-3 2 3M5 20l-2 2m16-2 2 2"/>',
 search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
 filter:'<path d="M3 4h18l-7 8v7l-4 2v-9Z"/>',
 panel:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 4v16"/>',
 folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l3 4h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 1h18"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 down:'<path d="m6 9 6 6 6-6"/>',
 arrow:'<path d="m4 19 8-15 8 15-8-4Z"/>',
 mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-4 0h8"/>',
 bolt:'<path d="m14 2-10 12h7l-1 8 10-12h-7Z"/>',
 bell:'<path d="M5 16h14l-2-3V8a5 5 0 0 0-10 0v5Zm5 4h4"/>',
 close:'<path d="m5 5 14 14M19 5 5 19"/>'
};
function svgIcon(name){return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.folder}</svg>`}
function sharpenIcons(){
 const navIcons={home:'chat',project:'project',capability:'expert',library:'book',automation:'clock'};
 document.querySelectorAll('#nav [data-page]').forEach(b=>{b.querySelector('.icon').innerHTML=svgIcon(navIcons[b.dataset.page])});
 document.querySelectorAll('.recent [data-page="project"]').forEach(b=>{const label=b.textContent.replace('▧','').trim();b.innerHTML=svgIcon('project')+`<span>${label}</span>`});
 const nav=document.querySelector('#nav');
 if(!nav.querySelector('[data-title="助理"]')){const assistant=document.createElement('button');assistant.dataset.action='dialog';assistant.dataset.title='助理';assistant.innerHTML='<span class="icon">'+svgIcon('user')+'</span>助理';nav.children[0].after(assistant);const more=document.createElement('button');more.dataset.action='dialog';more.dataset.title='更多';more.innerHTML='<span class="icon">'+svgIcon('more')+'</span>更多';nav.append(more);}
 const toolbar=document.querySelector('.windowtools');toolbar.innerHTML='<span class="traffic"><i></i><i></i><i></i></span><span class="window-icons">'+svgIcon('panel')+svgIcon('search')+svgIcon('filter')+'</span>';
 document.querySelectorAll('.panel .card button:not(.schedule-all)').forEach(b=>{b.setAttribute('aria-label',b.dataset.title||'添加配置');b.innerHTML=svgIcon('plus')});
 document.querySelectorAll('.panel>.row>.small').forEach(x=>x.innerHTML=svgIcon('panel'));
 document.querySelectorAll('.composer').forEach(c=>{const add=c.querySelector('.tools button');add.innerHTML=svgIcon('plus');add.setAttribute('aria-label','添加资料');c.querySelector('.primary').setAttribute('aria-label','开始任务 ↗');if(c.closest('.project')){c.querySelector('.primary').innerHTML=svgIcon('arrow');const row=c.querySelector('.row');let controls=document.createElement('div');controls.className='input-actions';controls.innerHTML=`<span>${svgIcon('bolt')} 快速 ${svgIcon('down')}</span><button data-action="dialog" data-title="语音输入" aria-label="语音输入">${svgIcon('mic')}</button>`;row.insertBefore(controls,c.querySelector('.primary'));}});
 document.querySelectorAll('.homecategories button').forEach((b,i)=>{b.innerHTML=svgIcon(['coffee','code','palette'][i])+'<span>'+b.dataset.title+'</span>'});
 document.querySelectorAll('.face').forEach(x=>{x.setAttribute('title',x.textContent);x.innerHTML=svgIcon('user')});
 const crumb=document.querySelector('#breadcrumb');if(crumb.textContent.startsWith('▱')){const text=crumb.textContent.replace('▱','').trim();crumb.innerHTML=svgIcon('folder')+'<span>'+text+'</span>'}
 document.querySelector('#close').innerHTML=svgIcon('close');
}
