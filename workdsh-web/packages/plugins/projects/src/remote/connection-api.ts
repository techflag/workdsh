import { ensureProjectWorkspace } from '../runtime/project-workspace.js';
import { randomUUID } from 'node:crypto';
import type { Context } from '@deepseek-ai/cordis';
import type { ConnectionRpcResult, HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
import type { ActorContext, IdentityService } from 'workdsh-contracts';
import type { ProjectAssetRef, ProjectConfig, ProjectInputRef, ProjectWorkItem } from 'workdsh-contracts/projects';
declare module '@deepseek-ai/cordis' { interface Context { workdshIdentity: IdentityService; } }
export const projectManagementPath='/api/workdsh-projects';
const ok=<T>(value:T):ConnectionRpcResult<T>=>({ok:true,value}); const fail=(code:string,message:string):ConnectionRpcResult<never>=>({ok:false,error:{code,message,details:{}}});
const record=(v:unknown):Record<string,unknown>|undefined=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:undefined;
const actor=(ctx:Context):ActorContext=>{const p=ctx.workdshIdentity.profile();return{principalId:p.principalId,organizationId:p.organization.id,requestId:`projects-ui-${randomUUID()}`,resolvedBy:p.resolvedBy};};
export function registerProjectConnection(ctx:Context){const connection=(ctx as Context&{connection:HostConnectionHandle}).connection;const unregister=connection.fetch.register({path:projectManagementPath,methods:['POST'],requestBody:'buffered',fetch:async request=>{try{const body=record(await request.json()),endpoint=body?.endpoint,p=record(body?.payload)??{},a=actor(ctx),m=ctx.workdshProjects;
if(endpoint==='ensure-workspace'&&typeof p.projectId==='string')return Response.json(ok(await ensureProjectWorkspace(ctx,a,p.projectId,request.signal)));
if(endpoint==='templates')return Response.json(ok(await m.templates()));
if(endpoint==='list')return Response.json(ok(p.status==='archived'?await m.listArchived(a,typeof p.query==='string'?p.query:'',request.signal):await m.list(a,typeof p.query==='string'?p.query:'',request.signal)));
if(endpoint==='create'&&typeof p.name==='string')return Response.json(ok(await m.create(a,{name:p.name,...(typeof p.description==='string'?{description:p.description}:{}),...(typeof p.templateId==='string'?{templateId:p.templateId}:{})},request.signal)));
if(endpoint==='get'&&typeof p.projectId==='string')return Response.json(ok(await m.get(a,p.projectId,request.signal)));
if(endpoint==='archive'&&typeof p.projectId==='string')return Response.json(ok(await m.archive(a,p.projectId,request.signal)));
if(endpoint==='restore'&&typeof p.projectId==='string')return Response.json(ok(await m.restore(a,p.projectId,request.signal)));
if(endpoint==='update-config'&&typeof p.projectId==='string'&&record(p.config)&&typeof p.expectedRevisionId==='string')return Response.json(ok(await m.updateConfig(a,p.projectId,p.config as unknown as ProjectConfig,p.expectedRevisionId,request.signal)));
if(endpoint==='add-work-item'&&typeof p.projectId==='string'&&typeof p.title==='string')return Response.json(ok(await m.addWorkItem(a,p.projectId,p.title,request.signal)));
if(endpoint==='update-work-item'&&typeof p.projectId==='string'&&record(p.item)&&typeof p.expectedRevision==='string')return Response.json(ok(await m.updateWorkItem(a,p.projectId,p.item as unknown as Pick<ProjectWorkItem,'id'|'title'|'status'|'assignee'|'priority'|'tags'>,p.expectedRevision,request.signal)));
if(endpoint==='add-asset'&&typeof p.projectId==='string'&&record(p.asset))return Response.json(ok(await m.addAsset(a,p.projectId,p.asset as unknown as Omit<ProjectAssetRef,'id'|'projectId'|'createdAt'>,request.signal)));
if(endpoint==='remove-asset'&&typeof p.projectId==='string'&&typeof p.refId==='string'){await m.removeAsset(a,p.projectId,p.refId,request.signal);return Response.json(ok({removed:true}));}
if(endpoint==='validate-input-refs'&&typeof p.projectId==='string'&&Array.isArray(p.references))return Response.json(ok(await m.validateInputRefs(a,p.projectId,p.references as unknown as ProjectInputRef[],request.signal)));
if(endpoint==='link-task'&&typeof p.projectId==='string'&&typeof p.sessionId==='string'&&typeof p.title==='string')return Response.json(ok(await m.linkTask(a,p.projectId,p.sessionId,p.title,typeof p.workItemId==='string'?p.workItemId:undefined,Array.isArray(p.references)?p.references as unknown as ProjectInputRef[]:[],request.signal,Array.isArray(p.capabilities)?p.capabilities as unknown as import('workdsh-contracts/projects').ProjectCapabilityRef[]:undefined)));
if(endpoint==='task-context'&&typeof p.sessionId==='string')return Response.json(ok((await m.taskContext(a,p.sessionId,request.signal))??null));
return Response.json(fail('projects/invalid-request','项目请求无效。'),{status:400});}catch(cause){const code=cause instanceof Error&&cause.message.startsWith('projects/')?cause.message:'projects/internal';const messages:Record<string,string>={'projects/capability-not-bound':'该能力不属于当前项目配置，请重新选择。','projects/not-found':'项目内容不存在或无权访问。','projects/revision-conflict':'内容已被更新，请刷新后重试；当前草稿已保留。','projects/instruction-budget-exceeded':'项目指令超过预留上下文预算，请删减重复背景或改为项目资料后重试。','projects/reference-stale':'引用已删除、更新或无权访问，请重新选择。','projects/invalid-name':'请输入有效的项目名称。','projects/invalid-title':'请输入有效标题。','projects/template-not-found':'项目模板不存在。'};return Response.json(fail(code,messages[code]??'项目操作失败。'),{status:code==='projects/internal'?500:400});}}});ctx.effect(()=>unregister,'workdsh.projects.fetch');}
