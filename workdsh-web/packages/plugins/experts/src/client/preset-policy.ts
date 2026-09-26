/** Compiled expert presets require an execution binding and are never native choices. */
export function isNativePreset(id: string): boolean { return !id.startsWith('wd-exp-'); }
export function nativePresetRows<T extends { id: string }>(rows: readonly T[]): readonly T[] {
  return rows.filter(row => isNativePreset(row.id));
}
export function requireNativePreset(id: string): void {
  if (!isNativePreset(id)) throw new Error('请从专家中心召唤专家；内部专家配置不能作为普通对话或默认配置。');
}
