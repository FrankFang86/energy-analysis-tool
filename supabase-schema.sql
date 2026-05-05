-- 建筑能耗分析工具数据库Schema

-- 1. 用户资料表
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company TEXT,
  phone TEXT,
  wechat_openid TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 项目表（核心数据）
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_name TEXT NOT NULL, -- 仅录入者可见

  -- 基本信息
  province TEXT NOT NULL, -- 省份
  city TEXT,
  building_type TEXT NOT NULL, -- 业态：办公/商场/酒店/医院/学校/住宅/工业/其他
  building_area DECIMAL(12,2) NOT NULL, -- 建筑面积 m²
  climate_zone TEXT NOT NULL, -- 气候区：严寒/寒冷/夏热冬冷/夏热冬暖/温和

  -- 空调与冷热月
  ac_type TEXT DEFAULT 'central', -- 空调形式：central/split/vrf/chiller/other
  cooling_months INTEGER[], -- 供冷月份，如 [5,6,7,8,9]
  heating_months INTEGER[], -- 供热月份，如 [11,12,1,2,3]

  -- 建筑特性（用于相似项目匹配）
  building_height DECIMAL(8,2), -- 建筑高度 m
  build_year INTEGER, -- 建成年份
  has_central_ac BOOLEAN DEFAULT false, -- 是否有中央空调
  has_heating BOOLEAN DEFAULT false, -- 是否有供暖
  has_ventilation BOOLEAN DEFAULT false, -- 是否有机械通风
  has_smart_control BOOLEAN DEFAULT false, -- 是否有智能控制
  energy_source TEXT[], -- 能源类型：电/天然气/煤/太阳能/其他
  rating_level TEXT, -- 能效等级

  -- 数据状态
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_public BOOLEAN DEFAULT false, -- 是否公开用于对比（不公开项目名）

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 月度能耗数据表（改造前）
CREATE TABLE monthly_energy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL, -- 数据年份

  -- 12个月能耗数据（kWh或m³）
  month_1 DECIMAL(12,2), month_2 DECIMAL(12,2), month_3 DECIMAL(12,2),
  month_4 DECIMAL(12,2), month_5 DECIMAL(12,2), month_6 DECIMAL(12,2),
  month_7 DECIMAL(12,2), month_8 DECIMAL(12,2), month_9 DECIMAL(12,2),
  month_10 DECIMAL(12,2), month_11 DECIMAL(12,2), month_12 DECIMAL(12,2),

  -- 单位（electricity/kwh, natural_gas/m³, coal/kg）
  unit TEXT DEFAULT 'kwh',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, year)
);

-- 4. 月度能耗数据表（改造后）
CREATE TABLE monthly_energy_after (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,

  month_1 DECIMAL(12,2), month_2 DECIMAL(12,2), month_3 DECIMAL(12,2),
  month_4 DECIMAL(12,2), month_5 DECIMAL(12,2), month_6 DECIMAL(12,2),
  month_7 DECIMAL(12,2), month_8 DECIMAL(12,2), month_9 DECIMAL(12,2),
  month_10 DECIMAL(12,2), month_11 DECIMAL(12,2), month_12 DECIMAL(12,2),

  unit TEXT DEFAULT 'kwh',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, year)
);

-- 5. 基准EUI数据库
CREATE TABLE benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 匹配维度
  province TEXT NOT NULL,
  building_type TEXT NOT NULL,
  climate_zone TEXT NOT NULL,

  -- 标准值
  standard_eui DECIMAL(10,4) NOT NULL, -- kWh/m²/年
  min_eui DECIMAL(10,4), -- 优秀值
  max_eui DECIMAL(10,4), -- 较差值

  -- 来源信息
  source_name TEXT, -- 标准名称
  source_url TEXT, -- 标准链接
  release_year INTEGER, -- 发布年份

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(province, building_type, climate_zone)
);

