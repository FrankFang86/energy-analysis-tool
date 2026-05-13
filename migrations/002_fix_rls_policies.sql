-- 修复 RLS 策略：确保同类项目数据可以被共享访问

-- 1. 确保 annual_energy 表的 RLS 允许读取 public 项目的数据
DROP POLICY IF EXISTS "Allow read public annual_energy" ON annual_energy;
CREATE POLICY "Allow read public annual_energy" ON annual_energy
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = annual_energy.project_id
    AND projects.is_public = true
  )
);

-- 2. 确保 projects 表的 RLS 允许读取 public 项目的数据
DROP POLICY IF EXISTS "Allow read public projects" ON projects;
CREATE POLICY "Allow read public projects" ON projects
FOR SELECT USING (is_public = true);

-- 3. 确保用户可以插入自己的数据
DROP POLICY IF EXISTS "Allow insert own annual_energy" ON annual_energy;
CREATE POLICY "Allow insert own annual_energy" ON annual_energy
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = annual_energy.project_id
    AND projects.user_id = auth.uid()
  )
);

-- 4. 确保用户可以更新自己的数据
DROP POLICY IF EXISTS "Allow update own annual_energy" ON annual_energy;
CREATE POLICY "Allow update own annual_energy" ON annual_energy
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = annual_energy.project_id
    AND projects.user_id = auth.uid()
  )
);

-- 5. 确保用户可以删除自己的数据
DROP POLICY IF EXISTS "Allow delete own annual_energy" ON annual_energy;
CREATE POLICY "Allow delete own annual_energy" ON annual_energy
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = annual_energy.project_id
    AND projects.user_id = auth.uid()
  )
);

-- 6. 确保 benchmarks 表可被所有认证用户读取
DROP POLICY IF EXISTS "Allow read benchmarks" ON benchmarks;
CREATE POLICY "Allow read benchmarks" ON benchmarks
FOR SELECT USING (true);

-- 验证 RLS 是否已启用
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('projects', 'annual_energy', 'benchmarks', 'profiles');