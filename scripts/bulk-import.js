/**
 * Bulk import energy data from Excel to Supabase
 * Data source: 小程序项目能耗上传.xlsx
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hhqoiozrkskuicgiqdki.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob3Fpb3pya3NrdWljZ2lxZGtoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgwNTUwNCwiZXhwIjoyMDkzMzgxNTA0fQ.MvSs4Q5nW9KWMQZklcDm1FqnPe729yJyCzpd9OKJ3Sc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Project data from Excel (57 projects)
const projects = [
  { province: '山东', city: '聊城', name: '税务局1.3楼', type: '政府办公', area: 11537, year: 2021, acType: 'split', cooling: [6,7,8,9], heating: [12,1], months: [83552, 61032, 65576, 52896, 54544, 90992, 105336, 105304, 78200, 63864, 76352, 87096] },
  { province: '山东', city: '聊城', name: '税务局1.3楼', type: '政府办公', area: 11537, year: 2022, acType: 'split', cooling: [6,7,8,9], heating: [12,1], months: [90480, 74544, 79504, 68464, 76016, 124744, 127936, 131808, 91232, 65512, 72192, 83864] },
  { province: '山东', city: '聊城', name: '税务局2#楼', type: '政府办公', area: 4928, year: 2021, acType: 'split', cooling: [6,7,8,9], heating: [12,1], months: [31400, 22530, 24650, 20230, 17540, 35920, 43960, 39430, 23550, 19730, 24570, 29740] },
  { province: '山东', city: '聊城', name: '税务局2#楼', type: '政府办公', area: 4928, year: 2022, acType: 'split', cooling: [6,7,8,9], heating: [12,1], months: [31460, 25930, 23770, 17400, 17970, 43190, 42680, 47820, 21590, 17560, 22600, 30720] },
  { province: '山东', city: '烟台', name: '芝罘万达', type: '商业综合体', area: 240000, year: 2023, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [836103.314, 654012.592, 628919.577, 577221.077, 777334.766, 1143613.888, 1510695.598, 1596799.342, 1174101.996, 759431.302, 561035.863, 715911.112] },
  { province: '山东', city: '日照', name: '凌海大酒店', type: '星级酒店（四星级）', area: 25000, year: 2023, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [102486, 93511, 89788, 71679, 75403, 153186, 264178, 315968, 123163, 74297, 84463, 122194] },
  { province: '山东', city: '潍坊', name: '蓝海大饭店', type: '星级酒店（五星级）', area: 78000, year: 2019, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [471069.98, 351076.08, 330048, 314797.76, 342172.46, 472406.17, 774130, 794924.17, 494147.02, 336611.68, 331616.81, 406639.52] },
  { province: '山东', city: '潍坊', name: '蓝海大饭店', type: '星级酒店（五星级）', area: 78000, year: 2020, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [406338, 93556, 156111, 253278.69, 298192.32, 434976.94, 579580.84, 618785.97, 487337.56, 310554, 361726.3, 405315.1] },
  { province: '山东', city: '潍坊', name: '蓝海大饭店', type: '星级酒店（五星级）', area: 78000, year: 2021, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [314293.9, 277348, 326238, 299446, 405550, 516660, 821764, 744360, 538984, 357076, 395800, 408120] },
  { province: '山东', city: '淄博', name: '桓台妇幼保健院', type: '医院（三乙）', area: 44500, year: 2024, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [271848, 245401, 238007, 224820, 335424, 428396, 480419, 506388, 388004, 253232, 260169, 284291] },
  { province: '山东', city: '淄博', name: '淄矿医院', type: '医院（三乙）', area: 44403, year: 2021, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [495960, 382040, 416760, 359400, 367400, 524640, 643320, 585840, 442960, 380200, 431000, 459441] },
  { province: '山东', city: '淄博', name: '淄矿医院', type: '医院（三乙）', area: 44403, year: 2022, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [456920, 393200, 389400, 320880, 394760, 557800, 606040, 613280, 431000, 380080, 401920, 474440] },
  { province: '山东', city: '淄博', name: '淄矿医院', type: '医院（三乙）', area: 44403, year: 2023, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [510000, 411360, 403720, 372280, 375320, 586360, 677920, 649000, 484760, 346720, 404640, 469880] },
  { province: '山东', city: '新泰', name: '新矿医院', type: '医院（三乙）', area: 44508, year: 2023, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [475200, 446400, 340800, 321600, 292600, 379200, 499200, 576000, 456000, 316800, 360000, 446400] },
  { province: '山东', city: '肥城', name: '肥矿医院', type: '医院（三乙）', area: 64924, year: 2021, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [430426, 312259, 332851, 272131, 285014, 257453, 645744, 596218, 551760, 320918, 408778, 472771] },
  { province: '山东', city: '肥城', name: '肥矿医院', type: '医院（三乙）', area: 64924, year: 2022, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [427046, 367699, 360518, 275827, 287866, 519446, 588720, 596534, 335280, 275510, 342989, 466858] },
  { province: '山东', city: '德州', name: '陵城区人民医院', type: '医院（二甲）', area: 52528, year: 2022, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [755059, 675689, 545035, 381579, 442071, 786775, 967361, 1001049, 547563, 371979, 510740, 731961] },
  { province: '湖北', city: '咸宁', name: '咸宁第一人民医院', type: '医院（二甲）', area: 69880, year: 2019, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [557660, 545520, 430060, 326540, 318080, 511360, 784680, 983260, 877740, 454780, 326500, 435940] },
  { province: '湖北', city: '咸宁', name: '咸宁第一人民医院', type: '医院（二甲）', area: 69880, year: 2020, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [412980, 414060, 375140, 274480, 378600, 679540, 734400, 928420, 760780, 324780, 570820, 454120] },
  { province: '湖北', city: '咸宁', name: '咸宁第一人民医院', type: '医院（二甲）', area: 69880, year: 2021, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [563320, 752440, 417940, 348820, 438220, 822080, 961500, 915280, 865060, 452540, 353620, 475580] },
  { province: '湖北', city: '咸宁', name: '咸宁第一人民医院', type: '医院（二甲）', area: 69880, year: 2022, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [573060, 515000, 393980, 353900, 393320, 803220, 1000160, 974140, 616760, 413700, 342560, 475060] },
  { province: '湖北', city: '咸宁', name: '咸宁第一人民医院', type: '医院（二甲）', area: 69880, year: 2023, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [583220, 504420, 388460, 345240, 486360, 749800, 882060, 843020, 585500, 360960, 384620, 533160] },
  { province: '湖北', city: '咸宁', name: '咸宁第一人民医院', type: '医院（二甲）', area: 69880, year: 2024, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [544200, 515400, 403400, 346900, 485900, 645900, 905400, 965400, 760000, 392100, 372500, 500300] },
  { province: '湖北', city: '咸宁', name: '崇阳县人民医院', type: '医院（三级）', area: 62350, year: 2019, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [1007040, 948160, 706000, 395600, 357360, 638560, 901440, 1247520, 1048240, 592400, 378320, 675200] },
  { province: '湖北', city: '咸宁', name: '崇阳县人民医院', type: '医院（三级）', area: 62350, year: 2020, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [679440, 919040, 415760, 362800, 414160, 793680, 866160, 1140000, 899760, 355280, 615680, 968240] },
  { province: '湖北', city: '咸宁', name: '崇阳县人民医院', type: '医院（三级）', area: 62350, year: 2021, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [1019920, 612720, 589360, 331920, 547840, 897280, 1194320, 1056960, 974320, 461440, 437120, 918320] },
  { province: '湖北', city: '咸宁', name: '崇阳县人民医院', type: '医院（三级）', area: 62350, year: 2022, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [1176800, 982800, 403280, 359040, 427280, 1028560, 1369440, 1387600, 734480, 427040, 362720, 882720] },
  { province: '湖北', city: '咸宁', name: '崇阳县人民医院', type: '医院（三级）', area: 62350, year: 2023, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [905600, 811360, 479600, 345120, 502560, 901440, 1176560, 1107680, 974320, 461440, 437120, 918320] },
  { province: '湖北', city: '咸宁', name: '崇阳县人民医院', type: '医院（三级）', area: 62350, year: 2024, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [861800, 791200, 586000, 339000, 408800, 666600, 1015800, 1008000, 816100, 420700, 419600, 824400] },
  { province: '湖北', city: '咸宁', name: '通城县人民医院', type: '医院（二甲）', area: 50000, year: 2019, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [675200, 646100, 495800, 361600, 303200, 450700, 563700, 857700, 715700, 450100, 285200, 560400] },
  { province: '湖北', city: '咸宁', name: '通城县人民医院', type: '医院（二甲）', area: 50000, year: 2020, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [736000, 768900, 382400, 360400, 414100, 688500, 733400, 971900, 778800, 405300, 602700, 878000] },
  { province: '湖北', city: '咸宁', name: '通城县人民医院', type: '医院（二甲）', area: 50000, year: 2021, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [858700, 540300, 582300, 428900, 526700, 797500, 1008900, 938800, 841900, 485300, 381200, 735200] },
  { province: '湖北', city: '咸宁', name: '通城县人民医院', type: '医院（二甲）', area: 50000, year: 2022, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [910500, 859980, 505500, 419600, 430300, 817400, 1119100, 1149200, 656800, 456400, 379100, 890100] },
  { province: '湖北', city: '咸宁', name: '通城县人民医院', type: '医院（二甲）', area: 50000, year: 2023, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [844800, 711400, 472500, 386300, 527000, 743600, 1061200, 1018600, 738900, 435700, 525900, 981100] },
  { province: '湖北', city: '咸宁', name: '通城县人民医院', type: '医院（二甲）', area: 50000, year: 2024, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [1010600, 993200, 674600, 368400, 615400, 716600, 1199400, 1190000, 956200, 455300, 508500, 929800] },
  { province: '广西', city: '柳州', name: '柳州市人民医院', type: '医院（三甲）', area: 257352, year: 2023, acType: 'central', cooling: [4,5,6,7,8,9,10], heating: [], months: [1499471, 1320805, 1235966, 1317009, 1759454, 2058748, 2318852, 2190047, 1999041, 1612437, 1363888, 1552111] },
  { province: '广西', city: '柳州', name: '柳州市人民医院', type: '医院（三甲）', area: 257352, year: 2024, acType: 'central', cooling: [4,5,6,7,8,9,10], heating: [], months: [1624914, 150807, 1459287, 1678977, 1943133, 2201892, 2619505, 2612254, 2372441, 1941133, 1384578, 1628122] },
  { province: '广东', city: '肇庆', name: '华斌实验学校', type: '学校（小学初中高中）', area: 81886, year: 2025, acType: 'split', cooling: [4,5,6,7,8,9,10], heating: [], months: [332520, 343560, 452040, 527160, 649320, 804000, 357720, 397200, 961680, 550080, 408000, 475080] },
  { province: '安徽', city: '阜阳', name: '太和县文化中心', type: '国家机关办公建筑', area: 61635, year: 2021, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2,3], months: [196854, 308040, 153855, 178980, 110265, 118875, 281685, 307605, 251445, 159885, 120945, 97305] },
  { province: '安徽', city: '阜阳', name: '太和县文化中心', type: '国家机关办公建筑', area: 61635, year: 2022, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2,3], months: [198060, 250845, 210165, 119535, 64335, 92610, 283710, 340605, 322380, 137415, 407610, 96930] },
  { province: '安徽', city: '阜阳', name: '太和县文化中心', type: '国家机关办公建筑', area: 61635, year: 2023, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2,3], months: [177555, 209925, 181800, 120240, 93510, 120690, 194025, 306630, 318315, 156810, 96585, 104490] },
  { province: '安徽', city: '阜阳', name: '太和县文化中心', type: '国家机关办公建筑', area: 61635, year: 2024, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2,3], months: [252915, 224115, 127695, 84765, 127515, 210510, 278010, 358980, 171915, 82740, 90660, 209250] },
  { province: '山东', city: '泰安', name: '泰安市政务服务中心', type: '国家机关办公建筑', area: 108500, year: 2023, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2,3], months: [1029525, 893248, 662279, 407420, 421424, 784549, 1057316, 1018576, 787537, 426079, 872298, 1267430] },
  { province: '山东', city: '泰安', name: '泰安市政务服务中心', type: '国家机关办公建筑', area: 108500, year: 2024, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2,3], months: [1272568, 1087655, 707744, 381690, 597497, 936926, 1065782, 1160579, 859762, 392677, 710350, 1101634] },
  { province: '山东', city: '泰安', name: '泰安市政务服务中心', type: '国家机关办公建筑', area: 108500, year: 2025, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2,3], months: [1083681, 990661, 701319, 386495, 488160, 871917, 1164093, 1171307, 695143, 484354, 901806, 1229019] },
  { province: '江西', city: '上饶', name: '鄱阳县政府', type: '国家机关办公建筑', area: 26040, year: 2022, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [178236, 166506, 117468, 108864, 93576, 157572, 255258, 260952, 150888, 81912, 73272, 138612] },
  { province: '江西', city: '上饶', name: '鄱阳县政府', type: '国家机关办公建筑', area: 26040, year: 2023, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [132768, 136560, 111216, 66534, 107364, 152754, 206862, 202956, 163230, 82680, 93480, 184728] },
  { province: '江西', city: '上饶', name: '鄱阳县政府', type: '国家机关办公建筑', area: 26040, year: 2024, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2], months: [164862, 137658, 122106, 74118, 105282, 117654, 218526, 226968, 201282, 82680, 93480, 184728] },
  { province: '江西', city: '赣州', name: '上犹县人民医院', type: '医院（二甲）', area: 63000, year: 2023, acType: 'central', cooling: [4,5,6,7,8,9,10], heating: [12,1,2], months: [568700, 445600, 359900, 317200, 433700, 602000, 768300, 689500, 513400, 344300, 313300, 514700] },
  { province: '江西', city: '赣州', name: '上犹县人民医院', type: '医院（二甲）', area: 63000, year: 2024, acType: 'central', cooling: [4,5,6,7,8,9,10], heating: [12,1,2], months: [557800, 524400, 457100, 342500, 443081, 602970, 833432, 733971, 611892, 336133, 321628, 507375] },
  { province: '江西', city: '赣州', name: '上犹县人民医院', type: '医院（二甲）', area: 63000, year: 2025, acType: 'central', cooling: [4,5,6,7,8,9,10], heating: [12,1,2], months: [534925, 511070, 398307, 317688, 423132, 571413, 687580, 668895, 633577, 487820, 280076, 0] },
  { province: '安徽', city: '阜阳', name: '临泉县市民中心', type: '文化教育建筑', area: 26531, year: 2023, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2,3], months: [185340, 173700, 71738, 70333, 91770, 162109, 216375, 229399, 159741, 76777, 76309, 172074] },
  { province: '安徽', city: '阜阳', name: '临泉县市民中心', type: '文化教育建筑', area: 26531, year: 2024, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2,3], months: [225000, 175440, 110550, 82410, 158220, 249390, 320670, 368400, 206190, 106380, 104310, 229500] },
  { province: '安徽', city: '阜阳', name: '临泉县市民中心', type: '文化教育建筑', area: 26531, year: 2025, acType: 'central', cooling: [5,6,7,8,9], heating: [11,12,1,2,3], months: [233670, 195960, 110550, 88020, 132360, 215010, 360000, 356250, 189750, 108720, 100440, 189930] },
  { province: '四川', city: '成都', name: '领地·环球金融中心', type: '商务写字楼建筑', area: 211916, year: 2023, acType: 'central', cooling: [4,5,6,7,8,9,10], heating: [12,1], months: [1280471, 1308736, 1123039, 1350286, 1719409, 1800578, 2254824, 2373052, 1795972, 1180698, 1213068, 1321945] },
  { province: '四川', city: '成都', name: '领地·环球金融中心', type: '商务写字楼建筑', area: 211916, year: 2024, acType: 'central', cooling: [4,5,6,7,8,9,10], heating: [12,1], months: [1358296, 1104832, 1177900, 1352706, 1671173, 1737034, 2198363, 2597546, 2289348, 1187621, 1204659, 1341556] },
  { province: '四川', city: '成都', name: '领地·环球金融中心', type: '商务写字楼建筑', area: 211916, year: 2025, acType: 'central', cooling: [4,5,6,7,8,9,10], heating: [12,1], months: [1230394, 1178850, 1263267, 1381339, 1606990, 1847310, 2472150, 2360960, 1791380, 1282590, 1184560, 1291620] },
];

// Climate zone mapping (based on city)
const cityClimateMap = {
  '聊城': '寒冷', '烟台': '寒冷', '日照': '寒冷', '潍坊': '寒冷', '淄博': '寒冷', '新泰': '寒冷', '肥城': '寒冷', '德州': '寒冷', '泰安': '寒冷',
  '咸宁': '夏热冬冷', '柳州': '夏热冬暖', '肇庆': '夏热冬暖', '阜阳': '夏热冬冷', '上饶': '夏热冬冷', '赣州': '夏热冬暖', '成都': '夏热冬冷'
};

function getClimateZone(city) {
  return cityClimateMap[city] || '夏热冬冷';
}

async function importProjects() {
  console.log('Starting bulk import of 57 projects...');

  // Use a fixed user_id for demo (you should use actual user auth)
  const userId = '00000000-0000-0000-0000-000000000001';

  let successCount = 0;
  let errorCount = 0;

  for (const p of projects) {
    try {
      // Insert project
      const projectData = {
        user_id: userId,
        project_name: `${p.province}${p.city}${p.name}_${p.year}`,
        province: p.province,
        city: p.city,
        building_type: p.type,
        building_area: p.area,
        climate_zone: getClimateZone(p.city),
        ac_type: p.acType,
        cooling_months: p.cooling,
        heating_months: p.heating,
        is_public: true
      };

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      if (projectError) {
        console.error(`Failed to insert project: ${p.name}`, projectError);
        errorCount++;
        continue;
      }

      // Insert monthly energy data
      const monthlyData = {
        project_id: project.id,
        year: p.year,
        month_1: p.months[0] || 0,
        month_2: p.months[1] || 0,
        month_3: p.months[2] || 0,
        month_4: p.months[3] || 0,
        month_5: p.months[4] || 0,
        month_6: p.months[5] || 0,
        month_7: p.months[6] || 0,
        month_8: p.months[7] || 0,
        month_9: p.months[8] || 0,
        month_10: p.months[9] || 0,
        month_11: p.months[10] || 0,
        month_12: p.months[11] || 0,
        unit: 'kWh'
      };

      const { error: monthlyError } = await supabase
        .from('monthly_energy')
        .insert(monthlyData);

      if (monthlyError) {
        console.error(`Failed to insert monthly data for: ${p.name}`, monthlyError);
        // Delete the project we just created
        await supabase.from('projects').delete().eq('id', project.id);
        errorCount++;
        continue;
      }

      successCount++;
      console.log(`✓ ${successCount}. ${p.province}-${p.city}-${p.name} (${p.year})`);
    } catch (err) {
      console.error(`Error processing ${p.name}:`, err);
      errorCount++;
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log(`Total: ${projects.length}`);
}

importProjects().catch(console.error);