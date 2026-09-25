/** Create a local test DMG from a verified host-architecture application. */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
const root=resolve(import.meta.dirname,'..')
const workspace=process.argv[2]??'dsh-plugin-desktop'
if(workspace!=='dsh-plugin-desktop')throw new Error('Unknown desktop workspace')
if(process.platform!=='darwin')throw new Error('Run this command on macOS')
const pkg=JSON.parse(readFileSync(join(root,workspace,'package.json'),'utf8'))
const app=join(root,workspace,'dist',process.arch==='x64'?'mac':'mac-'+process.arch,pkg.build.productName+'.app')
if(!existsSync(app))throw new Error('Run the workspace package:dir gate first')
const run=(command,args)=>{const result=spawnSync(command,args,{stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)throw new Error(command+' failed')}
// Ad-hoc signatures allow local testing; these are not Developer ID signatures or notarization.
run('codesign',['--force','--deep','--sign','-',app])
run('codesign',['--verify','--deep','--strict',app])
const staging=mkdtempSync(join(tmpdir(),'dsh-ssh-dmg-'))
const filename=`DSH-SSH-${pkg.version}-macOS-${process.arch}-unsigned.dmg`
const output=join(root,workspace,'dist',filename)
try {
  run('ditto',[app,join(staging,pkg.build.productName+'.app')])
  symlinkSync('/Applications',join(staging,'Applications'))
  run('hdiutil',['create','-volname',pkg.build.productName,'-srcfolder',staging,'-ov','-format','UDZO',output])
  run('hdiutil',['verify',output])
  const hash=createHash('sha256');for await(const chunk of createReadStream(output))hash.update(chunk)
  writeFileSync(output+'.sha256',hash.digest('hex')+'  '+filename+'\n')
  console.log(output)
} finally {rmSync(staging,{recursive:true,force:true})}
