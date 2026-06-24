import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto';
import { cookies } from 'next/headers';
import { turso } from '@/lib/turso';
import { ensureSchema } from './schema';

const SESSION_COOKIE = 'mapmark_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const SESSION_SECRET = process.env.APP_SESSION_SECRET || 'dev-session-secret';
const ADMIN_USER_ID = 'admin';

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

// ===== 管理密码 =====

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(':');
  if (!salt || !expectedHash) return false;
  const passwordHash = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  return expected.length === passwordHash.length && timingSafeEqual(expected, passwordHash);
}

export async function hasAdminPassword(): Promise<boolean> {
  await ensureSchema();
  const result = await turso.execute({
    sql: 'SELECT value FROM settings WHERE key = ? LIMIT 1',
    args: ['admin_password_hash'],
  });
  return result.rows.length > 0;
}

export async function setAdminPassword(password: string): Promise<void> {
  await ensureSchema();
  const hash = hashPassword(password);
  const now = new Date().toISOString();
  await turso.execute({
    sql: `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    args: ['admin_password_hash', hash],
  });
  // 记录设置时间
  await turso.execute({
    sql: `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    args: ['admin_password_set_at', now],
  });
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  await ensureSchema();
  const result = await turso.execute({
    sql: 'SELECT value FROM settings WHERE key = ? LIMIT 1',
    args: ['admin_password_hash'],
  });
  const row = result.rows[0];
  if (!row) return false;
  return verifyPassword(password, String(row.value));
}

// ===== Session 管理 =====

function hashSessionToken(token: string) {
  return createHash('sha256').update(`${SESSION_SECRET}:${token}`).digest('hex');
}

export async function createSession() {
  await ensureSchema();
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

  await turso.execute({
    sql: 'INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [crypto.randomUUID(), ADMIN_USER_ID, tokenHash, expiresAt, now.toISOString()],
  });

  return {
    token,
    expiresAt,
    cookieName: SESSION_COOKIE,
  };
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await ensureSchema();
    await turso.execute({
      sql: 'DELETE FROM sessions WHERE token_hash = ?',
      args: [hashSessionToken(token)],
    });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function isLoggedIn(): Promise<boolean> {
  await ensureSchema();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const result = await turso.execute({
    sql: `SELECT expires_at FROM sessions WHERE token_hash = ? LIMIT 1`,
    args: [hashSessionToken(token)],
  });

  const row = result.rows[0];
  if (!row) return false;

  const expiresAt = String(row.expires_at);
  if (new Date(expiresAt).getTime() <= Date.now()) {
    await clearSession();
    return false;
  }

  return true;
}