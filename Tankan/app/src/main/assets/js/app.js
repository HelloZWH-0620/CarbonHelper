/* ============================================================
   碳看版 · 看板 / 低碳排行榜 / 电器详情
   双列电器卡片 · 指标错峰轮播 · 卡片中心展开动画 · 跟手返回
   ============================================================ */

(function () {
  'use strict';

  /* 未捕获异常转发到 console（原生桥会转 logcat，便于定位「无法返回」类问题） */
  window.onerror = function (msg, src, line, col) {
    console.log('JS-ERROR ' + msg + ' @' + (src || '?') + ':' + line + ':' + col);
    return false;
  };

  /* ---------- 数据 ---------- */
  /* KG_PER_KWH 华中区域电网排放因子（演示取 0.58 kgCO₂/度）；电价 0.6 元/度 */
  var KG_PER_KWH = 0.58;
  var PRICE_PER_KWH = 0.6;

  /* 内置 4 款电器模板（同时也是设备目录的前四项）；
     实际在管列表 APPLIANCES 在下方按 localStorage 已添加记录克隆生成 */
  var BASE_TEMPLATES = [
    {
      catId: 'aircon', emoji: '❄️',
      name: '空调', img: 'img/aircondition.png',
      today: '5小时', month: '18.6度', carbon: '10.8 KG',
      status: '运行中', powerW: 450, voltage: 220, currentA: 3, location: '北宿2栋-406', kwhToday: 1.6, runH: 3.2, standbyH: 1.1,
      slots: [0.5, 0.2, 0.3, 0.5, 0.7, 0.9, 0.8, 1.6],   // 8个时段 kWh
      trend: [2.4, 2.1, 2.8, 3.2, 2.2, 2.6, 3.0],      // 近7日 kWh
      ai: {
        windowText: '23:00 - 次日 01:00',
        cause: '深夜功率持续偏高，可能是温度设定过低，且没有开启定时关闭。',
        action: '设定 26℃ 运行，凌晨 2:00 自动关闭',
        saveKg: 0.3
      },
      sim: {
        baseKwh: 1.2,
        sliders: [
          { label: '设定温度', min: 22, max: 26, step: 1, unit: '℃', val: 22, dir: 'up', w: 0.28 },
          { label: '每日时长', min: 6, max: 8, step: 0.5, unit: '小时', val: 8, dir: 'down', w: 0.30 }
        ]
      },
      acts: [
        ['凌晨 2:00 自动关闭空调', '已达成', 'auto'],
        ['空调保持 26℃ 运行', '已达成', 'auto'],
        ['清洗空调滤网', '待打卡', 'manual']
      ],
      tips: ['空调制冷每调高 1℃，可省电约 7%，26℃ 是舒适与节能的平衡点', '使用定时功能避免整夜运转', '每月清洗滤网可提升制冷效率'],
      quiz: {
        q: '空调制冷时，温度每调高 1℃，大约可以省电多少？',
        opts: ['约 7%', '约 20%', '几乎不省电'],
        ans: 0,
        why: '每调高 1℃ 约省电 7%，26℃ 是舒适与节能的平衡点。'
      }
    },
    {
      catId: 'waterheater', emoji: '🚿',
      name: '热水器', img: 'img/hotwater.png',
      today: '20分钟', month: '4.2度', carbon: '2.4 KG',
      status: '待机', powerW: 0, voltage: 220, currentA: 10, location: '北宿2栋-406阳台', kwhToday: 0.7, runH: 0.4, standbyH: 2.1,
      slots: [0.1, 0.1, 0.5, 0.2, 0.2, 0.4, 1.9, 0.7],
      trend: [0.5, 0.6, 0.4, 0.8, 0.5, 0.9, 0.6],
      ai: {
        windowText: '18:00 - 21:00',
        cause: '用电高峰时段重复加热，可能是水温设定过高，全天保温持续散热。',
        action: '水温调至 55℃，避开 18-21 时高峰，用完即断电',
        saveKg: 0.15
      },
      sim: {
        baseKwh: 0.6,
        sliders: [
          { label: '设定水温', min: 45, max: 65, step: 1, unit: '℃', val: 65, dir: 'down', w: 0.22 },
          { label: '每日加热', min: 20, max: 60, step: 5, unit: '分钟', val: 60, dir: 'down', w: 0.36 }
        ]
      },
      acts: [
        ['用水后自动断电', '已达成', 'auto'],
        ['水温设定不超过 60℃', '已达成', 'auto'],
        ['每月除垢一次', '待打卡', 'manual']
      ],
      tips: ['保温也在持续散热耗电，用完及时断电更省电', '夏季水温可适当调低 5℃', '定期除垢能提升加热效率'],
      quiz: {
        q: '下列哪种使用习惯更省电？',
        opts: ['全天通电保温，随用随取', '用完及时断电，需要时再加热', '水温一直设在 65℃'],
        ans: 1,
        why: '保温过程持续散热耗电，用完断电、用前加热更省电。'
      }
    },
    {
      catId: 'computer', emoji: '💻',
      name: '电脑', img: 'img/computer.png',
      today: '6小时30分', month: '9.1度', carbon: '5.3 KG',
      status: '运行中', powerW: 120, voltage: 220, currentA: 1, location: '北宿2栋-406书桌', kwhToday: 0.9, runH: 6.5, standbyH: 2.4,
      slots: [1.2, 0.8, 0.3, 0.4, 0.7, 0.8, 0.8, 1.0],
      trend: [1.1, 0.9, 1.4, 1.2, 1.6, 1.0, 1.3],
      ai: {
        windowText: '00:00 - 06:00',
        cause: '本周深夜待机累计约 11 小时，相当于多排放约 0.15kg CO₂。',
        action: '开启闲置 30 分钟自动休眠，睡前彻底断电',
        saveKg: 0.15
      },
      sim: {
        baseKwh: 1.4,
        sliders: [
          { label: '每日使用', min: 6, max: 10, step: 0.5, unit: '小时', val: 10, dir: 'down', w: 0.30 },
          { label: '每日待机', min: 0, max: 11, step: 1, unit: '小时', val: 11, dir: 'down', w: 0.35 }
        ]
      },
      acts: [
        ['闲置自动息屏', '已达成', 'auto'],
        ['深夜自动断电', '已达成', 'auto'],
        ['整理桌面线缆', '待打卡', 'manual']
      ],
      tips: ['休眠模式比屏保更省电', '屏幕亮度降低 20% 约省电 10%', '充电器不使用时请拔下'],
      quiz: {
        q: '电脑长时间不用时，最省电的状态是？',
        opts: ['开启屏保', '休眠 / 睡眠', '锁屏但保持运行'],
        ans: 1,
        why: '屏保和锁屏仍在全速运行，休眠会挂起系统，功耗接近关机。'
      }
    },
    {
      catId: 'lamp', emoji: '💡',
      name: '灯', img: 'img/light.png',
      today: '9小时', month: '6.1度', carbon: '3.5 KG',
      status: '运行中', powerW: 18, voltage: 220, currentA: 1, location: '北宿2栋-406顶灯', kwhToday: 0.5, runH: 9.0, standbyH: 0.2,
      slots: [0.1, 0.1, 0.3, 0.4, 0.5, 0.6, 0.8, 0.9],
      trend: [0.7, 0.8, 0.6, 0.9, 0.7, 0.8, 1.0],
      ai: {
        windowText: '21:00 - 24:00',
        cause: '深夜照明耗电偏高，可能存在人走未关灯、睡前忘记关灯的情况。',
        action: '开启「人走灯灭」提醒，设置睡前定时关闭',
        saveKg: 0.1
      },
      sim: {
        baseKwh: 0.5,
        sliders: [
          { label: '每日开灯', min: 6, max: 12, step: 0.5, unit: '小时', val: 12, dir: 'down', w: 0.45 },
          { label: '常用亮度', min: 50, max: 100, step: 10, unit: '%', val: 100, dir: 'down', w: 0.20 }
        ]
      },
      acts: [
        ['白天利用自然光', '已达成', 'auto'],
        ['人走灯灭', '已达成', 'auto'],
        ['更换为 LED 灯泡', '待打卡', 'manual']
      ],
      tips: ['LED 灯比白炽灯省电 80% 以上', '白天充分利用自然光', '局部照明代替全屋开灯'],
      quiz: {
        q: '同样亮度下，LED 灯比白炽灯大约省电多少？',
        opts: ['80% 以上', '约 30%', '约 10%'],
        ans: 0,
        why: 'LED 电光转换效率远高于白炽灯，可省电 80% 以上，寿命也更长。'
      }
    }
  ];

  var METRICS = [
    { k: '使用时长', key: 'today' },
    { k: '当月用电', key: 'month' },
    { k: '日碳排放', key: 'carbon' }
  ];
  var SLOT_LABELS = ['0-3时', '3-6时', '6-9时', '9-12时', '12-15时', '15-18时', '18-21时', '21-24时'];
  var SLOT_TIMES = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
  var DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

  /* ============================================================
     用户本地数据：API Key / 低碳目标 / 答题连胜（localStorage）
     ============================================================ */
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('tankan:' + k); return v === null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem('tankan:' + k, JSON.stringify(v)); } catch (e) {}
    }
  };
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function yesterdayStr() {
    var d = new Date(); d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function getAiKey() { return store.get('ds_key', '') || ''; }

  /* ============================================================
     设备目录（宿舍常见电器）与「添加设备」
     · 已添加的 catId 列表持久化在 localStorage(tankan:added)
     · 暂缺实拍图的电器以 emoji 占位；补图时把同名 png 放入 assets/img 即可
     ============================================================ */
  var APPLIANCES = [];

  function catFmt1(v) { return (Math.round(v * 10) / 10).toString(); }
  function catHash(s) {
    var h = 2166136261, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h;
  }
  /* slots 时段权重（仅看形状，渲染时会归一化到 kwhToday） */
  var PAT_SLOTS = {
    evening: [0.1, 0.1, 0.2, 0.3, 0.4, 0.6, 1.5, 1.9],  /* 傍晚到睡前 */
    flat:    [1.0, 0.95, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15], /* 全天持续 */
    night:   [1.5, 1.2, 0.4, 0.3, 0.35, 0.5, 0.9, 1.4],  /* 夜间为主 */
    day:     [0.2, 0.2, 0.7, 1.05, 1.1, 0.95, 0.85, 0.6],/* 白天为主 */
    twin:    [0.3, 0.25, 1.0, 0.5, 0.3, 0.45, 1.1, 1.6], /* 早晚双峰 */
    brief:   [0.2, 0.2, 1.8, 0.4, 0.3, 0.5, 1.9, 1.2]    /* 短时即开即用 */
  };
  /* 近 7 日趋势：catId 种子确定性起伏（形状会被归一化到月总量） */
  function catTrend(seed) {
    var h = catHash(seed), arr = [], i;
    for (i = 0; i < 7; i++) { h = (h * 1103515245 + 12345) >>> 0; arr.push(0.75 + (h % 1000) / 1000 * 0.55); }
    return arr;
  }
  /* spec 简写：
     ai = [异常时段, 原因, 建议, 每日可减kg]
     sim 每条 = [标签, min, max, step, 单位, 当前值, dir(down=调小省电/up=调大省电), 权重]
     acts = 三条行为（前两条自动识别、第三条待手动打卡）
     q = [题干, 选项, 正确序号, 解析] */
  function mkAppliance(s) {
    return {
      catId: s.id, emoji: s.emoji, name: s.name, img: s.img,
      today: s.today,
      month: s.month + '度',
      carbon: catFmt1(s.month * KG_PER_KWH) + ' KG',
      status: s.status || (s.powerW > 0 ? '运行中' : '待机'),
      powerW: s.powerW, voltage: s.v || 220, currentA: s.a || 1,
      location: s.loc || '北宿2栋-406',
      kwhToday: s.kwh, runH: s.run, standbyH: s.sb,
      slots: PAT_SLOTS[s.pat] || PAT_SLOTS.flat,
      trend: catTrend(s.id),
      ai: { windowText: s.ai[0], cause: s.ai[1], action: s.ai[2], saveKg: s.ai[3] },
      sim: {
        baseKwh: s.base != null ? s.base : Math.max(0.1, s.kwh * 0.7),
        sliders: s.sim.map(function (d) {
          return { label: d[0], min: d[1], max: d[2], step: d[3], unit: d[4], val: d[5], dir: d[6], w: d[7] };
        })
      },
      acts: [
        [s.acts[0], '已达成', 'auto'],
        [s.acts[1], '已达成', 'auto'],
        [s.acts[2], '待打卡', 'manual']
      ],
      tips: s.tips,
      quiz: { q: s.q[0], opts: s.q[1], ans: s.q[2], why: s.q[3] }
    };
  }

  var EXTRA_SPECS = [
    {
      id: 'fan', emoji: '🌀', name: '电风扇', img: 'img/fan.png',
      powerW: 55, a: 1, loc: '北宿2栋-406书桌', today: '5小时30分', kwh: 0.3, month: 1.8, run: 5.5, sb: 0.4, pat: 'day',
      ai: ['12:00 - 16:00', '气温不高时风扇仍长时间开最大档直吹，体感不适也浪费电。', '风量调低一档并开启摇头，出门前提前 10 分钟关闭', 0.06],
      sim: [['每日使用', 2, 10, 0.5, '小时', 10, 'down', 0.3], ['风量档位', 1, 3, 1, '档', 3, 'down', 0.25]],
      acts: ['离开座位随手关风扇', '使用摇头代替固定直吹', '每周擦拭扇叶灰尘'],
      tips: ['风扇搭配空调使用，空调可调高 1-2℃', '最高档与最低档耗电相差近一半', '扇叶积灰会降低送风效率'],
      q: ['夏天用空调时，下列哪种做法更省电？', ['空调+风扇同用，温度调高 1-2℃', '空调开到 22℃ 猛吹', '风扇一直开最大档'], 0, '风扇加速空气循环，空调调高温度依旧凉爽，整体更省电。']
    },
    {
      id: 'washer', emoji: '👕', name: '洗衣机', img: 'img/washer.png',
      powerW: 330, a: 10, loc: '北宿2栋-406阳台', today: '45分钟', kwh: 0.25, month: 3.2, run: 0.75, sb: 0.3, pat: 'twin',
      ai: ['20:00 - 22:00', '少量衣物也使用标准加热强洗，水加热消耗了大量电能。', '攒满一桶再洗，选择常温快洗并避开晚高峰', 0.12],
      sim: [['每周洗衣', 2, 8, 1, '次', 8, 'down', 0.3], ['洗涤水温', 20, 60, 5, '℃', 60, 'down', 0.35]],
      acts: ['攒满一桶再洗衣', '使用常温快洗模式', '定期清理滤网盒'],
      tips: ['加热水是洗衣机最耗电的环节，常温洗可省电约 80%', '少量衣物手洗更省水省电', '洗衣尽量避开 18-21 时高峰'],
      q: ['洗衣机洗衣时最耗电的环节是？', ['把水加热', '滚筒转动', '排水'], 0, '水温每升高一级都要消耗大量电能，常温洗涤最省电。']
    },
    {
      id: 'hairdryer', emoji: '💨', name: '吹风机', img: 'img/dryer.png',
      powerW: 1600, a: 10, loc: '楼层洗漱间', today: '8分钟', kwh: 0.18, month: 1.6, run: 0.13, sb: 0.1, pat: 'twin',
      ai: ['22:00 - 23:30', '每次吹发都使用最高温、最高风档，功率接近 1600W。', '先用毛巾擦干水分，中温风吹至八成干即可', 0.08],
      sim: [['每次吹发', 5, 20, 1, '分钟', 20, 'down', 0.35], ['风温档位', 1, 3, 1, '档', 3, 'down', 0.3]],
      acts: ['吹发前用毛巾充分擦干', '使用中温档代替高温档', '定期清理进风口毛发'],
      tips: ['毛巾多擦 1 分钟，吹风可少用 3 分钟', '高温档功率最大且更伤发质', '进风口被毛发堵塞会明显增加耗电'],
      q: ['吹头发前用毛巾充分擦干，可以？', ['缩短吹风时间更省电', '让头发更难吹干', '让吹风机功率变大'], 0, '带走的水分越少，吹发时间越短，高功率的吹风机也就越省电。']
    },
    {
      id: 'kettle', emoji: '🫖', name: '电热水壶', img: 'img/kettle.png',
      powerW: 1500, a: 10, loc: '北宿2栋-406书桌', today: '12分钟', kwh: 0.22, month: 2.4, run: 0.2, sb: 0.2, pat: 'brief',
      ai: ['全天多次', '一天内多次烧整壶水，凉了又重复加热，热量被白白浪费。', '按饮用需求烧适量水，烧开后尽快灌入保温壶', 0.1],
      sim: [['每日烧水', 1, 6, 1, '次', 6, 'down', 0.4], ['每次水量', 0.5, 1.8, 0.1, '升', 1.8, 'down', 0.3]],
      acts: ['按需烧水不超量', '多余开水装入保温壶', '每周清除壶底水垢'],
      tips: ['烧水量按需取用，避免重复加热', '水垢会降低加热效率，建议每月除垢', '长时间沸腾、反复沸腾最费电'],
      q: ['更省电的烧水方式是？', ['需要多少烧多少', '一次烧一大壶慢慢喝', '水凉了反复烧开'], 0, '多余的水放凉后再加热等于白烧两遍，按需取用最省电。']
    },
    {
      id: 'microwave', emoji: '🍱', name: '微波炉', img: 'img/microwave.png',
      powerW: 800, a: 10, loc: '楼层公共厨房', today: '6分钟', kwh: 0.06, month: 1.2, run: 0.1, sb: 0.2, pat: 'brief',
      ai: ['加热时段分散', '同一份食物频繁开门、分多次加热，每次启动都有额外损耗。', '一次设定合适时长，加热前在食物表面洒少量水', 0.04],
      sim: [['每周使用', 2, 10, 1, '次', 10, 'down', 0.25], ['单次时长', 1, 6, 0.5, '分钟', 6, 'down', 0.25]],
      acts: ['一次加热到位不反复开门', '加热前洒水并加盖', '及时清洁内腔油污'],
      tips: ['加热少量饭菜，微波炉比明火更省电', '加盖或保鲜膜可缩短加热时间', '内腔油污会降低微波加热效率'],
      q: ['用微波炉热饭时，更省电的做法是？', ['加盖或裹保鲜膜一次热透', '反复开门查看再继续加热', '用最大火力长时间加热'], 0, '加盖锁住水分和热量，一次热透避免反复重启。']
    },
    {
      id: 'fridge', emoji: '🧊', name: '小冰箱', img: 'img/ice.png',
      powerW: 80, a: 1, loc: '北宿2栋-406墙角', today: '全天运行', kwh: 0.55, month: 12, run: 24, sb: 0, pat: 'flat',
      status: '运行中',
      ai: ['13:00 - 15:00', '环境温度高，冰箱又紧贴墙角摆放，散热不畅使压缩机频繁启动。', '与墙壁留出 10cm 散热间隙，热食放凉后再放入', 0.18],
      sim: [['设定温度', 2, 7, 1, '℃', 2, 'up', 0.3], ['每日开门', 5, 30, 1, '次', 30, 'down', 0.2]],
      acts: ['热食放凉再放入冰箱', '冰箱两侧预留散热间隙', '每周检查门封条密封'],
      tips: ['箱内八分满最省电，空隙过大会增加冷量流失', '每多开 10 次门，一个月约多耗 1 度电', '定期除霜可明显提升制冷效率'],
      q: ['关于冰箱省电，正确的做法是？', ['热食放凉后再放入', '趁热放进去快速制冷', '紧贴墙角摆放节省空间'], 0, '热食会抬升箱内温度，压缩机需要额外做功降温。']
    },
    {
      id: 'router', emoji: '📶', name: '路由器', img: 'img/router.png',
      powerW: 12, a: 1, loc: '北宿2栋-406书桌', today: '全天在线', kwh: 0.18, month: 2.8, run: 24, sb: 0, pat: 'flat',
      status: '运行中',
      ai: ['00:00 - 06:00', '深夜睡眠和白天上课无人时，路由器仍持续运行，长时间空载耗电。', '睡前或长时间外出时关闭路由器电源', 0.07],
      sim: [['每日通电', 8, 24, 1, '小时', 24, 'down', 0.4], ['每周关闭天数', 0, 7, 1, '天', 0, 'up', 0.2]],
      acts: ['睡前关闭路由器电源', '长时间外出拔掉插头', '每月重启并擦拭灰尘'],
      tips: ['路由器待机也耗电，不用时断电最直接', '不要叠放在其他发热设备上', '定期关机重启有助于稳定和散热'],
      q: ['全宿舍都去上课时，路由器怎样最省电？', ['关闭插排或拔掉电源', '保持开机方便回来即用', '用毛巾盖住防尘'], 0, '无人使用的数小时里，断电省下的虽不多，但积少成多。']
    },
    {
      id: 'humidifier', emoji: '💧', name: '加湿器', img: 'img/humidifier.png',
      powerW: 30, a: 1, loc: '北宿2栋-406书桌', today: '4小时', kwh: 0.1, month: 1.2, run: 4, sb: 0.5, pat: 'day',
      ai: ['整夜运行', '加湿器整夜开启，清晨桌面结露，说明加湿量已经明显过量。', '湿度目标设为 40-50%，使用恒湿模式并定时关闭', 0.04],
      sim: [['每日使用', 1, 10, 0.5, '小时', 10, 'down', 0.3], ['目标湿度', 30, 70, 5, '%RH', 70, 'down', 0.2]],
      acts: ['使用恒湿模式而非常开', '睡前定时 2 小时关闭', '每周换水刷洗水箱'],
      tips: ['人体舒适湿度为 40%-60%，并非越高越好', '定期清洁水箱，避免细菌随水雾扩散', '使用纯净水或凉白开可减少白粉'],
      q: ['冬季室内湿度保持在多少最舒适也最省电？', ['40%-60%', '越高越好，90% 最佳', '越干越好'], 0, '湿度过高不仅费电，还可能引起结露和霉菌。']
    },
    {
      id: 'warmer', emoji: '🔥', name: '电暖器', img: 'img/warmer.png',
      powerW: 1800, a: 16, loc: '北宿2栋-406', today: '3小时', kwh: 3.2, month: 18, run: 3, sb: 1, pat: 'night',
      ai: ['23:00 - 次日 02:00', '深夜睡眠时电暖器仍满功率运行，它是宿舍里功率最大的用电设备。', '睡前提前暖房，入睡后切低温档或定时关闭', 0.8],
      sim: [['每日使用', 1, 8, 0.5, '小时', 8, 'down', 0.35], ['温度档位', 1, 3, 1, '档', 3, 'down', 0.3]],
      acts: ['入睡后调低档位', '先关好门窗再开暖器', '周围不堆放衣物书本'],
      tips: ['电暖器每多用 1 小时约多耗 1.8 度电', '关严门窗升温更快更省电', '严禁在电暖器上覆盖衣物烘烤'],
      q: ['宿舍里功率通常最大、最需要控制时长的电器是？', ['电暖器', '路由器', '手机充电器'], 0, '电暖器功率可达 1800W 以上，是宿舍冬季的用电大户。']
    },
    {
      id: 'robot', emoji: '🤖', name: '扫地机器人', img: 'img/robot.png',
      powerW: 30, a: 1, loc: '北宿2栋-406地面', today: '20分钟', kwh: 0.05, month: 0.9, run: 0.33, sb: 2.2, pat: 'brief',
      status: '待机',
      ai: ['基座全天通电', '清扫完成后充电基座长时间空载通电，待机功耗积少成多。', '每周定时清扫 2-3 次，充满电后断开基座电源', 0.03],
      sim: [['每周清扫', 1, 7, 1, '次', 7, 'down', 0.25], ['清扫范围', 30, 100, 10, '%', 100, 'down', 0.2]],
      acts: ['充满电后断开基座', '定期清理滚刷毛发', '清扫前收拢地面杂物'],
      tips: ['满电后继续插着会持续消耗待机电量', '清理滚刷和滤网能减小运行阻力', '先收纳线缆再清扫可提高效率'],
      q: ['扫地机器人清扫前先整理地面线缆杂物，可以？', ['提高清扫效率更省电', '完全没有影响', '反而更费电'], 0, '减少绕障和重复路径，同样电量覆盖更多面积。']
    },
    {
      id: 'projector', emoji: '📽️', name: '投影仪', img: 'img/projector.png',
      powerW: 150, a: 3, loc: '北宿2栋-406白墙', today: '2小时', kwh: 0.3, month: 4.5, run: 2, sb: 1.5, pat: 'night',
      ai: ['22:00 之后', '深夜连续观影超过 3 小时，高亮度模式持续耗电。', '开启节能模式，看一集休息一会儿，避免睡着后空放', 0.12],
      sim: [['每周观影', 2, 10, 1, '次', 10, 'down', 0.3], ['亮度档位', 1, 3, 1, '档', 3, 'down', 0.2]],
      acts: ['使用节能亮度模式', '不用时彻底关机断电', '每月清洁进风滤网'],
      tips: ['亮度调低一档画面依旧清晰且更省电', '拉好窗帘遮光可降低对亮度的需求', '投影仪待机功耗不低，看完记得断电'],
      q: ['白天用投影仪看电影，怎样做更省电？', ['拉上窗帘遮光并降低亮度档', '把亮度开到最大', '开着灯同时投影'], 0, '环境光越暗，需要的投影亮度越低，耗电也越少。']
    },
    {
      id: 'purifier', emoji: '🌿', name: '空气净化器', img: 'img/purifier.png',
      powerW: 45, a: 1, loc: '北宿2栋-406', today: '6小时', kwh: 0.16, month: 2.4, run: 6, sb: 1, pat: 'flat',
      ai: ['全天最高档', '空气质量良好时净化器仍全天最高档运行，风机持续高速耗电。', '使用自动模式，让机器按空气质量调节风量', 0.07],
      sim: [['每日开启', 2, 24, 1, '小时', 24, 'down', 0.3], ['风量档位', 1, 3, 1, '档', 3, 'down', 0.25]],
      acts: ['使用自动风量模式', '开窗通风时关闭净化器', '每两周清洗一次滤网'],
      tips: ['自动模式比固定最高档省电约 50%', '开窗时关闭，避免净化室外空气做无用功', '滤网堵塞会让风机耗电大增'],
      q: ['空气净化器最省电的使用方式是？', ['开启自动模式随空气质量调档', '24 小时开最大档', '开窗通风时也一直开着'], 0, '自动模式在空气达标时自动降档，兼顾效果与耗电。']
    },
    {
      id: 'dispenser', emoji: '🚰', name: '饮水机', img: 'img/dispenser.png',
      powerW: 420, a: 3, loc: '北宿2栋-406', today: '保温全天', kwh: 0.7, month: 8.5, run: 1.2, sb: 8, pat: 'flat',
      status: '保温中',
      ai: ['夜间反复加热', '夜间无人接水时仍反复加热保温，一天中保温耗电占比超过一半。', '睡前关闭加热开关，需要热水时提前 5 分钟开启', 0.25],
      sim: [['每日保温', 1, 24, 1, '小时', 24, 'down', 0.4], ['保温水温', 75, 95, 1, '℃', 95, 'down', 0.2]],
      acts: ['睡前关闭加热开关', '长假离校前断开电源', '每月清洗内胆除垢'],
      tips: ['反复加热是饮水机的耗电大头', '保温温度不必设到最高', '定期清洗内胆可避免二次污染'],
      q: ['饮水机最费电的情况是？', ['全天反复加热保温', '只在需要时开启加热', '用保温杯接水带走'], 0, '热水散热降温后再次加热，循环往复最费电。']
    },
    {
      id: 'ricecooker', emoji: '🍚', name: '电饭锅', img: 'img/ricecooker.png',
      powerW: 600, a: 3, loc: '楼层公共厨房', today: '30分钟', kwh: 0.2, month: 2.8, run: 0.5, sb: 0.6, pat: 'evening',
      ai: ['保温时间过长', '饭煮好后长时间处于保温状态，部分机型保温耗电接近煮饭本身。', '煮好后尽快拔电，多人份集中烹煮减少次数', 0.09],
      sim: [['每周煮饭', 2, 10, 1, '次', 10, 'down', 0.3], ['保温时长', 0, 60, 10, '分钟', 60, 'down', 0.3]],
      acts: ['煮好饭及时断电', '提前淘米浸泡缩短加热', '保持内胆底部贴合发热盘'],
      tips: ['提前泡米 10 分钟可缩短加热时间', '保温超 1 小时不如吃前再加热', '发热盘有污渍会增加耗电'],
      q: ['电饭锅省电的小技巧是？', ['提前浸泡大米并及时结束保温', '反复开盖查看饭熟没熟', '一直保温随时吃'], 0, '泡米让米粒更快熟透，及时断电避免保温耗电。']
    },
    {
      id: 'blanket', emoji: '🛏️', name: '电热毯', img: 'img/blanket.png',
      powerW: 120, a: 1, loc: '北宿2栋-406床铺', today: '2小时', kwh: 0.2, month: 3.5, run: 2, sb: 0, pat: 'night',
      ai: ['整夜高温开启', '电热毯整夜开在高温档，既浪费电也存在安全隐患。', '睡前预热 30 分钟，入睡后切低温档或定时关闭', 0.12],
      sim: [['每晚使用', 1, 10, 0.5, '小时', 10, 'down', 0.35], ['温度档位', 1, 3, 1, '档', 3, 'down', 0.3]],
      acts: ['入睡后调低温档', '离家前确认断电', '不折叠通电使用'],
      tips: ['电热毯严禁折叠通电使用', '预热后调低温档更安全省电', '不要与热水袋同时使用'],
      q: ['关于电热毯，正确且省电的用法是？', ['睡前预热，入睡后调低温档', '整夜开高温档睡', '折叠起来用更暖和'], 0, '被窝预热后维持低温即可，整夜高温既费电又危险。']
    },
    {
      id: 'nightlight', emoji: '🌙', name: '小夜灯', img: 'img/nightlight.png',
      powerW: 3, a: 1, loc: '北宿2栋-406床头', today: '整夜点亮', kwh: 0.03, month: 0.6, run: 9, sb: 0, pat: 'night',
      ai: ['天亮后仍未关闭', '早晨天亮后小夜灯经常忘记关闭，虽然功率小但积少成多。', '更换光感应或人体感应小夜灯，天亮自动熄灭', 0.02],
      sim: [['每晚点亮', 4, 12, 0.5, '小时', 12, 'down', 0.3], ['亮度档位', 1, 3, 1, '档', 3, 'down', 0.15]],
      acts: ['天亮随手关闭小夜灯', '选用感应式小夜灯', '使用 LED 光源'],
      tips: ['感应小夜灯比常亮款省电约 80%', '深夜起床短时照明即可', '优先选购带定时功能的型号'],
      q: ['小夜灯更省电的选择是？', ['人体或光感应自动开关', '24 小时常亮', '买功率最大的最亮款'], 0, '感应灯只在需要时点亮，亮灯时间大幅缩短。']
    },
    {
      id: 'console', emoji: '🎮', name: '游戏机', img: 'img/console.png',
      powerW: 150, a: 3, loc: '北宿2栋-406书桌', today: '2小时30分', kwh: 0.32, month: 5, run: 2.5, sb: 1.5, pat: 'evening',
      ai: ['待机下载', '游戏结束后主机长时间保持待机下载，待机功耗不容忽视。', '集中安排下载时段，开启省电模式，不玩时彻底断电', 0.1],
      sim: [['每日游戏', 1, 6, 0.5, '小时', 6, 'down', 0.3], ['待机时长', 0, 8, 1, '小时', 8, 'down', 0.25]],
      acts: ['不玩时关闭主机电源', '开启主机省电模式', '下载完成后退出待机'],
      tips: ['主机待机功耗可达运行时的十分之一', '休息时让主机一起休息', '离开宿舍前拔掉插排最稳妥'],
      q: ['游戏主机暂时不玩又要下载更新，较省电的做法是？', ['设置下载完成后自动关机', '一直开着想起来再关', '开着游戏挂机下载'], 0, '下载完成自动断电，避免主机长时间待机空耗。']
    },
    {
      id: 'speaker', emoji: '🔊', name: '蓝牙音箱', img: 'img/speaker.png',
      powerW: 20, a: 1, loc: '北宿2栋-406书桌', today: '3小时', kwh: 0.05, month: 0.8, run: 3, sb: 2, pat: 'evening',
      ai: ['长期蓝牙待机', '音箱使用后未关机，长时间处于蓝牙待机状态，电量被悄悄消耗。', '听完随手关机，充满电后拔掉充电器', 0.03],
      sim: [['每日播放', 1, 8, 0.5, '小时', 8, 'down', 0.25], ['音量大小', 20, 100, 10, '%', 100, 'down', 0.2]],
      acts: ['听完随手关机', '充满电及时拔线', '每月做一次充放电保养'],
      tips: ['音量开到八成即可，最大音量更耗电', '不用时关闭蓝牙可延长续航', '长期不用时保持约 50% 电量存放'],
      q: ['蓝牙音箱更省电的使用习惯是？', ['听完随手关机并拔下充电器', '一直开着等自动待机', '音量始终调到最大'], 0, '关机断电既省电又保护电池。']
    },
    {
      id: 'toothbrush', emoji: '🪥', name: '电动牙刷', img: 'img/toothbrush.png',
      powerW: 2, a: 1, loc: '楼层洗漱间', today: '充电待机', kwh: 0.01, month: 0.2, run: 0.1, sb: 23, pat: 'flat',
      status: '充电待机',
      ai: ['长期插在充电座', '一次充电可用数十天，牙刷却长期放在带电底座上持续耗电。', '电量低于 30% 再充，充满后取下，日常不插带电底座', 0.015],
      sim: [['每月充电', 1, 8, 1, '次', 8, 'down', 0.3], ['每次充电', 4, 24, 1, '小时', 24, 'down', 0.2]],
      acts: ['充满电后取下使用', '不让充电底座长期通电', '使用原装充电器'],
      tips: ['电动牙刷充一次通常可用 2-4 周', '长期浮充会缩短电池寿命', '刷头建议每 3 个月更换'],
      q: ['电动牙刷怎样充电更合理？', ['需要时再充，充满取下', '长期插在充电座上', '用到完全没电再充'], 0, '随用随充、充满取下，既省电又利于电池寿命。']
    },
    {
      id: 'powerstrip', emoji: '🔌', name: '智能插排', img: 'img/powerstrip.png',
      powerW: 1, a: 10, loc: '北宿2栋-406书桌', today: '全天供电', kwh: 0.02, month: 0.5, run: 24, sb: 0, pat: 'flat',
      status: '供电中',
      ai: ['待机电器未断电', '插排上的多个小电器长期待机，插排没有发挥集中断电的作用。', '使用带总开关的插排，离开宿舍一键切断待机电源', 0.15],
      sim: [['每日待机供电', 1, 24, 1, '小时', 24, 'down', 0.4], ['联动断电电器', 0, 5, 1, '台', 0, 'up', 0.15]],
      acts: ['离开宿舍关闭插排总开关', '充电器充满及时拔下', '大功率电器使用独立插座'],
      tips: ['一个插排集中管理，出门一键断电最省心', '插排自身几乎不耗电，但它管着的待机电器会', '不要叠接多个大功率设备'],
      q: ['离开宿舍一整天，最省心的省电做法是？', ['关闭插排总开关一键断电', '只关电器不拔插排', '把所有电器调到待机'], 0, '关闭总开关后，插排上的待机电器全部断电。']
    },
    {
      id: 'waterpurifier', emoji: '🚰', name: '净水器', img: 'img/water.png',
      powerW: 35, a: 1, loc: '北宿2栋-406水槽下', today: '制水40分钟', kwh: 0.06, month: 1.8, run: 0.6, sb: 0.5, pat: 'brief',
      ai: ['12:00 - 13:00', '午间集中制水时净水器频繁启停，滤芯长期不换会让增压泵负荷升高、更费电。', '按需制水，定期更换滤芯，夜间与外出时关闭电源', 0.02],
      sim: [['每日制水', 1, 6, 0.5, '次', 6, 'down', 0.3], ['待机时长', 0, 24, 1, '小时', 24, 'down', 0.3]],
      acts: ['按需制水不囤水', '及时更换滤芯', '长期外出关闭电源'],
      tips: ['滤芯堵塞会增大泵压，明显增加耗电', '现制现饮，无需反复加热保温', '夜间和外出时关闭电源更省电'],
      q: ['关于净水器省电，正确的做法是？', ['及时更换滤芯并减少待机', '滤芯一直不换更省钱', '24 小时开着不停制水'], 0, '滤芯堵塞会让增压泵更费力，及时更换滤芯、减少待机最省电。']
    }
  ];

  var DEVICE_CATALOG = BASE_TEMPLATES.concat(EXTRA_SPECS.map(mkAppliance));
  var catalogMap = {};
  DEVICE_CATALOG.forEach(function (t) { catalogMap[t.catId] = t; });
  var DEFAULT_ADDED = BASE_TEMPLATES.map(function (t) { return t.catId; });
  var addedIds = store.get('added', DEFAULT_ADDED.slice());
  console.log('BOOT added=' + JSON.stringify(addedIds));
  function cloneTemplate(t) { return JSON.parse(JSON.stringify(t)); }
  /* 按 addedIds 顺序从目录克隆重建在管电器（保存参数/删除均作用于 APPLIANCES 实例） */
  function syncAppliances() {
    APPLIANCES.length = 0;
    addedIds.forEach(function (id) {
      var t = catalogMap[id];
      if (t) { APPLIANCES.push(cloneTemplate(t)); }
    });
  }
  syncAppliances();

  /* 每电器月度减碳目标（kg），可在「低碳目标」弹窗修改 */
  function defaultTarget(item) { return Math.max(1, Math.round(item.ai.saveKg * 30 * 0.8)); }
  function getTarget(idx, item) {
    var all = store.get('goals', {});
    return all[idx] != null ? all[idx] : defaultTarget(item);
  }
  function setTarget(idx, kg) {
    var all = store.get('goals', {});
    all[idx] = kg;
    store.set('goals', all);
  }
  /* 该电器本月已减碳（演示：AI 建议 × 天数 × 坚持比例 + 打卡积分换算） */
  function savedKgOf(item) {
    return item.ai.saveKg * 30 * 0.6 + points * 0.02;
  }

  /* ============================================================
     AI 每日出题题库（15 道；配置 DeepSeek Key 后优先让 AI 出题）
     ============================================================ */
  var QUIZ_BANK = [
    { q: '空调制冷时，温度每调高 1℃，大约可以省电多少？', opts: ['约 7%', '约 20%', '几乎不省电'], ans: 0, why: '每调高 1℃ 约省电 7%，26℃ 是舒适与节能的平衡点。' },
    { q: '夏天空调设置多少度左右，舒适与节能最平衡？', opts: ['22℃', '26℃', '30℃'], ans: 1, why: '26℃ 左右既能保证舒适，又比低温设置明显省电。' },
    { q: '下列哪种空调使用习惯更省电？', opts: ['整夜低温运行', '搭配定时关闭', '频繁开关机降温'], ans: 1, why: '定时在凌晨自动关闭，可避免睡着后整夜高功率运行。' },
    { q: '空调滤网积灰会怎样？', opts: ['更省电', '影响制冷、更费电', '没有影响'], ans: 1, why: '积灰堵塞风道，换热效率下降、耗电上升，建议每月清洗。' },
    { q: '热水器怎样使用更省电？', opts: ['全天通电保温', '用完及时断电', '水温一直设 65℃'], ans: 1, why: '保温过程持续散热耗电，用完断电、用前加热更省电。' },
    { q: '夏季热水器水温可怎样调整？', opts: ['适当调低约 5℃', '调到最高', '不用调整'], ans: 0, why: '夏季自来水温度高，适当调低目标水温可减少加热耗电。' },
    { q: '电热水器定期除垢的好处是？', opts: ['更好看', '提升加热效率、省电', '水量变大'], ans: 1, why: '水垢会阻碍热交换，定期除垢能恢复加热效率。' },
    { q: '热水器避开以下哪个时段更好？', opts: ['18:00-21:00 用电高峰', '凌晨 2:00-5:00', '中午 12:00'], ans: 0, why: '晚高峰电网负荷大，错峰使用既减碳又更安全。' },
    { q: '电脑长时间不用时，最省电的状态是？', opts: ['开启屏保', '休眠 / 睡眠', '锁屏但保持运行'], ans: 1, why: '休眠会挂起系统，功耗接近关机；屏保仍在全速运行。' },
    { q: '电脑屏幕亮度降低 20%，大约可省电？', opts: ['约 10%', '约 50%', '不省电'], ans: 0, why: '屏幕是笔记本耗电大户，降低亮度约可省电 10%。' },
    { q: '充电器不使用时应该怎么做？', opts: ['一直插着', '拔下电源', '用湿毛巾盖住'], ans: 1, why: '充电器空载仍有待机损耗，长期插着还存在安全隐患。' },
    { q: '同样亮度下，LED 灯比白炽灯约省电多少？', opts: ['80% 以上', '约 10%', '更费电'], ans: 0, why: 'LED 电光转换效率远高于白炽灯，可省电 80% 以上。' },
    { q: '白天采光充足时，更低碳的做法是？', opts: ['开灯照明', '利用自然光、少开灯', '开空调开灯'], ans: 1, why: '白天充分利用自然光，可直接减少照明用电。' },
    { q: '宿舍用电产生 CO₂，主要是因为？', opts: ['电器会呼吸', '发电环节（如火电）排放 CO₂', '电线漏电'], ans: 1, why: '我国电力中仍有较大比例来自火电，每用 1 度电约排放 0.58kg CO₂。' },
    { q: '1 度电大约相当于排放多少 CO₂（华中区域电网因子）？', opts: ['约 0.58 kg', '约 5.8 kg', '几乎为 0'], ans: 0, why: '华中区域电网排放因子约为 0.58 kgCO₂/度。' },
    { q: '下列哪项属于低碳行为？', opts: ['人走灯灭', '空调 22℃ 盖被子', '电脑通宵下载'], ans: 0, why: '人走灯灭可直接避免无效照明耗电。' },
    { q: '家用电器的「待机功耗」会发生在什么时候？', opts: ['插头通电但未开机', '完全断电后', '报废之后'], ans: 0, why: '遥控器关机后电器仍有待机功耗，长期下来积少成多。' }
  ];
  var QUIZ_PER_DAY = 15;

  /* 每日答题进度与连胜（多邻国式 streak） */
  function getDaily() {
    var t = todayStr();
    var d = store.get('daily', null);
    if (!d || d.date !== t) {
      d = { date: t, answered: 0, correct: 0, finished: false, order: null };
      store.set('daily', d);
    }
    return d;
  }
  function getStreak() {
    var d = getDaily();
    var s = store.get('streak', { days: 0, lastDate: '' });
    if (d.finished && s.lastDate !== d.date) {
      s.days = (s.lastDate === yesterdayStr()) ? s.days + 1 : 1;
      s.lastDate = d.date;
      store.set('streak', s);
    }
    return s.days;
  }
  /* 今日 15 题：从题库按日期种子洗牌抽取 */
  function todayQuestions() {
    var d = getDaily();
    if (!d.order) {
      var seed = 0;
      for (var i = 0; i < d.date.length; i++) { seed = (seed * 31 + d.date.charCodeAt(i)) >>> 0; }
      var idx = QUIZ_BANK.map(function (_, k) { return k; });
      for (var j = idx.length - 1; j > 0; j--) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        var k = seed % (j + 1);
        var tmp = idx[j]; idx[j] = idx[k]; idx[k] = tmp;
      }
      d.order = idx.slice(0, QUIZ_PER_DAY);
      store.set('daily', d);
    }
    return d.order.map(function (k) { return QUIZ_BANK[k]; });
  }

  /* ============================================================
     看板页 · 双列网格渲染 + 随机错峰轮播
     ============================================================ */
  var grid = document.getElementById('appGrid');
  var timers = [];

  function rotateMetric(card, item) {
    var label = card.querySelector('.metric-label');
    var val = card.querySelector('.metric-val');
    var current = label.textContent;
    var others = METRICS.filter(function (m) { return m.k !== current; });
    var next = others[Math.floor(Math.random() * others.length)];
    card.classList.add('flip');
    setTimeout(function () {
      label.textContent = next.k;
      val.textContent = item[next.key];
      card.classList.remove('flip');
    }, 180);
    timers.push(setTimeout(function () { rotateMetric(card, item); }, 2600 + Math.random() * 3200));
  }

  function renderGrid() {
    APPLIANCES.forEach(function (item, idx) {
      var card = document.createElement('article');
      card.className = 'app-card';
      card.dataset.idx = idx;
      card.innerHTML =
        '<div class="app-pic"><span class="pic-emoji">' + (item.emoji || '🔌') + '</span>' +
        '<img src="' + item.img + '" alt="' + item.name + '" onerror="this.parentNode.classList.add(\'no-img\')"></div>' +
        '<div class="app-info">' +
        '  <p class="app-name">' + item.name + '</p>' +
        '  <div class="app-metric">' +
        '    <span class="metric-label"></span>' +
        '    <span class="metric-val"></span>' +
        '  </div>' +
        '</div>';
      grid.appendChild(card);

      var m0 = METRICS[Math.floor(Math.random() * METRICS.length)];
      card.querySelector('.metric-label').textContent = m0.k;
      card.querySelector('.metric-val').textContent = item[m0.key];

      /* 每张卡片随机起始时间与随机间隔，错峰轮播 */
      timers.push(setTimeout(function () { rotateMetric(card, item); }, 1200 + Math.random() * 2400));
    });
    if (!APPLIANCES.length) {
      grid.innerHTML = '<div class="grid-empty">暂无电器，点击下方「添加设备」开始记录用电</div>';
    }
  }

  /* 删除/编辑设备后清空轮播定时器并重建网格 */
  function rerenderGrid() {
    timers.forEach(function (tm) { clearTimeout(tm); });
    timers = [];
    grid.innerHTML = '';
    renderGrid();
    updateOverview();
  }

  /* 概览卡月度数据随在管设备动态汇总（默认 4 款时恰为 38 度 / 22.04 KG） */
  function updateOverview() {
    var total = sumArr(APPLIANCES.map(function (a) { return parseFloat(a.month) || 0; }));
    var numEl = document.querySelector('.ov-num');
    var kgEl = document.querySelector('.ov-carbon');
    if (numEl) { numEl.textContent = total % 1 === 0 ? total : (Math.round(total * 10) / 10).toString(); }
    if (kgEl) { kgEl.textContent = '约 ' + (Math.round(total * KG_PER_KWH * 100) / 100) + ' KG 碳排放量'; }
  }

  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.app-card');
    if (!card) return;
    openDetail(parseInt(card.dataset.idx, 10));
  });

  /* ============================================================
     覆盖页动画引擎（详情 / 宿舍 / 答题）
     · morph：整张页面从来源卡片「放大/缩小」（类似聊天界面点开图片）
     · slide：自右向左推入（答题页）
     · 左边缘热区右滑 = 系统风格侧滑跟手返回
     该 WebView 的 transform（WAAPI 与 rAF 内联）合成中间帧不上屏，
     改用主线程布局属性：morph 用 zoom（X 缩放）+ 等比高度补偿，
     slide 用 left 百分比；rAF 逐帧写值逐帧布局重绘，稳定显示。
     ============================================================ */
  var pageDetail = document.getElementById('pageDetail');
  var detailBody = document.getElementById('detailBody');
  var pageDorm = document.getElementById('pageDorm');
  var dormBody = document.getElementById('dormBody');
  var pageQuiz = document.getElementById('pageQuiz');
  var quizBody = document.getElementById('quizBody');
  var pageAdd = document.getElementById('pageAdd');
  var addBody = document.getElementById('addBody');
  var pageAi = document.getElementById('pageAi');
  var aiBody = document.getElementById('aiBody');
  var pageMall = document.getElementById('pageMall');
  var mallBody = document.getElementById('mallBody');

  var detailOpen = false;
  var dormOpen = false;
  var quizOpen = false;
  var addOpen = false;
  var sheet = null;           // 当前覆盖页 { el, p, raf, gen }

  function easeOutCubic(k) { return 1 - Math.pow(1 - k, 3); }
  function easeInOut(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }

  /* p：0 = 全屏，1 = 屏外右侧（安卓16 标准右入侧滑） */
  function applySheet(s, p) {
    var el = s.el;
    /* 显式定宽 + 只改 left：left 百分比逐帧变化即真实平移。
       若只设 left 而保留 inset 的 right:0，元素宽度会被压缩为 0，
       页面逐帧回流成「挤压展开」而非平移，故必须固定 width */
    el.style.width = window.innerWidth + 'px';
    el.style.right = 'auto';
    el.style.left = (p * 100) + '%';
  }
  function clearSheet(s) {
    /* 兼容两种入参：sheet 对象 {el} 或页面元素本身——
       deleteAppliance/closeDetail/finalizeAi 直接传元素，若按 s.el 取会抛
       TypeError 中断关闭流程，导致详情页卡死无法返回 */
    var el = (s && s.el) ? s.el : s;
    if (!el || !el.style) { return; }
    var st = el.style;
    st.left = '';
    st.right = '';
    st.width = '';
    st.height = '';
    st.transform = '';
    st.transformOrigin = '';
  }
  function cancelSheetAnim(s) {
    if (s.raf) { s.gen++; cancelAnimationFrame(s.raf); s.raf = 0; }
  }
  function animSheet(s, to, dur, ease, done) {
    cancelSheetAnim(s);
    var from = s.p, gen = s.gen, t0 = performance.now();
    function step(now) {
      if (s.gen !== gen) { return; }
      var k = Math.min(1, (now - t0) / dur);
      s.p = from + (to - from) * ease(k);
      applySheet(s, s.p);
      if (k < 1) { s.raf = requestAnimationFrame(step); }
      else { s.raf = 0; s.p = to; if (done) { done(); } }
    }
    s.raf = requestAnimationFrame(step);
  }

  /* 右入侧滑（安卓16 规范）：屏外右侧 → 全屏，done 在落位后回调 */
  function openSlide(el, done) {
    el.style.height = window.innerHeight + 'px';
    el.scrollTop = 0;
    var s = { el: el, p: 1, raf: 0, gen: 0 };
    sheet = s;
    applySheet(s, 1);
    void el.offsetHeight;   /* 强制先落一帧起点态 */
    animSheet(s, 0, 300, easeOutCubic, done);
  }
  function finalizeSheet(s) {
    cancelSheetAnim(s);
    clearSheet(s);
    if (s.el === pageDetail) { finalizeDetail(); }
    else if (s.el === pageDorm) { finalizeDorm(); }
    else if (s.el === pageQuiz) { finalizeQuiz(); }
    else if (s.el === pageAdd) { finalizeAdd(); }
    else if (s.el === pageMall) { finalizeMall(); }
    else if (s.el === pageAi) { finalizeAi(); }
  }
  /* 提交关闭：从当前进度动画到起点，再隐藏 */
  function commitSheet(s, dur) {
    if (!s) { return; }
    if (s.el === pageDetail) { setFabs(false); }
    sheet = null;
    animSheet(s, 1, dur || 280, easeInOut, function () { finalizeSheet(s); });
  }

  /* 详情页底部悬浮按钮：固定定位不随页面平移，故滑入落位后才显示 */
  function setFabs(on) {
    var f = detailBody.querySelector('.detail-fabs');
    if (f) { f.classList.toggle('show', !!on); }
  }

  /* ---------- 左边缘侧滑跟手（系统风格） ---------- */
  var EDGE = 28;
  function bindFollow(el, isOpen) {
    var g = { edge: false, lock: null, ignore: false, startX: 0, startY: 0, t0: 0, x: 0, lastX: 0, lastT: 0, vx: 0 };
    el.addEventListener('touchstart', function (e) {
      if (!isOpen() || !sheet || sheet.el !== el) { return; }
      var t = e.touches[0];
      g.edge = t.clientX <= EDGE;
      g.lock = null;
      g.ignore = !!(e.target.closest &&
        e.target.closest('input, button, a, select, textarea'));
      g.startX = t.clientX; g.startY = t.clientY;
      g.x = 0; g.lastX = 0; g.vx = 0; g.lastT = Date.now(); g.t0 = g.lastT;
      if (g.edge && !g.ignore) { cancelSheetAnim(sheet); }
    }, { passive: true });

    el.addEventListener('touchmove', function (e) {
      if (!isOpen() || !g.edge || g.ignore || !sheet || sheet.el !== el) { return; }
      var t = e.touches[0];
      var dx = t.clientX - g.startX, dy = t.clientY - g.startY;
      if (g.lock === null) {
        if (Math.abs(dx) > 9 || Math.abs(dy) > 9) {
          g.lock = (Math.abs(dx) > Math.abs(dy) + 3) ? 'x' : 'y';
        }
      }
      if (g.lock !== 'x') { return; }
      e.preventDefault();
      var ddx = Math.max(0, dx);
      var now = Date.now(), dt = now - g.lastT;
      if (dt > 0) { g.vx = 0.6 * g.vx + 0.4 * ((ddx - g.lastX) / dt); }
      g.lastT = now; g.lastX = ddx; g.x = ddx;
      sheet.p = Math.min(1, ddx / (window.innerWidth * 0.55));
      applySheet(sheet, sheet.p);
    }, { passive: false });

    function end() {
      if (!isOpen() || !g.edge || g.ignore || g.lock !== 'x') { g.lock = null; return; }
      g.lock = null;
      if (!sheet) { return; }
      var p = sheet.p;
      /* 松手判定：位移超阈值，或全程平均速度足够快且拖出足够距离（真机手指） */
      var avgV = g.x / Math.max(1, Date.now() - g.t0);
      var fast = avgV > 0.6 && g.x > 80;
      if (p > 0.28 || fast) { commitSheet(sheet); }
      else { animSheet(sheet, 0, 240, easeOutCubic); }
    }
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
  }
  bindFollow(pageDetail, function () { return detailOpen; });
  bindFollow(pageDorm, function () { return dormOpen; });
  bindFollow(pageQuiz, function () { return quizOpen; });
  bindFollow(pageAdd, function () { return addOpen; });
  bindFollow(pageAi, function () { return aiOpen; });
  bindFollow(pageMall, function () { return mallOpen; });

  function openDetail(idx, opts) {
    /* 重入保护：任一覆盖页开着（含关闭动画期间 flag 未落）时忽略，
       防止孤儿 finalizeSheet 把新打开的详情页砍掉造成状态漂移 */
    if (detailOpen || dormOpen || quizOpen || addOpen || aiOpen) { return; }
    var item = APPLIANCES[idx];
    if (!item) { return; }
    var kg = (item.kwhToday * KG_PER_KWH).toFixed(1);
    var cost = (item.kwhToday * PRICE_PER_KWH).toFixed(1);
    var running = item.status === '运行中';
    detailBody.dataset.idx = idx;
    detailBody.innerHTML =
      '<div class="detail-hero">' +
      '  <div class="hero-icon"><span class="pic-emoji">' + (item.emoji || '🔌') + '</span><img src="' + item.img + '" alt="' + item.name + '" onerror="this.parentNode.classList.add(\'no-img\')"></div>' +
      '  <div class="hero-info">' +
      '    <p class="hero-name">' + item.name + '</p>' +
      '    <p class="hero-status"><span class="status-dot ' + (running ? 'on' : 'idle') + '"></span>' +
               item.status + ' · 实时功率 <b>' + item.powerW + 'W</b></p>' +
      '  </div>' +
      '</div>' +
      '<div class="hero-stats">' +
      '  <div class="hstat"><span class="hs-label">今日碳排</span><span class="hs-val">' + kg + '<em>kg</em></span></div>' +
      '  <div class="hstat"><span class="hs-label">今日电费</span><span class="hs-val">' + cost + '<em>元</em></span></div>' +
      '  <div class="hstat"><span class="hs-label">运行时长</span><span class="hs-val">' + fmtH(item.runH) + '<em>h</em></span></div>' +
      '  <div class="hstat"><span class="hs-label">待机时长</span><span class="hs-val">' + fmtH(item.standbyH) + '<em>h</em></span></div>' +
      '</div>' +
      '<div class="detail-cards">' +
      aiCard(item) +
      '<div class="usage-zone">' + usageCard(item, idx) + carbonCard(item, idx) + '</div>' +
      actsCard(item, idx) +
      '</div>' +
      detailFabsHTML(false);
    pageDetail.classList.add('open');
    pageDetail.scrollTop = 0;
    detailOpen = true;
    if (window.TankanBridge) { window.TankanBridge.setDetailOpen(true); }

    /* 右入侧滑（安卓16）；底部悬浮按钮等页面落位后再显示 */
    openSlide(pageDetail, function () {
      setFabs(true);
      if (opts && opts.focusActs) { focusActsCard(); }
    });
  }

  /* 「我的 → 电器智能打卡」跳转：滚到「低碳行为打卡」卡并高亮两次 */
  function focusActsCard() {
    var el = detailBody.querySelector('.acts-card');
    if (!el) { return; }
    var from = pageDetail.scrollTop;
    var to = Math.max(0, from + el.getBoundingClientRect().top -
      pageDetail.getBoundingClientRect().top - Math.round(window.innerHeight * 0.18));
    var t0 = Date.now(), dur = 420;
    (function step() {
      var p = Math.min(1, (Date.now() - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      pageDetail.scrollTop = from + (to - from) * e;
      if (p < 1) { requestAnimationFrame(step); return; }
      el.classList.remove('flash');
      void el.offsetHeight;
      el.classList.add('flash');
      setTimeout(function () { el.classList.remove('flash'); }, 2000);
    })();
  }

  function finalizeDetail() {
    detailOpen = false;
    delete detailBody.dataset.idx;   /* 防止 getCurrentDetailIdx 返回陈旧索引删错设备 */
    setFabs(false);
    pageDetail.classList.remove('open');
    if (window.TankanBridge) { window.TankanBridge.setDetailOpen(false); }
    /* 从「我的」的电器智能打卡进入详情：返回时刷新打卡状态与记录 */
    if (pageMineEl.classList.contains('show')) {
      var keep = pageMineEl.scrollTop;
      renderMine();
      pageMineEl.scrollTop = keep;
    }
  }

  /* 供原生返回按钮 / 系统返回键调用：缩小回卡片后关闭 */
  window.requestCloseDetail = function () {
    if (detailOpen && sheet) { commitSheet(sheet); }
  };
  /* 兜底：立即关闭（无动画） */
  window.closeDetail = function () {
    if (detailOpen) {
      if (sheet) { cancelSheetAnim(sheet); sheet = null; }
      finalizeDetail();
      clearSheet(pageDetail);
    }
  };

  function fmtH(v) { return (Math.round(v * 10) / 10).toString(); }
  function slotRange(i) {
    return SLOT_TIMES[i] + ' - ' + (i === SLOT_TIMES.length - 1 ? '24:00' : SLOT_TIMES[i + 1]);
  }

  function card(title, inner) {
    return '<div class="card dcard"><p class="dcard-title">' + title + '</p>' + inner + '</div>';
  }

  /* ============================================================
     用电详情（今天 / 本周 / 本月 合并卡，iOS 屏幕使用时间风格：
     顶部汇总大数值 + 圆角竖柱 + 虚线网格 + 右侧纵轴 + 底部时间轴）
     ============================================================ */
  var USAGE_TABS = [
    { key: 'today', label: '今天' },
    { key: 'week', label: '本周' },
    { key: 'month', label: '本月' }
  ];
  var usageTab = {};   // idx -> 当前 tab

  function monthTotalKwh(item) {
    var v = parseFloat(item.month);
    return isNaN(v) ? item.kwhToday * 30 : v;
  }
  function sumArr(arr) { return arr.reduce(function (a, b) { return a + b; }, 0); }
  function fmt1(v) { return (Math.round(v * 10) / 10).toString(); }
  function fmtAxis(v) { return (Math.round(v * 100) / 100).toString(); }
  function niceMax(maxV) {
    var steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
    for (var i = 0; i < steps.length; i++) { if (maxV <= steps[i]) { return steps[i]; } }
    return Math.ceil(maxV / 50) * 50;
  }
  function hourLabel(h) { return (h < 10 ? '0' + h : '' + h) + ':00'; }

  /* 今日 24 小时用电（度/小时）：以 slots 的 3 小时分布为权重，
     用确定性抖动细分到小时，归一化使全天总量 = kwhToday */
  function todaySeries(item, idx) {
    var sumSlots = sumArr(item.slots) || 1;
    var rand = rng(1000 + idx * 37);
    var raw = [];
    for (var s = 0; s < 8; s++) {
      var share = item.slots[s] / sumSlots;
      var weights = [], ws = 0, h, k, j;
      for (h = 0; h < 3; h++) {
        j = 0.55 + rand() * 0.9;
        weights.push(j); ws += j;
      }
      for (k = 0; k < 3; k++) { raw.push(share * weights[k] / ws); }
    }
    var total = sumArr(raw) || 1;
    return raw.map(function (v) { return v / total * item.kwhToday; });
  }

  /* 本周 7 日：保留 trend 起伏形状，日均对齐本月日均，避免与月总量矛盾 */
  function weekSeries(item) {
    var mean = sumArr(item.trend) / item.trend.length || 1;
    var daily = monthTotalKwh(item) / 30;
    return item.trend.map(function (v) { return v / mean * daily; });
  }

  /* 本月 30 日：trend 周期形状 + 确定性抖动，归一化到月总量 */
  function monthSeries(item, idx) {
    var mean = sumArr(item.trend) / item.trend.length || 1;
    var rand = rng(3000 + idx * 53);
    var raw = [], d;
    for (d = 0; d < 30; d++) {
      raw.push(item.trend[d % 7] / mean * (0.82 + rand() * 0.36));
    }
    var total = sumArr(raw) || 1;
    var target = monthTotalKwh(item);
    return raw.map(function (v) { return v / total * target; });
  }

  function buildUsage(item, idx, key) {
    var vals, times, labels, bigLabel, bigVal, bigSub, note;
    var badIdx = [], mean, thr, i;
    if (key === 'week') {
      vals = weekSeries(item);
      mean = sumArr(vals) / vals.length;
      thr = mean * 1.2;
      vals.forEach(function (v, k) { if (v >= thr) { badIdx.push(k); } });
      labels = vals.map(function (_, k) { return '周' + DAY_LABELS[k]; });
      times = vals.map(function (_, k) {
        return { label: labels[k], p: (k + 0.5) / vals.length * 100 };
      });
      bigLabel = '本周用电';
      bigVal = fmt1(sumArr(vals));
      bigSub = '日均 ' + fmt1(mean) + ' 度 · 累计排放 ' + fmt1(sumArr(vals) * KG_PER_KWH) + ' kg CO₂';
      if (badIdx.length) {
        var bi = 0;
        vals.forEach(function (v, k) { if (v > vals[bi]) { bi = k; } });
        note = '<p class="u-note bad">⚠ 周' + DAY_LABELS[bi] + ' 用电最高（' + fmt1(vals[bi]) +
               ' 度），较日均多排约 <b>' + fmt1((vals[bi] - mean) * KG_PER_KWH) + 'kg</b> CO₂</p>';
      } else {
        note = '<p class="u-note ok">近 7 日用电平稳，保持得不错。</p>';
      }
    } else if (key === 'month') {
      vals = monthSeries(item, idx);
      mean = sumArr(vals) / vals.length;
      thr = mean * 1.3;
      var extraM = 0;
      vals.forEach(function (v, k) { if (v >= thr) { badIdx.push(k); extraM += v - mean; } });
      labels = vals.map(function (_, k) { return (k + 1) + '日'; });
      times = [
        { label: '1日', p: 0.5 / 30 * 100 },
        { label: '15日', p: 14.5 / 30 * 100 },
        { label: '30日', p: 29.5 / 30 * 100 }
      ];
      bigLabel = '本月用电';
      bigVal = fmt1(sumArr(vals));
      bigSub = '日均 ' + fmt1(mean) + ' 度 · 累计排放 ' + fmt1(sumArr(vals) * KG_PER_KWH) + ' kg CO₂';
      note = badIdx.length
        ? '<p class="u-note bad">⚠ 本月有 <b>' + badIdx.length + '</b> 天用电高于常态，多排约 <b>' +
          fmt1(extraM * KG_PER_KWH) + 'kg</b> CO₂</p>'
        : '<p class="u-note ok">本月用电平稳，没有发现异常波动。</p>';
    } else {
      vals = todaySeries(item, idx);
      mean = sumArr(vals) / vals.length;
      thr = mean * 1.8;
      var extraT = 0;
      vals.forEach(function (v, k) { if (v >= thr) { badIdx.push(k); extraT += v - mean; } });
      labels = vals.map(function (_, k) { return hourLabel(k) + ' - ' + hourLabel(k + 1); });
      times = [
        { label: '0:00', p: 0.5 / 24 * 100 },
        { label: '12:00', p: 12.5 / 24 * 100 }
      ];
      bigLabel = '今日用电';
      bigVal = fmt1(item.kwhToday);
      bigSub = '相当于排放 ' + fmt1(item.kwhToday * KG_PER_KWH) + ' kg CO₂ · 电费 ' +
               fmt1(item.kwhToday * PRICE_PER_KWH) + ' 元';
      if (badIdx.length && extraT * KG_PER_KWH >= 0.02) {
        var ranges = [];
        var s0 = badIdx[0], prev = s0;
        for (i = 1; i <= badIdx.length; i++) {
          if (i < badIdx.length && badIdx[i] === prev + 1) { prev = badIdx[i]; continue; }
          ranges.push(hourLabel(s0) + ' - ' + hourLabel(prev + 1));
          if (i < badIdx.length) { s0 = badIdx[i]; prev = s0; }
        }
        note = '<p class="u-note bad">⚠ ' + ranges.join('、') + ' 用电异常偏高，该时段多排约 <b>' +
               fmt1(extraT * KG_PER_KWH) + 'kg</b> CO₂</p>';
      } else {
        note = '<p class="u-note ok">今日各时段用电平稳，没有发现异常。</p>';
      }
    }
    return { vals: vals, times: times, labels: labels, bigLabel: bigLabel, bigVal: bigVal,
             bigSub: bigSub, badIdx: badIdx, note: note };
  }

  /* 用电详情合并卡：header 内 今天/本周/本月 分段切换 */
  function usageCard(item, idx) {
    var key = usageTab[idx] || 'today';
    var d = buildUsage(item, idx, key);
    var top = niceMax(Math.max.apply(null, d.vals) * 1.08);
    var seg = USAGE_TABS.map(function (t) {
      return '<button class="useg' + (t.key === key ? ' active' : '') +
        '" data-act="usage-tab" data-tab="' + t.key + '">' + t.label + '</button>';
    }).join('');
    var bars = d.vals.map(function (v, k) {
      var h = Math.max(2.5, v / top * 100);
      return '<i class="u-bar' + (d.badIdx.indexOf(k) >= 0 ? ' bad' : '') +
        '" style="height:' + h.toFixed(1) + '%"></i>';
    }).join('');
    var times = d.times.map(function (t) {
      return '<span style="left:' + t.p.toFixed(2) + '%">' + t.label + '</span>';
    }).join('');
    /* 拖动取数：labels/vals 供手指滑过柱条时弹气泡（单引号包 JSON，内部只有双引号） */
    var labelsJson = JSON.stringify(d.labels || []);
    var valsJson = JSON.stringify(d.vals.map(function (v) { return Math.round(v * 100) / 100; }));
    return '<div class="card dcard usage-card">' +
      '<div class="uc-head"><p class="dcard-title">用电详情</p>' +
      '<div class="usage-seg">' + seg + '</div></div>' +
      '<div class="u-big"><p class="ub-label">' + d.bigLabel + '</p>' +
      '<p class="ub-val">' + d.bigVal + '<em>度</em></p>' +
      '<p class="ub-sub">' + d.bigSub + '</p></div>' +
      '<div class="u-chart">' +
      '<div class="u-plot">' +
      '<span class="u-gl top"></span><span class="u-gl mid"></span>' +
      '<div class="u-bars ' + key + '" data-labels=\'' + labelsJson + '\' data-vals=\'' + valsJson + '\'>' + bars + '</div>' +
      '<div class="u-tip" style="display:none"></div>' +
      '</div>' +
      '<div class="u-axis"><span>' + fmtAxis(top) + '<em>度</em></span>' +
      '<span>' + fmtAxis(top / 2) + '<em>度</em></span><span>0<em>度</em></span></div>' +
      '</div>' +
      '<div class="u-times' + (key === 'week' ? ' week' : '') + '">' + times + '</div>' +
      d.note + '</div>';
  }

  /* 碳排放卡：用碳量 / 减碳量（随用电卡的 tab 联动统计周期） */
  function carbonCard(item, idx) {
    var key = usageTab[idx] || 'today';
    var kwh, days, period;
    if (key === 'week') { kwh = sumArr(weekSeries(item)); days = 7; period = '本周'; }
    else if (key === 'month') { kwh = monthTotalKwh(item); days = 30; period = '本月'; }
    else { kwh = item.kwhToday; days = 1; period = '今日'; }
    var useKg = kwh * KG_PER_KWH;
    /* 减碳量：AI 建议每日可减 × 天数 × 坚持比例 0.6，加打卡/答题积分换算（每积分约 0.02kg） */
    var saveKg = item.ai.saveKg * days * 0.6 + points * 0.02;
    var km = saveKg / 0.19;   /* 私家车每公里约 0.19kg CO₂ */
    var kmText = km < 1 ? Math.round(km * 1000) + ' 米' : fmt1(km) + ' 公里';
    return '<div class="card dcard">' +
      '<p class="dcard-title">碳排放</p>' +
      '<div class="cb-grid">' +
      '<div class="cb-item use"><span class="cb-cap">用碳量 · ' + period + '</span>' +
      '<span class="cb-num">' + fmt1(useKg) + '<em>kg CO₂</em></span>' +
      '<span class="cb-desc">用电 ' + fmt1(kwh) + ' 度 · 电费 ' + fmt1(kwh * PRICE_PER_KWH) + ' 元</span></div>' +
      '<div class="cb-item save"><span class="cb-cap">减碳量 · ' + period + '</span>' +
      '<span class="cb-num">' + fmt1(saveKg) + '<em>kg CO₂</em></span>' +
      '<span class="cb-desc">≈ 少开私家车 ' + kmText + '</span></div>' +
      '</div>' +
      '<p class="cb-tip">💡 坚持 AI 建议与低碳打卡，' + period + '预计还可再减约 <b>' +
      fmt1(item.ai.saveKg * days * 0.4) + 'kg</b> CO₂</p>' +
      '</div>';
  }

  /* ============================================================
     行动模块状态：碳积分 / 答题 / 打卡 / 提醒（本次运行内有效）
     ============================================================ */
  var points = store.get('points', 0);   // 碳积分（localStorage 持久化，可兑换商城好礼）
  var quizDone = {};      // idx -> true（已答对/已作答，不可重复得分）
  var checkinSet = store.get('checkin_set', {});   // key catId + '|' + 行为名 -> true（手动打卡）
  var reminderSet = {};   // idx -> true（AI 提醒已设置）

  function addPoints(n) {
    points = Math.max(0, points + n);
    store.set('points', points);
  }

  /* ---------- 绿色打卡（低碳校园「绿色打卡」整合） ---------- */
  var CHECKIN_TASKS = [
    { id: 'bike',   icon: '🚲', name: '骑行上学', pts: 10, kg: 2.0,  cat: '出行' },
    { id: 'light',  icon: '💡', name: '随手关灯', pts: 2,  kg: 0.1,  cat: '节约用电' },
    { id: 'plate',  icon: '🍚', name: '光盘行动', pts: 5,  kg: 0.2,  cat: '饮食' },
    { id: 'cup',    icon: '🥤', name: '自带水杯', pts: 3,  kg: 0.1,  cat: '饮食' },
    { id: 'stairs', icon: '🏃', name: '爬楼',     pts: 3,  kg: 0.05, cat: '出行' }
  ];
  var checkinLog = store.get('checkins', []);   // [{name, pts, kg, cat, ts}] 新记录在前

  function dateStrOf(t) {
    var d = new Date(t);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function hmOf(t) {
    var d = new Date(t);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  /* 本周起始日（周一）字符串 */
  function weekStartStr() {
    var d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return dateStrOf(d.getTime());
  }
  function pushCheckin(name, pts, kg, cat) {
    checkinLog.unshift({ name: name, pts: pts, kg: kg, cat: cat, ts: Date.now() });
    if (checkinLog.length > 80) { checkinLog.length = 80; }
    store.set('checkins', checkinLog);
  }
  /* 今日已完成的绿色任务 id */
  function todayTaskIds() {
    var day = todayStr(), ids = {};
    checkinLog.forEach(function (r) { if (dateStrOf(r.ts) === day) { ids[r.name] = true; } });
    return ids;
  }
  /* 本周打卡记录（周一至今） */
  function weekLog() {
    var ws = weekStartStr();
    return checkinLog.filter(function (r) { return dateStrOf(r.ts) >= ws; });
  }
  /* 上周打卡记录（用于碳周报「较上周」对比） */
  function prevWeekLog() {
    var end = new Date(weekStartStr().replace(/-/g, '/')).getTime();
    var start = end - 7 * 86400000;
    return checkinLog.filter(function (r) { return r.ts >= start && r.ts < end; });
  }

  /* Resource/icons 描边图标（描边色由 CSS 的 currentColor 提供） */
  var ICON_BOT = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M11 18V21C11 21.5 10.6 22 10 22C9.4 22 9 21.5 9 21V18H11Z" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M15 18V21C15 21.5 14.6 22 14 22C13.4 22 13 21.5 13 21V18H15Z" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M17 11V16C17 17.1 16.1 18 15 18H9C7.9 18 7 17.1 7 16V11C7 9.9 7.9 9 9 9H15C16.1 9 17 9.9 17 11Z" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M5 11V15C5 15.6 4.6 16 4 16C3.4 16 3 15.6 3 15V11C3 10.4 3.4 10 4 10C4.6 10 5 10.4 5 11Z" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M21 11V15C21 15.6 20.6 16 20 16C19.4 16 19 15.6 19 15V11C19 10.4 19.4 10 20 10C20.6 10 21 10.4 21 11Z" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M13 18H11" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M9.6 7H14.4C15.3 7 16 6.25 16 5.28571C16 2.92857 14.2 1 12 1C9.8 1 8 2.92857 8 5.28571C8 6.25 8.7 7 9.6 7Z" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
  var ICON_TREE = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M16.1698 10.0603H7.82982C6.64982 10.0603 6.23983 9.27031 6.92983 8.31031L11.0998 2.47031C11.5898 1.77031 12.4099 1.77031 12.8899 2.47031L17.0598 8.31031C17.7598 9.27031 17.3498 10.0603 16.1698 10.0603Z" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M18.7798 15.6705C19.7098 16.9505 19.1698 18.0005 17.5898 18.0005H6.41986C4.83986 18.0005 4.29985 16.9505 5.22985 15.6705L9.21984 10.0605H14.7899L16.1699 12.0005" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M12 22V18" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  /* 详情页底部悬浮按钮（智能建议 / 低碳目标） */
  function detailFabsHTML(shown) {
    return '<div class="detail-fabs' + (shown ? ' show' : '') + '">' +
      '<button class="dfab" data-act="ai-chat">' + ICON_BOT + '智能建议</button>' +
      '<button class="dfab goal" data-act="goal">' + ICON_TREE + '低碳目标</button>' +
      '</div>';
  }

  /* 卡片3：AI 诊断（现象 + 原因 + 可执行建议）；操作入口移至底部悬浮按钮 */
  function aiCard(item) {
    return '<div class="card dcard ai-card">' +
      '<p class="dcard-title"><span class="ai-badge">✦ AI 诊断</span></p>' +
      '<p class="ai-window"><span class="ai-warn">⚠</span> ' + item.ai.windowText + ' 功率异常</p>' +
      '<p class="ai-cause">' + item.ai.cause + '</p>' +
      '<div class="ai-action"><span class="ai-tag">建议</span>' + item.ai.action + '</div>' +
      '<p class="ai-save">预计按建议调整后，明天可减少 <b>' + item.ai.saveKg.toFixed(2) + 'kg</b> CO₂</p>' +
      '</div>';
  }

  /* 模拟推演滑块组（渲染进「低碳目标」底部悬浮窗） */
  function simRowsHTML(item) {
    return item.sim.sliders.map(function (s) {
      return '<div class="sim-row">' +
        '<div class="sim-head"><span>' + s.label + '</span><b><em class="sim-v">' + s.val + '</em>' + s.unit + '</b></div>' +
        '<input class="sim-range" type="range" min="' + s.min + '" max="' + s.max + '" step="' + s.step +
        '" value="' + s.val + '" data-dir="' + s.dir + '" data-w="' + s.w + '">' +
        '<div class="sim-scale"><span>' + s.min + s.unit + '</span><span>' + s.max + s.unit + '</span></div>' +
        '</div>';
    }).join('');
  }

  /* 卡片4：低碳行为打卡（自动识别 + 手动打卡） */
  function actsCard(item, idx) {
    var rows = item.acts.map(function (a) {
      var isAuto = a[2] === 'auto';
      var key = (item.catId || idx) + '|' + a[0];
      var manualDone = !isAuto && !!checkinSet[key];
      var done = a[1] === '已达成' || manualDone;
      var tag;
      if (done) { tag = '<span class="act-tag done">✓ ' + (isAuto ? '已自动识别' : '已打卡') + '</span>'; }
      else { tag = '<span class="act-tag go" data-act="checkin" data-name="' + a[0] + '">去打卡</span>'; }
      return '<div class="act' + (isAuto ? '' : ' manual') + (done ? ' is-done' : '') + '">' +
        '<span class="act-check' + (done ? ' done' : '') + '">✓</span>' +
        '<span class="act-name">' + a[0] + '</span>' + tag +
        '</div>';
    }).join('');
    return '<div class="card dcard acts-card"><p class="dcard-title">低碳行为打卡</p>' +
      '<div class="act-list">' + rows + '</div></div>';
  }

  /* 知识卡 / 小测验已移至排行榜下方「参与答题」页（见 renderQuiz） */

  /* 模拟推演：根据滑块计算日减排 kg 与月省电费（元） */
  function simCompute(panel, item) {
    var frac = 0;
    panel.querySelectorAll('.sim-range').forEach(function (el) {
      var min = parseFloat(el.min), max = parseFloat(el.max), val = parseFloat(el.value);
      var p = max === min ? 0 : (val - min) / (max - min);
      if (el.dataset.dir === 'down') { p = 1 - p; }
      frac += parseFloat(el.dataset.w) * p;
    });
    var saveKwh = item.sim.baseKwh * Math.max(0, Math.min(1, frac));
    return { kg: saveKwh * KG_PER_KWH, money: saveKwh * PRICE_PER_KWH * 30 };
  }

  /* ---------- 轻提示（display 切换，规避该 WebView 的 opacity 合成缺陷） ---------- */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.style.display = 'none';
      document.body.appendChild(toastEl);
    }
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    toastTimer = setTimeout(function () { toastEl.style.display = 'none'; }, 1800);
  }

  /* ---------- 详情页交互（事件委托，innerHTML 重建后仍然生效） ---------- */
  pageDetail.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || !detailOpen) return;
    var idx = parseInt(detailBody.dataset.idx, 10);
    var item = APPLIANCES[idx];
    var act = t.dataset.act;

    if (act === 'usage-tab') {
      usageTab[idx] = t.dataset.tab;
      /* 只重渲染用电区两张卡，保留滚动位置，避免整页重建的闪动 */
      var zone = detailBody.querySelector('.usage-zone');
      if (zone && APPLIANCES[idx]) {
        zone.innerHTML = usageCard(APPLIANCES[idx], idx) + carbonCard(APPLIANCES[idx], idx);
        void zone.offsetHeight;
      }
      return;
    }

    if (act === 'ai-chat') {
      openAi({
        title: item.name + ' · 智能建议',
        context: '我是学生宿舍「北宿2栋-406」的低碳助手。当前电器：' + item.name +
          '（额定 ' + item.voltage + 'V/' + item.currentA + 'A，位置：' + item.location + '）。' +
          '今日用电 ' + item.kwhToday + ' 度；AI 发现 ' + item.ai.windowText + ' 用电异常，原因：' +
          item.ai.cause + ' 已有建议：' + item.ai.action
      });
      return;
    }

    if (act === 'goal') {
      openGoalModal(idx);
      return;
    }

    if (act === 'checkin') {
      var name = t.dataset.name;
      checkinSet[(item.catId || idx) + '|' + name] = true;
      store.set('checkin_set', checkinSet);
      addPoints(2);
      /* 电器行为打卡同样计入绿色打卡记录（节约用电类） */
      pushCheckin(item.name + ' · ' + name, 2, 0, '节约用电');
      syncPoints();
      rebuildDetailKeepScroll(idx);
      toast('打卡成功，+2 碳积分');
      return;
    }

  });

  /* 同步答题页顶部的积分显示 */
  function syncPoints() {
    var badge = quizBody.querySelector('.qz-points b');
    if (badge) { badge.textContent = points; }
  }

  /* ---------- 柱图手指拖动：随手指显示该时段用电详情气泡 ---------- */
  var scrub = { lock: null, plot: null, bars: null, vals: null, labels: null, tip: null, idx: -1 };

  function scrubHide() {
    if (scrub.tip) { scrub.tip.style.display = 'none'; }
    if (scrub.bars) {
      var on = scrub.bars.querySelector('.u-bar.on');
      if (on) { on.classList.remove('on'); }
    }
    scrub.idx = -1;
  }
  function scrubAt(clientX) {
    /* 用「距手指最近的柱心」定位，避免网格线/容器挡命中 */
    var pr = scrub.plot.getBoundingClientRect();
    var x = clientX - pr.left;
    if (x < 0 || x > pr.width) { scrubHide(); return; }
    var all = scrub.bars.children;
    var best = -1, bestD = 1e9, k, cx, d;
    for (k = 0; k < all.length; k++) {
      var br = all[k].getBoundingClientRect();
      cx = br.left + br.width / 2 - pr.left;
      d = Math.abs(cx - x);
      if (d < bestD) { bestD = d; best = k; }
    }
    if (best < 0) { return; }
    var halfGap = pr.width / Math.max(1, all.length) / 2 + 6;
    if (bestD > halfGap) { scrubHide(); return; }
    if (best === scrub.idx) { return; }
    scrub.idx = best;
    for (k = 0; k < all.length; k++) { all[k].classList.toggle('on', k === best); }
    var tip = scrub.tip;
    var barRect = all[best].getBoundingClientRect();
    tip.innerHTML = '<b>' + scrub.labels[best] + '</b>' + fmt1(scrub.vals[best]) + ' 度' +
      '<em>' + fmt1(scrub.vals[best] * KG_PER_KWH) + 'kg CO₂</em>';
    tip.style.display = 'block';
    var bx = barRect.left + barRect.width / 2 - pr.left;
    var tw = tip.offsetWidth;
    var left = Math.max(2, Math.min(pr.width - tw - 2, bx - tw / 2));
    tip.style.left = left + 'px';
    tip.style.bottom = (pr.height - (barRect.top - pr.top) + 8) + 'px';
  }

  pageDetail.addEventListener('touchstart', function (e) {
    var plot = e.target.closest && e.target.closest('.u-plot');
    if (!plot || !detailOpen) { return; }
    scrub.lock = null;
    scrub.plot = plot;
    scrub.bars = plot.querySelector('.u-bars');
    scrub.tip = plot.querySelector('.u-tip');
    try {
      scrub.vals = JSON.parse(scrub.bars.dataset.vals || '[]');
      scrub.labels = JSON.parse(scrub.bars.dataset.labels || '[]');
    } catch (err) { scrub.vals = []; scrub.labels = []; }
    scrub.sx = e.touches[0].clientX; scrub.sy = e.touches[0].clientY;
  }, { passive: true });

  pageDetail.addEventListener('touchmove', function (e) {
    if (!scrub.plot || !detailOpen) { return; }
    var t = e.touches[0];
    var dx = t.clientX - scrub.sx, dy = t.clientY - scrub.sy;
    if (scrub.lock === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        scrub.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
    }
    if (scrub.lock === 'x') {
      e.preventDefault();
      scrubAt(t.clientX);
    }
  }, { passive: false });

  function scrubEnd() {
    if (scrub.plot) {
      window.setTimeout(scrubHide, 400);
      scrub.plot = null; scrub.bars = null; scrub.lock = null;
    }
  }
  pageDetail.addEventListener('touchend', scrubEnd);
  pageDetail.addEventListener('touchcancel', scrubEnd);

  /* 打卡/答题后局部重渲染，保持滚动位置与详情打开状态 */
  function rebuildDetailKeepScroll(idx) {
    var top = pageDetail.scrollTop;
    var item = APPLIANCES[idx];
    var kg = (item.kwhToday * KG_PER_KWH).toFixed(1);
    var cost = (item.kwhToday * PRICE_PER_KWH).toFixed(1);
    var running = item.status === '运行中';
    detailBody.innerHTML =
      '<div class="detail-hero">' +
      '  <div class="hero-icon"><span class="pic-emoji">' + (item.emoji || '🔌') + '</span><img src="' + item.img + '" alt="' + item.name + '" onerror="this.parentNode.classList.add(\'no-img\')"></div>' +
      '  <div class="hero-info">' +
      '    <p class="hero-name">' + item.name + '</p>' +
      '    <p class="hero-status"><span class="status-dot ' + (running ? 'on' : 'idle') + '"></span>' +
               item.status + ' · 实时功率 <b>' + item.powerW + 'W</b></p>' +
      '  </div>' +
      '</div>' +
      '<div class="hero-stats">' +
      '  <div class="hstat"><span class="hs-label">今日碳排</span><span class="hs-val">' + kg + '<em>kg</em></span></div>' +
      '  <div class="hstat"><span class="hs-label">今日电费</span><span class="hs-val">' + cost + '<em>元</em></span></div>' +
      '  <div class="hstat"><span class="hs-label">运行时长</span><span class="hs-val">' + fmtH(item.runH) + '<em>h</em></span></div>' +
      '  <div class="hstat"><span class="hs-label">待机时长</span><span class="hs-val">' + fmtH(item.standbyH) + '<em>h</em></span></div>' +
      '</div>' +
      '<div class="detail-cards">' +
      aiCard(item) +
      '<div class="usage-zone">' + usageCard(item, idx) + carbonCard(item, idx) + '</div>' +
      actsCard(item, idx) +
      '</div>' +
      detailFabsHTML(true);
    /* innerHTML 同步赋值时新内容高度可能尚未布局，scrollTop 会被夹回 0：
       强制重排后恢复，并在下一帧再补一次（该 WebView 需要双保险） */
    void pageDetail.offsetHeight;
    pageDetail.scrollTop = top;
    requestAnimationFrame(function () { pageDetail.scrollTop = top; });
  }

  /* ============================================================
     低碳排行榜（本班 / 本校 / 本市，演示数据）
     ============================================================ */
  var pageBoard = document.getElementById('pageBoard');
  var pageRank = document.getElementById('pageRank');
  var pageMine = document.getElementById('pageMine');
  var podiumEl = document.getElementById('rankPodium');
  var listEl = document.getElementById('rankList');
  var segEl = document.getElementById('rankSeg');

  var RANK_CONF = {
    class:  { n: 24, myRank: 6,  sub: 'group'  },
    school: { n: 30, myRank: 12, sub: 'class'  },
    city:   { n: 50, myRank: 46, sub: 'school' }
  };
  var GROUPS = ['第一学习小组', '第二学习小组', '第三学习小组', '第四学习小组', '第五学习小组'];
  var CLASSES = ['高二(1)班', '高二(2)班', '高二(3)班', '高一(1)班', '高一(4)班', '高三(2)班'];
  var SCHOOLS = ['市第一中学', '市第二中学', '外国语学校', '实验中学', '育才中学', '华侨中学'];
  var NAMES = [
    '林小雨', '陈子轩', '黄雨桐', '张浩然', '李欣怡', '王梓涵', '吴俊杰', '刘诗涵', '赵宇航', '孙梦琪',
    '周嘉怡', '徐志强', '马若曦', '朱明哲', '胡雅静', '郭伟宸', '何语嫣', '高博文', '罗婉婷', '郑思远',
    '梁静怡', '冯子墨', '董一诺', '萧映寒', '程可欣', '曹天宇', '袁乐瑶', '邓皓轩', '蒋书瑶', '沈亦凡',
    '卢佳琪', '姜沐阳', '崔芷若', '钟启明', '陆语棠', '杜文昊', '任欣然', '苏子衿', '魏知夏', '姚景行',
    '方芷晴', '石逸飞', '孔书妍', '曹泽宇', '严雪青', '华明瑄', '金木妍', '魏奇诺', '陶安然', '姜星河'
  ];
  var AVATAR_COLORS = ['#5B9BD5', '#70AD47', '#ED7D31', '#9B59B6', '#1ABC9C', '#E91E63', '#607D8B', '#F39C12'];

  function pick(arr, i) { return arr[i % arr.length]; }

  function avatarColor(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) { h = (h * 31 + name.charCodeAt(i)) >>> 0; }
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }

  /* 确定性伪随机，保证每次渲染榜单一致 */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function buildEntries(scope) {
    var conf = RANK_CONF[scope];
    var rand = rng(scope === 'class' ? 7 : scope === 'school' ? 23 : 91);
    var used = {};
    var arr = [];
    for (var i = 0; i < conf.n - 1; i++) {
      var ni = Math.floor(rand() * NAMES.length);
      while (used[ni]) { ni = (ni + 1) % NAMES.length; }
      used[ni] = true;
      var name = NAMES[ni];
      var sub;
      if (conf.sub === 'group') sub = pick(GROUPS, ni);
      else if (conf.sub === 'class') sub = pick(CLASSES, ni);
      else sub = pick(SCHOOLS, ni);
      /* 减碳量从高到低递减并带抖动 */
      var kg = (26 - i * 0.42 + rand() * 1.4);
      arr.push({ name: name, sub: sub, kg: Math.max(2, kg) });
    }
    arr.sort(function (a, b) { return b.kg - a.kg; });
    /* 把「我」插入到目标名次 */
    var mySub = conf.sub === 'group' ? '第三学习小组' : conf.sub === 'class' ? '高二(3)班' : '市第一中学';
    var hi = arr[conf.myRank - 2] ? arr[conf.myRank - 2].kg : arr[arr.length - 1].kg + 1;
    var lo = arr[conf.myRank - 1] ? arr[conf.myRank - 1].kg : hi - 1;
    var myKg = (hi + lo) / 2;
    arr.splice(conf.myRank - 1, 0, { name: '我', sub: mySub, kg: myKg, me: true });
    arr.forEach(function (e, idx) { e.rank = idx + 1; });
    return arr;
  }

  function avatarHtml(e, cls) {
    var ch = e.me ? '我' : e.name.charAt(0);
    var bg = e.me ? 'background:#0E8A5F' : 'background:' + avatarColor(e.name);
    return '<span class="' + cls + '" style="' + bg + '">' + ch + '</span>';
  }

  function renderRank(scope) {
    var entries = buildEntries(scope);
    var first = entries[0], second = entries[1], third = entries[2];

    function podiumOne(e, place, order) {
      var cls = place === 1 ? 'first' : place === 2 ? 'second' : 'third';
      var medal = place === 1 ? '👑' : place === 2 ? '🥈' : '🥉';
      return '<div class="podium-item ' + cls + '">' +
        '<span class="podium-crown">' + medal + '</span>' +
        avatarHtml(e, 'podium-avatar') +
        '<span class="podium-name">' + e.name + '</span>' +
        '<span class="podium-val">' + e.kg.toFixed(1) + ' KG</span>' +
        '<div class="podium-bar">' + (order + 1) + '</div>' +
        '</div>';
    }
    podiumEl.innerHTML = podiumOne(second, 2, 1) + podiumOne(first, 1, 0) + podiumOne(third, 3, 2);

    /* entries 已包含"我"行，挑出来放到前三名与其余同学之间，
       其余（slice 去掉前三名和我）接在后面 */
    var meIdx = -1;
    for (var i = 0; i < entries.length; i++) { if (entries[i].me) { meIdx = i; break; } }
    var me = meIdx >= 0 ? entries[meIdx] : null;
    var podium = entries.slice(0, 3);
    var rest = entries.slice(3);
    if (meIdx >= 3) { rest = rest.filter(function (e) { return !e.me; }); }
    var myCard;
    if (me) {
      myCard = '<div class="my-rank rank-row">' +
        '<span class="rank-no">' + me.rank + '</span>' +
        avatarHtml(me, 'rank-avatar') +
        '<div class="rank-meta"><p class="rank-name">我</p>' +
        '<p class="rank-sub">' + me.sub + '</p></div>' +
        '<div class="rank-val"><b>' + me.kg.toFixed(1) + '</b><span>KG 减碳</span></div>' +
        '</div>';
    } else {
      myCard = '<div class="my-rank rank-row">' +
        '<span class="rank-no">—</span>' +
        '<span class="rank-avatar" style="background:#0F6CBD;color:#fff;">我</span>' +
        '<div class="rank-meta"><p class="rank-name">我</p>' +
        '<p class="rank-sub">继续打卡就能上榜啦</p></div>' +
        '<div class="rank-val"><b>0.0</b><span>KG 减碳</span></div>' +
        '</div>';
    }
    var rows = rest.map(function (e) {
      return '<div class="rank-row">' +
        '<span class="rank-no">' + e.rank + '</span>' +
        avatarHtml(e, 'rank-avatar') +
        '<div class="rank-meta">' +
        '  <p class="rank-name">' + e.name + '</p>' +
        '  <p class="rank-sub">' + e.sub + '</p>' +
        '</div>' +
        '<div class="rank-val"><b>' + e.kg.toFixed(1) + '</b><span>KG 减碳</span></div>' +
        '</div>';
    }).join('');

    listEl.innerHTML = myCard + rows;
  }

  segEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.seg-item');
    if (!btn) return;
    var scopes = segEl.querySelectorAll('.seg-item');
    for (var i = 0; i < scopes.length; i++) { scopes[i].classList.remove('active'); }
    btn.classList.add('active');
    renderRank(btn.dataset.scope);
  });

  /* ============================================================
     宿舍用电总览页（主页大卡点入）
     ============================================================ */
  function renderDorm() {
    var monthArr = APPLIANCES.map(function (a) { return parseFloat(a.month) || 0; });
    var totalMonth = sumArr(monthArr);
    var totalKg = totalMonth * KG_PER_KWH;
    var totalCost = totalMonth * PRICE_PER_KWH;
    var todayKwh = sumArr(APPLIANCES.map(function (a) { return a.kwhToday; }));
    var todayKg = todayKwh * KG_PER_KWH;
    var maxM = Math.max.apply(null, monthArr.concat([1]));
    var rows = APPLIANCES.map(function (a, i) {
      var v = monthArr[i];
      var w = Math.max(4, Math.round(v / maxM * 100));
      return '<div class="dm-row">' +
        '<span class="dm-name">' + a.name + '</span>' +
        '<div class="dm-track"><div class="dm-fill" style="width:' + w + '%"></div></div>' +
        '<span class="dm-val">' + fmt1(v) + '度</span></div>';
    }).join('');
    var treeDays = Math.round(totalKg / 12 * 365);   /* 一棵树年吸收约 12kg */
    dormBody.innerHTML =
      '<header class="top"><h1 class="top-title">宿舍用电</h1>' +
      '<p class="top-sub">北宿2栋-406 · ' + APPLIANCES.length + ' 台电器在管</p></header>' +
      '<main class="sub-main">' +
      '<section class="card dm-hero">' +
      '  <p class="dm-label">本月总用电</p>' +
      '  <p class="dm-num">' + fmt1(totalMonth) + '<em>度</em></p>' +
      '  <div class="dm-mini"><span><b>' + fmt1(todayKwh) + '</b> 度 今日</span>' +
      '<span><b>' + fmt1(totalCost) + '</b> 元 本月电费</span></div>' +
      '</section>' +
      '<div class="dm-stats">' +
      '  <div class="hstat"><span class="hs-label">本月碳排</span><span class="hs-val">' + fmt1(totalKg) + '<em>kg</em></span></div>' +
      '  <div class="hstat"><span class="hs-label">今日碳排</span><span class="hs-val">' + fmt1(todayKg) + '<em>kg</em></span></div>' +
      '  <div class="hstat"><span class="hs-label">碳积分</span><span class="hs-val qz-points"><b>' + points + '</b><em>分</em></span></div>' +
      '</div>' +
      '<section class="card dcard"><p class="dcard-title">各电器本月用电占比</p>' +
      '  <div class="dm-list">' + rows + '</div></section>' +
      '<section class="card dcard"><p class="dcard-title">碳排放去哪了</p>' +
      '  <p class="dm-eq">本月 ' + fmt1(totalKg) + 'kg CO₂，约等于 <b>' + treeDays + '</b> 天的大树吸碳量，' +
      '  或私家车行驶 <b>' + fmt1(totalKg / 0.19) + '</b> 公里的排放。</p>' +
      '  <p class="dm-eq">相比宿舍平均用电习惯，本月已通过 AI 建议与打卡减少约 <b>' +
           fmt1(sumArr(APPLIANCES.map(function (a) { return a.ai.saveKg; })) * 18) + 'kg</b> CO₂。</p>' +
      '</section>' +
      '<section class="card ai-entry" data-act="dorm-ai">' +
      '  <img src="img/AI.png" alt="AI助手">' +
      '  <div class="ae-info"><b>智能建议</b>' +
      '  <p>问问 AI：怎样让宿舍用电更省、更低碳？</p></div>' +
      '  <span class="ae-go">›</span>' +
      '</section>' +
      '</main>';
  }

  /* 宿舍级 AI 上下文（看板大卡 / 宿舍页入口共用） */
  function dormContext() {
    var monthArr = APPLIANCES.map(function (a) { return parseFloat(a.month) || 0; });
    var monthKwh = sumArr(monthArr);
    var todayKwh = sumArr(APPLIANCES.map(function (a) { return parseFloat(a.kwhToday) || 0; }));
    var carbonKg = Math.round(monthKwh * KG_PER_KWH * 100) / 100;
    var carKm = Math.round(carbonKg / 0.19);
    var treeDays = Math.round(carbonKg / 12 * 365);      /* 一棵树年吸收约 12kg */
    var savedKg = Math.round(sumArr(APPLIANCES.map(function (a) { return a.ai.saveKg; })) * 18 * 10) / 10;
    return {
      title: '宿舍智能建议',
      /* 看板「宿舍用电」卡片 + 宿舍用电详情（用电占比 / 碳排放去哪）在对话中的可见回显 */
      summary: {
        month: fmt1(monthKwh), today: fmt1(todayKwh), carbon: carbonKg, count: APPLIANCES.length,
        rows: APPLIANCES.map(function (a, i) { return { name: a.name, kwh: monthArr[i] }; }),
        treeDays: treeDays, carKm: carKm, savedKg: savedKg
      },
      context: '我是学生宿舍「北宿2栋-406」的低碳助手。宿舍有 ' + APPLIANCES.length +
        ' 台电器：' + APPLIANCES.map(function (a, i) {
          return a.name + '（' + a.voltage + 'V/' + a.currentA + 'A，今日 ' + a.kwhToday +
            ' 度，本月 ' + fmt1(monthArr[i]) + ' 度）';
        }).join('、') +
        '。本月总用电 ' + fmt1(monthKwh) + ' 度，碳排放约 ' + carbonKg +
        ' KG（各电器占比：' + APPLIANCES.map(function (a, i) {
          return a.name + ' ' + Math.round(monthArr[i] / (monthKwh || 1) * 100) + '%';
        }).join('、') + '）。按每度电 ' + KG_PER_KWH + 'kg CO₂ 折算，本月碳排放约等于 ' + treeDays +
        ' 天的大树吸碳量、私家车行驶 ' + carKm + ' 公里；相比宿舍平均用电习惯，已通过 AI 建议与打卡减少约 ' +
        savedKg + 'kg CO₂。看板卡片上的提示：请注意不要长时间开灯、空调温度保持 26 摄氏度会更好。' +
        '请围绕宿舍节电、错峰、减碳给出具体可执行的建议。'
    };
  }

  dormBody.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || !dormOpen) { return; }
    if (t.dataset.act === 'dorm-ai') { openAi(dormContext()); }
  });

  function openDormFrom() {
    if (dormOpen || detailOpen || quizOpen || addOpen) { return; }
    renderDorm();
    pageDorm.classList.add('show');
    dormOpen = true;
    if (window.TankanBridge) { window.TankanBridge.setSubOpen(true); }
    openSlide(pageDorm);
  }
  function finalizeDorm() {
    dormOpen = false;
    pageDorm.classList.remove('show');
    if (window.TankanBridge) { window.TankanBridge.setSubOpen(false); }
  }
  window.closeDorm = function () { if (dormOpen && sheet) { commitSheet(sheet); }; };

  /* 主页上方大用电卡：整卡直接进入 AI 智能建议问答（宿舍级上下文） */
  (function () {
    var ov = document.querySelector('.overview');
    if (ov) { ov.style.cursor = 'pointer'; ov.addEventListener('click', function () { openAi(dormContext()); }); }
  })();

  /* ============================================================
     Siri 风 AI 智能建议对话页（右入侧滑）
     ============================================================ */
  var aiOpen = false;
  var aiCtx = null;
  var aiMsgs = [];
  var aiReqSeq = 0;
  var aiBusy = false;
  var sheetUnderAi = null;   // 打开 AI 页时底层正在展示的覆盖页

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var AI_CHIPS = ['怎么用最省电？', '帮我制定本周减碳计划', '待机功耗怎么消除？', '错峰用电建议'];

  function aiWelcome(ctx) {
    if (ctx.summary) {
      return '你好，李华！我是宿舍低碳助手 🖐 看板「宿舍用电」卡片已带进对话：本月已用 ' +
        ctx.summary.month + ' 度、约 ' + ctx.summary.carbon + ' KG CO₂，' +
        ctx.summary.count + ' 台在管电器。上方卡片里还列出了各电器本月用电占比和碳排放去向，' +
        '问我怎么省电、怎么错峰、能减多少碳，我都会结合这些数据回答。';
    }
    return '你好！关于「' + (ctx.title.replace(' · 智能建议', '')) + '」，我已读取它的用电曲线与诊断结果，可以问我怎么用更省电、如何设置定时、能减多少碳。';
  }

  /* 本地兜底回复（未配置 Key 或网络失败时的演示回复） */
  function localAiReply(text, ctx) {
    var t = text;
    if (/计划|怎么用|省电|建议|怎么/.test(t)) {
      return '根据当前用电数据，给你 3 条可立即执行的建议：\n' +
        '1. 空调设 26℃，凌晨 2:00 定时关闭，预计每天省 1.2 度；\n' +
        '2. 热水器避开 18:00-21:00 高峰、用完断电，每天约省 0.4 度；\n' +
        '3. 电脑开启 30 分钟自动休眠、睡前拔插排，消除待机功耗。\n' +
        '坚持一周大约可减少 8-10kg CO₂。在「我的」里配置 DeepSeek API Key 后，我可以结合实时数据给你更精细的方案。';
    }
    if (/待机/.test(t)) {
      return '待机耗电常被忽略：热水器全天保温、电脑深夜不休眠、充电器空载都算。建议给书桌和阳台各配一个带开关的插排，睡前一键断电，预计每天可省约 0.3-0.5 度。';
    }
    if (/错峰|高峰|几点/.test(t)) {
      return '居民电价低谷一般在 23:00-次日 7:00。热水器、充电类用电尽量放到清晨；18:00-21:00 是全网高峰，这段时间少用大功率电器，既省钱也减碳。';
    }
    return '这是一个很好的问题！简单说：每省 1 度电约减少 0.58kg CO₂。你可以先用模拟推演拖一拖参数看效果，也可以在「我的」里配置 DeepSeek API Key，让我结合你的实时用电数据深入分析。';
  }

  /* 看板「宿舍用电」卡片 + 宿舍用电详情的数据在对话中的可见回显
     （本月用电量/碳排概览 + 各电器本月用电占比 + 碳排放去哪了） */
  function aiCtxCardHTML(s) {
    var maxM = Math.max.apply(null, (s.rows || []).map(function (r) { return r.kwh; }).concat([1]));
    var rows = (s.rows || []).map(function (r) {
      var w = Math.max(4, Math.round(r.kwh / maxM * 100));
      return '<div class="dm-row"><span class="dm-name">' + escHtml(r.name) + '</span>' +
        '<div class="dm-track"><div class="dm-fill" style="width:' + w + '%"></div></div>' +
        '<span class="dm-val">' + fmt1(r.kwh) + '度</span></div>';
    }).join('');
    return '<div class="ai-ctx-card">' +
      '<p class="ai-ctx-from">来自看板 · 宿舍用电</p>' +
      '<div class="ai-ctx-grid">' +
      '<div><span>本月用电量</span><p class="ai-ctx-val"><b>' + s.month + '</b><em>度</em></p></div>' +
      '<div><span>碳排放量</span><p class="ai-ctx-val"><b>' + s.carbon + '</b><em>KG</em></p></div>' +
      '<div><span>今日用电</span><p class="ai-ctx-val"><b>' + s.today + '</b><em>度</em></p></div>' +
      '<div><span>在管电器</span><p class="ai-ctx-val"><b>' + s.count + '</b><em>台</em></p></div>' +
      '</div>' +
      (rows ? '<p class="ai-ctx-sec">各电器本月用电占比</p><div class="dm-list">' + rows + '</div>' : '') +
      '<p class="ai-ctx-sec">碳排放去哪了</p>' +
      '<p class="dm-eq">本月 ' + s.carbon + 'kg CO₂，约等于 <b>' + s.treeDays +
      '</b> 天的大树吸碳量，或私家车行驶 <b>' + s.carKm + '</b> 公里的排放。</p>' +
      '<p class="dm-eq">相比宿舍平均用电习惯，本月已通过 AI 建议与打卡减少约 <b>' +
      s.savedKg + 'kg</b> CO₂。</p>' +
      '<p class="ai-ctx-hint">这些数据已带入对话，并同步给 AI 作为分析依据。</p>' +
      '</div>';
  }

  function renderAi() {
    var bubbles = aiMsgs.map(function (m) {
      if (m.role === 'user') {
        return '<div class="ai-row me"><div class="ai-bubble me">' + escHtml(m.content).replace(/\n/g, '<br>') + '</div></div>';
      }
      return '<div class="ai-row ai"><img src="img/AI.png" class="ai-ava">' +
        '<div class="ai-bubble ai">' + escHtml(m.content).replace(/\n/g, '<br>') + '</div></div>';
    }).join('');
    var chipsHtml = aiMsgs.length <= 1
      ? '<div class="ai-chips">' + AI_CHIPS.map(function (c) {
          return '<button data-act="ai-chip">' + c + '</button>';
        }).join('') + '</div>'
      : '';
    var typing = aiBusy ? '<div class="ai-row ai"><img src="img/AI.png" class="ai-ava">' +
      '<div class="ai-bubble ai typing"><i></i><i></i><i></i></div></div>' : '';
    var ctxCard = (aiCtx && aiCtx.summary) ? aiCtxCardHTML(aiCtx.summary) : '';
    aiBody.innerHTML =
      '<div class="siri-orb" aria-hidden="true"><span></span></div>' +
      '<header class="siri-head">' +
      '<p class="siri-title">智能建议</p><p class="siri-sub">' + escHtml(aiCtx.title) + '</p>' +
      '<span class="ai-key-state' + (getAiKey() ? ' on' : '') + '">' +
      (getAiKey() ? 'DeepSeek 已连接' : '演示模式 · 未配置 Key') + '</span>' +
      '<button class="siri-dorm" data-act="ai-dorm">宿舍用电详情 ›</button></header>' +
      '<div class="ai-scroll" id="aiScroll">' + ctxCard + bubbles + typing + chipsHtml + '</div>' +
      '<div class="ai-input-bar">' +
      '<input id="aiInput" type="text" placeholder="问问 AI 省电妙招…" autocomplete="off">' +
      '<button id="aiSend" data-act="ai-send">发送</button></div>';
    var sc = document.getElementById('aiScroll');
    if (sc) { sc.scrollTop = sc.scrollHeight; }
  }

  function aiPush(role, content) {
    aiMsgs.push({ role: role, content: content });
    renderAi();
  }

  function aiAsk(text) {
    if (aiBusy) { return; }
    text = (text || '').trim();
    if (!text) { return; }
    aiPush('user', text);
    aiBusy = true;
    renderAi();
    var seq = ++aiReqSeq;
    var key = getAiKey();
    var done = function (ok, reply) {
      if (seq !== aiReqSeq) { return; }
      aiBusy = false;
      aiPush('ai', ok ? reply : localAiReply(text, aiCtx));
    };
    if (key && window.TankanBridge && window.TankanBridge.aiChat) {
      var payload = {
        system: '你是「碳看版」App 的宿舍低碳助手，回答面向高中生/大一学生，语气亲切简洁，' +
                '使用中文，多用短句和编号列表，建议要具体可执行，单次回答不超过 180 字。背景信息：' +
                aiCtx.context,
        messages: aiMsgs.filter(function (m) { return m.role === 'user' || m.role === 'ai'; })
          .map(function (m) { return { role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }; })
      };
      var timer = setTimeout(function () { done(false, ''); }, 20000);
      window.__aiResp = function (id, ok, reply) {
        if (id !== seq) { return; }
        clearTimeout(timer);
        done(ok, reply);
      };
      try {
        window.TankanBridge.aiChat(String(seq), key, JSON.stringify(payload));
      } catch (err) {
        clearTimeout(timer); done(false, '');
      }
    } else {
      setTimeout(function () { done(false, ''); }, 500);
    }
  }

  function openAi(ctx) {
    if (aiOpen) { return; }
    aiCtx = ctx;
    aiMsgs = [{ role: 'ai', content: aiWelcome(ctx) }];
    aiBusy = false;
    renderAi();
    pageAi.classList.add('show');
    aiOpen = true;
    if (window.TankanBridge) { window.TankanBridge.setSubOpen(true); }
    /* 保存底层页动画状态：AI 关闭后恢复它的侧滑跟手 */
    sheetUnderAi = sheet;
    openSlide(pageAi);
  }
  function finalizeAi() {
    aiOpen = false;
    aiBusy = false;
    pageAi.classList.remove('show');
    clearSheet(pageAi);
    /* 底层详情/宿舍/答题仍打开时，把动画句柄还给它 */
    var underSubPage = !!(sheetUnderAi && (dormOpen || quizOpen || addOpen));
    if (sheetUnderAi && (detailOpen || dormOpen || quizOpen || addOpen)) {
      sheet = sheetUnderAi;
    }
    sheetUnderAi = null;
    /* subOpen 归还规则：底层是宿舍/答题/添加时保留（它们靠 subOpen 隐藏底部
       导航）；底层是详情页或无底层页时归还——详情有自己的 detailOpen 分支
       接管返回+更多按钮，残留 subOpen 会在看板上留下失效返回键（无法返回） */
    if (!underSubPage && window.TankanBridge) {
      window.TankanBridge.setSubOpen(false);
    }
  }
  /* AI 页顶部「宿舍用电详情」入口：收起 AI（及其底层详情）后打开宿舍页 */
  function gotoDormFromAi() {
    if (dormOpen) { finalizeAi(); return; }   /* AI 本就叠在宿舍页上：收起即可 */
    aiOpen = false;
    aiBusy = false;
    pageAi.classList.remove('show');
    if (sheet) { cancelSheetAnim(sheet); sheet = null; }
    clearSheet(pageAi);
    sheetUnderAi = null;
    if (detailOpen) { finalizeDetail(); clearSheet(pageDetail); }
    openDormFrom();
  }

  pageAi.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || !aiOpen) { return; }
    if (t.dataset.act === 'ai-send') {
      var inp = document.getElementById('aiInput');
      aiAsk(inp ? inp.value : '');
    } else if (t.dataset.act === 'ai-chip') {
      aiAsk(t.textContent);
    } else if (t.dataset.act === 'ai-dorm') {
      gotoDormFromAi();
    }
  });
  pageAi.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && e.target.id === 'aiInput') {
      aiAsk(e.target.value);
    }
  });

  /* ============================================================
     低碳目标底部悬浮窗（详情页底部按钮打开：目标数据 + 模拟推演）
     ============================================================ */
  var goalIdx = -1;
  function openGoalModal(idx) {
    goalIdx = idx;
    renderGoalModal(false);
  }
  /* 底部悬浮窗（米白玻璃）：低碳目标数据 + 模拟推演 + 采用并提醒 */
  function renderGoalModal(editing) {
    var item = APPLIANCES[goalIdx];
    if (!item) { return; }
    var target = getTarget(goalIdx, item);
    var saved = Math.min(target * 1.4, savedKgOf(item));
    var pct = Math.min(100, Math.round(saved / target * 100));
    var perDay = Math.max(0, (target - saved) / Math.max(1, 30 - new Date().getDate() + 1));
    var doneActs = item.acts.filter(function (a) { return a[1] === '已达成'; }).length;
    var body;
    if (editing) {
      var presets = [3, 5, 10, 20];
      body = '<div class="gm-edit">' +
        '<p class="gm-label">选择本月减碳目标（kg CO₂）</p>' +
        '<div class="gm-opts">' + presets.map(function (v) {
          return '<button class="gm-opt' + (v === target ? ' on' : '') + '" data-act="gm-pick" data-v="' + v + '">' + v + 'kg</button>';
        }).join('') + '</div>' +
        '<div class="gm-custom"><input id="gmInput" type="number" min="1" max="200" placeholder="自定义 kg">' +
        '<button data-act="gm-custom">设定</button></div></div>';
    } else {
      body =
        '<div class="gm-ring-wrap"><div class="gm-ring"><svg viewBox="0 0 120 120">' +
        '<circle cx="60" cy="60" r="52" class="bg"/>' +
        '<circle cx="60" cy="60" r="52" class="fg" stroke-dasharray="' + (2 * Math.PI * 52).toFixed(1) +
          '" stroke-dashoffset="' + (2 * Math.PI * 52 * (1 - pct / 100)).toFixed(1) + '"/></svg>' +
        '<div class="gm-ring-in"><b>' + pct + '%</b><span>已完成</span></div></div></div>' +
        '<div class="gm-nums"><span>目标 <b>' + target + '</b> kg</span>' +
        '<span>已减 <b>' + fmt1(saved) + '</b> kg</span></div>' +
        '<p class="gm-desc">' + (pct >= 100
          ? '🎉 太棒了，本月目标已达成，继续保持！'
          : '还差 <b>' + fmt1(Math.max(0, target - saved)) + 'kg</b>，之后每天约需再减 <b>' + fmt1(perDay) +
            'kg</b>；已坚持 ' + doneActs + '/' + item.acts.length + ' 项低碳行为。') + '</p>';
    }
    var set = !!reminderSet[goalIdx];
    var modal = document.getElementById('goalModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'goalModal';
      modal.className = 'glass-modal';
      document.body.appendChild(modal);
      modal.addEventListener('click', function (e) {
        if (e.target === modal) { closeGoalModal(); return; }
        var t = e.target.closest('[data-act]');
        if (!t) { return; }
        var act = t.dataset.act;
        if (act === 'gm-close') { closeGoalModal(); }
        else if (act === 'gm-more') { renderGoalModal(true); }
        else if (act === 'gm-back') { renderGoalModal(false); }
        else if (act === 'gm-pick') {
          setTarget(goalIdx, parseInt(t.dataset.v, 10));
          renderGoalModal(false);
          toast('低碳目标已更新');
        } else if (act === 'gm-custom') {
          var inp = document.getElementById('gmInput');
          var v = inp ? parseInt(inp.value, 10) : NaN;
          if (!isNaN(v) && v > 0 && v <= 200) {
            setTarget(goalIdx, v); renderGoalModal(false); toast('低碳目标已更新为 ' + v + 'kg');
          } else { toast('请输入 1-200 之间的数字'); }
        } else if (act === 'sim-apply') {
          reminderSet[goalIdx] = true;
          renderGoalModal(false);
          toast('已设置提醒：' + APPLIANCES[goalIdx].ai.action);
        }
      });
      modal.addEventListener('input', function (e) {
        if (!e.target.classList.contains('sim-range')) { return; }
        var row = e.target.closest('.sim-row');
        if (row) { row.querySelector('.sim-v').textContent = e.target.value; }
        paintRange(e.target);
        var res = simCompute(modal, APPLIANCES[goalIdx]);
        modal.querySelector('.sim-kg').textContent = res.kg.toFixed(2);
        modal.querySelector('.sim-money').textContent = res.money.toFixed(1);
      });
    }
    modal.style.display = 'flex';
    var moreInner = editing ? '✕' : '<i></i><i></i><i></i>';
    modal.innerHTML =
      '<div class="gm-card">' +
      '<div class="gm-head"><p class="dcard-title">低碳目标 · ' + item.name + '</p>' +
      '<button class="gm-more" data-act="' + (editing ? 'gm-back' : 'gm-more') + '">' + moreInner +
      '</button></div>' + body +
      '<div class="gm-sec"><p class="gm-sec-title">模拟推演</p>' +
      '<p class="sim-tip">拖一拖，看看改变习惯后能减多少碳、省多少钱：</p>' +
      simRowsHTML(item) +
      '<div class="sim-result">预计每日减少 <b class="sim-kg">0.0</b> kg CO₂' +
      '　·　每月省电费 <b class="sim-money">0</b> 元</div></div>' +
      '<button class="pill-btn primary block" data-act="sim-apply"' + (set ? ' disabled' : '') + '>' +
      (set ? '✓ 提醒已设置' : '采用这个方案，并提醒我') + '</button>' +
      '</div>';
    /* init：滑块进度填充 + 初始推演结果 */
    var ranges = modal.querySelectorAll('.sim-range');
    for (var i = 0; i < ranges.length; i++) { paintRange(ranges[i]); }
    var res0 = simCompute(modal, item);
    modal.querySelector('.sim-kg').textContent = res0.kg.toFixed(2);
    modal.querySelector('.sim-money').textContent = res0.money.toFixed(1);
    /* 卡片最大高度用 px 显式设定：本 WebView 的 dvh/vh 单位不可靠（实测算成 0），
       否则内容会被压扁；同时强制重排，规避 display:none→flex 新内容不绘制 */
    modal.querySelector('.gm-card').style.maxHeight = Math.round(window.innerHeight * 0.76) + 'px';
    void modal.offsetHeight;
  }
  function closeGoalModal() {
    var modal = document.getElementById('goalModal');
    if (modal) { modal.style.display = 'none'; }
  }
  /* 已滑过部分染成主题蓝（模拟 LiquidSlider 的进度填充） */
  function paintRange(el) {
    var min = parseFloat(el.min), max = parseFloat(el.max), v = parseFloat(el.value);
    var p = max === min ? 0 : (v - min) / (max - min) * 100;
    el.style.background = 'linear-gradient(90deg, #0088FF 0%, #0088FF ' + p + '%, rgba(120,120,120,.2) ' + p +
      '%, rgba(120,120,120,.2) 100%)';
  }

  /* ============================================================
     低碳答题页（AI 每日 15 题 · 多分页 · 多邻国式连胜）
     ============================================================ */
  var quizQuestions = [];
  var quizIndex = 0;
  var quizPicked = -1;

  function renderQuizHome(aiBadge) {
    var d = getDaily();
    var streak = getStreak();
    var done = d.answered;
    var pct = Math.round(done / QUIZ_PER_DAY * 100);
    quizBody.innerHTML =
      '<header class="top"><h1 class="top-title">低碳答题</h1>' +
      '<p class="top-sub">AI 每天为你出 15 道题，连续打卡冲连胜 🔥</p></header>' +
      '<main class="sub-main">' +
      '<section class="card qz-home">' +
      '<img src="img/AI.png" class="qz-ai-logo">' +
      '<p class="qz-ai-title">今日 15 题</p>' +
      '<span class="qz-ai-badge">' + (aiBadge ? 'DeepSeek 实时出题' : (getAiKey() ? 'DeepSeek 已连接' : 'AI 演示题库')) + '</span>' +
      '<div class="qz-streak"><b>🔥 ' + streak + '</b><span>天连胜</span></div>' +
      '<div class="qz-daybar">' + Array.prototype.map.call(new Array(QUIZ_PER_DAY), function (_, k) {
        return '<i class="' + (k < done ? 'on' : '') + '"></i>';
      }).join('') + '</div>' +
      '<p class="qz-dayprog">今日进度 ' + done + ' / ' + QUIZ_PER_DAY + '（' + pct + '%）· 答对 ' + d.correct + ' 题</p>' +
      '<button class="pill-btn primary block qz-start" data-act="qz-start">' +
        (d.finished ? '查看今日成绩' : (done > 0 ? '继续答题（第 ' + (done + 1) + ' 题）' : '开始今日答题')) +
      '</button>' +
      '<p class="qz-reward">答对一题 +10 碳积分，完成 15 题连胜 +1 天</p>' +
      '</section></main>';
  }

  function renderQuizQuestion() {
    var q = quizQuestions[quizIndex];
    var d = getDaily();
    var streak = getStreak();
    var opts = q.opts.map(function (o, i) {
      var cls = 'dq-opt';
      if (quizPicked >= 0) {
        if (i === q.ans) { cls += ' right'; }
        else if (i === quizPicked) { cls += ' wrong'; }
        else { cls += ' dim'; }
      }
      return '<button class="' + cls + '" data-act="dq-pick" data-i="' + i + '">' +
        '<em>' + String.fromCharCode(65 + i) + '</em>' + o + '</button>';
    }).join('');
    var feedback = quizPicked >= 0
      ? '<div class="dq-fb ' + (quizPicked === q.ans ? 'ok' : 'bad') + '">' +
        (quizPicked === q.ans ? '✓ 回答正确 +10 碳积分' : '✗ 正确答案：' + q.opts[q.ans]) +
        '<p>' + q.why + '</p></div>'
      : '';
    quizBody.innerHTML =
      '<div class="dq-top"><button class="dq-close" data-act="dq-home">✕</button>' +
      '<div class="dq-segs">' + quizQuestions.map(function (_, k) {
        var s = k < quizIndex ? 'done' : (k === quizIndex ? 'cur' : '');
        return '<i class="' + s + '"></i>';
      }).join('') + '</div>' +
      '<span class="dq-streak">🔥 ' + streak + '</span></div>' +
      '<div class="dq-wrap"><p class="dq-no">第 ' + (quizIndex + 1) + ' / ' + QUIZ_PER_DAY + ' 题</p>' +
      '<p class="dq-q">' + q.q + '</p>' +
      '<div class="dq-opts">' + opts + '</div>' + feedback +
      (quizPicked >= 0 ? '<button class="pill-btn primary block dq-next" data-act="dq-next">' +
        (quizIndex === QUIZ_PER_DAY - 1 ? '查看成绩 ▸' : '下一题 ▸') + '</button>' : '') +
      '</div>';
  }

  function renderQuizResult() {
    var d = getDaily();
    var acc = d.answered ? Math.round(d.correct / d.answered * 100) : 0;
    var pass = acc >= 60;
    quizBody.innerHTML =
      '<div class="dq-wrap dq-result-wrap">' +
      '<p class="dq-trophy">' + (pass ? '🏆' : '💪') + '</p>' +
      '<p class="dq-result-title">' + (pass ? '今日挑战完成！' : '完成今日练习') + '</p>' +
      '<p class="dq-result-sub">答对 ' + d.correct + ' / ' + d.answered + ' 题 · 正确率 ' + acc + '%</p>' +
      '<div class="dq-result-cards">' +
      '<div><b>🔥 ' + getStreak() + '</b><span>天连胜</span></div>' +
      '<div><b>+' + (d.correct * 10) + '</b><span>碳积分</span></div>' +
      '<div><b>' + acc + '%</b><span>正确率</span></div></div>' +
      '<button class="pill-btn primary block" data-act="dq-home">返回</button></div>';
  }

  function startQuiz() {
    quizQuestions = todayQuestions();
    var d = getDaily();
    quizIndex = Math.min(d.answered, QUIZ_PER_DAY - 1);
    quizPicked = -1;
    if (d.finished) { renderQuizResult(); } else { renderQuizQuestion(); }
  }

  pageQuiz.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || !quizOpen) { return; }
    var act = t.dataset.act;
    if (act === 'qz-start') { startQuiz(); return; }
    if (act === 'dq-home') { renderQuizHome(false); return; }
    if (act === 'dq-pick') {
      if (quizPicked >= 0) { return; }
      var q = quizQuestions[quizIndex];
      var picked = parseInt(t.dataset.i, 10);
      quizPicked = picked;
      var d = getDaily();
      d.answered += 1;
      var ok = picked === q.ans;
      if (ok) { d.correct += 1; addPoints(10); }
      if (d.answered >= QUIZ_PER_DAY) { d.finished = true; }
      store.set('daily', d);
      renderQuizQuestion();
      if (d.finished) { getStreak(); }
      return;
    }
    if (act === 'dq-next') {
      if (quizIndex < QUIZ_PER_DAY - 1) {
        quizIndex += 1; quizPicked = -1; renderQuizQuestion();
      } else {
        renderQuizResult();
      }
    }
  });

  window.openQuiz = function () {
    if (quizOpen || detailOpen || dormOpen || addOpen) { return; }
    /* 有 Key 时可接 DeepSeek 实时出题；演示先出本地 AI 题库，秒开不阻塞 */
    renderQuizHome(false);
    pageQuiz.classList.add('show');
    quizOpen = true;
    if (window.TankanBridge) { window.TankanBridge.setSubOpen(true); }
    openSlide(pageQuiz);
  };
  function finalizeQuiz() {
    quizOpen = false;
    pageQuiz.classList.remove('show');
    if (window.TankanBridge) { window.TankanBridge.setSubOpen(false); }
  }
  window.closeQuiz = function () { if (quizOpen && sheet) { commitSheet(sheet); }; };

  /* ============================================================
     碳商城（排行榜右上角进入；低碳校园「积分商城」整合）
     ============================================================ */
  var mallOpen = false;

  var MALL_GOODS = [
    { id: 'canteen',    icon: '🍚', name: '食堂优惠券', desc: '面值 5 元，全校食堂通用',  cost: 50,  stock: 49 },
    { id: 'market',     icon: '🛒', name: '超市折扣券', desc: '校内超市 88 折，单次使用', cost: 100, stock: 20 },
    { id: 'stationery', icon: '✏️', name: '文具兑换券', desc: '校文具店通用，可叠加使用', cost: 150, stock: 10 }
  ];
  var mallStock = store.get('mall_stock', {});      // id -> 剩余库存
  var mallOrders = store.get('mall_orders', []);    // [{name, cost, time}] 新记录在前

  function stockOf(g) {
    return mallStock[g.id] != null ? mallStock[g.id] : g.stock;
  }

  function renderMall() {
    var goodsHtml = MALL_GOODS.map(function (g) {
      var st = stockOf(g);
      var can = points >= g.cost && st > 0;
      return '<div class="ml-good">' +
        '<span class="ml-ic">' + g.icon + '</span>' +
        '<div class="ml-info"><p class="ml-name">' + g.name + '</p>' +
        '<p class="ml-desc">' + g.desc + ' · 库存 ' + st + '</p></div>' +
        '<button class="ml-buy" data-act="ml-buy" data-id="' + g.id + '"' + (can ? '' : ' disabled') + '>' +
        (st <= 0 ? '已兑完' : g.cost + ' 积分') + '</button>' +
        '</div>';
    }).join('');
    var ordersHtml = mallOrders.length
      ? mallOrders.slice(0, 5).map(function (o) {
          return '<div class="ml-order"><span class="ml-order-name">' + o.name + '</span>' +
            '<em>-' + o.cost + ' 分</em><span class="ml-order-time">' + o.time + '</span></div>';
        }).join('')
      : '<p class="ck-empty">还没有兑换记录，攒够积分就能兑换好礼</p>';
    mallBody.innerHTML =
      '<header class="top"><h1 class="top-title">碳商城</h1>' +
      '<p class="top-sub">绿色打卡攒积分，商城好礼随心兑</p></header>' +
      '<main class="sub-main">' +
      '<section class="card dm-hero">' +
      '<p class="dm-label">当前碳积分</p>' +
      '<p class="dm-num">' + points + '<em>分</em></p>' +
      '<div class="dm-mini"><span>答题答对 <b>+10</b> 分</span><span>绿色打卡 <b>+2~10</b> 分</span></div>' +
      '</section>' +
      '<section class="card ai-entry" data-act="ml-quiz">' +
      '<span class="ml-quiz-ic">📝</span>' +
      '<div class="ae-info"><b>绿色低碳知识竞赛</b>' +
      '<p>随机 15 题 · 答对 1 题 +10 碳积分</p></div>' +
      '<span class="ae-go">›</span></section>' +
      '<section class="card dcard"><p class="dcard-title">好礼兑换</p>' +
      '<div class="ml-goods">' + goodsHtml + '</div></section>' +
      '<section class="card dcard"><p class="dcard-title">我的兑换</p>' +
      '<div class="ml-orders">' + ordersHtml + '</div></section>' +
      '</main>';
  }

  mallBody.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || !mallOpen) { return; }
    var act = t.dataset.act;
    if (act === 'ml-quiz') {
      /* 收起商城再进答题页：两页共用 subOpen 返回键，叠放会互相抢状态 */
      mallOpen = false;
      if (sheet) { cancelSheetAnim(sheet); sheet = null; }
      clearSheet(pageMall);
      pageMall.classList.remove('show');
      window.openQuiz();
      return;
    }
    if (act === 'ml-buy') {
      var g = null;
      MALL_GOODS.forEach(function (x) { if (x.id === t.dataset.id) { g = x; } });
      if (!g) { return; }
      var st = stockOf(g);
      if (st <= 0) { toast('该好礼已经兑完啦'); return; }
      if (points < g.cost) { toast('碳积分不足，去绿色打卡攒积分吧'); return; }
      addPoints(-g.cost);
      mallStock[g.id] = st - 1;
      store.set('mall_stock', mallStock);
      var now = new Date();
      mallOrders.unshift({
        id: g.id, name: g.name, cost: g.cost,
        time: (now.getMonth() + 1) + '/' + now.getDate() + ' ' + hmOf(now.getTime())
      });
      if (mallOrders.length > 30) { mallOrders.length = 30; }
      store.set('mall_orders', mallOrders);
      renderMall();
      toast('兑换成功：' + g.name);
      return;
    }
  });

  function openMall() {
    if (mallOpen || detailOpen || dormOpen || quizOpen || addOpen || aiOpen) { return; }
    renderMall();
    pageMall.classList.add('show');
    mallOpen = true;
    if (window.TankanBridge) { window.TankanBridge.setSubOpen(true); }
    openSlide(pageMall);
  }
  function finalizeMall() {
    mallOpen = false;
    pageMall.classList.remove('show');
    if (window.TankanBridge) { window.TankanBridge.setSubOpen(false); }
  }
  window.closeMall = function () { if (mallOpen && sheet) { commitSheet(sheet); }; };

  /* 排行榜右上角「碳商城」入口 */
  (function () {
    var entry = document.getElementById('mallEntry');
    if (entry) { entry.addEventListener('click', function () { openMall(); }); }
  })();

  /* ============================================================
     添加设备：宿舍电器目录（暂缺实拍图的以 emoji 占位，补图后自动生效）
     ============================================================ */
  function renderAdd() {
    var tiles = DEVICE_CATALOG.map(function (t) {
      var added = addedIds.indexOf(t.catId) >= 0;
      var powerText = t.powerW >= 1000 ? (t.powerW / 1000) + 'kW' : t.powerW + 'W';
      return '<div class="add-tile' + (added ? ' added' : '') + '" data-act="add-pick" data-id="' + t.catId + '">' +
        '<div class="add-pic"><span class="pic-emoji">' + (t.emoji || '🔌') + '</span>' +
        '<img src="' + t.img + '" alt="" onerror="this.parentNode.classList.add(\'no-img\')">' +
        '<span class="add-flag' + (added ? '' : ' plus') + '">' + (added ? '✓ 已添加' : '＋ 添加') + '</span>' +
        '</div>' +
        '<div class="add-info"><p class="add-name">' + t.name + '</p>' +
        '<p class="add-sub">' + powerText + ' · ' + t.voltage + 'V/' + t.currentA + 'A</p></div>' +
        '</div>';
    }).join('');
    addBody.innerHTML =
      '<header class="top"><h1 class="top-title">添加设备</h1>' +
      '<p class="top-sub">选择宿舍里的电器，一键加入看板（已添加 ' + addedIds.length + ' / ' + DEVICE_CATALOG.length + '）</p></header>' +
      '<main class="sub-main"><section class="add-grid">' + tiles + '</section>' +
      '<p class="add-note">部分电器图标将在后续版本补上实拍图，当前以表情占位。</p></main>';
  }

  addBody.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act="add-pick"]');
    if (!t || !addOpen) { return; }
    var id = t.dataset.id;
    console.log('TAP-ADD id=' + id + ' already=' + (addedIds.indexOf(id) >= 0) + '\n' + (new Error().stack || ''));
    if (addedIds.indexOf(id) >= 0) { return; }
    var tpl = catalogMap[id];
    if (!tpl) { return; }
    addedIds.push(id);
    store.set('added', addedIds);
    console.log('WRITE-ADD ' + JSON.stringify(addedIds));
    APPLIANCES.push(cloneTemplate(tpl));
    rerenderGrid();
    renderAdd();
    toast('已添加设备：' + tpl.name);
  });

  window.openAddDevice = function () {
    if (addOpen || detailOpen || dormOpen || quizOpen || aiOpen) { return; }
    renderAdd();
    pageAdd.classList.add('show');
    addOpen = true;
    if (window.TankanBridge) { window.TankanBridge.setSubOpen(true); }
    openSlide(pageAdd);
  };
  function finalizeAdd() {
    addOpen = false;
    pageAdd.classList.remove('show');
    if (window.TankanBridge) { window.TankanBridge.setSubOpen(false); }
  }
  window.closeAdd = function () { if (addOpen && sheet) { commitSheet(sheet); } };

  /* ============================================================
     个人中心（演示账号：李华 / 学生 / 大一）
     ============================================================ */
  var pageMineEl = pageMine;
  /* 全校排名（市第一中学视角，复用排行榜数据） */
  function mySchoolRank() {
    var arr = buildEntries('school');
    for (var i = 0; i < arr.length; i++) { if (arr[i].me) { return arr[i].rank; } }
    return 0;
  }
  /* 碳诊断个性化建议：按本周打卡缺口生成 */
  function dietTips(wk) {
    function has(name) {
      return wk.some(function (r) { return r.name === name; });
    }
    var tips = [];
    if (!has('骑行上学')) { tips.push('本周骑行为 0 次，建议骑行上学，每周可减碳约 2kg'); }
    if (!has('随手关灯')) { tips.push('本周还没有随手关灯打卡，离开教室和宿舍记得关灯省电'); }
    if (!has('光盘行动')) { tips.push('本周还没有光盘打卡，按需取餐不浪费，每次约减碳 0.2kg'); }
    if (!has('自带水杯')) { tips.push('建议自带水杯，减少一次性纸杯与瓶装水的使用'); }
    if (!has('爬楼')) { tips.push('3 层以内建议爬楼梯代替电梯，低碳又能锻炼身体'); }
    if (!tips.length) { tips.push('本周绿色行为很全面，保持下去，试试带动室友一起打卡'); }
    return tips.slice(0, 4);
  }

  function renderMine() {
    var streak = getStreak();
    var d = getDaily();
    var key = getAiKey();
    var mineBody = document.getElementById('mineBody');
    var doneIds = todayTaskIds();
    var wk = weekLog();
    var wkPrev = prevWeekLog();
    var wkKg = sumArr(wk.map(function (r) { return r.kg; }));
    var prevKg = sumArr(wkPrev.map(function (r) { return r.kg; }));
    var wkPts = sumArr(wk.map(function (r) { return r.pts; }));
    var monthKey = todayStr().slice(0, 7);
    var monthLog = checkinLog.filter(function (r) { return dateStrOf(r.ts).slice(0, 7) === monthKey; });
    var monthKg = sumArr(monthLog.map(function (r) { return r.kg; }));

    /* 今日绿色打卡任务 */
    var tasksHtml = CHECKIN_TASKS.map(function (t) {
      var done = !!doneIds[t.name];
      return '<button class="ck-task' + (done ? ' done' : '') + '" data-act="ck-task" data-id="' + t.id + '">' +
        '<span class="ck-ic">' + t.icon + '</span>' +
        '<span class="ck-name">' + t.name + '</span>' +
        '<span class="ck-pts">' + (done ? '✓ 已完成' : '+' + t.pts) + '</span>' +
        '</button>';
    }).join('');

    /* 电器智能打卡：跳转到电器详情页的「低碳行为打卡」 */
    var appRows = APPLIANCES.length
      ? APPLIANCES.map(function (a, i) {
          var manual = (a.acts[2] && a.acts[2][0]) || '低碳行为打卡';
          var done = !!checkinSet[(a.catId || i) + '|' + manual];
          return '<button class="ck-app" data-act="go-checkin" data-idx="' + i + '">' +
            '<span class="ck-app-name">' + a.name + '</span>' +
            '<span class="ck-app-act">' + manual + '</span>' +
            '<span class="ck-app-go' + (done ? ' done' : '') + '">' + (done ? '✓ 已打卡' : '去打卡 ›') + '</span>' +
            '</button>';
        }).join('')
      : '<p class="ck-empty">还没有添加电器，去「添加设备」把宿舍电器加进来吧</p>';

    /* 打卡记录（最近 4 条） */
    var recHtml = checkinLog.length
      ? checkinLog.slice(0, 4).map(function (r) {
          var dt = new Date(r.ts);
          return '<div class="ck-rec"><span class="ck-rec-name">' + r.name + '</span>' +
            '<span class="ck-rec-pts">+' + r.pts + '</span>' +
            '<span class="ck-rec-time">' + (dt.getMonth() + 1) + '/' + dt.getDate() + ' ' + hmOf(r.ts) + '</span></div>';
        }).join('')
      : '<p class="ck-empty">今天还没有打卡，点击上面的任务开始吧</p>';

    /* 本周行为分类统计（出行 / 饮食 / 节约用电） */
    var catRows = ['出行', '饮食', '节约用电'].map(function (c) {
      var rows = wk.filter(function (r) { return r.cat === c; });
      return { cat: c, n: rows.length, kg: sumArr(rows.map(function (r) { return r.kg; })) };
    });
    var catMax = Math.max.apply(null, catRows.map(function (s) { return s.kg; }).concat([0.1]));
    var catHtml = catRows.map(function (s) {
      var w = Math.max(4, Math.round(s.kg / catMax * 100));
      return '<div class="dm-row"><span class="dm-name ck-cat">' + s.cat + '</span>' +
        '<div class="dm-track"><div class="dm-fill" style="width:' + w + '%"></div></div>' +
        '<span class="dm-val">' + s.n + ' 次</span></div>';
    }).join('');

    var tipHtml = dietTips(wk).map(function (t) { return '<li>' + t + '</li>'; }).join('');
    var diff = wkKg - prevKg;
    var rankText = wk.length ? '第 ' + mySchoolRank() + ' 名' : '未上榜';

    /* 碳宠物等级：0 种子 (0-49) / 1 发芽 (50-199) / 2 成宠 (200+) */
    var PET_LEVELS = [
      { min: 0,    max: 49,  name: '种子碳宝', hint: '攒到 50 积分就能发芽，我会很努力生长的 🌱' },
      { min: 50,   max: 199, name: '发芽碳宝', hint: '再攒 ' + (200 - points) + ' 积分就能长成小绒球啦' },
      { min: 200,  max: 9999, name: '碳小绒',  hint: '谢谢你陪我长大～我每天都在帮你减碳 💚' }
    ];
    var petLevel = 0;
    for (var li = 0; li < PET_LEVELS.length; li++) { if (points >= PET_LEVELS[li].min) { petLevel = li; } }
    var petInfo = PET_LEVELS[petLevel];
    var nextAt = petLevel < PET_LEVELS.length - 1 ? PET_LEVELS[petLevel + 1].min : null;
    var petPct = nextAt ? Math.min(100, Math.round((points - petInfo.min) / (nextAt - petInfo.min) * 100)) : 100;
    /* 今日点宠物剩余次数 */
    var petDate = store.get('pet_click_date', '');
    var petCount = store.get('pet_click_count', 0);
    var todayStrVal = todayStr();
    if (petDate !== todayStrVal) { petCount = 0; store.set('pet_click_date', todayStrVal); store.set('pet_click_count', 0); }
    var petLeft = Math.max(0, 3 - petCount);

    mineBody.innerHTML =
      '<header class="top"><h1 class="top-title">我的</h1></header>' +
      '<main class="sub-main">' +
      '<section class="card me-card">' +
      '<img src="img/user-avatar.png" class="me-avatar">' +
      '<div class="me-info"><p class="me-name">李华</p><p class="me-tag">学生 · 大一</p>' +
      '<p class="me-loc">北宿2栋-406</p></div>' +
      '<span class="me-badge">演示账号</span></section>' +
      /* ---------- 碳积分大 hero（原商城页积分卡，搬到"我的"页） ---------- */
      '<section class="card points-hero">' +
      '<p class="points-label">我的碳积分</p>' +
      '<p class="points-num">' + points + '<em>分</em></p>' +
      '<div class="points-sub">' +
      '<span>🔥 <b>' + streak + '</b> 天连胜</span>' +
      '<span>📝 <b>' + d.correct + '</b> 题 今日答对</span>' +
      '<span>💚 <b>' + wkPts + '</b> 分 本周获积</span></div>' +
      '</section>' +
      /* ---------- 碳小绒宠物（跟随积分等级成长，点击 +1 积分，每日限 3 次） ---------- */
      '<section class="card dcard">' +
      '<div class="pet-card">' +
      '<div class="pet-stage" data-act="pet">' +
      '<div class="pet-bubble" id="petBubble">你好呀～点我一起减碳 🌱</div>' +
      '<div class="pet level-' + petLevel + '" id="pet">' +
      '<div class="pet-shadow"></div>' +
      '<div class="pet-inner">' +
      '<div class="pet-body" id="petBody">' +
      '<div class="pet-arm left"></div>' +
      '<div class="pet-arm right" id="petArmR"></div>' +
      '<div class="pet-leg left"><div class="pet-shoe"></div></div>' +
      '<div class="pet-leg right"><div class="pet-shoe"></div></div>' +
      '<div class="pet-fluff"></div>' +
      '<div class="pet-shine"></div>' +
      '<div class="pet-eye left"><span class="pet-glint"></span></div>' +
      '<div class="pet-eye right"><span class="pet-glint"></span></div>' +
      '<div class="pet-cheek left"></div>' +
      '<div class="pet-cheek right"></div>' +
      '<div class="pet-mouth"></div>' +
      '</div></div></div></div>' +
      '<div class="pet-info">' +
      '<p class="pet-name">碳小绒</p>' +
      '<p class="pet-level">Lv.' + petLevel + ' · ' + petInfo.name + '</p>' +
      '<div class="pet-level-bar"><div class="pet-level-fill" style="width:' + petPct + '%"></div></div>' +
      '<p class="pet-hint">' + petInfo.hint + '</p>' +
      '<p class="pet-tap">点我 <b>+' + petLeft + '</b> 次得积分（每日限 3 次）</p>' +
      '</div></div></section>' +
      /* ---------- 绿色打卡（低碳校园整合） ---------- */
      '<section class="card dcard">' +
      '<p class="dcard-title">绿色打卡</p>' +
      '<p class="ck-sub">点击任务开始，碳积分可在碳商城兑换好礼</p>' +
      '<div class="ck-tasks">' + tasksHtml + '</div>' +
      '<p class="ck-sec-title">电器智能打卡</p>' +
      '<div class="ck-apps">' + appRows + '</div>' +
      '<p class="ck-sec-title">我的打卡记录</p>' +
      '<div class="ck-recs">' + recHtml + '</div>' +
      '</section>' +
      /* ---------- 碳诊断（低碳校园整合） ---------- */
      '<section class="card dcard">' +
      '<p class="dcard-title">碳诊断</p>' +
      '<div class="ck-hero"><b>' + fmt1(wkKg) + '</b><em>kg</em>' +
      '<span>本周减碳量 · 打卡 ' + wk.length + ' 次</span></div>' +
      '<div class="dm-list">' + catHtml + '</div>' +
      '<p class="ck-sec-title">个性化低碳建议</p>' +
      '<ul class="ov-tips">' + tipHtml + '</ul>' +
      '</section>' +
      /* ---------- 碳周报（低碳校园整合） ---------- */
      '<section class="card dcard">' +
      '<p class="dcard-title">碳周报 · ' + weekStartStr().slice(5).replace('-', '/') + ' 当周</p>' +
      '<div class="wr-rows">' +
      '<div class="wr-row"><span>本周减碳量</span><b>' + fmt1(wkKg) + ' kg</b>' +
      '<em>较上周 ' + (diff >= 0 ? '+' : '') + fmt1(diff) + ' kg</em></div>' +
      '<div class="wr-row"><span>本周获得积分</span><b>' + wkPts + ' 分</b><em>打卡攒积分</em></div>' +
      '<div class="wr-row"><span>本周打卡次数</span><b>' + wk.length + ' 次</b><em>绿色行为留痕</em></div>' +
      '<div class="wr-row"><span>本周全校排名</span><b>' + rankText + '</b><em>' +
      (rankText === '未上榜' ? '完成打卡即可上榜' : '较上周持平') + '</em></div>' +
      '</div>' +
      '<p class="wr-month">月度碳报告：本月减碳总量 ' + fmt1(monthKg) + ' kg，来自 ' + monthLog.length +
      ' 次已通过打卡。</p>' +
      '</section>' +
      '<section class="card dcard key-card">' +
      '<p class="dcard-title">AI 服务</p>' +
      '<label class="key-lock"><span class="kl-logo">DS</span>' +
      '<div><b>DeepSeek</b><p class="kl-state">' + (key ? '已连接 · 智能建议与 AI 出题已启用' : '未配置 · 当前为本地演示模式') + '</p></div>' +
      '<i class="kl-pad">🔒</i></label>' +
      '<div class="key-row"><input id="dsKeyInput" type="password" placeholder="粘贴 DeepSeek API Key（sk-…）" value="">' +
      '<button id="dsKeySave" class="key-save">保存</button></div>' +
      '<p class="key-tip">Key 仅保存在本机 localStorage，用于调用 api.deepseek.com；本应用不经过第三方服务器。</p>' +
      '</section>' +
      '</main>';
    var inp = document.getElementById('dsKeyInput');
    var btn = document.getElementById('dsKeySave');
    if (inp) { inp.value = key; }
    if (btn) {
      btn.addEventListener('click', function () {
        var v = (inp.value || '').trim();
        store.set('ds_key', v);
        renderMine();
        toast(v ? 'DeepSeek Key 已保存' : '已清除 Key，使用演示模式');
      });
    }
  }

  /* 「我的」页交互：绿色打卡 / 电器智能打卡跳转 */
  var mineBody = document.getElementById('mineBody');
  mineBody.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) { return; }
    var act = t.dataset.act;
    if (act === 'pet') {
      var petEl = document.getElementById('pet');
      var bubbleEl = document.getElementById('petBubble');
      var bodyEl = document.getElementById('petBody');
      var armEl = document.getElementById('petArmR');
      var petStage = document.querySelector('#mineBody .pet-stage');
      if (!petEl) { return; }
      /* 本地 pet_click_date / pet_click_count 判今日剩余 */
      var d0 = store.get('pet_click_date', '');
      var c0 = store.get('pet_click_count', 0);
      var todayStrVal = todayStr();
      if (d0 !== todayStrVal) { c0 = 0; }
      if (c0 >= 3) {
        if (bubbleEl) { bubbleEl.textContent = '今天的鼓励用完啦，明天再来～'; bubbleEl.classList.add('show');
          setTimeout(function () { bubbleEl.classList.remove('show'); }, 2400); }
        return;
      }
      c0++; store.set('pet_click_date', todayStrVal); store.set('pet_click_count', c0);
      addPoints(1);
      /* 动画 */
      bodyEl.classList.remove('jump'); void bodyEl.offsetWidth; bodyEl.classList.add('jump');
      armEl.classList.remove('waving'); void armEl.offsetWidth; armEl.classList.add('waving');
      /* 随机低碳话术 */
      var LINES = ['我是碳小绒，专门帮你减碳～', '少开一天车，等于种下一棵树 🌳',
        '空调调高 1℃，地球凉快一点点 ☀️', '随手关灯，我就会偷偷开心 ✨',
        '自带水杯，就少一个塑料瓶 💧', '今天走路了吗？我陪你一起 🚶',
        '省下的每一度电，都是我的小零食 ⚡', '垃圾分类，我有在认真看哦 👀',
        '谢谢你陪我，地球也谢谢你 🌍', '最好的碳，是没排出来的碳 🌱'];
      var say = LINES[Math.floor(Math.random() * LINES.length)];
      if (bubbleEl) { bubbleEl.textContent = say; bubbleEl.classList.add('show');
        setTimeout(function () { bubbleEl.classList.remove('show'); }, 2600); }
      /* emoji 粒子 */
      var ICONS = ['🍃','💚','✨','🌱','♻️','🫧'];
      for (var i = 0; i < 8; i++) {
        var p = document.createElement('span');
        p.className = 'pet-part';
        p.textContent = ICONS[Math.floor(Math.random() * ICONS.length)];
        var r = petStage.getBoundingClientRect();
        p.style.left = (r.left + r.width / 2) + 'px';
        p.style.top = (r.top + r.height / 2) + 'px';
        p.style.fontSize = (14 + Math.random() * 12) + 'px';
        var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
        var dist = 40 + Math.random() * 60;
        p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
        document.body.appendChild(p);
        (function (el) { setTimeout(function () { el.remove(); }, 1600); })(p);
      }
      var keep = pageMineEl.scrollTop;
      renderMine();
      pageMineEl.scrollTop = keep;
      return;
    }
    if (act === 'ck-task') {
      var task = null;
      CHECKIN_TASKS.forEach(function (x) { if (x.id === t.dataset.id) { task = x; } });
      if (!task) { return; }
      if (todayTaskIds()[task.name]) { toast('今天已经打过卡啦'); return; }
      addPoints(task.pts);
      pushCheckin(task.name, task.pts, task.kg, task.cat);
      var keep = pageMineEl.scrollTop;
      renderMine();
      pageMineEl.scrollTop = keep;
      toast('打卡成功：' + task.name + ' +' + task.pts + ' 碳积分');
      return;
    }
    if (act === 'go-checkin') {
      openDetail(parseInt(t.dataset.idx, 10), { focusActs: true });
    }
  });

  /* 宠物眨眼循环（只在"我的"页显示且宠物 DOM 存在时生效） */
  var petBlinkTimer = null;
  function startPetBlink() {
    stopPetBlink();
    var tick = function () {
      if (!pageMineEl.classList.contains('show')) { return; }
      var eyes = document.querySelectorAll('.pet-eye');
      if (!eyes.length) { petBlinkTimer = setTimeout(tick, 1200); return; }
      for (var i = 0; i < eyes.length; i++) eyes[i].classList.add('blink');
      setTimeout(function () { for (var i = 0; i < eyes.length; i++) eyes[i].classList.remove('blink'); }, 150);
      petBlinkTimer = setTimeout(tick, 1800 + Math.random() * 3200);
    };
    petBlinkTimer = setTimeout(tick, 800);
  }
  function stopPetBlink() { if (petBlinkTimer) { clearTimeout(petBlinkTimer); petBlinkTimer = null; } }

  /* ============================================================
     页面切换（看板 / 排行榜 / 我的）
     ============================================================ */
  var overlayOpen = false;   /* 当前是否处于非看板覆盖页（排行榜 / 我的） */

  function showPage(index) {
    pageBoard.style.display = (index === 0) ? 'block' : 'none';
    pageRank.classList.toggle('show', index === 1);
    pageMineEl.classList.toggle('show', index === 2);
    if (index === 1) { pageRank.style.height = window.innerHeight + 'px'; }
    if (index === 2) { pageMineEl.style.height = window.innerHeight + 'px'; renderMine(); startPetBlink(); }
    else { stopPetBlink(); }
    var open = (index !== 0);
    if (open !== overlayOpen) {
      overlayOpen = open;
      /* 原生侧 rankOpen 语义 = 不在看板页，用于系统返回键与添加按钮显隐 */
      if (window.TankanBridge) { window.TankanBridge.setRankOpen(open); }
    }
  }

  /* 原生底部导航调用：0 看板 / 1 排行榜 / 2 我的 */
  window.switchNav = function (index) {
    showPage(index);
  };

  /* 原生系统返回键：AI / 详情 / 宿舍 / 答题优先，其次排行榜/我的回看板 */
  window.handleSystemBack = function () {
    var gm = document.getElementById('goalModal');
    if (gm && gm.style.display === 'flex') { closeGoalModal(); return; }
    /* 各覆盖页：动画句柄丢失（sheet=null）时强制关闭，保证返回永远可达 */
    if (aiOpen) {
      if (sheet) { commitSheet(sheet); } else { finalizeAi(); }
    } else if (detailOpen) {
      if (sheet) { commitSheet(sheet); } else { closeDetail(); }
    } else if (dormOpen) {
      if (sheet) { commitSheet(sheet); } else { finalizeDorm(); }
    } else if (quizOpen) {
      if (sheet) { commitSheet(sheet); } else { finalizeQuiz(); }
    } else if (addOpen) {
      if (sheet) { commitSheet(sheet); } else { finalizeAdd(); }
    } else if (mallOpen) {
      if (sheet) { commitSheet(sheet); } else { finalizeMall(); }
    } else if (overlayOpen) {
      showPage(0);
      if (window.TankanBridge) { window.TankanBridge.setNavIndex(0); }
    }
  };

  /* 原生「添加电器」：打开设备目录侧滑页 */
  window.onAddClick = function () { window.openAddDevice(); };

  /* 原生详情页「更多」菜单（保留空实现，菜单由原生 Compose 承载） */
  window.onMoreClick = function () {};

  /* ============================================================
     原生桥：电器参数读取 / 保存 / 删除设备
     ============================================================ */
  window.getCurrentDetailIdx = function () {
    var i = parseInt(detailBody.dataset.idx, 10);
    return isNaN(i) ? -1 : i;
  };

  /* 原生「电器详情」对话框打开时读取参数（仅电压 / 电流） */
  window.getApplianceParams = function (idx) {
    var it = APPLIANCES[idx];
    if (!it) { return null; }
    return {
      idx: idx, name: it.name,
      voltage: it.voltage, currentA: it.currentA
    };
  };

  /* 原生保存参数：p 为 JSON 字符串或对象 */
  window.saveApplianceParams = function (idx, p) {
    try {
      var data = typeof p === 'string' ? JSON.parse(p) : p;
      var it = APPLIANCES[idx];
      if (!it || !data) { return false; }
      var v = parseInt(data.voltage, 10);
      if ([5, 220, 380].indexOf(v) >= 0) { it.voltage = v; }
      var a = parseInt(data.currentA, 10);
      if ([1, 3, 10, 16].indexOf(a) >= 0) { it.currentA = a; }
      rerenderGrid();
      if (detailOpen && parseInt(detailBody.dataset.idx, 10) === idx) {
        rebuildDetailKeepScroll(idx);
      }
      toast('电器参数已保存');
      return true;
    } catch (err) {
      return false;
    }
  };

  /* 原生删除设备：先关详情页，再移除数据、重建看板 */
  window.deleteAppliance = function (idx) {
    console.log('DEL-CALL idx=' + idx + '\n' + (new Error().stack || ''));
    if (!APPLIANCES[idx]) { console.log('DEL-ABORT no item at idx'); return false; }
    var nm = APPLIANCES[idx].name;
    var catId = APPLIANCES[idx].catId;
    /* 先关详情页再动数据：即使后续重建网格出错，页面也已返回主界面不卡死 */
    if (detailOpen) {
      if (sheet) { cancelSheetAnim(sheet); sheet = null; clearSheet(pageDetail); }
      finalizeDetail();
    }
    APPLIANCES.splice(idx, 1);
    if (catId) {
      var p = addedIds.indexOf(catId);
      if (p >= 0) { addedIds.splice(p, 1); store.set('added', addedIds); }
    }
    console.log('WRITE-DEL ' + JSON.stringify(addedIds));
    try { rerenderGrid(); } catch (err) { console.log('DEL-RERENDER-ERR ' + (err && err.message)); }
    toast('已删除设备：' + nm);
    return true;
  };

  /* 键盘（IME）高度：原生按 WindowInsets.Type.ime() 注入 --kb；
     再用 visualViewport 兜底（原生未派发 IME inset 时也能跟随键盘上浮）。 */
  (function () {
    var nativeKb = 0;
    function applyKb() {
      var kb = nativeKb;
      var vv = window.visualViewport;
      if (vv) {
        kb = Math.max(kb, window.innerHeight - vv.height - vv.offsetTop);
      }
      if (kb < 0) { kb = 0; }
      if (document.documentElement) {
        document.documentElement.style.setProperty('--kb', Math.round(kb) + 'px');
      }
    }
    window.__setKb = function (px) { nativeKb = px || 0; applyKb(); };
    var vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', applyKb);
      vv.addEventListener('scroll', applyKb);
    }
  })();

  /* 视口变化时，修正覆盖页显式高度（该 WebView 对 inset:0 的重算不可靠） */
  window.addEventListener('resize', function () {
    var vh = window.innerHeight;
    pageBoard.style.height = vh + 'px';
    if (detailOpen) { pageDetail.style.height = vh + 'px'; }
    if (dormOpen) { pageDorm.style.height = vh + 'px'; }
    if (quizOpen) { pageQuiz.style.height = vh + 'px'; }
    if (addOpen) { pageAdd.style.height = vh + 'px'; }
    if (aiOpen) { pageAi.style.height = vh + 'px'; }
    if (mallOpen) { pageMall.style.height = vh + 'px'; }
    if (pageRank.classList.contains('show')) { pageRank.style.height = vh + 'px'; }
    if (pageMine.classList.contains('show')) { pageMine.style.height = vh + 'px'; }
  });

  /* ---------- 初始 ---------- */
  renderGrid();
  updateOverview();
  renderRank('class');

  /* 该 WebView 首帧合成缺陷：看板首个子元素（标题区）会被固定背景层压住不绘制。
     显式设高度并做一次 display 重排，强制重建合成层后恢复正常。 */
  pageBoard.style.height = window.innerHeight + 'px';
  pageBoard.style.display = 'none';
  void pageBoard.offsetHeight;
  pageBoard.style.display = 'block';
})();
