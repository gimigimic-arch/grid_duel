import { createClient } from '@supabase/supabase-js';

// サーバー専用クライアント（SERVICE_ROLE KEY使用）
// API Route内でのみ使用すること。クライアントコンポーネントからは使わないこと。
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
