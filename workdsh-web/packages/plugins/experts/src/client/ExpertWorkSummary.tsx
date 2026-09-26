import * as React from 'react';
import type { ExpertDefinition } from '../shared.js';

/** A read-only projection shared by published details and saved-draft review. */
export function ExpertWorkSummary({ definition }: { readonly definition: ExpertDefinition }) {
  const sections = [
    ['会交付什么', definition.deliverables],
    ['怎么处理你的任务', definition.methodology],
    ['使用前需要了解', definition.boundaries],
  ] as const;
  return <section className="expert-work-summary" aria-label="专家工作与交付">
    {sections.filter(([, body]) => body.trim()).map(([title, body]) =>
      <section key={title}><h3>{title}</h3><p>{body}</p></section>)}
  </section>;
}
