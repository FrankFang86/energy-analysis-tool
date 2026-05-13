-- 迁移 SQL：添加空调EUI相关列到 annual_energy 表
-- 执行方式：在 Supabase Dashboard -> SQL Editor 中执行此 SQL

-- 添加空调EUI相关列（如果不存在）
ALTER TABLE annual_energy ADD COLUMN IF NOT EXISTS annual_ac_eui numeric(10, 2);
ALTER TABLE annual_energy ADD COLUMN IF NOT EXISTS monthly_ac_eui jsonb;

-- 添加注释
COMMENT ON COLUMN annual_energy.annual_ac_eui IS '年度空调EUI = 空调能耗 / 建筑面积';
COMMENT ON COLUMN annual_energy.monthly_ac_eui IS '月度空调EUI数组 [1月,2月,...,12月]';

-- 为现有数据计算并填充年度空调EUI
-- 注意：需要结合项目的空调运行模式、冷热月、建筑面积来计算
UPDATE annual_energy ae
SET annual_ac_eui = CASE
    WHEN p.building_area > 0 AND p.ac_mode IS NOT NULL THEN
      -- 简单估算：按冷热月比例计算空调能耗
      ROUND(
        (COALESCE(ae.month_1, 0) + COALESCE(ae.month_2, 0) + COALESCE(ae.month_3, 0) +
         COALESCE(ae.month_4, 0) + COALESCE(ae.month_5, 0) + COALESCE(ae.month_6, 0) +
         COALESCE(ae.month_7, 0) + COALESCE(ae.month_8, 0) + COALESCE(ae.month_9, 0) +
         COALESCE(ae.month_10, 0) + COALESCE(ae.month_11, 0) + COALESCE(ae.month_12, 0)
        ) * 0.45 / p.building_area * 100
      ) / 100
    ELSE NULL
  END
FROM projects p
WHERE ae.project_id = p.id
  AND ae.annual_ac_eui IS NULL;

-- 验证结果
SELECT
  ae.id,
  p.project_name,
  ae.year,
  ae.annual_eui,
  ae.annual_ac_eui
FROM annual_energy ae
JOIN projects p ON ae.project_id = p.id
LIMIT 10;