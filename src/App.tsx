import { useState, useEffect, useMemo } from 'react';
import { supabase, supabaseAdmin } from './lib/supabase';
import { PROVINCES, CLIMATE_ZONES, BUILDING_TYPES, MONTHS, AC_TYPES, extractProvinceCity, getClimateZoneByCity, getClimateZoneByProvince } from './lib/supabase';
import { setCache, getCache, clearCache } from './utils/cache';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart } from 'recharts';
import { User, LogOut, Plus, Calculator, Building2, Zap, Snowflake, Lightbulb, ArrowUpDown, Home, FileText, BarChart3, UserCircle, ChevronRight, TrendingUp, TrendingDown, Award, Target, Leaf, Save, Pencil, Trash2 } from 'lucide-react';
import './App.css';

// 类型定义
interface Profile {
  id: string;
  email: string;
  full_name?: string;
  company?: string;
  phone?: string;
}

interface Project {
  id: string;
  user_id: string;
  project_name: string;
  province: string;
  city?: string;
  building_type: string;
  building_area: number;
  climate_zone: string;
  ac_mode?: string;
  ac_type?: string;
  cooling_months?: number[];
  heating_months?: number[];
  is_public: boolean;
  created_at?: string;
}

interface MonthlyData {
  year: number;
  months: number[];
  unit: string;
}

interface ScopEquipment {
  id: string;
  name: string;
  ratedPower: number;
  frequency: number;
}

interface ScopLoadSegment {
  coolingLoad: number;
  chillerCount: number;
  chillers: ScopEquipment[];
  chilledPump: { ratedPower: number; frequency: number };
  coolingPump: { ratedPower: number; frequency: number };
  coolingTower: { ratedPower: number; frequency: number };
}

interface ScopData {
  lowLoad: ScopLoadSegment;
  highLoad: ScopLoadSegment;
}

interface Project {
  id: string;
  user_id: string;
  project_name: string;
  province: string;
  city?: string;
  building_type: string;
  building_area: number;
  climate_zone: string;
  ac_mode?: string;
  ac_type?: string;
  cooling_months?: number[];
  heating_months?: number[];
  is_public: boolean;
  created_at?: string;
  scop_data?: ScopData;
}

// 分类能耗类型
interface EnergyCategory {
  name: string;
  value: number;
  icon: string;
  color: string;
}

// 同类项目统计数据（从数据库计算得出）
interface PeerStats {
  count: number;       // 同类项目数量
  avgEUI: number;      // 同类项目平均EUI
  minEUI: number;      // 同类项目最低EUI（优秀）
  maxEUI: number;      // 同类项目最高EUI（较差）
}

// 空调相关统计数据
interface ACStats {
  annualAC_EUI: number;        // 年度空调EUI
  avgPeerAC_EUI: number;       // 同类项目平均空调EUI
  bestPeerAC_EUI: number;      // 同类最佳空调EUI
  energySavingPotential: number; // 节能空间 (%)
  energySavingAmount: number;   // 节能金额 (万元)
}

