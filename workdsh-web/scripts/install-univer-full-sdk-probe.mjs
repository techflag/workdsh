// Install the reviewed SDK family in isolation; no production Profile changes.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const dir=fileURLToPath(new URL('../.artifacts/univer-full-sdk/',import.meta.url));
const manifest=JSON.parse(await readFile(new URL('./univer-full-sdk-packages.json',import.meta.url),'utf8'));
for(const [name,version]of Object.entries(manifest.dependencies))if(name.startsWith('@univerjs')&&version!=='1.0.0-rc.0')throw new Error('SDK family mismatch: '+name);
await mkdir(dir,{recursive:true});await writeFile(dir+'package.json',JSON.stringify(manifest,null,2)+'\n');
const child=spawn('corepack',['pnpm','install','--ignore-workspace'],{cwd:dir,stdio:'inherit'});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
