/**
 * Cross-domain Skill revision capability (D04 dependency adaptation).
 *
 * The Skill owner (`workdsh-plugin-skills`) implements this public surface so an
 * expert can freeze an explicit Skill dependency into an immutable snapshot and
 * mount it through the official Skill provider/tool. The expert plugin never
 * walks another plugin's private directories to fabricate a revision, and never
 * treats a file-edit digest as a durable revision id.
 *
 * Frozen content does not freeze permission: `checkRevision` separates integrity,
 * source enablement and current-use authorization.
 */
import type { ActorContext } from './governance.js';
import type { SkillRevisionRef } from './experts.js';

/** A consumer holding a retained reference (e.g. one published expert revision). */
export interface SkillConsumerRef {
  readonly domain: string;
  readonly id: string;
}

/** Integrity / enablement / authorization verdict for a retained revision. */
export type SkillRevisionStatus = 'intact' | 'missing' | 'drifted' | 'source-disabled' | 'source-uninstalled' | 'forbidden';

export interface SkillRevisionCheck {
  readonly ref: SkillRevisionRef;
  readonly status: SkillRevisionStatus;
  readonly retained: boolean;
  readonly snapshotDir?: string;
  readonly reason?: string;
}

/** One retained snapshot's managed location and content manifest. */
export interface RetainedSkillRevision {
  readonly ref: SkillRevisionRef;
  /** Managed snapshot directory contributed to a preset's `customSkillDirs`. Never an arbitrary writable path. */
  readonly snapshotDir: string;
  readonly files: readonly { readonly path: string; readonly byteLength: number; readonly sha256: string }[];
  readonly retainedBy: readonly SkillConsumerRef[];
}

/**
 * The Skill owner's public revision contract. Implemented by `workdsh-plugin-skills`;
 * consumed by the expert publish/compiler/runtime-guard path.
 */
export interface SkillRevisionProvider {
  /**
   * Read a consistent SKILL.md + resource snapshot and return a stable ref.
   * Must not splice two generations of content while an edit is in flight.
   */
  resolveRevision(skillId: string, expectedDigest?: string, signal?: AbortSignal): Promise<SkillRevisionRef>;
  /**
   * Establish an idempotent retained reference and return the managed snapshot the
   * scoped provider can consume. Grants no arbitrary path write capability.
   */
  retainRevision(ref: SkillRevisionRef, consumer: SkillConsumerRef, signal?: AbortSignal): Promise<RetainedSkillRevision>;
  /** Separate integrity, source enablement and current-use authorization. */
  checkRevision(ref: SkillRevisionRef, actor: ActorContext, signal?: AbortSignal): Promise<SkillRevisionCheck>;
  /** Release one consumer; cleanup is allowed only when no reachable reference remains. */
  releaseReference(ref: SkillRevisionRef, consumer: SkillConsumerRef, signal?: AbortSignal): Promise<void>;
}
