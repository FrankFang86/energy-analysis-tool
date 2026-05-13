/**
 * 数据库迁移脚本：添加 annual_eui 列到 annual_energy 表
 * 运行方式: npx ts-node migrations/add_annual_eui.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hhoqiozrkskuicgiqdkh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob3Fpb3pya3NrdWljZ2lxZGtoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgwNTUwNCwiZXhwIjoyMDkzMzgxNTA0fQ.MvSs4Q5nW9KWMQZklcDm1FqnPe729yJyCzpd9OKJ3Sc';

async function migrate() {
  console.log('开始数据库迁移...');

  // 使用 service role key 创建客户端（绕过 RLS）
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 检查列是否已存在
    console.log('检查 annual_eui 列是否存在...');
    const { data: checkData, error: checkError } = await supabase
      .from('annual_energy')
      .select('annual_eui')
      .limit(1);

    if (checkError && checkError.message.includes('annual_eui')) {
      console.log('列不存在，需要创建...');
    } else {
      console.log('列可能已存在或查询成功');
    }

    // 尝试添加列（使用 RPC 函数）
    // 首先创建一个函数来添加列（如果不存在）
    console.log('尝试添加 annual_eui 列...');

    // 使用 raw SQL 添加列
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        -- 添加 annual_eui 列（如果不存在）
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'annual_energy' AND column_name = 'annual_eui'
          ) THEN
            ALTER TABLE annual_energy ADD COLUMN annual_eui numeric(10, 2);
            RAISE NOTICE 'annual_eui 列已添加';
          ELSE
            RAISE NOTICE 'annual_eui 列已存在';
          END IF;
        END $$;
      `
    });

    if (error) {
      console.error('RPC 调用失败:', error);

      // 如果 RPC 函数不存在，尝试直接查询
      console.log('尝试直接查询验证...');
      const { data: testData } = await supabase
        .from('annual_energy')
        .select('id, year, month_1, month_2, month_3, month_4, month_5, month_6, month_7, month_8, month_9, month_10, month_11, month_12')
        .limit(1);

      if (testData) {
        console.log('数据库连接正常');
        console.log('示例数据:', testData[0]);

        // 尝试通过 upsert 更新现有数据的 annual_eui
        console.log('\n计算并更新现有数据的 annual_eui...');
        await updateExistingEUIs(supabase);
      }
    } else {
      console.log('迁移成功:', data);
    }

    // 验证列是否可用
    console.log('\n验证 annual_eui 列...');
    const { data: verifyData } = await supabase
      .from('annual_energy')
      .select('id, year, annual_eui')
      .limit(5);

    if (verifyData) {
      console.log('annual_eui 列已可访问');
      console.log('验证数据:', verifyData);
    }

    console.log('\n迁移完成！');

  } catch (err) {
    console.error('迁移出错:', err);
  }
}

async function updateExistingEUIs(supabase: any) {
  // 获取所有项目及其建筑面积
  const { data: projects } = await supabase
    .from('projects')
    .select('id, building_area');

  if (!projects) return;

  console.log(`找到 ${projects.length} 个项目`);

  for (const project of projects) {
    // 获取该项目的所有年度能耗数据
    const { data: energyRecords } = await supabase
      .from('annual_energy')
      .select('id, month_1, month_2, month_3, month_4, month_5, month_6, month_7, month_8, month_9, month_10, month_11, month_12')
      .eq('project_id', project.id);

    if (!energyRecords || energyRecords.length === 0) continue;

    for (const record of energyRecords) {
      // 计算总能耗
      const totalEnergy = [
        record.month_1, record.month_2, record.month_3, record.month_4,
        record.month_5, record.month_6, record.month_7, record.month_8,
        record.month_9, record.month_10, record.month_11, record.month_12
      ].reduce((sum: number, val: any) => sum + (val || 0), 0);

      // 计算 EUI
      const eui = project.building_area > 0 ? totalEnergy / project.building_area : 0;

      // 更新记录
      const { error } = await supabase
        .from('annual_energy')
        .update({ annual_eui: Math.round(eui * 100) / 100 })
        .eq('id', record.id);

      if (error) {
        console.error(`更新记录 ${record.id} 失败:`, error);
      }
    }
  }

  console.log('现有数据 EUI 更新完成');
}

migrate();
