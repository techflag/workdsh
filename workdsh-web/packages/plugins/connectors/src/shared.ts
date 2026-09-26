export type ConnectorState = 'discovering' | 'ready' | 'offline' | 'disabled';

export interface ConnectorSummary {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly serverName: string;
  readonly transport: 'stdio' | 'streamable-http';
  readonly scope: 'shared';
  readonly enabled: boolean;
  readonly state: ConnectorState;
  readonly toolNames: readonly string[];
  readonly resourceCount: number;
  readonly resourceTemplateCount: number;
  readonly lastCheckedAt: string;
  readonly diagnostic?: string;
}

export interface ConnectorConfigView {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly serverName: string;
  readonly transport: 'stdio' | 'streamable-http';
  readonly command?: string;
  readonly args?: readonly string[];
  readonly url?: string;
  readonly authorizationConfigured: boolean;
  readonly authorizationWritable: boolean;
  readonly editable: true;
}

export interface ConnectorInput {
  readonly title: string;
  readonly description?: string;
  readonly serverName: string;
  readonly transport: 'stdio' | 'streamable-http';
  readonly command?: string;
  readonly args?: readonly string[];
  readonly url?: string;
  /** Transient write-only value. It is stored by ctx.credentials and never returned. */
  readonly authorizationToken?: string;
}

export interface ConnectorManagementService {
  list(signal?: AbortSignal): Promise<readonly ConnectorSummary[]>;
  config(id: string): Promise<ConnectorConfigView>;
  create(input: ConnectorInput): Promise<ConnectorSummary>;
  update(id: string, input: ConnectorInput): Promise<ConnectorSummary>;
  remove(id: string): Promise<void>;
  setEnabled(id: string, enabled: boolean): Promise<ConnectorSummary>;
  selection(sessionId: string): Promise<readonly string[]>;
  setSelection(sessionId: string, connectorIds: readonly string[]): Promise<readonly string[]>;
}
