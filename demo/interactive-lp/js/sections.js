(function () {
  var B = window.BRAND;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = {};

  function setSeen(id, isIntersecting) {
    if (id) {
      seen[id] = !!isIntersecting;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatPhrases(str) {
    if (!str) return '';
    // 「\n」はそこで必ず改行する
    if (String(str).indexOf('\n') !== -1) {
      return String(str).split('\n').map(formatPhrases).join('<br>');
    }
    var parts = String(str).split('|');
    if (parts.length === 1) return escapeHtml(str);
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      out += '<span class="ph">' + escapeHtml(parts[i]) + '</span>';
    }
    return out;
  }

  function renderTitle(el, titleArr) {
    if (!el || !titleArr) return;
    var html = '';
    for (var i = 0; i < titleArr.length; i++) {
      var seg = titleArr[i];
      var text = escapeHtml(seg.t || '');
      if (seg.mark) {
        html += '<span class="mk">' + text + '</span>';
      } else {
        html += text;
      }
      if (seg.br) {
        html += '<br>';
      }
    }
    el.innerHTML = html;
  }

  function smoothScrollTo(selector) {
    var target = document.querySelector(selector);
    if (!target) return;
    var headerOffset = 54;
    var rect = target.getBoundingClientRect();
    var top = rect.top + window.pageYOffset - headerOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  /* =========================================================
     #1 ヒーロー & #1b 案内カード2枚
  ========================================================= */
  function initHero() {
    var subEl = document.getElementById('hero-sub');
    var titleEl = document.getElementById('hero-title');
    var bodyEl = document.getElementById('hero-body');
    var cardsWrap = document.getElementById('hero-cards');
    var chakoBtn = document.getElementById('chako');
    var chakoImg = document.getElementById('chakoImg');
    var bubbleEl = document.getElementById('bubble');

    if (subEl && B.hero.sub) subEl.textContent = B.hero.sub;
    renderTitle(titleEl, B.hero.title);
    if (bodyEl) bodyEl.innerHTML = formatPhrases(B.hero.body);
    if (bubbleEl && B.chakoInitialBubble) {
      bubbleEl.textContent = B.chakoInitialBubble;
    }

    if (B.hero.words && B.hero.words.length === 4) {
      for (var w = 0; w < 4; w++) {
        var wEl = document.getElementById('hero-w' + (w + 1));
        if (wEl) wEl.textContent = B.hero.words[w];
      }
    }

    // 3ポーズの先読み
    var poses = ['idle', 'cheer', 'point'];
    for (var p = 0; p < poses.length; p++) {
      var pre = new Image();
      pre.src = 'assets/chako/' + poses[p] + '.webp';
    }

    // 案内カード2枚（#1b）
    if (cardsWrap && B.hero.cards) {
      var cardsHtml = '';
      for (var i = 0; i < B.hero.cards.length; i++) {
        var c = B.hero.cards[i];
        var mod = i === 0 ? 'guide-card--01' : 'guide-card--02';
        cardsHtml +=
          '<button type="button" class="guide-card ' + mod + '" data-target="' + escapeHtml(c.target) + '">' +
            '<div class="guide-card-left">' +
              '<span class="guide-num">' + escapeHtml(c.num) + '</span>' +
              '<div class="guide-meta">' +
                '<span class="guide-badge">' + escapeHtml(c.badge) + '</span>' +
                '<span class="guide-text">' + formatPhrases(c.text) + '</span>' +
              '</div>' +
            '</div>' +
            '<span class="guide-arrow" aria-hidden="true">→</span>' +
          '</button>';
      }
      cardsWrap.innerHTML = cardsHtml;
      var btns = cardsWrap.querySelectorAll('.guide-card');
      for (var j = 0; j < btns.length; j++) {
        btns[j].addEventListener('click', function () {
          var target = this.getAttribute('data-target');
          if (window.Sound) window.Sound.playPop(640);
          smoothScrollTo(target);
        });
      }
    }

    // ちゃこタップ（5パターン順番ループ）
    var seq = B.chakoTapSequence || [
      { text: 'うれしい！', pose: 'cheer' },
      { text: 'カードを選んでみてね', pose: 'point' },
      { text: 'ふふん♪', pose: 'idle' },
      { text: 'また遊ぼうね！', pose: 'cheer' },
      { text: '下に絵があるよ', pose: 'point' }
    ];
    var tapIdx = 0;
    var revertTimer = null;

    if (chakoBtn && chakoImg && bubbleEl) {
      chakoBtn.addEventListener('click', function () {
        var voiceKey = 'v0' + ((tapIdx % seq.length) + 1);
        var item = seq[tapIdx % seq.length];
        tapIdx++;
        chakoImg.src = 'assets/chako/' + item.pose + '.webp';
        bubbleEl.textContent = item.text;

        chakoBtn.classList.remove('hit');
        bubbleEl.classList.remove('pop');
        void chakoBtn.offsetWidth;
        chakoBtn.classList.add('hit');
        bubbleEl.classList.add('pop');

        if (window.Sound) {
          window.Sound.playBoyon();
          window.Sound.playVoice(voiceKey, 0.12);
        }

        setTimeout(function () {
          chakoBtn.classList.remove('hit');
          bubbleEl.classList.remove('pop');
        }, 200);

        if (revertTimer) clearTimeout(revertTimer);
        revertTimer = setTimeout(function () {
          chakoImg.src = 'assets/chako/idle.webp';
        }, 2200);
      });
    }
  }

  /* =========================================================
     #2 ことばカード（選ぶ＋シャッター）
  ========================================================= */
  function initSec2() {
    renderTitle(document.getElementById('sec2-title'), B.sec2.title);
    var bodyEl = document.getElementById('sec2-body');
    var captionEl = document.getElementById('sec2-caption');
    if (bodyEl) bodyEl.innerHTML = formatPhrases(B.sec2.body);
    if (captionEl) captionEl.innerHTML = formatPhrases(B.sec2.caption);

    var subjRow = document.getElementById('subject-cards-row');
    var placeRow = document.getElementById('place-cards-row');
    var selectedSubject = 'chako';
    var selectedPlace = 'cafe';

    function renderGroup(rowEl, items, groupName, currentId) {
      if (!rowEl) return;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'word-card' + (it.id === currentId ? ' is-selected' : '');
        btn.setAttribute('data-group', groupName);
        btn.setAttribute('data-id', it.id);
        btn.textContent = it.label;
        rowEl.appendChild(btn);
      }
    }

    renderGroup(subjRow, B.sec2.subjects, 'subject', selectedSubject);
    renderGroup(placeRow, B.sec2.places, 'place', selectedPlace);

    var allCards = document.querySelectorAll('#sec-2 .word-card');
    for (var i = 0; i < allCards.length; i++) {
      allCards[i].addEventListener('click', function () {
        var group = this.getAttribute('data-group');
        var id = this.getAttribute('data-id');
        if (group === 'subject') {
          selectedSubject = id;
        } else {
          selectedPlace = id;
        }
        var siblings = this.parentNode.querySelectorAll('.word-card');
        for (var k = 0; k < siblings.length; k++) {
          siblings[k].classList.toggle('is-selected', siblings[k] === this);
        }
        if (window.Sound) window.Sound.playPop(560);
      });
    }

    var shutterBtn = document.getElementById('shutter-btn');
    var flashOverlay = document.getElementById('flash-overlay');
    var workImgs = document.querySelectorAll('#photo-frame .work-img');

    if (shutterBtn) {
      shutterBtn.addEventListener('click', function () {
        // 出てきた絵に合わせて、ちゃこのセリフを変える（その声がなければ v06）
        var comboVoice = { chako_cafe: 'v10', chako_stars: 'v11', cat_cafe: 'v12', cat_stars: 'v13' };
        var nextCombo = selectedSubject + '_' + selectedPlace;
        if (window.Sound) {
          window.Sound.playShutter();
          if (!window.Sound.playVoice(comboVoice[nextCombo], 0.45)) {
            window.Sound.playVoice('v06', 0.45);
          }
        }
        shutterBtn.classList.add('is-pressed');
        setTimeout(function () {
          shutterBtn.classList.remove('is-pressed');
        }, 140);

        if (flashOverlay) {
          flashOverlay.classList.add('is-flash');
          setTimeout(function () {
            flashOverlay.classList.remove('is-flash');
          }, 90);
        }

        var combo = selectedSubject + '_' + selectedPlace;
        for (var m = 0; m < workImgs.length; m++) {
          var isMatch = workImgs[m].getAttribute('data-combo') === combo;
          workImgs[m].classList.toggle('is-active', isMatch);
        }
      });
    }
  }

  /* =========================================================
     #3 数字で見るスクール
  ========================================================= */
  function initSec3() {
    var grid = document.getElementById('stats-grid');
    if (!grid || !B.sec3 || !B.sec3.items) return;

    var html = '';
    for (var i = 0; i < B.sec3.items.length; i++) {
      var it = B.sec3.items[i];
      html +=
        '<div class="stat-surface">' +
          '<div class="stat-value">' +
            escapeHtml(it.prefix) +
            '<span class="stat-num" data-target="' + it.target + '">0</span>' +
            escapeHtml(it.suffix) +
          '</div>' +
          '<div class="stat-label">' + formatPhrases(it.label) + '</div>' +
        '</div>';
    }
    grid.innerHTML = html;

    var counted = false;
    function startCountUp() {
      if (counted) return;
      counted = true;
      var nums = grid.querySelectorAll('.stat-num');
      var duration = reduceMotion ? 16 : 1100;
      var startTime = performance.now();

      function tick(now) {
        var t = Math.min(1, (now - startTime) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        for (var j = 0; j < nums.length; j++) {
          var targetVal = parseInt(nums[j].getAttribute('data-target'), 10) || 0;
          nums[j].textContent = String(Math.round(targetVal * eased));
        }
        if (t < 1) {
          requestAnimationFrame(tick);
        }
      }
      requestAnimationFrame(tick);
    }

    var sec3 = document.getElementById('sec-3');
    if (sec3 && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e++) {
          if (entries[e].isIntersecting) {
            startCountUp();
            io.disconnect();
            break;
          }
        }
      }, { threshold: 0.25 });
      io.observe(sec3);
    } else {
      startCountUp();
    }
  }

  /* =========================================================
     #4 3つの変化（打消し線→変化が浮き出る）
  ========================================================= */
  function initSec4() {
    var stack = document.getElementById('changes-stack');
    if (!stack || !B.sec4 || !B.sec4.cards) return;

    var html = '';
    for (var i = 0; i < B.sec4.cards.length; i++) {
      var c = B.sec4.cards[i];
      html +=
        '<div class="change-surface">' +
          '<div class="change-head">' +
            '<span class="change-num">' + escapeHtml(c.num) + '</span>' +
            '<span class="worry-wrap">' +
              formatPhrases(c.front) +
              '<i class="strike-line" aria-hidden="true"></i>' +
            '</span>' +
          '</div>' +
          '<div class="change-after">' +
            '<span class="change-arrow" aria-hidden="true">→</span>' +
            '<span>' + formatPhrases(c.back) + '</span>' +
          '</div>' +
        '</div>';
    }
    stack.innerHTML = html;

    var surfaces = stack.querySelectorAll('.change-surface');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e++) {
          if (entries[e].isIntersecting) {
            entries[e].target.classList.add('is-revealed');
          }
        }
      }, { threshold: 0.35 });
      for (var j = 0; j < surfaces.length; j++) {
        io.observe(surfaces[j]);
      }
    } else {
      for (var k = 0; k < surfaces.length; k++) {
        surfaces[k].classList.add('is-revealed');
      }
    }
  }

  /* =========================================================
     #5 30日ロードマップ（スクロール連動・音なし）
  ========================================================= */
  function initSec5() {
    renderTitle(document.getElementById('sec5-title'), B.sec5.title);
    var accentEl = document.getElementById('sec5-accent');
    var prefixEl = document.getElementById('roadmap-dial-prefix');
    var dayNumEl = document.getElementById('roadmap-day-num');
    var stepsWrap = document.getElementById('roadmap-steps');
    var railEl = document.getElementById('timeline-rail');
    var fillEl = document.getElementById('timeline-line-fill');

    if (accentEl) accentEl.textContent = B.sec5.accent;
    if (prefixEl && B.sec5.dialPrefix) prefixEl.textContent = B.sec5.dialPrefix;

    if (stepsWrap && B.sec5.steps) {
      var html = '';
      for (var i = 0; i < B.sec5.steps.length; i++) {
        var s = B.sec5.steps[i];
        html +=
          '<div class="roadmap-step">' +
            '<span class="step-day">' + escapeHtml(s.day) + '</span>' +
            '<span class="step-label">' + escapeHtml(s.label) + '</span>' +
          '</div>';
      }
      stepsWrap.innerHTML = html;
    }

    var stepEls = stepsWrap ? stepsWrap.querySelectorAll('.roadmap-step') : [];

    var surfaceEl = railEl ? railEl.closest('.roadmap-surface') : null;
    var litAt = [2, 11, 21];
    var roadmapRaf = 0;

    function drawRoadmap() {
      roadmapRaf = 0;
      if (!surfaceEl) return;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var startY = vh * 0.8;
      var endY = vh * 0.08;
      var top = surfaceEl.getBoundingClientRect().top;
      var p = Math.max(0, Math.min(1, (startY - top) / (startY - endY)));
      var day = Math.max(1, Math.min(30, Math.round(1 + p * 29)));

      if (fillEl) fillEl.style.transform = 'scaleY(' + p.toFixed(3) + ')';
      if (dayNumEl) dayNumEl.textContent = String(day);
      for (var i = 0; i < stepEls.length; i++) {
        stepEls[i].classList.toggle('is-lit', day >= litAt[i]);
      }
    }

    function updateRoadmap() {
      if (!roadmapRaf) roadmapRaf = requestAnimationFrame(drawRoadmap);
    }

    window.addEventListener('scroll', updateRoadmap, { passive: true });
    window.addEventListener('resize', updateRoadmap);
    drawRoadmap();
  }

  /* =========================================================
     #6 キャラクター設計シート（指でくるっと回す）
  ========================================================= */
  function initSec6() {
    renderTitle(document.getElementById('sec6-title'), B.sec6.title);
    var bodyEl = document.getElementById('sec6-body');
    var hintEl = document.getElementById('sec6-hint');
    var notesWrap = document.getElementById('sec6-notes');
    var angleLabel = document.getElementById('turn-angle-label');
    var stageEl = document.getElementById('turn-stage');
    var dotsWrap = document.getElementById('turn-dots');
    var imgs = document.querySelectorAll('#turn-stack .turn-img');

    if (bodyEl) bodyEl.innerHTML = formatPhrases(B.sec6.body);
    if (hintEl && B.sec6.hint) hintEl.textContent = '↔ ' + B.sec6.hint;

    if (notesWrap && B.sec6.backNotes) {
      var nHtml = '';
      for (var i = 0; i < B.sec6.backNotes.length; i++) {
        nHtml += '<span class="sheet-note-pill">' + escapeHtml(B.sec6.backNotes[i]) + '</span>';
      }
      notesWrap.innerHTML = nHtml;
    }

    // 8枚の先読み
    var turnFiles = ['000', '045', '090', '135', '180', '225', '270', '315'];
    for (var f = 0; f < turnFiles.length; f++) {
      var pre = new Image();
      pre.src = 'assets/turn/turn_' + turnFiles[f] + '.webp';
    }

    // 8ドット生成
    var dotEls = [];
    if (dotsWrap) {
      var dHtml = '';
      for (var d = 0; d < 8; d++) {
        dHtml += '<span class="turn-dot' + (d === 0 ? ' is-active' : '') + '"></span>';
      }
      dotsWrap.innerHTML = dHtml;
      dotEls = dotsWrap.querySelectorAll('.turn-dot');
    }

    var currentFrame = 0;
    var userTouched = false;
    var isDragging = false;
    var lastX = 0;
    var lastMoveTime = 0;
    var accumDx = 0;
    var velocity = 0;
    var inertiaRaf = null;
    var STEP_PX = 36;
    var MAX_V = 24;
    var spunFrames = 0;
    var spunVoice = false;
    var stageSeen = false;

    function setTurnFrame(nextIdx, withSound) {
      var norm = ((nextIdx % 8) + 8) % 8;
      if (norm === currentFrame) return;
      currentFrame = norm;
      for (var i = 0; i < imgs.length; i++) {
        imgs[i].classList.toggle('is-active', i === currentFrame);
      }
      for (var j = 0; j < dotEls.length; j++) {
        dotEls[j].classList.toggle('is-active', j === currentFrame);
      }
      if (angleLabel) {
        angleLabel.textContent = (currentFrame * 45) + '°';
      }
      if (withSound && window.Sound) {
        window.Sound.playTick();
        spunFrames++;
        if (spunFrames === 3 && !spunVoice) {
          spunVoice = true;
          window.Sound.playVoice('v07', 0.1);
        }
      }
    }

    function stopInertia() {
      if (inertiaRaf) {
        cancelAnimationFrame(inertiaRaf);
        inertiaRaf = null;
      }
      velocity = 0;
    }

    function consumeAccumDx(withSound) {
      while (Math.abs(accumDx) >= STEP_PX) {
        var dir = accumDx > 0 ? 1 : -1;
        accumDx -= dir * STEP_PX;
        setTurnFrame(currentFrame + dir, withSound);
      }
    }

    function startInertia() {
      if (inertiaRaf) cancelAnimationFrame(inertiaRaf);
      inertiaRaf = null;
      function stepInertia() {
        if (Math.abs(velocity) < 0.5) {
          inertiaRaf = null;
          velocity = 0;
          return;
        }
        accumDx += velocity;
        velocity *= 0.92;
        consumeAccumDx(true);
        inertiaRaf = requestAnimationFrame(stepInertia);
      }
      if (Math.abs(velocity) >= 0.5) {
        inertiaRaf = requestAnimationFrame(stepInertia);
      }
    }

    // 触る前の自動ゆっくり回転（0.45秒ごとに1コマ、一度でもpointerdownしたら永久停止）
    setInterval(function () {
      if (userTouched || reduceMotion || !stageSeen) return;
      setTurnFrame(currentFrame + 1, false);
    }, 450);

    if (stageEl && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        stageSeen = entries[entries.length - 1].isIntersecting;
      }, { threshold: 0.2 }).observe(stageEl);
    } else {
      stageSeen = true;
    }

    if (stageEl) {
      stageEl.addEventListener('pointerdown', function (e) {
        userTouched = true;
        stopInertia();
        isDragging = true;
        lastX = e.clientX;
        lastMoveTime = performance.now();
        accumDx = 0;
        velocity = 0;
        try {
          stageEl.setPointerCapture(e.pointerId);
        } catch (err) {}
      });

      stageEl.addEventListener('pointermove', function (e) {
        if (!isDragging) return;
        var now = performance.now();
        var dx = e.clientX - lastX;
        var dt = Math.max(8, now - lastMoveTime);
        var nowV = (dx / dt) * 16.67;
        velocity = velocity * 0.5 + nowV * 0.5;
        lastX = e.clientX;
        lastMoveTime = now;
        accumDx += dx;
        consumeAccumDx(true);
      });

      stageEl.addEventListener('pointerup', function () {
        if (!isDragging) return;
        isDragging = false;
        // 止めてから離したときは回さない
        if (performance.now() - lastMoveTime > 90) velocity = 0;
        velocity = Math.max(-MAX_V, Math.min(MAX_V, velocity));
        startInertia();
      });

      stageEl.addEventListener('pointercancel', function () {
        isDragging = false;
        stopInertia();
      });
    }
  }

  /* =========================================================
     #7 制作の流れ（見本_v3準拠＋完成時キラン音）
  ========================================================= */
  function initSec7() {
    var labelEl = document.getElementById('sec7-label');
    var titleEl = document.getElementById('sec7-title');
    var hintEl = document.getElementById('sec7-hint');
    if (labelEl && B.sec7.label) labelEl.textContent = B.sec7.label;
    renderTitle(titleEl, B.sec7.title);
    if (hintEl && B.sec7.hint) hintEl.textContent = B.sec7.hint;

    var canvas = document.getElementById('canvas');
    var track = document.getElementById('track');
    var blank = document.getElementById('blank');
    var rough = document.getElementById('rough');
    var finalImg = document.getElementById('final');
    var scan = document.getElementById('scan');
    var fill = document.getElementById('fill');
    var thumb = document.getElementById('thumb');
    var cnum = document.getElementById('cnum');
    var ctext = document.getElementById('ctext');
    var stepEls = document.querySelectorAll('#sec7-steps span');
    var scenes = B.sec7.scenes;
    if (!canvas || !track) return;

    var v = 0;
    var touched = false;
    var finished = false;
    var fromUser = false;
    var rafPending = false;
    var lastIdx = -1;

    function clamp(x) {
      return Math.max(0, Math.min(1, x));
    }

    // 前半で線画、後半で完成の絵を左から引く
    function render() {
      rafPending = false;
      var a = clamp(v / 0.5);
      var b = clamp((v - 0.5) / 0.5);
      rough.style.clipPath = 'inset(0 ' + (100 - a * 100) + '% 0 0)';
      finalImg.style.clipPath = 'inset(0 ' + (100 - b * 100) + '% 0 0)';
      var w = v <= 0.5 ? a : b;
      scan.style.transform = 'translateX(' + (w * canvas.clientWidth) + 'px)';
      scan.style.opacity = (v > 0.005 && v < 0.995) ? '1' : '0';
      blank.style.opacity = a > 0.4 ? '0' : '1';
      thumb.style.transform = 'translate(' + (v * (track.clientWidth - thumb.offsetWidth)) + 'px,-50%)';
      fill.style.transform = 'scaleX(' + v + ')';
      track.setAttribute('aria-valuenow', String(Math.round(v * 100)));

      var idx = v < 0.2 ? 0 : (v < 0.75 ? 1 : 2);
      if (idx !== lastIdx) {
        lastIdx = idx;
        for (var i = 0; i < stepEls.length; i++) {
          stepEls[i].classList.toggle('on', i <= idx);
        }
        if (scenes[idx]) {
          cnum.textContent = scenes[idx].num;
          ctext.textContent = scenes[idx].text;
        }
      }

      if (v >= 0.99 && !finished) {
        finished = true;
        canvas.classList.add('done');
        if (fromUser && window.Sound) {
          window.Sound.playSparkle();
          window.Sound.playVoice('v08', 0.35);
        }
      }
      if (v < 0.9 && finished) {
        finished = false;
        canvas.classList.remove('done');
      }
    }

    function requestRender() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(render);
    }

    // 触った場所から動かした分だけ進める。幅の8割なぞると端まで届く
    function drag(el, scale) {
      var id = null;
      var sx = 0;
      var sv = 0;
      el.addEventListener('pointerdown', function (e) {
        id = e.pointerId;
        sx = e.clientX;
        sv = v;
        touched = true;
        fromUser = true;
        lastMoveX = e.clientX;
        lastMoveT = performance.now();
        try {
          el.setPointerCapture(id);
        } catch (err) {}
      });
      var lastMoveX = 0;
      var lastMoveT = 0;
      el.addEventListener('pointermove', function (e) {
        if (e.pointerId !== id) return;
        var before = v;
        v = clamp(sv + (e.clientX - sx) / (el.clientWidth * scale));
        requestRender();
        // 絵が変わっている間だけ、鉛筆でこする音
        var now = performance.now();
        if (window.Sound && v !== before && v < 0.99) {
          var speed = Math.abs(e.clientX - lastMoveX) / Math.max(8, now - lastMoveT);
          window.Sound.scribble(speed / 1.2);
        }
        lastMoveX = e.clientX;
        lastMoveT = now;
      });
      function up(e) {
        if (e.pointerId === id) id = null;
      }
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    }

    drag(canvas, 0.8);
    drag(track, 0.9);

    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') v = clamp(v + 0.05);
      else if (e.key === 'ArrowLeft') v = clamp(v - 0.05);
      else return;
      touched = true;
      fromUser = true;
      e.preventDefault();
      requestRender();
    });

    window.addEventListener('resize', requestRender);
    render();

    if (!reduceMotion) {
      var t0 = performance.now();
      function hintLoop(now) {
        if (touched) return;
        if (seen['sec-7']) {
          var s = Math.sin((now - t0) / 1000 * 1.4);
          v = 0.1 * s * s;
          render();
        }
        requestAnimationFrame(hintLoop);
      }
      requestAnimationFrame(hintLoop);
    }
  }

  /* =========================================================
     #8 作品解剖（3秒ごと自動切替＋手動操作）
  ========================================================= */
  function initSec8() {
    renderTitle(document.getElementById('sec8-title'), B.sec8.title);
    var zoomEl = document.getElementById('decode-zoom');
    var spotEl = document.getElementById('decode-spotlight');
    var pinsWrap = document.getElementById('decode-pins');
    var navWrap = document.getElementById('decode-nav');
    var wordsWrap = document.getElementById('decode-words');
    var points = (B.sec8 && B.sec8.points) || [];

    var pinsHtml = '';
    var navHtml = '';
    var wordsHtml = '';

    for (var i = 0; i < points.length; i++) {
      var pt = points[i];
      pinsHtml +=
        '<button type="button" class="decode-pin" data-id="' + pt.id + '" style="left:' + pt.x + '%;top:' + pt.y + '%" aria-label="' + escapeHtml(pt.nav) + '">' +
          pt.id +
        '</button>';
      navHtml +=
        '<button type="button" class="decode-btn" data-id="' + pt.id + '">' +
          escapeHtml(pt.nav) +
        '</button>';
      wordsHtml +=
        '<span class="decode-word" data-id="' + pt.id + '">＋ ' +
          escapeHtml(pt.word) +
        '</span>';
    }
    navHtml +=
      '<button type="button" class="decode-btn is-active" id="decode-reset" data-id="0">' +
        escapeHtml(B.sec8.resetLabel || '全体') +
      '</button>';

    if (pinsWrap) pinsWrap.innerHTML = pinsHtml;
    if (navWrap) navWrap.innerHTML = navHtml;
    if (wordsWrap) wordsWrap.innerHTML = wordsHtml;

    var navBtns = navWrap ? navWrap.querySelectorAll('.decode-btn') : [];
    var wordEls = wordsWrap ? wordsWrap.querySelectorAll('.decode-word') : [];
    var pinBtns = pinsWrap ? pinsWrap.querySelectorAll('.decode-pin') : [];

    var currentId = 0;
    var manualMode = false;

    function applyDecodeState(id, fromUser) {
      currentId = id;
      for (var i = 0; i < navBtns.length; i++) {
        var bid = parseInt(navBtns[i].getAttribute('data-id'), 10);
        navBtns[i].classList.toggle('is-active', bid === id);
      }
      for (var j = 0; j < wordEls.length; j++) {
        var wid = parseInt(wordEls[j].getAttribute('data-id'), 10);
        wordEls[j].classList.toggle('is-active', wid === id);
      }

      if (id === 0) {
        if (zoomEl) zoomEl.style.transform = 'translate(0%, 0%) scale(1)';
        if (spotEl) spotEl.classList.remove('is-visible');
        if (pinsWrap) pinsWrap.classList.remove('is-zoomed');
      } else {
        var targetPt = null;
        for (var k = 0; k < points.length; k++) {
          if (points[k].id === id) {
            targetPt = points[k];
            break;
          }
        }
        if (targetPt) {
          var box = targetPt.box; // [left, top, width, height]
          var cx = box[0] + box[2] / 2;
          var cy = box[1] + box[3] / 2;
          var tx = Math.max(-12, Math.min(12, (50 - cx) * 0.25));
          var ty = Math.max(-12, Math.min(12, (50 - cy) * 0.25));
          if (zoomEl) {
            zoomEl.style.transform = 'translate(' + tx.toFixed(1) + '%, ' + ty.toFixed(1) + '%) scale(1.25)';
          }
          if (spotEl) {
            spotEl.style.left = box[0] + '%';
            spotEl.style.top = box[1] + '%';
            spotEl.style.width = box[2] + '%';
            spotEl.style.height = box[3] + '%';
            spotEl.classList.add('is-visible');
          }
          if (pinsWrap) {
            pinsWrap.classList.add('is-zoomed');
          }
        }
      }

      if (fromUser && window.Sound) {
        window.Sound.playPop(600);
      }
    }

    for (var n = 0; n < navBtns.length; n++) {
      navBtns[n].addEventListener('click', function () {
        var id = parseInt(this.getAttribute('data-id'), 10) || 0;
        if (id === 0) {
          manualMode = false;
          applyDecodeState(0, true);
        } else {
          manualMode = true;
          applyDecodeState(id, true);
        }
      });
    }

    for (var p = 0; p < pinBtns.length; p++) {
      pinBtns[p].addEventListener('click', function () {
        var id = parseInt(this.getAttribute('data-id'), 10) || 1;
        manualMode = true;
        applyDecodeState(id, true);
      });
    }

    // 3秒ごとに 1→2→3→4→5→全体(0)→1… と自動で進める（音なし）
    setInterval(function () {
      if (manualMode || reduceMotion || !seen['sec-8']) return;
      var nextId = currentId >= 5 ? 0 : currentId + 1;
      applyDecodeState(nextId, false);
    }, 3000);
  }

  /* =========================================================
     #9 ひと息（ちゃこ猫・見本_v3準拠＋ゴロゴロ音）
  ========================================================= */
  function initSec9() {
    var labelEl = document.getElementById('sec9-label');
    var titleEl = document.getElementById('sec9-title');
    var leadEl = document.getElementById('sec9-lead');
    if (labelEl && B.sec9.label) labelEl.textContent = B.sec9.label;
    renderTitle(titleEl, B.sec9.title);
    if (leadEl && B.sec9.lead) leadEl.textContent = B.sec9.lead;

    var field = document.getElementById('field');
    var cat = document.getElementById('cat');
    if (!field || !cat) return;

    var cx = 0;
    var tx = 0;
    var face = 1;
    var stroking = false;
    var pid = null;
    var lastHeart = 0;
    var lastPurr = 0;
    var lastX = 0;

    function heart(x) {
      var h = document.createElement('span');
      h.className = 'heart';
      h.textContent = '♥';
      h.style.left = (field.clientWidth / 2 + x - 8) + 'px';
      h.style.bottom = '200px';
      field.appendChild(h);
      setTimeout(function () {
        if (h.parentNode) h.parentNode.removeChild(h);
      }, 1000);
    }

    function purr(now) {
      if (now - lastPurr < 220) return;
      lastPurr = now;
      if (window.Sound) window.Sound.playPurrPulse();
    }

    function target(e) {
      tx = e.clientX - field.getBoundingClientRect().left - field.clientWidth / 2;
    }

    field.addEventListener('pointerdown', function (e) {
      pid = e.pointerId;
      stroking = true;
      cat.classList.add('happy');
      lastX = e.clientX;
      try {
        field.setPointerCapture(pid);
      } catch (err) {}
      target(e);
      lastHeart = performance.now();
      heart(cx);
      purr(lastHeart);
      if (window.Sound) window.Sound.playMeow();
    });
    field.addEventListener('pointermove', function (e) {
      if (e.pointerId !== pid) return;
      target(e);
      var now = performance.now();
      purr(now);
      if (Math.abs(e.clientX - lastX) > 24 && now - lastHeart > 260) {
        lastHeart = now;
        lastX = e.clientX;
        heart(cx);
      }
    });
    function catUp(e) {
      if (e.pointerId !== pid) return;
      pid = null;
      stroking = false;
      cat.classList.remove('happy');
    }
    field.addEventListener('pointerup', catUp);
    field.addEventListener('pointercancel', catUp);

    var t0 = performance.now();
    function catLoop(now) {
      if (seen['sec-9']) {
        var t = (now - t0) / 1000;
        var lim = field.clientWidth / 2 - 88;
        var goal = stroking ? tx : (reduceMotion ? cx : Math.sin(t * 0.45) * lim * 0.55);
        goal = Math.max(-lim, Math.min(lim, goal));
        var d = goal - cx;
        cx += d * (stroking ? 0.14 : 0.03);
        if (Math.abs(d) > 3) face = d > 0 ? -1 : 1;
        var hop = stroking && Math.abs(d) > 8 ? -Math.abs(Math.sin(t * 11)) * 8 : 0;
        cat.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + hop.toFixed(1) + 'px,0) scaleX(' + face + ')';
      }
      requestAnimationFrame(catLoop);
    }
    requestAnimationFrame(catLoop);
  }

  /* =========================================================
     #10 講師紹介＋受講生の声
  ========================================================= */
  function initSec10() {
    renderTitle(document.getElementById('sec10-title'), B.sec10.title);
    var roleEl = document.getElementById('sec10-role');
    var bodyEl = document.getElementById('sec10-body');
    var vNoteEl = document.getElementById('sec10-voice-note');
    var vTextEl = document.getElementById('sec10-voice-text');
    var vText2El = document.getElementById('sec10-voice-text2');

    if (roleEl) roleEl.innerHTML = formatPhrases(B.sec10.role);
    if (bodyEl) bodyEl.textContent = B.sec10.body;
    if (vNoteEl) vNoteEl.textContent = B.sec10.voiceNote;
    if (vTextEl) vTextEl.textContent = B.sec10.voiceText;
    if (vText2El) vText2El.textContent = B.sec10.voiceText2;
  }

  /* =========================================================
     #11 最終CTA（プッシュボタン＋紙吹雪）
  ========================================================= */
  function initSec11() {
    renderTitle(document.getElementById('sec11-title'), B.sec11.title);
    var bodyEl = document.getElementById('sec11-body');
    var aboveEl = document.getElementById('sec11-above');
    var pushBtn = document.getElementById('cta-push-btn');
    var chakoImg = document.getElementById('cta-chako');
    var afterWrap = document.getElementById('cta-after');
    var entryBtn = document.getElementById('cta-entry-btn');
    var emptyMsg = document.getElementById('cta-empty-msg');
    var confettiCanvas = document.getElementById('confetti-canvas');
    var surfaceEl = document.getElementById('cta-surface');

    if (bodyEl) bodyEl.innerHTML = formatPhrases(B.sec11.body);
    if (aboveEl) aboveEl.textContent = B.sec11.aboveBtn;
    if (entryBtn) entryBtn.textContent = B.sec11.entryBtn;
    if (emptyMsg) emptyMsg.textContent = B.sec11.emptyEntryMsg;

    var confettiRaf = null;
    function launchConfetti() {
      if (!confettiCanvas || !surfaceEl || reduceMotion) return;
      var rect = surfaceEl.getBoundingClientRect();
      var w = Math.max(280, Math.round(rect.width));
      var h = Math.max(300, Math.round(rect.height));
      confettiCanvas.width = w;
      confettiCanvas.height = h;
      var c = confettiCanvas.getContext('2d');
      if (!c) return;

      var colors = ['#1A1948', '#FFFFFF', '#FBF7F0', '#2B2A6B'];
      var pieces = [];
      for (var i = 0; i < 42; i++) {
        pieces.push({
          x: w * 0.5 + (Math.random() - 0.5) * 80,
          y: h * 0.45,
          vx: (Math.random() - 0.5) * 9,
          vy: -Math.random() * 8 - 3,
          size: 6 + Math.random() * 6,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 0.25,
          color: colors[i % colors.length]
        });
      }

      if (confettiRaf) cancelAnimationFrame(confettiRaf);
      function stepConfetti() {
        c.clearRect(0, 0, w, h);
        var alive = 0;
        for (var i = 0; i < pieces.length; i++) {
          var p = pieces[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.28;
          p.rot += p.vrot;
          if (p.y < h + 20) {
            alive++;
            c.save();
            c.translate(p.x, p.y);
            c.rotate(p.rot);
            c.fillStyle = p.color;
            c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
            c.restore();
          }
        }
        if (alive > 0) {
          confettiRaf = requestAnimationFrame(stepConfetti);
        } else {
          c.clearRect(0, 0, w, h);
          confettiRaf = null;
        }
      }
      confettiRaf = requestAnimationFrame(stepConfetti);
    }

    if (pushBtn) {
      pushBtn.addEventListener('click', function () {
        if (window.Sound) {
          window.Sound.playFanfare();
          window.Sound.playVoice('v09', 0.9);
        }
        pushBtn.classList.add('is-pushed');
        setTimeout(function () {
          pushBtn.classList.remove('is-pushed');
        }, 180);

        if (chakoImg) {
          chakoImg.src = 'assets/chako/cheer.webp';
        }
        if (afterWrap) {
          afterWrap.classList.remove('is-hidden');
        }
        if (!B.ENTRY_URL && emptyMsg) {
          emptyMsg.classList.remove('is-hidden');
        }
        launchConfetti();
      });
    }

    if (entryBtn) {
      if (B.ENTRY_URL) {
        entryBtn.href = B.ENTRY_URL;
      } else {
        entryBtn.addEventListener('click', function (e) {
          e.preventDefault();
          if (window.Sound) window.Sound.playPop(540);
          if (emptyMsg) emptyMsg.classList.remove('is-hidden');
        });
      }
    }
  }

  /* =========================================================
     #12 Q&A
  ========================================================= */
  function initSec12() {
    renderTitle(document.getElementById('sec12-title'), B.sec12.title);
    var qaList = document.getElementById('qa-list');
    if (!qaList || !B.sec12 || !B.sec12.qa) return;

    var html = '';
    for (var i = 0; i < B.sec12.qa.length; i++) {
      var item = B.sec12.qa[i];
      html +=
        '<div class="qa-item">' +
          '<button type="button" class="qa-q" aria-expanded="false">' +
            '<span>' + formatPhrases(item.q) + '</span>' +
            '<span class="qa-icon" aria-hidden="true">＋</span>' +
          '</button>' +
          '<div class="qa-a">' + escapeHtml(item.a) + '</div>' +
        '</div>';
    }
    qaList.innerHTML = html;

    var qBtns = qaList.querySelectorAll('.qa-q');
    for (var j = 0; j < qBtns.length; j++) {
      qBtns[j].addEventListener('click', function () {
        var parent = this.parentNode;
        var isOpen = parent.classList.toggle('is-open');
        this.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (window.Sound) window.Sound.playPop(520);
      });
    }
  }

  function initAll() {
    initHero();
    initSec2();
    initSec3();
    initSec4();
    initSec5();
    initSec6();
    initSec7();
    initSec8();
    initSec9();
    initSec10();
    initSec11();
    initSec12();
  }

  window.Sections = {
    initAll: initAll,
    setSeen: setSeen,
    smoothScrollTo: smoothScrollTo
  };
})();
