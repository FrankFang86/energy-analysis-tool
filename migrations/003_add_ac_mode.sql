-- 迁移 SQL：添加 ac_mode 列到 projects 表
-- 执行方式：在 Supabase Dashboard -> SQL Editor 中执行此 SQL

-- 添加 ac_mode 列（如果不存在）
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ac_mode text DEFAULT 'both';

-- 将现有数据的 ac_mode 设置为默认值 'both'
UPDATE projects SET ac_mode = 'both' WHERE ac_mode IS NULL;

-- 添加注释
COMMENT ON COLUMN projects.ac_mode IS '空调运行模式: cooling_only(单冷), heating_only(单热), both(冷热都有)';

-- 验证结果
SELECT id, project_name, ac_mode, ac_type FROM projects LIMIT 5;