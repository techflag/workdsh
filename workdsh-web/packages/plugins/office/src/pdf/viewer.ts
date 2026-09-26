import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerSource from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';
/** Each loading task owns its worker and URL; no shared application worker globals. */
export function createPdfTask(bytes:Uint8Array){const url=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'}));let worker:Worker;try{worker=new Worker(url,{type:'module'});}catch(e){URL.revokeObjectURL(url);throw e;}const engine=pdfjs.PDFWorker.create({port:worker});const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,worker:engine});return {task,async destroy(){try{await task.destroy();}finally{engine.destroy();worker.terminate();URL.revokeObjectURL(url);}}};}
