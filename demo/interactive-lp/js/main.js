(function () {
  var B = window.BRAND || {};

  function initHeaderAndDock() {
    var soundBtn = document.getElementById('sound-toggle');
    if (soundBtn && B.header) {
      soundBtn.textContent = B.header.soundOn || '音：ON';
      soundBtn.addEventListener('click', function () {
        if (!window.Sound) return;
        window.Sound.ensureContext();
        var next = !window.Sound.isEnabled();
        window.Sound.setEnabled(next);
        soundBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
        soundBtn.textContent = next ? (B.header.soundOn || '音：ON') : (B.header.soundOff || '音：OFF');
        if (next) {
          window.Sound.playPop(660);
        }
      });
    }

    // 声を2つ比べている間だけ、音ボタンの横に「声：A／B」の切り替えを出す
    if (soundBtn && window.Sound && window.Sound.hasVoiceB()) {
      var voiceBtn = document.createElement('button');
      voiceBtn.type = 'button';
      voiceBtn.className = 'sound-btn voice-btn';
      voiceBtn.textContent = '声：A';
      voiceBtn.addEventListener('click', function () {
        var next = voiceBtn.textContent === '声：A' ? 'B' : 'A';
        voiceBtn.textContent = '声：' + next;
        window.Sound.ensureContext();
        window.Sound.setVoiceSet(next);
        window.Sound.playVoice('v01', 0.02);
      });
      var wrap = document.createElement('div');
      wrap.className = 'header-btns';
      soundBtn.parentNode.insertBefore(wrap, soundBtn);
      wrap.appendChild(voiceBtn);
      wrap.appendChild(soundBtn);
    }

    var dockLeft = document.getElementById('dock-left');
    var dockRight = document.getElementById('dock-right');
    if (dockLeft && B.bottomBar) {
      dockLeft.textContent = B.bottomBar.leftLabel;
      dockLeft.href = B.bottomBar.leftTarget;
      dockLeft.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.Sound) window.Sound.playPop(580);
        if (window.Sections) window.Sections.smoothScrollTo(B.bottomBar.leftTarget);
      });
    }
    if (dockRight && B.bottomBar) {
      dockRight.textContent = B.bottomBar.rightLabel;
      dockRight.href = B.bottomBar.rightTarget;
      dockRight.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.Sound) window.Sound.playPop(660);
        if (window.Sections) window.Sections.smoothScrollTo(B.bottomBar.rightTarget);
      });
    }

    var footerEl = document.getElementById('footer-text');
    if (footerEl && B.footer) {
      // 「|」で区切った文のまとまりは途中で改行しない
      footerEl.innerHTML = B.footer.split('|').map(function (s) {
        return '<span class="ph">' + s.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
      }).join('');
    }
  }

  function initProgressBar() {
    var bar = document.getElementById('bar');
    if (!bar) return;
    function updateBar() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    window.addEventListener('scroll', updateBar, { passive: true });
    window.addEventListener('resize', updateBar);
    updateBar();
  }

  function initVisibilityObserver() {
    var watched = document.querySelectorAll('[data-watch]');
    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < watched.length; i++) {
        watched[i].classList.add('in-view');
        if (window.Sections) window.Sections.setSeen(watched[i].id, true);
      }
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        e.target.classList.toggle('off', !e.isIntersecting);
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
        }
        if (window.Sections && e.target.id) {
          window.Sections.setSeen(e.target.id, e.isIntersecting);
        }
      }
    }, { threshold: 0.05 });

    for (var j = 0; j < watched.length; j++) {
      io.observe(watched[j]);
    }
  }

  function boot() {
    initHeaderAndDock();
    if (window.Sections) {
      window.Sections.initAll();
    }
    initProgressBar();
    initVisibilityObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
