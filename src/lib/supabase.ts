import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase 环境变量未配置，请在 .env.local 中设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    _supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
  }
  return _supabase;
}

// 为了向后兼容，保留默认导出
export const supabase = typeof window !== 'undefined' ? getSupabase() : getSupabase();

// 图片上传到 Supabase Storage
export async function uploadAnnotationImage(file: File): Promise<string | null> {
  const client = getSupabase();
  const bucket = 'annotation-images';
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await client.storage.from(bucket).upload(filename, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    console.error('图片上传失败:', error.message);
    return null;
  }

  const { data } = client.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
}

// 删除已上传的图片
export async function deleteAnnotationImage(url: string): Promise<boolean> {
  const client = getSupabase();
  const bucket = 'annotation-images';
  const filename = url.split('/').pop();
  if (!filename) return false;

  const { error } = await client.storage.from(bucket).remove([filename]);
  return !error;
}
