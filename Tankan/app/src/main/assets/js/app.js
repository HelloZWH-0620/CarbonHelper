/* ============================================================
   碳看版 · 看板页逻辑
   瀑布流电器卡片 · 上下跟手切换轮播
   ============================================================ */

(function () {
  'use strict';

  var APPLIANCES = [
    { name: '空调',   img: 'img/aircondition.png', today: '5小时',   month: '18.6度', carbon: '10.8 KG' },
    { name: '热水器', img: 'img/hotwater.png',     today: '20分钟',  month: '4.2度',  carbon: '2.4 KG'  },
    { name: '电脑',   img: 'img/computer.png',     today: '6小时30分', month: '9.1度', carbon: '5.3 KG'  },
    { name: '灯',     img: 'img/light.png',        today: '9小时',   month: '6.1度',  carbon: '3.5 KG'  }
  ];

  var stage = document.getElementById('stage');

  /* ---------- 渲染卡片 ---------- */
  var cards = APPLIANCES.map(function (item) {
    var el = document.createElement('article');
    el.className = 'card-app';
    el.innerHTML =
      '<div class="pic"><img src="' + item.img + '" alt="' + item.name + '"></div>' +
      '<p class="name">' + item.name + '</p>' +
      '<div class="stats">' +
      '  <div class="stat"><div class="k">今日时长</div><div class="v">' + item.today + '</div></div>' +
      '  <div class="stat"><div class="k">当月用电</div><div class="v">' + item.month + '</div></div>' +
      '  <div class="stat"><div class="k">碳排放</div><div class="v">' + item.carbon + '</div></div>' +
      '</div>';
    stage.appendChild(el);
    return el;
  });

  var N = cards.length;

  /* ---------- 轮播状态 ---------- */
  var idx = 0;            // 当前置顶卡片索引
  var cardH = 0, peek = 0;
  var dragging = false, startY = 0, dragBase = 0, drag = 0;
  var lastY = 0, lastT = 0, vel = 0;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* 上下两端施加阻尼，产生“跟手 + 回弹”手感 */
  function applyResistance(raw) {
    if (idx === 0 && raw > 0) return raw * 0.35;
    if (idx === N - 1 && raw < 0) return raw * 0.35;
    return raw;
  }

  function layout() {
    var H = stage.clientHeight;
    if (H <= 0) { requestAnimationFrame(layout); return; }
    peek = Math.min(56, H * 0.16);
    cardH = H - peek * 2;
    place();
  }

  function place() {
    for (var i = 0; i < N; i++) {
      var y = peek + (i - idx) * cardH + drag;
      cards[i].style.height = cardH + 'px';
      cards[i].style.transform = 'translate3d(0,' + y + 'px,0)';
    }
  }

  function snap(animated) {
    cards.forEach(function (c) {
      c.style.transition = animated ? 'transform .45s cubic-bezier(.2,.8,.2,1)' : 'none';
    });
    place();
    if (animated) {
      setTimeout(function () {
        cards.forEach(function (c) { c.style.transition = 'none'; });
      }, 500);
    }
  }

  /* ---------- 指针事件（跟手） ---------- */
  stage.addEventListener('pointerdown', function (e) {
    if (N === 0) return;
    dragging = true;
    startY = e.clientY; lastY = e.clientY;
    lastT = performance.now(); vel = 0;
    dragBase = drag;
    snap(false);
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
  });

  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var now = performance.now();
    var dy = e.clientY - lastY;
    var dt = now - lastT;
    if (dt > 0) { vel = 0.65 * vel + 0.35 * (dy / dt); }
    lastY = e.clientY; lastT = now;
    drag = applyResistance(dragBase + (e.clientY - startY));
    place();
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    var moved = e.clientY - startY;

    var delta = Math.round(moved / cardH);
    if (Math.abs(vel) > 0.45) {
      delta += vel > 0 ? 1 : -1;
    }
    idx = clamp(idx - delta, 0, N - 1);
    drag = 0;
    snap(true);
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  /* ---------- 底部导航按钮（看板页内无跳转，仅状态呈现） ---------- */
  var navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!btn.classList.contains('active')) {
        navItems.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      }
    });
  });

  /* ---------- 初始布局与尺寸变化 ---------- */
  layout();
  window.addEventListener('resize', function () {
    drag = 0;
    layout();
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () { drag = 0; layout(); }, 120);
  });
})();
