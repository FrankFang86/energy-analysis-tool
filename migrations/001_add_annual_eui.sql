-- 迁移 SQL：在 annual_energy 表中添加 annual_eui 列
-- 执行方式：在 Supabase Dashboard -> SQL Editor 中执行此 SQL

-- 添加 annual_eui 列（如果不存在）
ALTER TABLE annual_energy ADD COLUMN IF NOT EXISTS annual_eui numeric(10, 2);

-- 为现有数据计算并填充 annual_eui
-- 使用 CASE WHEN 处理 building_area 为 0 的情况
UPDATE annual_energy ae
SET annual_eui = CASE
    WHEN p.building_area > 0 THEN
      ROUND(
        (COALESCE(ae.month_1, 0) + COALESCE(ae.month_2, 0) + COALESCE(ae.month_3, 0) +
         COALESCE(ae.month_4, 0) + COALESCE(ae.month_5, 0) + COALESCE(ae.month_6, 0) +
         COALESCE(ae.month_7, 0) + COALESCE(ae.month_8, 0) + COALESCE(ae.month_9, 0) +
         COALESCE(ae.month_10, 0) + COALESCE(ae.month_11, 0) + COALESCE(ae.month_12, 0)
        ) / p.building_area * 100
      ) / 100
    ELSE NULL
  END
FROM projects p
WHERE ae.project_id = p.id
  AND ae.annual_eui IS NULL;

-- 验证结果
SELECT
  ae.id,
  ae.project_id,
  p.project_name,
  ae.year,
  ae.annual_eui
FROM annual_energy ae
JOIN projects p ON ae.project_id = p.id
LIMIT 10;
