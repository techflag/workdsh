import {readFile} from 'node:fs/promises';
// The plan and every feature directory are addressed from the repository root,
// not from the Web app: (apps/web/scripts/ -> repository root).
const root=new URL('../../../',import.meta.url);
export async function sharedProfileFeatures(){
 const plan=JSON.parse(await readFile(new URL('profiles/shared/workdsh-features.json',root),'utf8'));
 const names=new Set();
 for(const feature of plan.features){
  if(names.has(feature.name))throw Error('Duplicate shared feature '+feature.name);
  names.add(feature.name);
  const manifest=JSON.parse(await readFile(new URL(feature.directory+'/package.json',root),'utf8'));
  if(manifest.name!==feature.name)throw Error('Shared feature package mismatch '+feature.name);
 }
 return plan;
}
