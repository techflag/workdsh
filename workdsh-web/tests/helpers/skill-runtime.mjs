import { Context } from '@deepseek-ai/cordis';
import Agents from '@deepseek-ai/dsh-agent';
import AgentLoop from '@deepseek-ai/dsh-agent-loop';
import Sessions from '@deepseek-ai/dsh-session';
import Projections from '@deepseek-ai/dsh-session-projection';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import Tools from '@deepseek-ai/dsh-tools';
import Llm, { LlmAdapter, createMessage } from '@deepseek-ai/dsh-llm';
import Skills from '@deepseek-ai/dsh-skill';
import * as filesystem from '@deepseek-ai/dsh-skill-filesystem';
import * as skillTool from '@deepseek-ai/dsh-tool-skill';

// Deterministic test double for model I/O only. The official loop executes the tool.
export class SkillRequestAdapter extends LlmAdapter {
  callId = 'skill-probe-call';
  requests = [];
  schemas = [];
  async *stream(options) {
    this.requests.push(structuredClone(options.messages));
    this.schemas.push(structuredClone(options.tools ?? []));
    if (this.requests.length > 2) throw new Error('unexpected extra model request');
    const block = this.requests.length === 1
      ? { type: 'tool-call', id: this.callId, name: 'skill', arguments: '{"name":"sample"}' }
      : { type: 'text', text: 'Fixture finished' };
    yield { type: 'block-start', index: 0, blockType: block.type };
    yield { type: 'block-end', index: 0, block };
    yield { type: 'finish', reason: { kind: block.type === 'tool-call' ? 'tool-calls' : 'stop' } };
  }
}

export { createMessage, Context, Agents, AgentLoop, Sessions, Projections, SystemPrompt, Tools, Llm, Skills, filesystem, skillTool };
