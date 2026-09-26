/* Shared presentation-only dialog: callers own data and persistence. */
window.WorkDSHConfigDialog = {
 open({title, content, confirm=false, onConfirm}) {
  const trigger=document.activeElement;
  const dialog=document.createElement('dialog');dialog.className='config-dialog';
  const heading=document.createElement('h2');heading.id='config-dialog-heading';heading.textContent=title;
  dialog.setAttribute('aria-labelledby',heading.id);
  const header=document.createElement('div');header.className='config-header';header.append(heading);
  const close=document.createElement('button');close.className='config-close';close.setAttribute('aria-label','关闭');close.innerHTML=svgIcon('close');close.onclick=()=>dialog.close();header.append(close);
  const body=document.createElement('div');body.className='config-body';body.append(content);
  const footer=document.createElement('div');footer.className='config-footer';
  const cancel=document.createElement('button');cancel.textContent=confirm?'取消':'关闭';cancel.onclick=()=>dialog.close();footer.append(cancel);
  if(confirm){const save=document.createElement('button');save.className='config-confirm';save.textContent='确定';save.onclick=()=>{onConfirm?.();dialog.close()};footer.append(save)}
  dialog.append(header,body,footer);document.body.append(dialog);
  dialog.addEventListener('close',()=>{dialog.remove();trigger?.focus()},{once:true});dialog.showModal();close.focus();return dialog;
 },
 card(name, description, icon='user') {
  const card=document.createElement('article');card.className='config-item';
  const avatar=document.createElement('span');avatar.className='config-avatar';avatar.innerHTML=svgIcon(icon);
  const text=document.createElement('div');text.className='config-item-text';
  const heading=document.createElement('h3');heading.textContent=name;heading.title=name;
  const detail=document.createElement('p');detail.textContent=description;detail.title=description;
  text.append(heading,detail);card.append(avatar,text);return card;
 }
};
