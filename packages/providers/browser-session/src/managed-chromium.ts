import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, type BrowserContext } from 'playwright-core';

export interface ManagedChromium {
  readonly endpoint: string;
  readonly profileDir: string;
  readonly context: BrowserContext;
  close(): Promise<void>;
}

const PORT_FILE = 'DevToolsActivePort';

async function readEndpoint(profileDir: string, signal?: AbortSignal): Promise<string> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    signal?.throwIfAborted();
    try {
      const [port] = (await readFile(join(profileDir, PORT_FILE), 'utf8')).split(/\r?\n/u);
      const number = Number(port);
      if (Number.isInteger(number) && number > 0 && number <= 65_535) {
        const endpoint = `http://127.0.0.1:${number}`;
        const response = await fetch(`${endpoint}/json/version`, { signal: AbortSignal.timeout(500) });
        if (response.ok) return endpoint;
      }
    } catch { /* Chromium writes the port file after startup. */ }
    await delay(50, undefined, { signal });
  }
  throw new Error('managed Chromium did not publish a local CDP endpoint');
}

/** Launch a private Chromium profile; caller must bind this handle to one live Session. */
export async function launchManagedChromium(executablePath: string, signal?: AbortSignal): Promise<ManagedChromium> {
  if (!executablePath.trim()) throw new Error('a bundled Chromium executable is required');
  signal?.throwIfAborted();
  const profileDir = await mkdtemp(join(tmpdir(), 'workdsh-browser-'));
  let context: BrowserContext | undefined;
  try {
    context = await chromium.launchPersistentContext(profileDir, {
      executablePath,
      headless: true,
      args: ['--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0'],
    });
    const endpoint = await readEndpoint(profileDir, signal);
    let closing: Promise<void> | undefined;
    const ownedContext = context;
    return {
      endpoint,
      profileDir,
      context: ownedContext,
      close: () => closing ??= (async () => {
        try { await ownedContext.close(); }
        finally { await rm(profileDir, { recursive: true, force: true }); }
      })(),
    };
  } catch (error) {
    try { await context?.close(); }
    finally { await rm(profileDir, { recursive: true, force: true }); }
    throw error;
  }
}
