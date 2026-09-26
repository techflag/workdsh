/* Prototype fixtures only; no authorization, network calls or persistence. */
(()=>{
const experts=[['钣金质量交付经理','专注钣金质量与交付，管理检验、NCR 与返工事项。'],['钣金经营总控顾问','总览钣金厂经营全局，贯通客户漏斗、报价与交付。'],['钣金生产计划师','专注钣金工艺与排产，核查设备能力匹配与生产约束。'],['钣金报价管理师','专注钣金厂询报价管理，核查客户查重、材料与工序成本。']];
function openProjectConfig(kind){
 const connector=kind==='连接器';const body=document.createElement('div');
 const toolbar=document.createElement('div');toolbar.className='config-toolbar';
 const leading=document.createElement(connector?'div':'p');
 if(!connector)leading.innerHTML=`当前项目已添加 <strong>${kind==='专家'?4:10}</strong> 个${kind}`;
 const add=document.createElement('button');add.className='config-add';add.innerHTML=svgIcon('plus')+'添加';
 add.onclick=()=>{const note=document.createElement('p');note.className='config-description';note.textContent='当前为界面示例，添加目录与保存将在对应插件接入后提供。';if(!body.querySelector('[data-notice]')){note.dataset.notice='true';toolbar.after(note)}};
 toolbar.append(leading,add);body.append(toolbar);
 const description=document.createElement('p');description.className='config-description';
 const grid=document.createElement('div');grid.className='config-grid';
 if(connector){leading.className='config-auth';leading.setAttribute('role','tablist');leading.setAttribute('aria-label','授权类型');
  const update=(selected)=>{leading.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',String(b.textContent===selected)));description.textContent=selected==='个人授权'?'连接器项目全员可用，每位成员使用自己的账号授权，以自己的身份访问和操作。适用于个人文档、知识库等。':'公共授权由项目管理者配置，成员在获准范围内使用项目连接。';grid.replaceChildren();if(selected==='个人授权')grid.append(WorkDSHConfigDialog.card('腾讯文档','创建、编辑和协作腾讯文档。用自然语言管理文档与表格。','book'));else{const empty=document.createElement('p');empty.className='config-empty';empty.textContent='暂无公共授权连接器';grid.append(empty)}};
  ['个人授权','公共授权'].forEach(label=>{const b=document.createElement('button');b.textContent=label;b.setAttribute('role','tab');b.onclick=()=>update(label);leading.append(b)});update('个人授权');body.append(description);
 }else{const items=kind==='专家'?experts:['客户管理','综合经营查询','质量与交付','生产报工','库存与采购','报价计算','报价转订单','询价接收','工单与排产','询价审查'].map(n=>[n,'项目业务技能 · 示例配置']);items.forEach(([name,desc])=>grid.append(WorkDSHConfigDialog.card(name,desc,kind==='专家'?'user':'code')))}
 body.append(grid);WorkDSHConfigDialog.open({title:kind,content:body,confirm:!connector});
}
document.addEventListener('click',event=>{const b=event.target.closest('.project .panel button[data-title]');if(!b)return;const kind={'项目专家':'专家','项目技能':'技能','连接器':'连接器'}[b.dataset.title];if(!kind)return;event.stopImmediatePropagation();openProjectConfig(kind)},true);
})();
