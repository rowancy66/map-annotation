// 目前仅保留仓库内实际使用的工具函数，避免额外依赖。
export function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(' ');
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCoordinate(lng: number, lat: number): string {
  return `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
}
