-- 创建管理员表
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email)
);

-- 启用 RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- 管理员可以读取所有管理员
CREATE POLICY "Admins can view admins" ON admins
  FOR SELECT USING (true);

-- 管理员可以插入管理员
CREATE POLICY "Admins can insert admins" ON admins
  FOR INSERT WITH CHECK (true);

-- 管理员可以删除管理员
CREATE POLICY "Admins can delete admins" ON admins
  FOR DELETE USING (true);

-- 初始管理员（fwing86@qq.com）
-- 注意：需要先确保该用户存在于 auth.users 中
-- 可以通过 Supabase Dashboard -> Authentication -> Users 添加用户

-- 添加初始管理员（如果用户已存在）
-- 请手动执行或通过应用添加
