export const PROJECT_INSTRUCTION_TOKEN_BUDGET = 8_000;

export function estimateProjectInstructionTokens(value: string): number {
  let wide = 0, narrow = 0;
  for (const character of value) (/[^\u0000-\u00ff]/u.test(character) ? wide++ : narrow++);
  return wide + Math.ceil(narrow / 4);
}