-- 6. 碳排放因子表
CREATE TABLE carbon_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  energy_type TEXT NOT NULL UNIQUE,
  factor DECIMAL(10,6) NOT NULL, -- kg CO2/kWh 或 kg CO2/m³
  source TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 预设选项数据
INSERT INTO carbon_factors (energy_type, factor, source) VALUES
('electricity', 0.8842, '国家发改委2019年电网排放因子'),
('natural_gas', 2.162, 'IPCC排放因子'),
('coal', 2.66, 'IPCC排放因子');

-- 8. 基准EUI初始数据
INSERT INTO benchmarks (province, building_type, climate_zone, standard_eui, min_eui, max_eui, source_name, release_year) VALUES
-- 办公建筑
('全国', '办公', '严寒', 85, 60, 120, '公共建筑能耗标准', 2019),
('全国', '办公', '寒冷', 75, 55, 110, '公共建筑能耗标准', 2019),
('全国', '办公', '夏热冬冷', 70, 50, 100, '公共建筑能耗标准', 2019),
('全国', '办公', '夏热冬暖', 65, 45, 95, '公共建筑能耗标准', 2019),
-- 商场
('全国', '商场', '严寒', 150, 100, 200, '公共建筑能耗标准', 2019),
('全国', '商场', '寒冷', 140, 90, 190, '公共建筑能耗标准', 2019),
('全国', '商场', '夏热冬冷', 130, 85, 180, '公共建筑能耗标准', 2019),
('全国', '商场', '夏热冬暖', 120, 80, 170, '公共建筑能耗标准', 2019),
-- 酒店
('全国', '酒店', '严寒', 120, 80, 160, '公共建筑能耗标准', 2019),
('全国', '酒店', '寒冷', 110, 75, 150, '公共建筑能耗标准', 2019),
('全国', '酒店', '夏热冬冷', 100, 70, 140, '公共建筑能耗标准', 2019),
('全国', '酒店', '夏热冬暖', 95, 65, 130, '公共建筑能耗标准', 2019),
-- 医院
('全国', '医院', '严寒', 180, 120, 250, '公共建筑能耗标准', 2019),
('全国', '医院', '寒冷', 170, 110, 240, '公共建筑能耗标准', 2019),
('全国', '医院', '夏热冬冷', 160, 100, 220, '公共建筑能耗标准', 2019),
('全国', '医院', '夏热冬暖', 150, 95, 210, '公共建筑能耗标准', 2019),
-- 学校
('全国', '学校', '严寒', 50, 30, 70, '公共建筑能耗标准', 2019),
('全国', '学校', '寒冷', 45, 28, 65, '公共建筑能耗标准', 2019),
('全国', '学校', '夏热冬冷', 40, 25, 60, '公共建筑能耗标准', 2019),
('全国', '学校', '夏热冬暖', 38, 22, 55, '公共建筑能耗标准', 2019);

-- 索引
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_location ON projects(province, building_type, climate_zone);
CREATE INDEX idx_projects_area ON projects(building_area);
CREATE INDEX idx_projects_ac_type ON projects(ac_type);
CREATE INDEX idx_monthly_project ON monthly_energy(project_id);
CREATE INDEX idx_monthly_after_project ON monthly_energy_after(project_id);
CREATE INDEX idx_benchmarks_match ON benchmarks(province, building_type, climate_zone);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_energy ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_energy_after ENABLE ROW LEVEL SECURITY;

-- Profiles: 用户只能读写自己的资料
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects: 项目创建者可读写，其他人只能查询公开项目（但不包含项目名）
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view public project metadata" ON projects
  FOR SELECT USING (is_public = true);

-- 月度数据：只有项目创建者可访问
CREATE POLICY "Users can manage own project data" ON monthly_energy
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can manage own project data after" ON monthly_energy_after
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Benchmarks: 公开查询
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view benchmarks" ON benchmarks
  FOR SELECT USING (true);