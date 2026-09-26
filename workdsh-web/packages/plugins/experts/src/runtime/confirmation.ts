import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import type { ConfirmationProof, ConfirmationRequest } from 'workdsh-contracts';
import { ExpertsError } from '../domain/values.js';

/**
 * Publish-confirmation authority (ADR-0017 #5, HLD 6.3).
 *
 * A model-supplied `confirmed:true`, a restated intention or prompt text is never
 * authority. `requestPublishConfirmation` only mints a short-lived challenge bound
 * to exact content; a **trusted UI user action** (`confirm`) exchanges it for a
 * one-time `ConfirmationProof`; `publish` consumes the proof and re-checks that the
 * content digest still matches. Tokens live in Host memory and expire, so a lost or
 * stale challenge simply requires the user to confirm again — it never auto-publishes.
 */

const CONFIRMATION_TTL_MS = 5 * 60 * 1000;

interface ConfirmationRecord {
  readonly request: ConfirmationRequest;
  readonly principalId: string;
  readonly definitionDigest: string;
  readonly dependencyLockDigest: string;
  confirmed: boolean;
  consumed: boolean;
}

export class ConfirmationStore {
  private readonly records = new Map<string, ConfirmationRecord>();

  /** Mint a challenge bound to exact content. Does not grant publish authority. */
  request(input: {
    expertId: string;
    action: string;
    draftRevision: string;
    definitionDigest: string;
    dependencyLockDigest: string;
    principalId: string;
  }): ConfirmationRequest {
    this.sweep();
    const nonce = randomUUID();
    const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString();
    const request: ConfirmationRequest = {
      confirmationToken: this.token(nonce, input.definitionDigest, input.dependencyLockDigest),
      expertId: input.expertId,
      action: input.action,
      draftRevision: input.draftRevision,
      definitionDigest: input.definitionDigest,
      dependencyLockDigest: input.dependencyLockDigest,
      expiresAt,
      nonce,
    };
    this.records.set(request.confirmationToken, {
      request,
      principalId: input.principalId,
      definitionDigest: input.definitionDigest,
      dependencyLockDigest: input.dependencyLockDigest,
      confirmed: false,
      consumed: false,
    });
    return request;
  }

  /** Trusted UI action: exchange a pending challenge for a one-time proof. */
  confirm(token: string, principalId: string): ConfirmationProof {
    const record = this.records.get(token);
    if (!record) throw new ExpertsError('experts/confirmation-stale', '发布确认已失效，请重新发起确认。');
    if (record.principalId !== principalId) throw new ExpertsError('experts/forbidden', '确认主体与发起主体不一致。');
    if (Date.parse(record.request.expiresAt) < Date.now()) {
      this.records.delete(token);
      throw new ExpertsError('experts/confirmation-stale', '发布确认已过期，请重新发起确认。');
    }
    record.confirmed = true;
    return { token };
  }

  /**
   * Consume a proof at the publish commit point. Re-verifies principal, expiry and
   * that the exact content digests still match, then marks it used (one-time nonce).
   */
  consume(
    proof: ConfirmationProof,
    check: { principalId: string; definitionDigest: string; dependencyLockDigest: string },
  ): void {
    const record = this.records.get(proof.token);
    if (!record) throw new ExpertsError('experts/confirmation-required', '缺少发布确认，请在界面中确认后再发布。');
    if (!record.confirmed) throw new ExpertsError('experts/confirmation-required', '发布尚未经过用户确认。');
    if (record.consumed) throw new ExpertsError('experts/confirmation-stale', '发布确认已使用，请重新发起确认。');
    if (record.principalId !== check.principalId) throw new ExpertsError('experts/forbidden', '确认主体与发布主体不一致。');
    if (Date.parse(record.request.expiresAt) < Date.now()) {
      this.records.delete(proof.token);
      throw new ExpertsError('experts/confirmation-stale', '发布确认已过期，请重新发起确认。');
    }
    if (!safeEqual(record.definitionDigest, check.definitionDigest) || !safeEqual(record.dependencyLockDigest, check.dependencyLockDigest)) {
      throw new ExpertsError('experts/confirmation-stale', '确认内容已变化，请重新校验并确认后再发布。');
    }
    record.consumed = true;
    this.records.delete(proof.token);
  }

  private token(nonce: string, definitionDigest: string, dependencyLockDigest: string): string {
    return createHash('sha256').update(`${nonce}\u0000${definitionDigest}\u0000${dependencyLockDigest}`).digest('hex');
  }

  private sweep(): void {
    const now = Date.now();
    for (const [token, record] of this.records) {
      if (Date.parse(record.request.expiresAt) < now) this.records.delete(token);
    }
  }
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
