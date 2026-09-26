// Single source for the expert domain contract shared by the Host service and the
// browser Client. The shared TYPES come from `workdsh-contracts/experts`, imported
// type-only and erased at build; the pure runtime VALUES are owned locally by the
// experts plugin (ADR-0019) so both the installed Host `dist/*.js` and the
// esbuild-inlined browser bundle stay self-contained and never import the private
// contracts package at runtime. build-experts.mjs copies the emitted contract
// declaration to dist/shared.d.ts (re-exporting these values) so installed types
// need no workspace.
export type * from 'workdsh-contracts/experts';
export { EXPERT_LIMITS, ExpertsError, actionAccess } from './domain/values.js';
