/**
 * Governance runtime primitive, owned locally by the audit plugin (D01).
 *
 * ADR-0019 (installable Host self-containment): an installed Host `dist/*.js` may
 * not carry a runtime import of the private workspace contracts package (it is never
 * packed or installed). The governance contract stays the single source of truth; this
 * local copy of the error class lets the audit Host resolve it without the workspace at
 * runtime, keeping the stable `audit/*` error codes unchanged.
 */
export class GovernanceContractError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'GovernanceContractError';
  }
}
