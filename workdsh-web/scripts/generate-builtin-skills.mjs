/** Build-only projection: official filesystem provider parses Markdown; no runtime registry. */
import {Context} from '@deepseek-ai/cordis';
import Skills from '@deepseek-ai/dsh-skill';
import * as filesystem from '@deepseek-ai/dsh-skill-filesystem';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../packages/plugins/skills/resources/skills/',import.meta.url));
const ctx=new Context();
try {
 await ctx.plugin(Skills);
 await ctx.plugin(filesystem,{includeDefaultRoots:false,customSkillDirs:[root],watch:false});
 const entries=await ctx.skills.list({cwd:root});
 const rows=[];
 for(const entry of entries){const s=await ctx.skills.get(entry.name,{cwd:root});if(!s?.content.trim())throw Error(`Missing builtin ${entry.name}`);rows.push({name:s.name,description:s.description,...(s.whenToUse?{whenToUse:s.whenToUse}:{}),content:s.content});}
 const creator=rows.find(s=>s.name==='workdsh-skill-creator');if(!creator)throw Error('Missing skill creator');
 const {content,...meta}=creator;
 const output='// GENERATED from resources/skills/*/SKILL.md by the official Harness provider. Edit Markdown, then run build.\n'+
 `export const professionalAuthoringSkills = ${JSON.stringify(rows.filter(s=>s!==creator),null,2)} as const;\n`+
 `export const skillCreatorContent: string = ${JSON.stringify(content)};\nexport const skillCreatorMeta = ${JSON.stringify(meta,null,2)} as const;\n`;
 await writeFile(new URL('../packages/plugins/skills/src/authoring/professional.ts',import.meta.url),output);
 console.log(`Generated ${rows.length} builtins from Markdown using Harness`);
}finally{await ctx.fiber.dispose();}
