import { createClient } from '@libsql/client';
import type { Client, InValue, InStatement, ResultSet, Transaction } from '@libsql/client';

let _turso: Client | null = null;

function getClient(): Client {
  if (!_turso) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) {
      throw new Error('Missing TURSO_DATABASE_URL');
    }
    _turso = createClient({ url, authToken });
  }
  return _turso;
}

// 懒初始化导出：第一次访问时才创建客户端
// 这样在 Vercel 构建时，如果没有环境变量，import 不会立即崩溃
export const turso: Pick<Client, 'execute' | 'batch' | 'transaction'> = {
  execute: (...args: Parameters<Client['execute']>) => getClient().execute(...args),
  batch: (...args: Parameters<Client['batch']>) => getClient().batch(...args),
  transaction: (...args: Parameters<Client['transaction']>) => getClient().transaction(...args),
};