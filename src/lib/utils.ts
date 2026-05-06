import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 目前简单实现，后续可加入 tailwind-merge
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 生成唯一 ID
export function generateId(): string {
  return crypto.randomUUID();
}

// 格式化日期
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

// 经纬度格式化
export function formatCoordinate(lng: number, lat: number): string {
  return `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
}