// 市选项（根据省份动态变化）
const getCitiesByProvince = (province: string): string[] => {
  const cityMap: Record<string, string[]> = {
    '北京': ['北京'], '天津': ['天津'], '上海': ['上海'], '重庆': ['重庆'],
    '河北': ['石家庄', '唐山', '保定', '邯郸', '秦皇岛', '廊坊', '沧州', '邢台', '衡水', '张家口', '承德'],
    '山西': ['太原', '大同', '运城', '长治', '晋城', '晋中', '临汾', '吕梁', '朔州', '忻州', '阳泉'],
    '内蒙古': ['呼和浩特', '包头', '鄂尔多斯', '呼伦贝尔', '赤峰', '通辽', '乌兰察布', '巴彦淖尔'],
    '辽宁': ['沈阳', '大连', '鞍山', '锦州', '抚顺', '本溪', '丹东', '营口', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛'],
    '吉林': ['长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城'],
    '黑龙江': ['哈尔滨', '大庆', '齐齐哈尔', '牡丹江', '佳木斯', '绥化', '鸡西', '双鸭山', '七台河', '鹤岗', '黑河', '伊春'],
    '江苏': ['南京', '苏州', '无锡', '常州', '南通', '徐州', '扬州', '镇江', '盐城', '连云港', '淮安', '泰州', '宿迁'],
    '浙江': ['杭州', '宁波', '温州', '嘉兴', '绍兴', '金华', '台州', '湖州', '衢州', '丽水', '舟山'],
    '安徽': ['合肥', '芜湖', '蚌埠', '马鞍山', '淮南', '淮北', '铜陵', '安庆', '黄山', '阜阳', '宿州', '滁州', '六安', '宣城', '池州', '亳州'],
    '福建': ['福州', '厦门', '泉州', '漳州', '莆田', '宁德', '三明', '南平', '龙岩'],
    '江西': ['南昌', '赣州', '九江', '宜春', '抚州', '上饶', '吉安', '景德镇', '萍乡', '新余', '鹰潭'],
    '山东': ['济南', '青岛', '烟台', '潍坊', '淄博', '威海', '临沂', '济宁', '泰安', '德州', '聊城', '滨州', '枣庄', '日照', '东营', '菏泽'],
    '河南': ['郑州', '洛阳', '开封', '新乡', '南阳', '安阳', '焦作', '许昌', '平顶山', '商丘', '周口', '信阳', '驻马店', '濮阳', '三门峡', '鹤壁', '漯河', '济源'],
    '湖北': ['武汉', '宜昌', '襄阳', '荆州', '黄冈', '荆门', '十堰', '孝感', '恩施', '随州', '咸宁', '黄石', '鄂州', '天门', '仙桃', '潜江'],
    '湖南': ['长沙', '株洲', '湘潭', '衡阳', '岳阳', '邵阳', '常德', '张家界', '益阳', '郴州', '永州', '怀化', '娄底', '湘西'],
    '广东': ['广州', '深圳', '佛山', '东莞', '珠海', '中山', '惠州', '江门', '汕头', '湛江', '茂名', '肇庆', '梅州', '汕尾', '河源', '阳江', '清远', '韶关', '揭阳', '云浮'],
    '广西': ['南宁', '桂林', '柳州', '北海', '梧州', '贵港', '玉林', '百色', '钦州', '河池', '贺州', '来宾', '崇左', '防城港'],
    '海南': ['海口', '三亚', '三沙', '儋州'],
    '四川': ['成都', '绵阳', '德阳', '宜宾', '泸州', '南充', '达州', '乐山', '内江', '自贡', '眉山', '广安', '资阳', '遂宁', '雅安', '广元', '巴中', '攀枝花', '甘孜', '阿坝', '凉山'],
    '贵州': ['贵阳', '遵义', '安顺', '六盘水', '毕节', '铜仁', '黔南', '黔东南', '黔西南'],
    '云南': ['昆明', '丽江', '大理', '曲靖', '红河', '文山', '玉溪', '楚雄', '普洱', '西双版纳', '德宏', '怒江', '迪庆', '临沧', '保山', '昭通'],
    '陕西': ['西安', '咸阳', '宝鸡', '延安', '榆林', '渭南', '商洛', '安康', '汉中', '铜川'],
    '甘肃': ['兰州', '天水', '酒泉', '张掖', '武威', '白银', '定西', '陇南', '平凉', '庆阳', '临夏', '甘南', '嘉峪关', '金昌'],
    '青海': ['西宁', '格尔木', '海东', '海南', '海西', '玉树', '果洛', '海北', '黄南'],
    '宁夏': ['银川', '石嘴山', '吴忠', '固原', '中卫'],
    '新疆': ['乌鲁木齐', '克拉玛依', '库尔勒', '喀什', '石河子', '哈密', '吐鲁番', '阿克苏', '和田', '伊宁', '博乐', '塔城', '阿勒泰'],
    '西藏': ['拉萨', '日喀则', '昌都', '林芝', '山南', '那曲', '阿里'],
    '香港': ['香港'], '澳门': ['澳门'],
    '台湾': ['台北', '高雄', '台中', '新北', '桃园', '台南', '基隆', '新竹'],
  };
  return cityMap[province] || [];
};

// 根据城市获取气候区（更精确）
const getClimateZoneByCity = (city: string, province: string): string => {
  const cityClimateMap: Record<string, string> = {
    // 严寒地区
    '哈尔滨': '严寒', '大庆': '严寒', '齐齐哈尔': '严寒', '牡丹江': '严寒', '佳木斯': '严寒', '绥化': '严寒', '鸡西': '严寒', '双鸭山': '严寒', '鹤岗': '严寒', '黑河': '严寒', '伊春': '严寒', '七台河': '严寒',
    '长春': '严寒', '吉林': '严寒', '四平': '严寒', '辽源': '严寒', '通化': '严寒', '白山': '严寒', '松原': '严寒', '白城': '严寒',
    '呼和浩特': '严寒', '包头': '严寒', '鄂尔多斯': '严寒', '呼伦贝尔': '严寒', '赤峰': '严寒', '通辽': '严寒', '乌兰察布': '严寒', '巴彦淖尔': '严寒',
    '乌鲁木齐': '严寒', '克拉玛依': '严寒', '库尔勒': '严寒', '喀什': '严寒', '石河子': '严寒', '哈密': '严寒', '吐鲁番': '严寒', '阿克苏': '严寒', '和田': '严寒', '伊宁': '严寒', '博乐': '严寒', '塔城': '严寒', '阿勒泰': '严寒',
    '拉萨': '严寒', '日喀则': '严寒', '昌都': '严寒', '那曲': '严寒', '阿里': '严寒', '林芝': '温和', '山南': '严寒',
    // 寒冷地区
    '沈阳': '寒冷', '大连': '寒冷', '鞍山': '寒冷', '锦州': '寒冷', '抚顺': '寒冷', '本溪': '寒冷', '丹东': '寒冷', '营口': '寒冷', '辽阳': '寒冷', '盘锦': '寒冷', '铁岭': '寒冷', '朝阳': '寒冷', '葫芦岛': '寒冷',
    '北京': '寒冷', '天津': '寒冷',
    '石家庄': '寒冷', '唐山': '寒冷', '保定': '寒冷', '邯郸': '寒冷', '秦皇岛': '寒冷', '廊坊': '寒冷', '沧州': '寒冷', '邢台': '寒冷', '衡水': '寒冷', '张家口': '严寒', '承德': '严寒',
    '太原': '寒冷', '大同': '严寒', '运城': '寒冷', '长治': '寒冷', '晋城': '寒冷', '晋中': '寒冷', '临汾': '寒冷', '吕梁': '寒冷', '朔州': '严寒', '忻州': '严寒', '阳泉': '寒冷',
    '济南': '寒冷', '青岛': '寒冷', '烟台': '寒冷', '潍坊': '寒冷', '淄博': '寒冷', '威海': '寒冷', '临沂': '寒冷', '济宁': '寒冷', '泰安': '寒冷', '德州': '寒冷', '聊城': '寒冷', '滨州': '寒冷', '枣庄': '寒冷', '日照': '寒冷', '东营': '寒冷', '菏泽': '寒冷',
    '郑州': '寒冷', '洛阳': '寒冷', '开封': '寒冷', '新乡': '寒冷', '南阳': '寒冷', '安阳': '寒冷', '焦作': '寒冷', '许昌': '寒冷', '平顶山': '寒冷', '商丘': '寒冷', '周口': '寒冷', '信阳': '寒冷', '驻马店': '寒冷', '濮阳': '寒冷', '三门峡': '寒冷', '鹤壁': '寒冷', '漯河': '寒冷', '济源': '寒冷',
    '西安': '寒冷', '咸阳': '寒冷', '宝鸡': '寒冷', '延安': '寒冷', '榆林': '严寒', '渭南': '寒冷', '商洛': '寒冷', '安康': '寒冷', '汉中': '夏热冬冷', '铜川': '寒冷',
    '兰州': '严寒', '天水': '寒冷', '酒泉': '严寒', '张掖': '严寒', '武威': '严寒', '白银': '严寒', '定西': '寒冷', '陇南': '夏热冬冷', '平凉': '寒冷', '庆阳': '寒冷', '临夏': '寒冷', '甘南': '严寒', '嘉峪关': '严寒', '金昌': '严寒',
    '西宁': '严寒', '格尔木': '严寒', '海东': '严寒', '海南': '严寒', '海西': '严寒', '玉树': '严寒', '果洛': '严寒', '海北': '严寒', '黄南': '严寒',
    '银川': '寒冷', '石嘴山': '寒冷', '吴忠': '寒冷', '固原': '寒冷', '中卫': '寒冷',
    // 夏热冬冷地区
    '上海': '夏热冬冷',
    '南京': '夏热冬冷', '苏州': '夏热冬冷', '无锡': '夏热冬冷', '常州': '夏热冬冷', '南通': '夏热冬冷', '徐州': '寒冷', '扬州': '夏热冬冷', '镇江': '夏热冬冷', '盐城': '夏热冬冷', '连云港': '夏热冬冷', '淮安': '夏热冬冷', '泰州': '夏热冬冷', '宿迁': '夏热冬冷',
    '杭州': '夏热冬冷', '宁波': '夏热冬冷', '温州': '夏热冬冷', '嘉兴': '夏热冬冷', '绍兴': '夏热冬冷', '金华': '夏热冬冷', '台州': '夏热冬冷', '湖州': '夏热冬冷', '衢州': '夏热冬冷', '丽水': '夏热冬冷', '舟山': '夏热冬冷',
    '合肥': '夏热冬冷', '芜湖': '夏热冬冷', '蚌埠': '夏热冬冷', '马鞍山': '夏热冬冷', '淮南': '夏热冬冷', '淮北': '寒冷', '铜陵': '夏热冬冷', '安庆': '夏热冬冷', '黄山': '夏热冬冷', '阜阳': '夏热冬冷', '宿州': '夏热冬冷', '滁州': '夏热冬冷', '六安': '夏热冬冷', '宣城': '夏热冬冷', '池州': '夏热冬冷', '亳州': '寒冷',
    '南昌': '夏热冬冷', '赣州': '夏热冬冷', '九江': '夏热冬冷', '宜春': '夏热冬冷', '抚州': '夏热冬冷', '上饶': '夏热冬冷', '吉安': '夏热冬冷', '景德镇': '夏热冬冷', '萍乡': '夏热冬冷', '新余': '夏热冬冷', '鹰潭': '夏热冬冷',
    '武汉': '夏热冬冷', '宜昌': '夏热冬冷', '襄阳': '夏热冬冷', '荆州': '夏热冬冷', '黄冈': '夏热冬冷', '荆门': '夏热冬冷', '十堰': '夏热冬冷', '孝感': '夏热冬冷', '恩施': '夏热冬冷', '随州': '夏热冬冷', '咸宁': '夏热冬冷', '黄石': '夏热冬冷', '鄂州': '夏热冬冷', '天门': '夏热冬冷', '仙桃': '夏热冬冷', '潜江': '夏热冬冷',
    '长沙': '夏热冬冷', '株洲': '夏热冬冷', '湘潭': '夏热冬冷', '衡阳': '夏热冬冷', '岳阳': '夏热冬冷', '邵阳': '夏热冬冷', '常德': '夏热冬冷', '张家界': '夏热冬冷', '益阳': '夏热冬冷', '郴州': '夏热冬冷', '永州': '夏热冬冷', '怀化': '夏热冬冷', '娄底': '夏热冬冷', '湘西': '夏热冬冷',
    '重庆': '夏热冬冷',
    '成都': '夏热冬冷', '绵阳': '夏热冬冷', '德阳': '夏热冬冷', '宜宾': '夏热冬冷', '泸州': '夏热冬冷', '南充': '夏热冬冷', '达州': '夏热冬冷', '乐山': '夏热冬冷', '内江': '夏热冬冷', '自贡': '夏热冬冷', '眉山': '夏热冬冷', '广安': '夏热冬冷', '资阳': '夏热冬冷', '遂宁': '夏热冬冷', '雅安': '夏热冬冷', '广元': '夏热冬冷', '巴中': '夏热冬冷', '攀枝花': '夏热冬暖', '甘孜': '严寒', '阿坝': '严寒', '凉山': '夏热冬暖',
    '贵阳': '夏热冬冷', '遵义': '夏热冬冷', '安顺': '夏热冬冷', '六盘水': '温和', '毕节': '夏热冬冷', '铜仁': '夏热冬冷', '黔南': '夏热冬冷', '黔东南': '夏热冬冷', '黔西南': '夏热冬冷',
    // 温和地区
    '昆明': '温和', '丽江': '温和', '大理': '温和', '曲靖': '温和', '玉溪': '温和', '楚雄': '温和', '普洱': '温和', '临沧': '温和', '保山': '温和', '昭通': '温和', '怒江': '温和',
    // 夏热冬暖地区
    '福州': '夏热冬暖', '厦门': '夏热冬暖', '泉州': '夏热冬暖', '漳州': '夏热冬暖', '莆田': '夏热冬暖', '宁德': '夏热冬暖', '三明': '夏热冬冷', '南平': '夏热冬冷', '龙岩': '夏热冬暖',
    '广州': '夏热冬暖', '深圳': '夏热冬暖', '佛山': '夏热冬暖', '东莞': '夏热冬暖', '珠海': '夏热冬暖', '中山': '夏热冬暖', '惠州': '夏热冬暖', '江门': '夏热冬暖', '汕头': '夏热冬暖', '湛江': '夏热冬暖', '茂名': '夏热冬暖', '肇庆': '夏热冬暖', '梅州': '夏热冬暖', '汕尾': '夏热冬暖', '河源': '夏热冬暖', '阳江': '夏热冬暖', '清远': '夏热冬暖', '韶关': '夏热冬暖', '揭阳': '夏热冬暖', '云浮': '夏热冬暖',
    '南宁': '夏热冬暖', '桂林': '夏热冬暖', '柳州': '夏热冬暖', '北海': '夏热冬暖', '梧州': '夏热冬暖', '贵港': '夏热冬暖', '玉林': '夏热冬暖', '百色': '夏热冬暖', '钦州': '夏热冬暖', '河池': '夏热冬暖', '贺州': '夏热冬暖', '来宾': '夏热冬暖', '崇左': '夏热冬暖', '防城港': '夏热冬暖',
    '海口': '夏热冬暖', '三亚': '夏热冬暖', '三沙': '夏热冬暖', '儋州': '夏热冬暖',
    '香港': '夏热冬暖', '澳门': '夏热冬暖',
    '台北': '夏热冬暖', '高雄': '夏热冬暖', '台中': '夏热冬暖', '新北': '夏热冬暖', '桃园': '夏热冬暖', '台南': '夏热冬暖', '基隆': '夏热冬暖', '新竹': '夏热冬暖',
    '红河': '夏热冬暖', '文山': '夏热冬暖', '西双版纳': '夏热冬暖', '德宏': '夏热冬暖', '迪庆': '严寒',
  };
  return cityClimateMap[city] || getClimateZoneByProvince(province);
};

function App() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'login' | 'dashboard' | 'project-form' | 'project-detail' | 'analysis' | 'admin'>('login');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'input' | 'analysis' | 'profile'>('home');

  // 项目表单状态
  const [projectForm, setProjectForm] = useState<Partial<Project>>({
    project_name: '',
    province: '',
    city: '',
    building_type: '',
    climate_zone: '',
    building_area: 0,
    is_public: true,
  });

  // 空调形式和冷热月状态
  const [acMode, setAcMode] = useState<'cooling_only' | 'heating_only' | 'both'>('both'); // 单冷/单热/冷热都有
  const [acTypes, setAcTypes] = useState<string[]>(['水冷冷水机组']); // 空调形式多选
  const [coolingMonths, setCoolingMonths] = useState<number[]>([5, 6, 7, 8, 9]);
  const [heatingMonths, setHeatingMonths] = useState<number[]>([11, 12, 1, 2, 3]);

  // 能耗数据状态 - 支持多年数据
  const [annualData, setAnnualData] = useState<MonthlyData[]>([
    { year: new Date().getFullYear(), months: Array(12).fill(0), unit: 'kWh' },
  ]);

  // 当前选择的年份索引
  const [selectedYearIndex, setSelectedYearIndex] = useState(0);

  // 分类能耗数据
  const [energyCategories, setEnergyCategories] = useState<EnergyCategory[]>([
    { name: '空调', value: 0, icon: 'snowflake', color: '#3b82f6' },
    { name: '照明', value: 0, icon: 'lightbulb', color: '#f59e0b' },
    { name: '电梯', value: 0, icon: 'arrow-up-down', color: '#8b5cf6' },
    { name: '其他', value: 0, icon: 'zap', color: '#6b7280' },
  ]);

  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);

  // 项目EUI缓存
  const [projectEUIs, setProjectEUIs] = useState<Record<string, number>>({});

  // 同类项目月度EUI均值（从数据库查询）
  const [peerMonthlyEUI, setPeerMonthlyEUI] = useState<number[]>([]);

  // 同类最优秀项目的月度EUI（从数据库查询）
  const [bestPeerMonthlyEUI, setBestPeerMonthlyEUI] = useState<number[]>([]);

  // 同类项目统计数据（从数据库计算）
  const [peerStats, setPeerStats] = useState<PeerStats>({ count: 0, avgEUI: 0, minEUI: 0, maxEUI: 0 });

  // 空调EUI相关状态
  const [projectAC_EUIs, setProjectAC_EUIs] = useState<Record<string, number>>({}); // 项目年度空调EUI
  const [acMonthlyEUI, setAcMonthlyEUI] = useState<number[]>([]); // 空调月度EUI
  const [acStats, setAcStats] = useState<ACStats>({
    annualAC_EUI: 0,
    avgPeerAC_EUI: 0,
    bestPeerAC_EUI: 0,
    energySavingPotential: 0,
    energySavingAmount: 0,
  });

  // 管理员相关状态
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsers, setAdminUsers] = useState<Profile[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [resetUserEmail, setResetUserEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [adminError, setAdminError] = useState('');

  // SCOP 相关状态
  const [scopData, setScopData] = useState<ScopData>({
    lowLoad: {
      coolingLoad: 0,
      chillerCount: 1,
      chillers: [{ id: '1', name: '主机1', ratedPower: 0, frequency: 50 }],
      chilledPump: { ratedPower: 0, frequency: 50 },
      coolingPump: { ratedPower: 0, frequency: 50 },
      coolingTower: { ratedPower: 0, frequency: 50 },
    },
    highLoad: {
      coolingLoad: 0,
      chillerCount: 1,
      chillers: [{ id: '1', name: '主机1', ratedPower: 0, frequency: 50 }],
      chilledPump: { ratedPower: 0, frequency: 50 },
      coolingPump: { ratedPower: 0, frequency: 50 },
      coolingTower: { ratedPower: 0, frequency: 50 },
    },
  });

  const calculateScop = (segment: ScopLoadSegment): number => {
    const { coolingLoad, chillers, chilledPump, coolingPump, coolingTower } = segment;
    if (coolingLoad <= 0) return 0;

    const totalChillerPower = chillers.reduce((sum, c) => sum + c.ratedPower, 0);
    const chilledPumpPower = chilledPump.ratedPower * Math.pow(chilledPump.frequency / 50, 3) / 0.85;
    const coolingPumpPower = coolingPump.ratedPower * Math.pow(coolingPump.frequency / 50, 3) / 0.85;
    const coolingTowerPower = coolingTower.ratedPower * Math.pow(coolingTower.frequency / 50, 3) / 0.85;

    const totalPower = totalChillerPower + chilledPumpPower + coolingPumpPower + coolingTowerPower;
    if (totalPower <= 0) return 0;

    return coolingLoad / totalPower;
  };

  useEffect(() => {
    checkUser();
    loadBenchmarks();
  }, []);

  // 当选择的项目变化时，加载同类项目数据
  useEffect(() => {
    if (selectedProject && view === 'project-detail') {
      loadPeerStats(selectedProject);
      loadPeerMonthlyEUI(selectedProject);
      loadACStats(selectedProject);
    }
  }, [selectedProject?.id, view]);

  // 使用useMemo计算同类均值月度数据（确保在peerMonthlyEUI更新后重新计算）
  const peerMonthlyData = useMemo(() => {
    if (!peerMonthlyEUI || peerMonthlyEUI.length === 0) {
      return [];
    }
    return peerMonthlyEUI;
  }, [peerMonthlyEUI]);

  // 使用useMemo计算同类最佳项目月度数据
  const bestPeerMonthlyData = useMemo(() => {
    if (!bestPeerMonthlyEUI || bestPeerMonthlyEUI.length === 0) {
      return [];
    }
    return bestPeerMonthlyEUI;
  }, [bestPeerMonthlyEUI]);

  const checkUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await loadProfile(authUser.id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('checkUser error:', err);
      setLoading(false);
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setUser(data);
        // 检查是否为管理员
        const adminEmail = 'fwing86@qq.com';
        setIsAdmin(data.email === adminEmail);
      } else {
        const { data: newProfile } = await supabase.from('profiles').insert({
          id: userId,
          email: email,
          full_name: '',
        }).select().single();
        if (newProfile) setUser(newProfile);
      }
      loadProjects();
      setView('dashboard');
    } catch (err) {
      console.error('loadProfile error:', err);
      setView('dashboard');
      loadProjects();
    } finally {
      setLoading(false);
    }
  };

  // 管理员：创建用户
  const adminCreateUser = async () => {
    setAdminMessage('');
    setAdminError('');

    if (!newUserEmail || !newUserPassword) {
      setAdminError('请填写邮箱和密码');
      return;
    }

    if (newUserPassword.length < 6) {
      setAdminError('密码至少需要6位');
      return;
    }

    try {
      // 使用服务角色客户端创建用户
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        email_confirm: true,
      });

      if (error) {
        setAdminError(error.message || '创建用户失败');
        return;
      }

      // 创建 profiles 记录
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: newUserEmail,
        });
      }

      setAdminMessage(`用户 ${newUserEmail} 创建成功！`);
      setNewUserEmail('');
      setNewUserPassword('');
      loadAdminUsers();
    } catch (err: any) {
      console.error('创建用户失败:', err);
      setAdminError(err.message || '创建用户失败');
    }
  };

  // 管理员：重置用户密码
  const adminResetPassword = async () => {
    setAdminMessage('');
    setAdminError('');

    if (!resetUserEmail || !resetNewPassword) {
      setAdminError('请填写邮箱和新密码');
      return;
    }

    if (resetNewPassword.length < 6) {
      setAdminError('新密码至少需要6位');
      return;
    }

    try {
      // 查找用户
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', resetUserEmail)
        .single();

      if (userError || !userData) {
        setAdminError('用户不存在');
        return;
      }

      // 使用服务角色客户端更新密码
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userData.id,
        { password: resetNewPassword }
      );

      if (updateError) {
        setAdminError(updateError.message || '重置密码失败');
        return;
      }

      setAdminMessage(`用户 ${resetUserEmail} 的密码已重置！`);
      setResetUserEmail('');
      setResetNewPassword('');
    } catch (err: any) {
      console.error('重置密码失败:', err);
      setAdminError(err.message || '重置密码失败');
    }
  };

  // 管理员：加载用户列表
  const loadAdminUsers = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').order('email');
      if (data) {
        setAdminUsers(data);
      }
    } catch (err) {
      console.error('加载用户列表失败:', err);
    }
  };

  const loadProjects = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    // 尝试从缓存读取
    const cachedProjects = getCache<Project[]>('projects', authUser.id);
    const cachedEUIs = getCache<Record<string, number>>('project_euis', authUser.id);

    // 加载项目列表
    const { data } = await supabase.from('projects').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false });
    if (data) {
      setProjects(data);
      // 更新缓存
      setCache('projects', data, authUser.id);
    }

    // 优先从缓存读取 EUI 数据（快速显示）
    if (cachedEUIs && Object.keys(cachedEUIs).length > 0) {
      setProjectEUIs(cachedEUIs);
    }

    // 后台加载 EUI 数据并更新缓存
    const euiMap: Record<string, number> = {};

    for (const project of data || []) {
      // 尝试读取预存的 annual_eui
      const { data: energyData, error } = await supabase
        .from('annual_energy')
        .select('annual_eui, year, month_1, month_2, month_3, month_4, month_5, month_6, month_7, month_8, month_9, month_10, month_11, month_12')
        .eq('project_id', project.id)
        .order('year', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // 如果是列不存在错误，从月度数据计算
        if (error.message.includes('annual_eui') || error.message.includes('does not exist')) {
          const { data: fallbackData } = await supabase
            .from('annual_energy')
            .select('year, month_1, month_2, month_3, month_4, month_5, month_6, month_7, month_8, month_9, month_10, month_11, month_12')
            .eq('project_id', project.id)
            .order('year', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (fallbackData && project.building_area > 0) {
            const months = ['month_1', 'month_2', 'month_3', 'month_4', 'month_5', 'month_6',
                           'month_7', 'month_8', 'month_9', 'month_10', 'month_11', 'month_12'];
            const totalEnergy = months.reduce((sum, m) => sum + ((fallbackData as any)[m] || 0), 0);
            const eui = totalEnergy / project.building_area;
            if (eui > 0) euiMap[project.id] = Math.round(eui * 100) / 100;
          }
        }
        continue;
      }

      if (energyData) {
        // 优先使用预存的 annual_eui
        if (energyData.annual_eui && energyData.annual_eui > 0) {
          euiMap[project.id] = energyData.annual_eui;
        } else if (project.building_area > 0) {
          // 如果预存值为0或null，从月度数据计算
          const months = ['month_1', 'month_2', 'month_3', 'month_4', 'month_5', 'month_6',
                         'month_7', 'month_8', 'month_9', 'month_10', 'month_11', 'month_12'];
          const totalEnergy = months.reduce((sum, m) => sum + ((energyData as any)[m] || 0), 0);
          const eui = totalEnergy / project.building_area;
          if (eui > 0) euiMap[project.id] = Math.round(eui * 100) / 100;
        }
      }
    }

    // 更新 EUI 缓存
    setCache('project_euis', euiMap, authUser.id);
    setProjectEUIs(euiMap);
  };

  const loadBenchmarks = async () => {
    const { data } = await supabase.from('benchmarks').select('*').eq('province', '全国');
    if (data) setBenchmarks(data);
  };

  // 加载同类项目的统计数据（从数据库计算）
  const loadPeerStats = async (project: Project) => {
    try {
      // 查询同类项目（同一业态且is_public=true，排除当前项目）
      const { data: peerProjects, error: peerError } = await supabase
        .from('projects')
        .select('*')
        .eq('building_type', project.building_type)
        .eq('is_public', true)
        .neq('id', project.id);

      if (peerError) {
        console.error('查询同类项目失败:', peerError);
        const benchmark = getMatchingBenchmark(project);
        setPeerStats({
          count: 0,
          avgEUI: benchmark?.standard_eui || 80,
          minEUI: benchmark?.min_eui || 60,
          maxEUI: benchmark?.max_eui || 120,
        });
        return;
      }

      if (!peerProjects || peerProjects.length === 0) {
        // 没有同类项目时，使用benchmark数据作为兜底
        const benchmark = getMatchingBenchmark(project);
        setPeerStats({
          count: 0,
          avgEUI: benchmark?.standard_eui || 80,
          minEUI: benchmark?.min_eui || 60,
          maxEUI: benchmark?.max_eui || 120,
        });
        return;
      }

      // 收集同类项目的 EUI 数据
      const peerEUIList: { eui: number; buildingArea: number }[] = [];

      for (const p of peerProjects) {
        // 获取该项目的年度能耗数据
        const { data: energyData, error: energyError } = await supabase
          .from('annual_energy')
          .select('year, month_1, month_2, month_3, month_4, month_5, month_6, month_7, month_8, month_9, month_10, month_11, month_12')
          .eq('project_id', p.id)
          .order('year', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (energyError) {
          console.error('获取能耗数据失败:', energyError);
          continue;
        }

        if (energyData && p.building_area > 0) {
          // 计算年度总能耗
          const months = ['month_1', 'month_2', 'month_3', 'month_4', 'month_5', 'month_6',
                         'month_7', 'month_8', 'month_9', 'month_10', 'month_11', 'month_12'];
          const totalEnergy = months.reduce((sum, m) => sum + ((energyData as any)[m] || 0), 0);
          const eui = totalEnergy / p.building_area;

          if (eui > 0) {
            peerEUIList.push({ eui, buildingArea: p.building_area });
          }
        }
      }

      if (peerEUIList.length === 0) {
        // 无法计算时使用benchmark兜底
        const benchmark = getMatchingBenchmark(project);
        setPeerStats({
          count: peerProjects.length,
          avgEUI: benchmark?.standard_eui || 80,
          minEUI: benchmark?.min_eui || 60,
          maxEUI: benchmark?.max_eui || 120,
        });
      } else {
        // 计算统计数据
        const euis = peerEUIList.map(p => p.eui);
        const avg = euis.reduce((s, e) => s + e, 0) / euis.length;
        const sorted = [...euis].sort((a, b) => a - b);
        setPeerStats({
          count: peerProjects.length,
          avgEUI: Math.round(avg * 100) / 100,
          minEUI: sorted[0],
          maxEUI: sorted[sorted.length - 1],
        });
      }
    } catch (err) {
      console.error('loadPeerStats 出错:', err);
      const benchmark = getMatchingBenchmark(project);
      setPeerStats({
        count: 0,
        avgEUI: benchmark?.standard_eui || 80,
        minEUI: benchmark?.min_eui || 60,
        maxEUI: benchmark?.max_eui || 120,
      });
    }
  };

  // 加载同类项目的月度EUI均值和最佳项目数据
  const loadPeerMonthlyEUI = async (project: Project) => {
    try {
      // 查询同类项目，使用原始building_type
      const { data: peerProjects, error: peerError } = await supabase
        .from('projects')
        .select('*')
        .eq('building_type', project.building_type)
        .eq('is_public', true)
        .neq('id', project.id);

      if (peerError) {
        console.error('查询同类项目失败:', peerError);
        setPeerMonthlyEUI([]);
        setBestPeerMonthlyEUI([]);
        return;
      }

      if (!peerProjects || peerProjects.length === 0) {
        setPeerMonthlyEUI([]);
        setBestPeerMonthlyEUI([]);
        return;
      }

      // 收集每个月的EUI数据（从月度能耗和building_area计算）
      const monthlyEUIs: number[][] = Array.from({ length: 12 }, () => []);
      // 存储每个项目的年度EUI用于找最佳项目
      const peerAnnualEUIList: { projectId: string; annualEUI: number; buildingArea: number }[] = [];

      for (const p of peerProjects) {
        const { data: energyData, error: energyError } = await supabase
          .from('annual_energy')
          .select('month_1,month_2,month_3,month_4,month_5,month_6,month_7,month_8,month_9,month_10,month_11,month_12')
          .eq('project_id', p.id)
          .order('year', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (energyError) {
          console.error('获取能耗数据失败:', energyError);
          continue;
        }

        if (energyData && p.building_area > 0) {
          let annualTotal = 0;
          for (let m = 0; m < 12; m++) {
            const monthEnergy = energyData[`month_${m + 1}` as keyof typeof energyData] as number || 0;
            annualTotal += monthEnergy;
            const monthEUI = monthEnergy / p.building_area;
            if (monthEUI > 0) {
              monthlyEUIs[m].push(monthEUI);
            }
          }
          const annualEUI = annualTotal / p.building_area;
          peerAnnualEUIList.push({ projectId: p.id, annualEUI, buildingArea: p.building_area });
        }
      }

      // 计算每个月的平均EUI
      const monthlyAvg = monthlyEUIs.map(euis => {
        if (euis.length === 0) return 0;
        return Math.round((euis.reduce((s, e) => s + e, 0) / euis.length) * 100) / 100;
      });

      setPeerMonthlyEUI(monthlyAvg);

      // 找出年度EUI最低的最佳项目
      if (peerAnnualEUIList.length > 0) {
        const bestPeer = peerAnnualEUIList.reduce((min, curr) =>
          curr.annualEUI < min.annualEUI ? curr : min
        );

        // 加载最佳项目的月度EUI数据
        const { data: bestEnergyData, error: bestError } = await supabase
          .from('annual_energy')
          .select('month_1,month_2,month_3,month_4,month_5,month_6,month_7,month_8,month_9,month_10,month_11,month_12')
          .eq('project_id', bestPeer.projectId)
          .order('year', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (bestError) {
          console.error('获取最佳项目数据失败:', bestError);
          setBestPeerMonthlyEUI([]);
        } else if (bestEnergyData && bestPeer.buildingArea > 0) {
          const bestMonthlyEUI = Array(12).fill(0).map((_, m) => {
            const monthEnergy = bestEnergyData[`month_${m + 1}` as keyof typeof bestEnergyData] as number || 0;
            return Math.round((monthEnergy / bestPeer.buildingArea) * 100) / 100;
          });
          setBestPeerMonthlyEUI(bestMonthlyEUI);
        } else {
          setBestPeerMonthlyEUI([]);
        }
      } else {
        setBestPeerMonthlyEUI([]);
      }
    } catch (err) {
      console.error('loadPeerMonthlyEUI 出错:', err);
      setPeerMonthlyEUI([]);
      setBestPeerMonthlyEUI([]);
    }
  };

  // 加载空调EUI相关统计数据
  // 基准能耗 = 非冷热月的能耗平均值
  // 月度空调EUI = (月度能耗 - 基准能耗) / 建筑面积
  // 年度空调EUI = 12个月月度空调EUI之和
  const loadACStats = async (project: Project) => {
    try {
      // 获取项目的年度能耗数据
      const { data: energyData } = await supabase
        .from('annual_energy')
        .select('year, month_1, month_2, month_3, month_4, month_5, month_6, month_7, month_8, month_9, month_10, month_11, month_12')
        .eq('project_id', project.id)
        .order('year', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!energyData || project.building_area <= 0) {
        setAcMonthlyEUI(Array(12).fill(0));
        setAcStats({
          annualAC_EUI: 0,
          avgPeerAC_EUI: 0,
          bestPeerAC_EUI: 0,
          energySavingPotential: 0,
          energySavingAmount: 0,
        });
        return;
      }

      const months = ['month_1', 'month_2', 'month_3', 'month_4', 'month_5', 'month_6',
                      'month_7', 'month_8', 'month_9', 'month_10', 'month_11', 'month_12'];

      // 获取月度能耗数据
      const monthlyEnergies: number[] = [];
      for (let m = 0; m < 12; m++) {
        monthlyEnergies.push((energyData as any)[months[m]] || 0);
      }

      // 获取所有冷热月
      const allACMonths = new Set([...(project.cooling_months || []), ...(project.heating_months || [])]);

      // 计算非冷热月的能耗值
      const nonACMonthValues = monthlyEnergies.filter((_, i) => !allACMonths.has(i + 1));

      // 计算基准能耗（剔除冷热月后的月均能耗）
      const avgNonAC = nonACMonthValues.length > 0
        ? nonACMonthValues.reduce((s, v) => s + v, 0) / nonACMonthValues.length
        : 0;

      // 计算月度空调EUI：月度空调能耗 / 建筑面积
      const acMonthlyEUIList: number[] = [];
      let annualACEnergy = 0;
      let annualTotal = 0;

      for (let m = 0; m < 12; m++) {
        const monthEnergy = monthlyEnergies[m];
        annualTotal += monthEnergy;
        // 月度空调能耗 = max(0, 月度能耗 - 基准能耗)
        const monthACEnergy = Math.max(0, monthEnergy - avgNonAC);
        annualACEnergy += monthACEnergy;
        // 月度空调EUI
        const acEUI = monthACEnergy / project.building_area;
        acMonthlyEUIList.push(Math.round(acEUI * 100) / 100);
      }

      setAcMonthlyEUI(acMonthlyEUIList);

      // 年度空调EUI = 12个月月度空调EUI之和
      const annualAC_EUI = acMonthlyEUIList.reduce((sum, e) => sum + e, 0);
      const annualAC_EUIRounded = Math.round(annualAC_EUI * 100) / 100;

      // 查询同类项目
      const { data: peerProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('building_type', project.building_type)
        .eq('is_public', true)
        .neq('id', project.id);

      // 计算同类项目的空调EUI
      const peerAC_EUIs: number[] = [];
      let bestPeerAC_EUI = 0;

      for (const p of peerProjects || []) {
        const { data: pEnergy } = await supabase
          .from('annual_energy')
          .select('month_1, month_2, month_3, month_4, month_5, month_6, month_7, month_8, month_9, month_10, month_11, month_12')
          .eq('project_id', p.id)
          .order('year', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (pEnergy && p.building_area > 0) {
          const pMonthlyEnergies: number[] = [];
          for (const m of months) {
            pMonthlyEnergies.push((pEnergy as any)[m] || 0);
          }

          // 计算同类项目的基准能耗
          const pACMonths = new Set([...(p.cooling_months || []), ...(p.heating_months || [])]);
          const pNonACValues = pMonthlyEnergies.filter((_, i) => !pACMonths.has(i + 1));
          const pAvgNonAC = pNonACValues.length > 0
            ? pNonACValues.reduce((s, v) => s + v, 0) / pNonACValues.length
            : 0;

          // 计算同类项目的月度空调EUI
          let pAnnualAC_EUI = 0;
          for (let m = 0; m < 12; m++) {
            const pMonthACEnergy = Math.max(0, pMonthlyEnergies[m] - pAvgNonAC);
            pAnnualAC_EUI += pMonthACEnergy / p.building_area;
          }

          if (pAnnualAC_EUI > 0) {
            peerAC_EUIs.push(pAnnualAC_EUI);
            if (bestPeerAC_EUI === 0 || pAnnualAC_EUI < bestPeerAC_EUI) {
              bestPeerAC_EUI = pAnnualAC_EUI;
            }
          }
        }
      }

      // 计算平均空调EUI
      const avgPeerAC_EUI = peerAC_EUIs.length > 0
        ? Math.round((peerAC_EUIs.reduce((s, e) => s + e, 0) / peerAC_EUIs.length) * 100) / 100
        : annualAC_EUIRounded * 0.45; // 使用行业估算值

      // 计算节能空间
      let energySavingPotential = 0;
      if (avgPeerAC_EUI > 0 && annualAC_EUIRounded > avgPeerAC_EUI) {
        energySavingPotential = Math.round(((annualAC_EUIRounded - avgPeerAC_EUI) / annualAC_EUIRounded) * 100);
      } else if (bestPeerAC_EUI > 0 && annualAC_EUIRounded > bestPeerAC_EUI) {
        energySavingPotential = Math.round(((annualAC_EUIRounded - bestPeerAC_EUI) / annualAC_EUIRounded) * 100);
      }

      // 计算节能金额（万元）
      // 假设电价1元/kWh，年空调能耗 * 节能比例
      const energySavingAmount = annualACEnergy * (energySavingPotential / 100) / 10000;

      setAcStats({
        annualAC_EUI: annualAC_EUIRounded,
        avgPeerAC_EUI,
        bestPeerAC_EUI: Math.round(bestPeerAC_EUI * 100) / 100,
        energySavingPotential,
        energySavingAmount: Math.round(energySavingAmount * 100) / 100,
      });
    } catch (err) {
      console.error('loadACStats 出错:', err);
      setAcMonthlyEUI(Array(12).fill(0));
      setAcStats({
        annualAC_EUI: 0,
        avgPeerAC_EUI: 0,
        bestPeerAC_EUI: 0,
        energySavingPotential: 0,
        energySavingAmount: 0,
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    // 密码长度验证
    if (password.length < 6) {
      setAuthError('密码至少需要6位');
      return;
    }

    // 先尝试登录
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      // 登录失败，可能是用户不存在，尝试注册
      if (loginError.message.includes('Invalid') || loginError.message.includes('invalid')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setAuthError(signUpError.message);
        } else if (signUpData.user) {
          // 注册成功，创建 profiles 记录
          try {
            await supabase.from('profiles').insert({
              id: signUpData.user.id,
              email: email,
            });
          } catch (err) {
            console.error('创建profiles失败:', err);
          }
          loadProfile(signUpData.user.id);
        }
      } else {
        // 其他登录错误（密码错误等）
        setAuthError(loginError.message);
      }
    } else {
      // 登录成功
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) loadProfile(authUser.id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProjects([]);
    setView('login');
  };

  const calculateEUI = (totalEnergy: number, buildingArea: number) => {
    if (!buildingArea || buildingArea <= 0) return 0;
    return totalEnergy / buildingArea;
  };

  // 建筑业态映射：将用户录入的业态映射到benchmark表中的building_type
  const mapBuildingType = (type: string): string => {
    const typeMap: Record<string, string> = {
      '政府机关': '办公',
      '写字楼办公': '办公',
      '酒店宾馆': '酒店',
      '商场超市': '商业',
      '医院卫生': '医疗',
      '学校教育': '教育',
    };
    return typeMap[type] || type;
  };

  const getMatchingBenchmark = (project: Project) => {
    const mappedType = mapBuildingType(project.building_type);
    return benchmarks.find(b =>
      b.building_type === mappedType && b.province === '全国'
    ) || benchmarks.find(b => b.province === '全国') || benchmarks[0];
  };

  // 计算综合能效指数（超过多少同类建筑）
  const calculateEfficiencyIndex = (projectEUI: number, buildingType: string) => {
    const avgEUI = benchmarks.find(b => b.building_type === buildingType)?.standard_eui || 80;
    const ratio = projectEUI / avgEUI;
    if (ratio <= 0.6) return { percent: 95, level: '优秀', color: 'text-green-600' };
    if (ratio <= 0.8) return { percent: 75, level: '良好', color: 'text-blue-600' };
    if (ratio <= 1.0) return { percent: 50, level: '中等', color: 'text-yellow-600' };
    if (ratio <= 1.2) return { percent: 25, level: '较差', color: 'text-orange-600' };
    return { percent: 10, level: '需改善', color: 'text-red-600' };
  };

  // 生成月度趋势对比数据 - 支持多年数据对比
  // 柱形图：每个年份显示一列柱形组（几年数据显示几组柱形）
  // 折线图：虚线显示同类项目1-12月EUI均值（从数据库查询同业态所有项目计算平均值）
  // 注意：所有数据使用月度EUI（kWh/m²）= 当月能耗 / 建筑面积
  const generateMonthlyTrendData = () => {
    // 年份颜色映射
    const yearColors: Record<number, string> = {
      2019: '#3b82f6',  // 蓝色
      2020: '#10b981',  // 绿色
      2021: '#f59e0b',  // 橙色
      2022: '#ef4444',  // 红色
      2023: '#8b5cf6',  // 紫色
      2024: '#ec4899',  // 粉色
      2025: '#06b6d4',  // 青色
    };

    // 获取所有年份（从 annualData 或默认当前年份）
    const years = annualData.length > 0
      ? annualData.map(d => d.year || new Date().getFullYear())
      : [new Date().getFullYear()];

    const buildingArea = selectedProject?.building_area || 10000; // 默认10000 m²

    // 构建多年同月数据：每个月份显示多年数据
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

    const chartData = months.map((monthLabel, monthIdx) => {
      const dataPoint: any = { month: monthLabel };

      // 每年的数据作为独立key - 转换为月度EUI
      years.forEach((year, yearIdx) => {
        const key = `${year}年`;
        const monthlyEnergy = annualData[yearIdx]?.months[monthIdx] || 0;
        // 月度EUI = 当月能耗 / 建筑面积
        dataPoint[key] = buildingArea > 0 ? Math.round((monthlyEnergy / buildingArea) * 100) / 100 : 0;
      });

      // 折线图：同类均值和最佳留null（null表示不绘制此点）
      dataPoint['同类均值'] = null;
      dataPoint['同类最佳'] = null;

      return dataPoint;
    });

    return { chartData, years, yearColors };
  };

  const { chartData: trendData, years: trendYears, yearColors: trendYearColors } = generateMonthlyTrendData();

  // 更新分类能耗
  // 空调能耗根据中央空调+冷热月可估算，动力/电梯/照明无法估算
  // 算法：非冷热月平均能耗作为基础能耗，冷热月能耗-基础能耗=每月空调能耗
  const updateEnergyCategories = (months: number[], cooling: number[], heating: number[], totalEnergy: number, isCentral: boolean) => {
    if (isCentral && cooling.length > 0 && heating.length > 0) {
      // 步骤1：获取所有冷热月（用 Set 去重）
      const allACMonths = new Set([...cooling, ...heating]);

      // 步骤2：计算非冷热月的能耗值
      const nonACMonthValues = months.filter((_, i) => !allACMonths.has(i + 1));

      // 步骤3：计算基础能耗（剔除冷热月后的月均能耗）
      const avgNonAC = nonACMonthValues.length > 0
        ? nonACMonthValues.reduce((s, v) => s + v, 0) / nonACMonthValues.length
        : 0;

      // 步骤4：计算每个冷热月的空调能耗，然后求和
      let totalACEnergy = 0;
      for (const monthNum of allACMonths) {
        const monthIndex = monthNum - 1; // 月份转为索引（1月=0）
        if (monthIndex >= 0 && monthIndex < 12) {
          const monthEnergy = months[monthIndex] || 0;
          const monthACEnergy = Math.max(0, monthEnergy - avgNonAC); // 冷热月能耗 - 基础能耗
          totalACEnergy += monthACEnergy;
        }
      }

      setEnergyCategories([
        { name: '空调', value: totalACEnergy, icon: 'snowflake', color: '#3b82f6' },
        { name: '动力/电梯', value: 0, icon: 'arrow-up-down', color: '#8b5cf6' },
        { name: '照明', value: 0, icon: 'lightbulb', color: '#f59e0b' },
        { name: '其他', value: Math.max(0, totalEnergy - totalACEnergy), icon: 'zap', color: '#6b7280' },
      ]);
    } else {
      // 非中央空调：只有总空调能耗可按比例估算，其他分项无法区分
      setEnergyCategories([
        { name: '空调', value: totalEnergy * 0.45, icon: 'snowflake', color: '#3b82f6' },
        { name: '动力/电梯', value: 0, icon: 'arrow-up-down', color: '#8b5cf6' },
        { name: '照明', value: 0, icon: 'lightbulb', color: '#f59e0b' },
        { name: '其他', value: totalEnergy * 0.55, icon: 'zap', color: '#6b7280' },
      ]);
    }
  };

  const saveProject = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser || !projectForm.project_name || !projectForm.building_area) {
      alert('请填写项目名称和建筑面积');
      return;
    }

    // 保存项目基本信息
    const { data: projectData, error } = await supabase.from('projects').insert({
      user_id: authUser.id,
      project_name: projectForm.project_name,
      province: projectForm.province,
      city: projectForm.city,
      building_type: projectForm.building_type,
      climate_zone: projectForm.climate_zone,
      building_area: projectForm.building_area,
      ac_mode: acMode,
      ac_type: acTypes.join(','),
      cooling_months: coolingMonths,
      heating_months: heatingMonths,
      is_public: projectForm.is_public,
      scop_data: scopData as any,
    }).select().single();

    if (error) {
      alert('保存失败: ' + error.message);
      return;
    }

    // 保存所有年度数据到 annual_energy 表
    const insertPromises = annualData.map(data => {
      const hasData = data.months.some(m => m > 0);
      if (!hasData) return Promise.resolve();

      // 计算年度总能耗
      const totalEnergy = data.months.reduce((sum, m) => sum + (m || 0), 0);
      // 计算年度 EUI = 总能耗 / 建筑面积
      const annualEUI = projectForm.building_area > 0 ? Math.round((totalEnergy / projectForm.building_area) * 100) / 100 : null;

      // 计算月度空调EUI（与loadACStats一致的算法）
      // 基准能耗 = 非冷热月的能耗平均值
      // 月度空调EUI = max(0, 月度能耗 - 基准能耗) / 建筑面积
      const allACMonths = new Set([...coolingMonths, ...heatingMonths]);
      const nonACMonthValues = data.months.filter((_, i) => !allACMonths.has(i + 1));
      const avgNonAC = nonACMonthValues.length > 0
        ? nonACMonthValues.reduce((s, v) => s + v, 0) / nonACMonthValues.length
        : 0;

      const monthlyAC_EUIList: number[] = [];
      let annualAC_EUI = 0;
      for (let m = 0; m < 12; m++) {
        const monthACEnergy = Math.max(0, (data.months[m] || 0) - avgNonAC);
        const acEUI = projectForm.building_area > 0 ? monthACEnergy / projectForm.building_area : 0;
        monthlyAC_EUIList.push(Math.round(acEUI * 100) / 100);
        annualAC_EUI += monthACEnergy / projectForm.building_area;
      }
      annualAC_EUI = Math.round(annualAC_EUI * 100) / 100;

      return supabase.from('annual_energy').insert({
        project_id: projectData.id,
        year: data.year,
        month_1: data.months[0], month_2: data.months[1],
        month_3: data.months[2], month_4: data.months[3],
        month_5: data.months[4], month_6: data.months[5],
        month_7: data.months[6], month_8: data.months[7],
        month_9: data.months[8], month_10: data.months[9],
        month_11: data.months[10], month_12: data.months[11],
        unit: data.unit,
        annual_eui: annualEUI, // 存储预计算的 EUI
        annual_ac_eui: annualAC_EUI, // 存储空调EUI
        monthly_ac_eui: monthlyAC_EUIList, // 存储月度空调EUI数组
      });
    });

    await Promise.all(insertPromises);

    alert('保存成功！');
    clearCache('projects');
    clearCache('project_euis');
    loadProjects();
    setActiveTab('home');
    resetForm();
  };

  const resetForm = () => {
    setProjectForm({ project_name: '', province: '', city: '', building_type: '', climate_zone: '', building_area: 0, is_public: true });
    setAnnualData([{ year: new Date().getFullYear(), months: Array(12).fill(0), unit: 'kWh' }]);
    setSelectedYearIndex(0);
    setAcMode('both');
    setAcTypes(['水冷冷水机组']);
    setCoolingMonths([5, 6, 7, 8, 9]);
    setHeatingMonths([11, 12, 1, 2, 3]);
    setSelectedProject(null);
    setScopData({
      lowLoad: {
        coolingLoad: 0,
        chillerCount: 1,
        chillers: [{ id: '1', name: '主机1', ratedPower: 0, frequency: 50 }],
        chilledPump: { ratedPower: 0, frequency: 50 },
        coolingPump: { ratedPower: 0, frequency: 50 },
        coolingTower: { ratedPower: 0, frequency: 50 },
      },
      highLoad: {
        coolingLoad: 0,
        chillerCount: 1,
        chillers: [{ id: '1', name: '主机1', ratedPower: 0, frequency: 50 }],
        chilledPump: { ratedPower: 0, frequency: 50 },
        coolingPump: { ratedPower: 0, frequency: 50 },
        coolingTower: { ratedPower: 0, frequency: 50 },
      },
    });
  };

  // 编辑项目
  const editProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setProjectForm({
      project_name: project.project_name,
      province: project.province,
      city: project.city || '',
      building_type: project.building_type,
      climate_zone: project.climate_zone,
      building_area: project.building_area,
      is_public: project.is_public,
    });
    // 加载项目编辑数据
    if (project.ac_mode) setAcMode(project.ac_mode as 'cooling_only' | 'heating_only' | 'both');
    if (project.ac_type) setAcTypes(project.ac_type.split(',').filter(Boolean));
    if (project.cooling_months) setCoolingMonths(project.cooling_months);
    if (project.heating_months) setHeatingMonths(project.heating_months);
    if (project.scop_data) setScopData(project.scop_data as ScopData);

    // 从 annual_energy 表加载所有年度数据
    const { data: annualRecords } = await supabase.from('annual_energy').select('*').eq('project_id', project.id).order('year', { ascending: true });

    if (annualRecords && annualRecords.length > 0) {
      const loadedData = annualRecords.map((r: any) => ({
        year: r.year,
        months: [r.month_1, r.month_2, r.month_3, r.month_4, r.month_5, r.month_6, r.month_7, r.month_8, r.month_9, r.month_10, r.month_11, r.month_12],
        unit: r.unit || 'kWh',
      }));
      setAnnualData(loadedData);
      setSelectedYearIndex(0);
    } else {
      // 如果没有数据，初始化一个空白年份
      setAnnualData([{ year: new Date().getFullYear(), months: Array(12).fill(0), unit: 'kWh' }]);
      setSelectedYearIndex(0);
    }

    setView('project-form');
    setActiveTab('input');
  };

  // 删除项目
  const deleteProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定删除项目"${project.project_name}"吗？此操作不可撤销。`)) return;

    await supabase.from('annual_energy').delete().eq('project_id', project.id);
    await supabase.from('projects').delete().eq('id', project.id);
    clearCache('projects');
    clearCache('project_euis');
    loadProjects();
  };

  // 更新项目
  const updateProject = async () => {
    if (!selectedProject || !projectForm.project_name || !projectForm.building_area) {
      alert('请填写项目名称和建筑面积');
      return;
    }

    // 更新项目基本信息
    await supabase.from('projects').update({
      project_name: projectForm.project_name,
      province: projectForm.province,
      city: projectForm.city,
      building_type: projectForm.building_type,
      climate_zone: projectForm.climate_zone,
      building_area: projectForm.building_area,
      ac_mode: acMode,
      ac_type: acTypes.join(','),
      cooling_months: coolingMonths,
      heating_months: heatingMonths,
      is_public: projectForm.is_public,
      scop_data: scopData as any,
    }).eq('id', selectedProject.id);

    // 删除旧的年度数据，重新插入所有年度数据
    await supabase.from('annual_energy').delete().eq('project_id', selectedProject.id);

    // 重新插入所有年度数据
    const insertPromises = annualData.map(data => {
      const hasData = data.months.some(m => m > 0);
      if (!hasData) return Promise.resolve();

      // 计算年度总能耗
      const totalEnergy = data.months.reduce((sum, m) => sum + (m || 0), 0);
      // 计算年度 EUI = 总能耗 / 建筑面积
      const annualEUI = projectForm.building_area > 0 ? Math.round((totalEnergy / projectForm.building_area) * 100) / 100 : null;

      // 计算月度空调EUI（与loadACStats一致的算法）
      // 基准能耗 = 非冷热月的能耗平均值
      // 月度空调EUI = max(0, 月度能耗 - 基准能耗) / 建筑面积
      const allACMonths = new Set([...coolingMonths, ...heatingMonths]);
      const nonACMonthValues = data.months.filter((_, i) => !allACMonths.has(i + 1));
      const avgNonAC = nonACMonthValues.length > 0
        ? nonACMonthValues.reduce((s, v) => s + v, 0) / nonACMonthValues.length
        : 0;

      const monthlyAC_EUIList: number[] = [];
      let annualAC_EUI = 0;
      for (let m = 0; m < 12; m++) {
        const monthACEnergy = Math.max(0, (data.months[m] || 0) - avgNonAC);
        const acEUI = projectForm.building_area > 0 ? monthACEnergy / projectForm.building_area : 0;
        monthlyAC_EUIList.push(Math.round(acEUI * 100) / 100);
        annualAC_EUI += monthACEnergy / projectForm.building_area;
      }
      annualAC_EUI = Math.round(annualAC_EUI * 100) / 100;

      return supabase.from('annual_energy').insert({
        project_id: selectedProject.id,
        year: data.year,
        month_1: data.months[0], month_2: data.months[1],
        month_3: data.months[2], month_4: data.months[3],
        month_5: data.months[4], month_6: data.months[5],
        month_7: data.months[6], month_8: data.months[7],
        month_9: data.months[8], month_10: data.months[9],
        month_11: data.months[10], month_12: data.months[11],
        unit: data.unit,
        annual_eui: annualEUI, // 存储预计算的 EUI
        annual_ac_eui: annualAC_EUI, // 存储空调EUI
        monthly_ac_eui: monthlyAC_EUIList, // 存储月度空调EUI数组
      });
    });

    await Promise.all(insertPromises);

    alert('更新成功！');
    clearCache('projects');
    clearCache('project_euis');
    loadProjects();
    setActiveTab('home');
    resetForm();
    setSelectedProject(null);
  };

  const loadProjectDetail = async (project: Project) => {
    setSelectedProject(project);

    // 从 annual_energy 表加载所有年度数据
    const { data: annualRecords } = await supabase.from('annual_energy').select('*').eq('project_id', project.id).order('year', { ascending: true });

    if (annualRecords && annualRecords.length > 0) {
      const loadedData = annualRecords.map((r: any) => ({
        year: r.year,
        months: [r.month_1, r.month_2, r.month_3, r.month_4, r.month_5, r.month_6, r.month_7, r.month_8, r.month_9, r.month_10, r.month_11, r.month_12],
        unit: r.unit || 'kWh',
      }));
      setAnnualData(loadedData);
      setSelectedYearIndex(0);

      // 使用第一年数据更新能耗分类
      const firstYear = loadedData[0];
      const totalEnergy = firstYear.months.reduce((sum, v) => sum + (v || 0), 0);

      const cooling = project.cooling_months || [5,6,7,8,9];
      const heating = project.heating_months || [11,12,1,2,3];
      const centralACTypes = ['水冷冷水机组', '水源热泵机组', '地源热泵机组', '风冷模块机组', '风冷螺杆机组', '蒸发冷机组', '多联机(VRF)'];
      const isCentral = centralACTypes.includes(project.ac_type || '');

      updateEnergyCategories(
        firstYear.months,
        cooling, heating,
        totalEnergy,
        isCentral
      );
    } else {
      setAnnualData([{ year: new Date().getFullYear(), months: Array(12).fill(0), unit: 'kWh' }]);
      setSelectedYearIndex(0);
    }

    setView('project-detail');
  };

  const getProvinceClimateZone = (province: string) => {
    for (const zone of CLIMATE_ZONES) {
      if (zone.provinces.includes(province)) return zone.value;
    }
    return '夏热冬冷';
  };

  // 分类能耗图标
  const getCategoryIcon = (icon: string) => {
    switch (icon) {
      case 'snowflake': return <Snowflake className="w-5 h-5" />;
      case 'lightbulb': return <Lightbulb className="w-5 h-5" />;
      case 'arrow-up-down': return <ArrowUpDown className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 登录页面
  if (!user || view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">建筑能耗分析工具</h1>
            <p className="text-gray-500 mt-2">智能分析 · 节能降耗 · 绿色建筑</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="your@email.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••" required />
            </div>
            {authError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{authError}</p>}
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:opacity-90 transition">
              登录 / 注册
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-6">首次使用将自动创建账号</p>
        </div>
      </div>
    );
  }

  // 项目详情页
  if (view === 'project-detail' && selectedProject) {
    const project = selectedProject;
    const currentYearData = annualData[selectedYearIndex] || { months: Array(12).fill(0) };
    const beforeTotal = currentYearData.months.reduce((sum, val) => sum + (val || 0), 0);
    const beforeEUI = calculateEUI(beforeTotal, project.building_area);
    const benchmark = getMatchingBenchmark(project);

    // 使用实际同类项目数据（从数据库计算）替代benchmark固定值
    const hasPeerData = peerStats.count > 0;
    const displayAvgEUI = hasPeerData ? peerStats.avgEUI : (benchmark?.standard_eui || 80);
    const displayMinEUI = hasPeerData ? peerStats.minEUI : (benchmark?.min_eui || 60);
    const displayMaxEUI = hasPeerData ? peerStats.maxEUI : (benchmark?.max_eui || 120);

    // 计算能效等级（基于实际同类项目数据）
    const calculateEfficiencyWithPeer = (projectEUI: number) => {
      if (!hasPeerData) {
        return calculateEfficiencyIndex(projectEUI, project.building_type);
      }
      const ratio = projectEUI / peerStats.avgEUI;
      if (ratio <= 0.8) return { percent: 90, level: '优秀', color: 'text-green-600' };
      if (ratio <= 1.0) return { percent: 60, level: '良好', color: 'text-blue-600' };
      if (ratio <= 1.2) return { percent: 40, level: '中等', color: 'text-yellow-600' };
      return { percent: 20, level: '需改善', color: 'text-red-600' };
    };
    const efficiency = calculateEfficiencyWithPeer(beforeEUI);

    const trendResult = generateMonthlyTrendData();
    const trendData = trendResult.chartData;
    const pieData = energyCategories.map(c => ({ name: c.name, value: c.value, color: c.color }));

    // 构建包含同类均值的图表数据
    const chartDataWithPeer = trendData.map((dataPoint: any, idx: number) => {
      return {
        ...dataPoint,
        '同类均值': peerMonthlyData[idx] > 0 ? peerMonthlyData[idx] : null,
        '同类最佳': bestPeerMonthlyData[idx] > 0 ? bestPeerMonthlyData[idx] : null
      };
    });

    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* 头部 */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div>
                <h1 className="font-bold text-gray-800">{project.project_name}</h1>
                <p className="text-xs text-gray-500">{project.building_type} · {project.province}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
          {/* 综合能效指数卡片 */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">综合能效指数</p>
                <p className="text-4xl font-bold mt-1">高于{efficiency.percent}%同类建筑</p>
                <p className={`text-lg mt-2 ${efficiency.color.replace('text-', 'text-blue-100').replace('600', '200')}`}>
                  能效等级：<span className="font-bold">{efficiency.level}</span>
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-4">
                <Award className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>

          {/* 关键指标 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500">建筑面积</p>
              <p className="text-xl font-bold text-gray-800">{project.building_area.toLocaleString()} <span className="text-xs">m²</span></p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500">当前EUI</p>
              <p className="text-xl font-bold text-blue-600">{beforeEUI.toFixed(2)} <span className="text-xs">kWh/m²</span></p>
            </div>
          </div>

          {/* 同类建筑EUI对比（使用实际计算的同类项目数据） */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              与同类建筑EUI对比 {hasPeerData && <span className="text-xs text-gray-500">（{peerStats.count}个同类项目数据）</span>}
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: '本项目', value: beforeEUI },
                  { name: '同类平均', value: displayAvgEUI },
                  { name: '同类优秀', value: displayMinEUI },
                  { name: '同类较差', value: displayMaxEUI },
                ]} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit=" kWh/m²" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)} kWh/m²`]} />
                  <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#94a3b8" />
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-center gap-6 text-sm">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> 本项目</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400"></span> 同类平均</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> 同类优秀</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> 同类较差</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              月度能耗趋势同行对比 ({trendYears.length}年数据)
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartDataWithPeer} barCategoryGap="5%" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit=" kWh/m²" />
                  <Tooltip formatter={(value: number, name: string) => {
                    if (name === '同类均值') return [`${value?.toFixed(2) || 0} kWh/m² (同类均值)`];
                    if (name === '同类最佳') return [`${value?.toFixed(2) || 0} kWh/m² (同类最佳)`];
                    return [`${value?.toFixed(2) || 0} kWh/m²`];
                  }} />
                  {trendYears.map((year) => (
                    <Bar
                      key={year}
                      dataKey={`${year}年`}
                      fill={trendYearColors[year] || '#3b82f6'}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="同类均值"
                    stroke="#94a3b8"
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="同类最佳"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#22c55e' }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-500">
              {trendYears.map((year) => (
                <span key={year} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: trendYearColors[year] || '#3b82f6' }}></span>
                  {year}年
                </span>
              ))}
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-gray-400"></span>
                同类均值
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 border-t-2 border-green-500"></span>
                同类最佳
              </span>
            </div>
          </div>

          {/* 空调月度EUI柱状图 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-2">空调月度EUI</h3>
              <p className="text-xs text-gray-500 mb-3">
                年度空调EUI: <span className="font-bold text-blue-600">{acStats.annualAC_EUI.toFixed(2)}</span> kWh/m²
              </p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MONTHS.map((m, i) => ({ name: m.label, value: acMonthlyEUI[i] || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(2)} kWh/m²`} />
                    <Bar dataKey="value" fill="#3b82f6" name="空调EUI" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">空调节能空间分析</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-gray-600">您的空调EUI</span>
                  <span className="font-bold text-blue-600 text-lg">{acStats.annualAC_EUI.toFixed(2)} kWh/m²</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-600">同类平均空调EUI</span>
                  <span className="font-bold text-green-600 text-lg">{acStats.avgPeerAC_EUI.toFixed(2)} kWh/m²</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <span className="text-gray-600">同类最佳空调EUI</span>
                  <span className="font-bold text-amber-600 text-lg">{acStats.bestPeerAC_EUI.toFixed(2)} kWh/m²</span>
                </div>
                {acStats.energySavingPotential > 0 ? (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-gray-600 mb-2">节能空间</p>
                    <p className="text-2xl font-bold text-red-600">{acStats.energySavingPotential}%</p>
                    <p className="text-sm text-gray-500 mt-1">
                      预计年节约: <span className="font-bold text-red-600">{acStats.energySavingAmount.toFixed(2)}</span> 万元
                    </p>
                    <p className="text-xs text-gray-400 mt-2">（基于电价1元/kWh估算）</p>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-center text-gray-500">
                      <span className="text-xl">🎉</span><br />
                      您的空调能效已达到同类优秀水平
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 与同类建筑EUI对比（进度条形式） */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              与同类建筑EUI对比 {hasPeerData && <span className="text-xs text-gray-500">（基于{peerStats.count}个同类项目）</span>}
            </h3>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>您的项目</span>
                  <span className="font-bold">{beforeEUI.toFixed(2)} kWh/m²</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${beforeEUI <= displayAvgEUI ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, (beforeEUI / (displayMaxEUI || 200)) * 100)}%` }}></div>
                </div>
              </div>
              <div className="text-center px-4 border-l">
                <p className="text-xs text-gray-500">同类平均</p>
                <p className="text-lg font-bold text-gray-700">{displayAvgEUI.toFixed(1)}</p>
              </div>
            </div>
          </div>

          {/* SCOP 系统能效展示 */}
          {project.scop_data && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-500" />
                SCOP 系统能效
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 mb-2">低负荷段 SCOP</p>
                  <p className="text-3xl font-bold text-blue-600">{calculateScop(project.scop_data.lowLoad).toFixed(3)}</p>
                  <p className="text-xs text-gray-500 mt-2">制冷量：{project.scop_data.lowLoad.coolingLoad} kW</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600 mb-2">高负荷段 SCOP</p>
                  <p className="text-3xl font-bold text-orange-600">{calculateScop(project.scop_data.highLoad).toFixed(3)}</p>
                  <p className="text-xs text-gray-500 mt-2">制冷量：{project.scop_data.highLoad.coolingLoad} kW</p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* 底部导航 */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around">
          <button onClick={() => { setView('dashboard'); setActiveTab('home'); }} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-400'}`}>
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">首页</span>
          </button>
          <button onClick={() => { setView('project-form'); setActiveTab('input'); resetForm(); }} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'input' ? 'text-blue-600' : 'text-gray-400'}`}>
            <FileText className="w-5 h-5" />
            <span className="text-xs mt-1">录入</span>
          </button>
          <button onClick={() => setView('analysis')} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'analysis' ? 'text-blue-600' : 'text-gray-400'}`}>
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs mt-1">分析</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-400'}`}>
            <UserCircle className="w-5 h-5" />
            <span className="text-xs mt-1">我的</span>
          </button>
        </nav>
      </div>
    );
  }

  // 项目表单页
  if (view === 'project-form') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => { setView('dashboard'); setActiveTab('home'); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <h1 className="font-bold text-gray-800">{selectedProject ? '编辑项目' : '录入项目数据'}</h1>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          {/* 基本信息 */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              基本信息
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">项目名称（仅您可见）</label>
                <input type="text" value={projectForm.project_name} onChange={(e) => {
                  setProjectForm({ ...projectForm, project_name: e.target.value });
                  // 自动从名称提取省市和气候区
                  const { province, city } = extractProvinceCity(e.target.value);
                  if (province) {
                    const zone = getClimateZoneByCity(city || province, province);
                    setProjectForm(prev => ({ ...prev, province, city, climate_zone: zone }));
                  }
                }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300" placeholder="如：上海XX大厦、广州市XX广场" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">省份/地区</label>
                  <select value={projectForm.province} onChange={(e) => {
                    const p = e.target.value;
                    setProjectForm(prev => ({ ...prev, province: p, city: '', climate_zone: getClimateZoneByProvince(p) }));
                  }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300">
                    <option value="">选择地区</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
                  <select value={projectForm.city || ''} onChange={(e) => {
                    const c = e.target.value;
                    const zone = getClimateZoneByCity(c, projectForm.province || '');
                    setProjectForm(prev => ({ ...prev, city: c, climate_zone: zone }));
                  }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300">
                    <option value="">选择城市</option>
                    {getCitiesByProvince(projectForm.province).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div></div>
                <div></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">建筑业态</label>
                  <select value={projectForm.building_type} onChange={(e) => setProjectForm({ ...projectForm, building_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300">
                    <option value="">选择业态</option>
                    {BUILDING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">建筑面积 (m²)</label>
                  <input type="number" value={projectForm.building_area || ''} onChange={(e) => setProjectForm({ ...projectForm, building_area: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300" placeholder="如：15000" />
                </div>
              </div>
            </div>
          </div>

          {/* 空调与冷热月配置 */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-cyan-500" />
              空调与冷热月
            </h2>
            <div className="space-y-4">
              {/* 空调运行模式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">空调运行模式</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAcMode('cooling_only')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition ${acMode === 'cooling_only' ? 'bg-cyan-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    单冷
                  </button>
                  <button type="button" onClick={() => setAcMode('heating_only')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition ${acMode === 'heating_only' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    单热
                  </button>
                  <button type="button" onClick={() => setAcMode('both')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition ${acMode === 'both' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    冷热都有
                  </button>
                </div>
              </div>

              {/* 空调形式（可多选） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">空调形式（可多选）</label>
                <div className="flex flex-wrap gap-2">
                  {AC_TYPES.map(t => (
                    <button key={t.value} type="button"
                      onClick={() => {
                        setAcTypes(prev => prev.includes(t.value) ? prev.filter(x => x !== t.value) : [...prev, t.value]);
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition ${acTypes.includes(t.value) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 供冷月份（仅单冷或冷热都有时显示） */}
              {(acMode === 'cooling_only' || acMode === 'both') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">供冷月份（可多选）</label>
                  <div className="flex flex-wrap gap-2">
                    {MONTHS.map(m => (
                      <button key={m.value} type="button"
                        onClick={() => {
                          setCoolingMonths(prev => prev.includes(m.value) ? prev.filter(x => x !== m.value) : [...prev, m.value]);
                        }}
                        className={`px-3 py-1 rounded-full text-sm transition ${coolingMonths.includes(m.value) ? 'bg-cyan-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 供热月份（仅单热或冷热都有时显示） */}
              {(acMode === 'heating_only' || acMode === 'both') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">供热月份（可多选）</label>
                  <div className="flex flex-wrap gap-2">
                    {MONTHS.map(m => (
                      <button key={m.value} type="button"
                        onClick={() => {
                          setHeatingMonths(prev => prev.includes(m.value) ? prev.filter(x => x !== m.value) : [...prev, m.value]);
                        }}
                        className={`px-3 py-1 rounded-full text-sm transition ${heatingMonths.includes(m.value) ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 年度能耗数据（支持多年） */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">年度能耗数据</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  const newYear = annualData.length > 0 ? Math.min(...annualData.map(d => d.year)) - 1 : new Date().getFullYear() - 1;
                  setAnnualData([...annualData, { year: newYear, months: Array(12).fill(0), unit: 'kWh' }]);
                }} className="px-3 py-1 bg-blue-500 text-white rounded text-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> 添加年份
                </button>
                {annualData.length > 1 && (
                  <button onClick={() => {
                    const newData = annualData.filter((_, i) => i !== selectedYearIndex);
                    setAnnualData(newData);
                    setSelectedYearIndex(Math.max(0, selectedYearIndex - 1));
                  }} className="px-3 py-1 bg-red-500 text-white rounded text-sm">
                    删除当前年
                  </button>
                )}
              </div>
            </div>

            {/* 年份选择器 */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
              {annualData.map((data, idx) => (
                <button key={idx} onClick={() => setSelectedYearIndex(idx)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${selectedYearIndex === idx ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {data.year}年 {idx === selectedYearIndex && '✓'}
                </button>
              ))}
            </div>

            {/* 当前选择的年份数据 */}
            {annualData[selectedYearIndex] && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm">年份：</label>
                  <input type="number" value={annualData[selectedYearIndex].year}
                    onChange={(e) => {
                      const newData = [...annualData];
                      newData[selectedYearIndex] = { ...newData[selectedYearIndex], year: parseInt(e.target.value) };
                      setAnnualData(newData);
                    }}
                    className="px-3 py-1 rounded-lg border w-24 text-center" />
                  <span className="text-sm text-gray-500">单位：kWh</span>
                </div>
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <label className="block text-xs text-gray-600 mb-1">批量粘贴（空格或逗号分隔）</label>
                  <div className="flex gap-2">
                    <input type="text" id={`paste-year-${selectedYearIndex}`} className="flex-1 px-2 py-1 rounded border text-sm"
                      placeholder="90480 74544 79504..."
                      onPaste={(e) => {
                        const values = e.clipboardData.getData('text').split(/[\s,，]+/).map(v => parseFloat(v)).filter(v => !isNaN(v));
                        if (values.length > 0) {
                          const newData = [...annualData];
                          const newMonths = [...newData[selectedYearIndex].months];
                          values.slice(0, 12).forEach((v, i) => { newMonths[i] = v; });
                          newData[selectedYearIndex] = { ...newData[selectedYearIndex], months: newMonths };
                          setAnnualData(newData);
                        }
                      }} />
                    <button onClick={() => {
                      const input = document.getElementById(`paste-year-${selectedYearIndex}`) as HTMLInputElement;
                      const values = input.value.split(/[\s,，]+/).map(v => parseFloat(v)).filter(v => !isNaN(v));
                      if (values.length > 0) {
                        const newData = [...annualData];
                        const newMonths = [...newData[selectedYearIndex].months];
                        values.slice(0, 12).forEach((v, i) => { newMonths[i] = v; });
                        newData[selectedYearIndex] = { ...newData[selectedYearIndex], months: newMonths };
                        setAnnualData(newData);
                        input.value = '';
                      }
                    }} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">解析</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {MONTHS.map((m, i) => (
                    <div key={i}>
                      <label className="block text-xs text-gray-500 mb-1">{m.label}</label>
                      <input type="number" value={annualData[selectedYearIndex].months[i] || ''}
                        onChange={(e) => {
                          const newData = [...annualData];
                          const newMonths = [...newData[selectedYearIndex].months];
                          newMonths[i] = parseFloat(e.target.value) || 0;
                          newData[selectedYearIndex] = { ...newData[selectedYearIndex], months: newMonths };
                          setAnnualData(newData);
                        }}
                        className="w-full px-2 py-1 rounded border text-sm" placeholder="0" />
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                  年度总能耗：<strong>{annualData[selectedYearIndex].months.reduce((s, v) => s + (v || 0), 0).toLocaleString()}</strong> kWh |
                  EUI：<strong>{calculateEUI(annualData[selectedYearIndex].months.reduce((s, v) => s + (v || 0), 0), projectForm.building_area || 1).toFixed(2)}</strong> kWh/m²
                </div>
              </div>
            )}
          </div>

          {/* SCOP 系统计算 */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-500" />
              SCOP 系统能效计算
            </h2>

            {/* 低负荷段 */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-700 mb-3">低负荷段</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">制冷量 (kW)</label>
                  <input type="number" value={scopData.lowLoad.coolingLoad || ''}
                    onChange={(e) => setScopData({ ...scopData, lowLoad: { ...scopData.lowLoad, coolingLoad: parseFloat(e.target.value) || 0 } })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" placeholder="0" />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">主机数量</label>
                  <input type="number" min="1" value={scopData.lowLoad.chillerCount}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 1;
                      const newChillers = Array.from({ length: count }, (_, i) => {
                        const existing = scopData.lowLoad.chillers[i];
                        return existing || { id: String(i + 1), name: `主机${i + 1}`, ratedPower: 0, frequency: 50 };
                      });
                      setScopData({ ...scopData, lowLoad: { ...scopData.lowLoad, chillerCount: count, chillers: newChillers } });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs text-gray-600">主机功率 (kW) / 运行频率 (Hz)</label>
                  {scopData.lowLoad.chillers.map((chiller, i) => (
                    <div key={chiller.id} className="flex gap-2">
                      <input type="number" value={chiller.ratedPower || ''}
                        onChange={(e) => {
                          const newChillers = [...scopData.lowLoad.chillers];
                          newChillers[i] = { ...newChillers[i], ratedPower: parseFloat(e.target.value) || 0 };
                          setScopData({ ...scopData, lowLoad: { ...scopData.lowLoad, chillers: newChillers } });
                        }}
                        className="flex-1 px-2 py-1 rounded border text-sm" placeholder="功率" />
                      <input type="number" value={chiller.frequency || ''}
                        onChange={(e) => {
                          const newChillers = [...scopData.lowLoad.chillers];
                          newChillers[i] = { ...newChillers[i], frequency: parseFloat(e.target.value) || 50 };
                          setScopData({ ...scopData, lowLoad: { ...scopData.lowLoad, chillers: newChillers } });
                        }}
                        className="w-20 px-2 py-1 rounded border text-sm" placeholder="频率" />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">冷冻泵额定功率 (kW)</label>
                    <input type="number" value={scopData.lowLoad.chilledPump.ratedPower || ''}
                      onChange={(e) => setScopData({ ...scopData, lowLoad: { ...scopData.lowLoad, chilledPump: { ...scopData.lowLoad.chilledPump, ratedPower: parseFloat(e.target.value) || 0 } } })}
                      className="w-full px-2 py-1 rounded border text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">冷冻泵运行频率 (Hz)</label>
                    <input type="number" value={scopData.lowLoad.chilledPump.frequency || ''}
                      onChange={(e) => setScopData({ ...scopData, lowLoad: { ...scopData.lowLoad, chilledPump: { ...scopData.lowLoad.chilledPump, frequency: parseFloat(e.target.value) || 50 } } })}
                      className="w-full px-2 py-1 rounded border text-sm" placeholder="50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">冷却泵额定功率 (kW)</label>
                    <input type="number" value={scopData.lowLoad.coolingPump.ratedPower || ''}
                      onChange={(e) => setScopData({ ...scopData, lowLoad: { ...scopData.lowLoad, coolingPump: { ...scopData.lowLoad.coolingPump, ratedPower: parseFloat(e.target.value) || 0 } } })}
                      className="w-full px-2 py-1 rounded border text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">冷却泵运行频率 (Hz)</label>
                    <input type="number" value={scopData.lowLoad.coolingPump.frequency || ''}
                      onChange={(e) => setScopData({ ...scopData, lowLoad: { ...scopData.lowLoad, coolingPump: { ...scopData.lowLoad.coolingPump, frequency: parseFloat(e.target.value) || 50 } } })}
                      className="w-full px-2 py-1 rounded border text-sm" placeholder="50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">冷却塔额定功率 (kW)</label>
                    <input type="number" value={scopData.lowLoad.coolingTower.ratedPower || ''}
                      onChange={(e) => setScopData({ ...scopData, lowLoad: { ...scopData.lowLoad, coolingTower: { ...scopData.lowLoad.coolingTower, ratedPower: parseFloat(e.target.value) || 0 } } })}
                      className="w-full px-2 py-1 rounded border text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">冷却塔运行频率 (Hz)</label>
                    <input type="number" value={scopData.lowLoad.coolingTower.frequency || ''}
                      onChange={(e) => setScopData({ ...scopData, lowLoad: { ...scopData.lowLoad, coolingTower: { ...scopData.lowLoad.coolingTower, frequency: parseFloat(e.target.value) || 50 } } })}
                      className="w-full px-2 py-1 rounded border text-sm" placeholder="50" />
                  </div>
                </div>

                <div className="p-3 bg-white rounded border border-blue-200 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">低负荷段 SCOP：</span>
                    <span className="text-xl font-bold text-blue-600">{calculateScop(scopData.lowLoad).toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 高负荷段 */}
            <div className="p-4 bg-orange-50 rounded-lg">
              <h3 className="font-medium text-orange-700 mb-3">高负荷段</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">制冷量 (kW)</label>
                  <input type="number" value={scopData.highLoad.coolingLoad || ''}
                    onChange={(e) => setScopData({ ...scopData, highLoad: { ...scopData.highLoad, coolingLoad: parseFloat(e.target.value) || 0 } })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" placeholder="0" />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">主机数量</label>
                  <input type="number" min="1" value={scopData.highLoad.chillerCount}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 1;
                      const newChillers = Array.from({ length: count }, (_, i) => {
                        const existing = scopData.highLoad.chillers[i];
                        return existing || { id: String(i + 1), name: `主机${i + 1}`, ratedPower: 0, frequency: 50 };
                      });
                      setScopData({ ...scopData, highLoad: { ...scopData.highLoad, chillerCount: count, chillers: newChillers } });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs text-gray-600">主机功率 (kW) / 运行频率 (Hz)</label>
                  {scopData.highLoad.chillers.map((chiller, i) => (
                    <div key={chiller.id} className="flex gap-2">
                      <input type="number" value={chiller.ratedPower || ''}
                        onChange={(e) => {
                          const newChillers = [...scopData.highLoad.chillers];
                          newChillers[i] = { ...newChillers[i], ratedPower: parseFloat(e.target.value) || 0 };
                          setScopData({ ...scopData, highLoad: { ...scopData.highLoad, chillers: newChillers } });
                        }}
                        className="flex-1 px-2 py-1 rounded border text-sm" placeholder="功率" />
                      <input type="number" value={chiller.frequency || ''}
                        onChange={(e) => {
                          const newChillers = [...scopData.highLoad.chillers];
                          newChillers[i] = { ...newChillers[i], frequency: parseFloat(e.target.value) || 50 };
                          setScopData({ ...scopData, highLoad: { ...scopData.highLoad, chillers: newChillers } });
                        }}
                        className="w-20 px-2 py-1 rounded border text-sm" placeholder="频率" />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">冷冻泵额定功率 (kW)</label>
                    <input type="number" value={scopData.highLoad.chilledPump.ratedPower || ''}
                      onChange={(e) => setScopData({ ...scopData, highLoad: { ...scopData.highLoad, chilledPump: { ...scopData.highLoad.chilledPump, ratedPower: parseFloat(e.target.value) || 0 } } })}
                      className="w-full px-2 py-1 rounded border text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">冷冻泵运行频率 (Hz)</label>
                    <input type="number" value={scopData.highLoad.chilledPump.frequency || ''}
                      onChange={(e) => setScopData({ ...scopData, highLoad: { ...scopData.highLoad, chilledPump: { ...scopData.highLoad.chilledPump, frequency: parseFloat(e.target.value) || 50 } } })}
                      className="w-full px-2 py-1 rounded border text-sm" placeholder="50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">冷却泵额定功率 (kW)</label>
                    <input type="number" value={scopData.highLoad.coolingPump.ratedPower || ''}
                      onChange={(e) => setScopData({ ...scopData, highLoad: { ...scopData.highLoad, coolingPump: { ...scopData.highLoad.coolingPump, ratedPower: parseFloat(e.target.value) || 0 } } })}
                      className="w-full px-2 py-1 rounded border text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">冷却泵运行频率 (Hz)</label>
                    <input type="number" value={scopData.highLoad.coolingPump.frequency || ''}
                      onChange={(e) => setScopData({ ...scopData, highLoad: { ...scopData.highLoad, coolingPump: { ...scopData.highLoad.coolingPump, frequency: parseFloat(e.target.value) || 50 } } })}
                      className="w-full px-2 py-1 rounded border text-sm" placeholder="50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">冷却塔额定功率 (kW)</label>
                    <input type="number" value={scopData.highLoad.coolingTower.ratedPower || ''}
                      onChange={(e) => setScopData({ ...scopData, highLoad: { ...scopData.highLoad, coolingTower: { ...scopData.highLoad.coolingTower, ratedPower: parseFloat(e.target.value) || 0 } } })}
                      className="w-full px-2 py-1 rounded border text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">冷却塔运行频率 (Hz)</label>
                    <input type="number" value={scopData.highLoad.coolingTower.frequency || ''}
                      onChange={(e) => setScopData({ ...scopData, highLoad: { ...scopData.highLoad, coolingTower: { ...scopData.highLoad.coolingTower, frequency: parseFloat(e.target.value) || 50 } } })}
                      className="w-full px-2 py-1 rounded border text-sm" placeholder="50" />
                  </div>
                </div>

                <div className="p-3 bg-white rounded border border-orange-200 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">高负荷段 SCOP：</span>
                    <span className="text-xl font-bold text-orange-600">{calculateScop(scopData.highLoad).toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button onClick={selectedProject ? updateProject : saveProject} className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            <Save className="w-5 h-5" />
            {selectedProject ? '更新项目' : '保存项目'}
          </button>
        </main>

        {/* 底部导航 */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around">
          <button onClick={() => { setView('dashboard'); setActiveTab('home'); }} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-400'}`}>
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">首页</span>
          </button>
          <button onClick={() => setActiveTab('input')} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'input' ? 'text-blue-600' : 'text-gray-400'}`}>
            <FileText className="w-5 h-5" />
            <span className="text-xs mt-1">录入</span>
          </button>
          <button onClick={() => setView('analysis')} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'analysis' ? 'text-blue-600' : 'text-gray-400'}`}>
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs mt-1">分析</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-400'}`}>
            <UserCircle className="w-5 h-5" />
            <span className="text-xs mt-1">我的</span>
          </button>
        </nav>
      </div>
    );
  }

  // 仪表盘/首页
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold">能耗精灵</h1>
              <p className="text-xs text-blue-200">{user?.company || user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-xs text-gray-500">项目总数</p>
            <p className="text-2xl font-bold text-gray-800">{projects.length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-xs text-gray-500">平均EUI</p>
            <p className="text-2xl font-bold text-blue-600">
              {(() => {
                const euis = Object.values(projectEUIs).filter(e => e > 0);
                if (euis.length === 0) return '0';
                const avg = euis.reduce((sum, e) => sum + e, 0) / euis.length;
                return avg.toFixed(1);
              })()}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-xs text-gray-500">覆盖地区</p>
            <p className="text-2xl font-bold text-purple-600">{new Set(projects.map(p => p.province)).size}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-xs text-gray-500">建筑类型</p>
            <p className="text-2xl font-bold text-green-600">{new Set(projects.map(p => p.building_type)).size}</p>
          </div>
        </div>

        {/* 快捷操作 */}
        <button onClick={() => { setView('project-form'); setActiveTab('input'); resetForm(); }}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
          <Plus className="w-5 h-5" />
          新建项目
        </button>

        {/* 项目列表 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">我的项目</h2>
          </div>
          {projects.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无项目，点击上方按钮创建</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {projects.map((project) => {
                const benchmark = getMatchingBenchmark(project);
                const projectEUI = projectEUIs[project.id] || null;
                const displayEUI = projectEUI !== null ? projectEUI : 0;
                const efficiency = calculateEfficiencyIndex(displayEUI || 0, project.building_type);
                const diffPercent = benchmark && displayEUI > 0 ? Math.round(((displayEUI - benchmark.standard_eui) / benchmark.standard_eui) * 100) : 0;
                const isAboveBenchmark = displayEUI > benchmark?.standard_eui;
                return (
                  <div key={project.id} onClick={() => loadProjectDetail(project)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">{project.project_name}</h3>
                      <p className="text-xs text-gray-500">{project.building_type} · {project.province}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); editProject(project, e); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="编辑">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteProject(project, e); }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="text-right ml-2">
                        {projectEUI !== null ? (
                          <>
                            <p className="text-sm font-medium text-blue-600">{displayEUI.toFixed(1)}</p>
                            <p className="text-xs text-gray-400">EUI: {benchmark?.standard_eui || '-'}</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">暂无数据</p>
                        )}
                      </div>
                      {benchmark && displayEUI > 0 && (
                        <div className={`text-xs px-2 py-1 rounded-full ${isAboveBenchmark ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {isAboveBenchmark ? `高于${Math.abs(diffPercent)}%` : `低于${Math.abs(diffPercent)}%`}
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Profile Tab Content */}
      {activeTab === 'profile' && (
        <div className="fixed inset-0 bg-gray-50 z-40 overflow-auto">
          <div className="max-w-md mx-auto p-4 space-y-4">
            {/* 用户信息卡片 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-4">账号信息</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">邮箱</span>
                  <span className="font-medium text-gray-800">{user?.email}</span>
                </div>
                {user?.full_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">姓名</span>
                    <span className="font-medium text-gray-800">{user.full_name}</span>
                  </div>
                )}
                {user?.company && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">公司</span>
                    <span className="font-medium text-gray-800">{user.company}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 管理员入口 */}
            {isAdmin && (
              <button onClick={() => setView('admin')}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
                <User className="w-5 h-5" />
                进入管理员面板
              </button>
            )}

            {/* 登出按钮 */}
            <button onClick={handleLogout}
              className="w-full py-3 bg-white text-red-500 rounded-xl font-medium flex items-center justify-center gap-2 border border-red-200">
              <LogOut className="w-5 h-5" />
              退出登录
            </button>
          </div>
        </div>
      )}

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-400'}`}>
          <Home className="w-5 h-5" />
          <span className="text-xs mt-1">首页</span>
        </button>
        <button onClick={() => { setView('project-form'); setActiveTab('input'); resetForm(); }} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'input' ? 'text-blue-600' : 'text-gray-400'}`}>
          <FileText className="w-5 h-5" />
          <span className="text-xs mt-1">录入</span>
        </button>
        <button onClick={() => setView('analysis')} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'analysis' ? 'text-blue-600' : 'text-gray-400'}`}>
          <BarChart3 className="w-5 h-5" />
          <span className="text-xs mt-1">分析</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center py-2 px-4 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-400'}`}>
          <UserCircle className="w-5 h-5" />
          <span className="text-xs mt-1">我的</span>
        </button>
      </nav>
    </div>
  );
}

export default App;