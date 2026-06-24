// 数据库初始化脚本
// 运行方式: node scripts/init-db.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dybmtnyiiynfgjzzeljt.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Ci8rIdUHThvOOAx1FyyBDA_9n2K7F95';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
  console.log('🔍 检查 Supabase 连接...');
  console.log(`   URL: ${supabaseUrl}`);
  
  // 尝试查询 maps 表
  const { error } = await supabase.from('maps').select('id').limit(1);
  
  if (error) {
    if (error.code === '42P01') {
      console.log('❌ maps 表不存在，需要运行数据库迁移');
      return false;
    }
    console.log('⚠️  查询出错:', error.message);
    return false;
  }
  
  console.log('✅ 数据库连接成功，maps 表已存在');
  return true;
}

async function main() {
  const connected = await checkConnection();
  
  if (!connected) {
    console.log('\n📋 请在 Supabase SQL Editor 中运行以下迁移脚本：');
    console.log(`   ${supabaseUrl.replace('.supabase.co', '')}/sql-editor`);
    console.log('\n   或访问: https://supabase.com/dashboard/project/dybmtnyiiynfgjzzeljt/sql\n');
    
    const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '001_initial.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    console.log('--- SQL 开始 ---');
    console.log(sql);
    console.log('--- SQL 结束 ---\n');
  }
}

main();
