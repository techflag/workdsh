import * as React from 'react';
import { parseDocument } from 'yaml';
import type { ExpertDefinition } from '../shared.js';

function text(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const localized = value as { zh?: unknown; en?: unknown };
    return typeof localized.zh === 'string' ? localized.zh : typeof localized.en === 'string' ? localized.en : '';
  }
  return '';
}

/** Display metadata is projected from the authored file, never written back. */
function identity(definition: ExpertDefinition) {
  const frontmatter = definition.agentDocument?.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  try {
    const document = frontmatter ? parseDocument(frontmatter) : undefined;
    const data = document && !document.errors.length ? document.toJS() : undefined;
    return { name: text(data?.displayName) || definition.name, profession: text(data?.profession) };
  } catch { return { name: definition.name, profession: '' }; }
}

export function TeamOverview({ definition }: { definition: ExpertDefinition }) {
  const team = definition.team;
  if (!team) return null;
  let leadMetadata: { displayName?: unknown; profession?: unknown; avatar?: string } | undefined;
  try {
    const manifestText = definition.packageDocuments?.['.workdsh-expert/plugin.json'] ?? definition.packageDocuments?.['.codebuddy-plugin/plugin.json'];
    const manifest = manifestText ? JSON.parse(manifestText) : undefined;
    leadMetadata = manifest?.members?.find((member: { role?: string }) => member.role === 'lead');
  } catch { /* Invalid authoring metadata is handled by Host validation. */ }
  const members = [{ key: 'lead', definition, lead: true }, ...team.members.map(member => ({ ...member, lead: false }))];
  return <section aria-label="团队成员与协作">
    <h2 className="detail-section-title">团队成员</h2>
    <div className="team-member-grid">{members.map(member => {
      const person = identity(member.definition);
      if (member.lead && leadMetadata) {
        person.name = text(leadMetadata.displayName) || person.name;
        person.profession = text(leadMetadata.profession) || person.profession;
      }
      const leadAsset = member.lead && leadMetadata?.avatar ? definition.packageAssets?.[leadMetadata.avatar.replace(/^\.\//, '')] : undefined;
      const avatar = leadAsset ? `data:image/${leadMetadata?.avatar?.endsWith('.webp') ? 'webp' : /\.jpe?g$/i.test(leadMetadata?.avatar ?? '') ? 'jpeg' : 'png'};base64,${leadAsset.base64}` : member.definition.avatarRef;
      return <details className="team-person" key={member.key}>
        <summary><span className="member-avatar" aria-hidden>{avatar?.startsWith('data:image/') ? <img src={avatar} alt="" /> : person.name.trim().charAt(0)}</span>
          <span className="member-identity"><strong>{person.profession || person.name}{member.lead && <span className="member-lead">主理人</span>}</strong><span>{person.profession ? person.name : member.lead ? '统筹需求与整合交付' : '团队成员'}</span></span>
        </summary>
        <p>{member.definition.description}</p>
        <p className="member-responsibility">{member.definition.agentDocument ? member.definition.agentDocument.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, '') : member.definition.role}</p>
      </details>;
    })}</div>
    {team.workflows.length > 0 && <details className="expert-settings team-workflows"><summary>协作场景 · {team.workflows.length}</summary>
      {team.workflows.map(workflow => <article key={workflow.id}><h3>{workflow.title}</h3><p>{workflow.trigger}</p><p>交付：{workflow.deliverable}</p></article>)}
    </details>}
  </section>;
}
