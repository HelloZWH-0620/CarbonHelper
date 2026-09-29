/* ============================================================
   碳看版 · 看板页 + 电器详情页
   双列电器卡片 · 指标随机错峰轮播 · 详情页跳转
   ============================================================ */

(function () {
  'use strict';

  /* ---------- 数据 ---------- */
  var APPLIANCES = [
    {
      name: '空调', img: 'img/aircondition.png',
      today: '5小时', month: '18.6度', carbon: '10.8 KG',
      slots: [0.3, 0.2, 0.5, 1.4, 2.3, 1.9, 0.8, 0.4],   // 8个时段 kWh
      trend: [2.4, 2.1, 2.8, 3.2, 2.2, 2.6, 3.0],      // 近7日 kWh
      carbonToday: '2.4 KG', carbonDelta: '较昨日 ↓ 11%', carbonNote: '本月碳排占宿舍目标的 55%，表现良好',
      acts: [['空调保持26℃运行', '已达成'], ['单次使用不超过3小时', '已达成'], ['睡前自动关闭', '待达成']],
      tips: ['空调温度每调高1℃可省电约7%', '使用定时功能避免整夜运转', '每月清洗滤网可提升制冷效率']
    },
    {
      name: '热水器', img: 'img/hotwater.png',
      today: '20分钟', month: '4.2度', carbon: '2.4 KG',
      slots: [0.1, 0.1, 0.6, 0.2, 0.2, 0.4, 1.9, 0.7],
      trend: [0.5, 0.6, 0.4, 0.8, 0.5, 0.9, 0.6],
      carbonToday: '0.6 KG', carbonDelta: '较昨日 ↓ 25%', carbonNote: '集中在傍晚使用，节能效果明显',
      acts: [['烧水后及时断电', '已达成'], ['水温设定不超过60℃', '已达成'], ['避开用电高峰', '待达成']],
      tips: ['热水器保温耗电约为重新加热的60%', '用完及时断电更省电', '夏季水温可调低5℃']
    },
    {
      name: '电脑', img: 'img/computer.png',
      today: '6小时30分', month: '9.1度', carbon: '5.3 KG',
      slots: [0.4, 0.3, 1.1, 0.8, 1.5, 1.2, 0.9, 1.3],
      trend: [1.1, 0.9, 1.4, 1.2, 1.6, 1.0, 1.3],
      carbonToday: '1.7 KG', carbonDelta: '较昨日 ↑ 6%', carbonNote: '午后与晚间使用较多',
      acts: [['闲置自动息屏', '已达成'], ['不长时间挂机下载', '已达成'], ['深夜关闭电源', '待达成']],
      tips: ['屏幕亮度降低20%约省电10%', '休眠模式比屏保更省电', '充电器不使用时拔下']
    },
    {
      name: '灯', img: 'img/light.png',
      today: '9小时', month: '6.1度', carbon: '3.5 KG',
      slots: [0.1, 0.1, 0.3, 0.4, 0.5, 0.6, 0.7, 0.5],
      trend: [0.7, 0.8, 0.6, 0.9, 0.7, 0.8, 1.0],
      carbonToday: '1.1 KG', carbonDelta: '较昨日 ↓ 8%', carbonNote: '夜晚照明为主，白天充分利用自然光',
      acts: [['白天不开灯', '已达成'], ['人走灯灭', '已达成'], ['睡前定时关闭', '待达成']],
      tips: ['LED灯比白炽灯省电80%以上', '充分利用自然光', '出门记得随手关灯']
    }
  ];

  var METRICS = [
    { k: '使用时长', key: 'today' },
    { k: '当月用电', key: 'month' },
    { k: '日碳排放', key: 'carbon' }
  ];
  var SLOT_LABELS = ['0-3时', '3-6时', '6-9时', '9-12时', '12-15时', '15-18时', '18-21时', '21-24时'];
  var DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

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
        '<div class="app-pic"><img src="' + item.img + '" alt="' + item.name + '"></div>' +
        '<p class="app-name">' + item.name + '</p>' +
        '<div class="app-metric">' +
        '  <span class="metric-label"></span>' +
        '  <span class="metric-val"></span>' +
        '</div>';
      grid.appendChild(card);

      var m0 = METRICS[Math.floor(Math.random() * METRICS.length)];
      card.querySelector('.metric-label').textContent = m0.k;
      card.querySelector('.metric-val').textContent = item[m0.key];

      /* 每张卡片随机起始时间与随机间隔，错峰轮播 */
      timers.push(setTimeout(function () { rotateMetric(card, item); }, 1200 + Math.random() * 2400));
    });
  }

  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.app-card');
    if (!card) return;
    openDetail(parseInt(card.dataset.idx, 10));
  });

  /* ============================================================
     详情页
     ============================================================ */
  var pageDetail = document.getElementById('pageDetail');
  var detailBody = document.getElementById('detailBody');

  function openDetail(idx) {
    var item = APPLIANCES[idx];
    detailBody.innerHTML =
      '<div class="detail-hero">' +
      '  <div class="hero-pic"><img src="' + item.img + '" alt="' + item.name + '"></div>' +
      '  <p class="hero-name">' + item.name + '</p>' +
      '  <p class="hero-sub">今日使用 ' + item.today + ' · 当月 ' + item.month + '</p>' +
      '</div>' +
      '<div class="detail-cards">' +
      slotsCard(item) +
      trendCard(item) +
      carbonCard(item) +
      actsCard(item) +
      tipsCard(item) +
      '</div>';
    pageDetail.scrollTop = 0;
    pageDetail.classList.add('open');
  }

  function card(title, inner) {
    return '<div class="card dcard"><p class="dcard-title">' + title + '</p>' + inner + '</div>';
  }

  /* 卡片1：本日用电时段统计（横式柱状） */
  function slotsCard(item) {
    var max = Math.max.apply(null, item.slots);
    var rows = item.slots.map(function (v, i) {
      var w = Math.max(10, Math.round(v / max * 100));
      var hot = (v === max) ? ' hot' : '';
      return '<div class="slot">' +
        '<span class="slot-label">' + SLOT_LABELS[i] + '</span>' +
        '<div class="slot-track"><div class="slot-fill' + hot + '" style="width:' + w + '%"></div></div>' +
        '<span class="slot-val">' + v + '度</span>' +
        '</div>';
    }).join('');
    return card('本日用电时段统计', '<div class="slot-list">' + rows + '</div>');
  }

  /* 卡片2：近7日用电趋势 */
  function trendCard(item) {
    var max = Math.max.apply(null, item.trend);
    var cols = item.trend.map(function (v, i) {
      var h = Math.max(14, Math.round(v / max * 100));
      return '<div class="tcol">' +
        '<div class="tbar" style="height:' + h + '%"><span class="tval">' + v + '</span></div>' +
        '<span class="tday">周' + DAY_LABELS[i] + '</span>' +
        '</div>';
    }).join('');
    return card('近7日用电趋势', '<div class="trend">' + cols + '</div>');
  }

  /* 卡片3：今日碳排放（环形 + 说明） */
  function carbonCard(item) {
    var pct = 55;
    var C = 264;
    return card('今日碳排放',
      '<div class="carbon">' +
      '  <div style="position:relative;width:7.2rem;height:7.2rem">' +
      '    <svg class="ring" viewBox="0 0 100 100">' +
      '      <circle class="ring-bg" cx="50" cy="50" r="42"/>' +
      '      <circle class="ring-fg" cx="50" cy="50" r="42" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct / 100)) + '"/>' +
      '    </svg>' +
      '    <div class="carbon-in" style="inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">' +
      '      <span class="carbon-v">' + item.carbonToday + '</span>' +
      '      <span class="carbon-d">' + item.carbonDelta + '</span>' +
      '    </div>' +
      '  </div>' +
      '  <p class="carbon-extra">' + item.carbonNote + '</p>' +
      '</div>');
  }

  /* 卡片4：低碳行为打卡 */
  function actsCard(item) {
    var rows = item.acts.map(function (a) {
      var done = a[1] === '已达成';
      return '<div class="act">' +
        '<span class="act-check' + (done ? ' done' : '') + '">✓</span>' +
        '<span class="act-name">' + a[0] + '</span>' +
        '<span class="act-state">' + a[1] + '</span>' +
        '</div>';
    }).join('');
    return card('低碳行为打卡', '<div class="act-list">' + rows + '</div>');
  }

  /* 卡片5：节能建议 */
  function tipsCard(item) {
    var rows = item.tips.map(function (t) {
      return '<div class="tip"><span class="tip-dot"></span><span>' + t + '</span></div>';
    }).join('');
    return card('节能建议', '<div class="tip-list">' + rows + '</div>');
  }

  /* 返回按钮（more 暂不生效） */
  document.getElementById('btnBack').addEventListener('click', function () {
    pageDetail.classList.remove('open');
  });

  /* ============================================================
     底部导航（居中悬浮）：仅切换选中态，未设计页面不跳转
     ============================================================ */
  var navItems = document.querySelectorAll('.float-nav .nav-item');
  navItems.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!btn.classList.contains('active')) {
        navItems.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      }
    });
  });

  /* ---------- 初始 ---------- */
  renderGrid();
})();
