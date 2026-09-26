/** Same-origin client for the official Connection-owned browser route. */

import type { BrowserFrame } from '../index.js';

const PATH = '/api/workdsh-browser-session';

async function request<T>(sessionId: string, operation: string, payload: object = {}, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(15_000);
  const response = await fetch(PATH, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId, operation, ...payload }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (response.status === 404 && operation === 'status') return { active: false } as T;
  if (!response.ok) throw new Error(response.status === 404 ? '浏览器会话已结束。' : '浏览器操作失败，请重试。');
  return response.json() as Promise<T>;
}

export const browserSessionClient = {
  status: (sessionId: string, signal?: AbortSignal) => request<{ active: boolean }>(sessionId, 'status', {}, signal),
  capture: (sessionId: string, signal?: AbortSignal) => request<BrowserFrame>(sessionId, 'capture', {}, signal),
  click: (sessionId: string, x: number, y: number, signal?: AbortSignal) => request<BrowserFrame>(sessionId, 'click', { x, y }, signal),
  type: (sessionId: string, text: string, signal?: AbortSignal) => request<BrowserFrame>(sessionId, 'type', { text }, signal),
  press: (sessionId: string, key: string, signal?: AbortSignal) => request<BrowserFrame>(sessionId, 'press', { key }, signal),
  scroll: (sessionId: string, deltaX: number, deltaY: number, signal?: AbortSignal) => request<BrowserFrame>(sessionId, 'scroll', { deltaX, deltaY }, signal),
  navigate: (sessionId: string, url: string, signal?: AbortSignal) => request<BrowserFrame>(sessionId, 'navigate', { url }, signal),
};
