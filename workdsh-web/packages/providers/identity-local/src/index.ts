import { randomUUID } from 'node:crypto';
import { Context, Service } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import { defineDomain } from '@deepseek-ai/dsh-storage-domain';
import { z } from 'zod';
import {
  assertActorContext,
  GovernanceContractError,
} from './governance.js';
import type {
  ActorContext,
  IdentityProfile,
  IdentityProvider,
  IdentityResolutionContext,
  IdentityService,
  Membership,
  Organization,
} from 'workdsh-contracts';

export interface LocalIdentityConfig {
  readonly principalId: string;
  readonly organizationId: string;
  readonly providerId?: string;
}

export interface LocalIdentityEvidence extends IdentityResolutionContext {
  /** Trusted Host correlation only; it never selects the principal or organization. */
  readonly sessionId?: string;
  /** Trusted Host correlation only; it never selects the principal or organization. */
  readonly runId?: string;
}

const boundedIdentity = z.string().min(1).max(256).refine((value) => !/[\u0000-\u001f]/.test(value));
const uninitializedState = z.object({ initialized: z.literal(false) });
const initializedState = z.object({
  initialized: z.literal(true),
  providerId: boundedIdentity,
  principalId: boundedIdentity,
  organization: z.object({
    id: boundedIdentity,
    kind: z.literal('personal'),
    name: boundedIdentity,
    revision: boundedIdentity,
  }),
  membership: z.object({
    organizationId: boundedIdentity,
    principalId: boundedIdentity,
    principalKind: z.literal('human'),
    role: z.literal('owner'),
    state: z.literal('active'),
    revision: boundedIdentity,
  }),
});

type LocalIdentityState = z.infer<typeof uninitializedState> | z.infer<typeof initializedState>;

export const localIdentityDomainSpec = defineDomain({
  name: 'workdsh_identity_local',
  version: 1,
  global: {
    schema: z.discriminatedUnion('initialized', [uninitializedState, initializedState]),
    initial: { initialized: false } satisfies LocalIdentityState,
  },
  tables: {},
});

export class LocalIdentityProvider implements IdentityProvider<LocalIdentityEvidence | undefined> {
  readonly id: string;
  readonly #principalId: string;
  readonly #organizationId: string;

  constructor(config: LocalIdentityConfig) {
    this.id = config.providerId ?? 'workdsh-identity-local';
    this.#principalId = config.principalId;
    this.#organizationId = config.organizationId;
    assertActorContext({
      principalId: this.#principalId,
      organizationId: this.#organizationId,
      requestId: 'configuration-check',
      resolvedBy: this.id,
    });
  }

  async resolve(evidence?: LocalIdentityEvidence, signal?: AbortSignal): Promise<ActorContext> {
    signal?.throwIfAborted();
    const actor: ActorContext = {
      principalId: this.#principalId,
      organizationId: this.#organizationId,
      requestId: randomUUID(),
      resolvedBy: this.id,
      ...(evidence?.sessionId === undefined ? {} : { sessionId: evidence.sessionId }),
      ...(evidence?.runId === undefined ? {} : { runId: evidence.runId }),
    };
    assertActorContext(actor);
    signal?.throwIfAborted();
    return Object.freeze(actor);
  }
}

export interface Config extends LocalIdentityConfig {
  readonly organizationName: string;
}

export const Config: Schema<Config> = Schema.object({
  principalId: Schema.string().required(),
  organizationId: Schema.string().required(),
  organizationName: Schema.string().required(),
  providerId: Schema.string().default('workdsh-identity-local'),
});

declare module '@deepseek-ai/cordis' {
  interface Context {
    workdshIdentity: IdentityService;
  }
}

function immutableProfile(state: Extract<LocalIdentityState, { initialized: true }>): IdentityProfile {
  return Object.freeze({
    principalId: state.principalId,
    principalKind: 'human' as const,
    organization: Object.freeze({ ...state.organization }) as Organization,
    membership: Object.freeze({ ...state.membership }) as Membership,
    resolvedBy: state.providerId,
  });
}

function assertCoherent(state: Extract<LocalIdentityState, { initialized: true }>): void {
  if (state.organization.id !== state.membership.organizationId
      || state.principalId !== state.membership.principalId) {
    throw new GovernanceContractError(
      'identity-local/inconsistent-profile',
      'Stored local identity, organization and membership do not agree.',
    );
  }
}

/** Cordis Host service backed by one official Storage Domain record. */
export class LocalIdentityService extends Service implements IdentityService {
  static inject = ['storageDomain'];
  static Config = Config;

  readonly id: string;
  private readonly configured: Config;
  private readonly provider: LocalIdentityProvider;
  private currentProfile?: IdentityProfile;

  constructor(ctx: Context, config: Config) {
    super(ctx, 'workdshIdentity');
    this.configured = Object.freeze({ ...config, providerId: config.providerId ?? 'workdsh-identity-local' });
    this.provider = new LocalIdentityProvider(this.configured);
    this.id = this.provider.id;
  }

  async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(localIdentityDomainSpec);
    this.ctx.effect(() => () => domain.close(), 'workdshIdentity.domainClose');
    let state = domain.global.get();
    if (!state.initialized) {
      const revision = randomUUID();
      state = {
        initialized: true,
        providerId: this.id,
        principalId: this.configured.principalId,
        organization: {
          id: this.configured.organizationId,
          kind: 'personal',
          name: this.configured.organizationName,
          revision,
        },
        membership: {
          organizationId: this.configured.organizationId,
          principalId: this.configured.principalId,
          principalKind: 'human',
          role: 'owner',
          state: 'active',
          revision,
        },
      };
      await domain.global.set(state);
    }
    assertCoherent(state);
    if (state.providerId !== this.id
        || state.principalId !== this.configured.principalId
        || state.organization.id !== this.configured.organizationId
        || state.organization.name !== this.configured.organizationName) {
      throw new GovernanceContractError(
        'identity-local/config-conflict',
        'Host identity configuration conflicts with the persisted local profile.',
      );
    }
    this.currentProfile = immutableProfile(state);
  }

  profile(): IdentityProfile {
    if (!this.currentProfile) throw new GovernanceContractError('identity-local/not-ready', 'Local identity is not ready.');
    return this.currentProfile;
  }

  membership(organizationId: string, principalId: string): Membership | undefined {
    const profile = this.profile();
    return profile.membership.organizationId === organizationId
      && profile.membership.principalId === principalId
      ? profile.membership
      : undefined;
  }

  resolve(evidence?: LocalIdentityEvidence, signal?: AbortSignal): Promise<ActorContext> {
    this.profile();
    return this.provider.resolve(evidence, signal);
  }
}

export default LocalIdentityService;
