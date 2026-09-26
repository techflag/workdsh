import type {OfficeHtmlSnapshot} from "workdsh-contracts/office";
export const previewPolicy="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
/** Policy precedes all generated markup and is never persisted or exported. */
export function previewHtml(html:string){return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${previewPolicy}">`+html;}
export function downloadHtml(snapshot:OfficeHtmlSnapshot){
 const url=URL.createObjectURL(new Blob([snapshot.state.html],{type:"text/html;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download=(snapshot.title.replace(/[\\/:*?"<>|]/g,"_")||"网页")+".html";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
