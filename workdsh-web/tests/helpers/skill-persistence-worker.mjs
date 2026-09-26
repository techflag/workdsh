import JsonlPersistence from '@deepseek-ai/dsh-session-persistence-jsonl';
import { createMessage, Context, Agents, AgentLoop, Sessions, Projections, SystemPrompt, Tools, Llm, Skills, filesystem, skillTool, SkillRequestAdapter } from './skill-runtime.mjs';

const [phase, root, skillRoot, sessionId] = process.argv.slice(2);
const ctx = new Context();
let handle;
let reader;
try {
  await ctx.plugin(JsonlPersistence, { root, compression: 'none' });
  if (phase === 'read') {
    reader = await ctx.sessionPersistence.open(sessionId, 'read');
    process.stdout.write(JSON.stringify({ events: (await reader.read()).events }));
  } else {
    for (const plugin of [Sessions, Projections, SystemPrompt, Tools, Llm, Agents, Skills, AgentLoop]) await ctx.plugin(plugin);
    const adapter = new SkillRequestAdapter();
    adapter.callId = `skill-${phase}`;
    ctx.llm.registerAdapter(['workdsh-test'], adapter);
    const options = {
      agentOptions: { provider: 'workdsh-test', model: 'fixed', cwd: skillRoot },
      setup: async agentCtx => {
        await agentCtx.plugin(filesystem, { includeDefaultRoots: false, customSkillDirs: [skillRoot], watch: false });
        await agentCtx.plugin(skillTool);
      },
    };
    handle = phase === 'create'
      ? await ctx.agents.create({ ...options, sessionId })
      : await ctx.agents.resume({ ...options, resumeSessionId: sessionId });
    const before = handle.agent.session.snapshotEvents();
    handle.agent.followup(createMessage({ role: 'user', content: [{ type: 'text', text: 'Load the sample skill.' }], source: { kind: 'user' } }));
    await handle.agent.whenIdle();
    await ctx.sessionPersistence.flush();
    process.stdout.write(JSON.stringify({ before, events: handle.agent.session.snapshotEvents(), requests: adapter.requests }));
  }
} finally {
  await reader?.close();
  await handle?.dispose();
  await ctx.fiber.dispose();
}
