import { z } from 'zod';
const id=z.string().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/).refine(v=>!["__proto__","constructor","prototype"].includes(v));
export const htmlStateSchema = z.object({modelVersion:z.literal(1),html:z.string().max(1024*1024)}).strict();
export const htmlOpenInput = z.object({source:z.literal('new'),kind:z.literal('html'),title:z.string().trim().min(1).max(160),operationId:id}).strict();
export const htmlEditInput = z.object({documentId:id,baseRevision:z.number().int().nonnegative(),operationId:id,operations:z.array(z.object({op:z.literal('html.replaceDocument'),html:z.string().max(1024*1024)}).strict()).length(1)}).strict();
export function applyHtml(state:z.infer<typeof htmlStateSchema>,operations:unknown[]) {
  const operation=htmlEditInput.shape.operations.parse(operations)[0]!;
  return {state:{...state,html:operation.html},ids:{}};
}
