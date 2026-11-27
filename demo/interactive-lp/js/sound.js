(function () {
  // 音はすべて js/sfx-data.js（base64）から読む。読めないときは、その場で合成した音で代わりに鳴らす
  var ctx = null;
  var master = null;
  var enabled = true;
  var unlocked = false;
  var decoded = false;
  var buffers = {};
  var loops = {};

  // 音ごとの大きさ（声を一番大きく、細かい音は小さく）
  var LEVEL = {
    boyon: 0.55, pop: 0.45, tick: 0.28, shutter: 0.6, sparkle: 0.5,
    purr: 0.5, fanfare: 0.5, scribble: 0.16, voice: 0.95, meow: 0.7
  };

  function ensureContext() {
    if (!ctx) {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(function () {});
    }
    unlocked = true;
    decodeAll();
    return ctx;
  }

  // 最初のタップで遅れないよう、ページを開いた時点で音のデータを読みこんでおく
  // （音を鳴らさない OfflineAudioContext なら、タップ前でも読みこめる）
  function decodeAll() {
    if (decoded) return;
    var Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var dec = Offline ? new Offline(1, 1, 44100) : ctx;
    if (!dec) return;
    decoded = true;
    var data = window.SFX_DATA || {};
    Object.keys(data).forEach(function (key) {
      try {
        var bin = atob(data[key]);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        var done = function (buf) { buffers[key] = buf; };
        var p = dec.decodeAudioData(arr.buffer, done, function () {});
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    });
  }
  decodeAll();

  function unlockHandler() {
    ensureContext();
  }
  window.addEventListener('pointerdown', unlockHandler, { passive: true });
  window.addEventListener('pointerup', unlockHandler, { passive: true });
  window.addEventListener('keydown', unlockHandler);

  function canPlay() {
    if (!enabled || !unlocked) return false;
    return !!ensureContext();
  }

  // 読みこんだ音を鳴らす。鳴らせたら true
  function playBuf(name, level, rate, delay) {
    if (!canPlay() || !buffers[name]) return false;
    var src = ctx.createBufferSource();
    var g = ctx.createGain();
    src.buffer = buffers[name];
    src.playbackRate.value = rate || 1;
    g.gain.value = level;
    src.connect(g);
    g.connect(master);
    src.start(ctx.currentTime + (delay || 0));
    return true;
  }

  // ループする音（ゴロゴロ・鉛筆）。keep を呼び続けている間だけ鳴り、止まると消える
  function loopKeep(name, level, holdMs) {
    if (!canPlay() || !buffers[name]) return false;
    var now = ctx.currentTime;
    var L = loops[name];
    if (!L) {
      var src = ctx.createBufferSource();
      var g = ctx.createGain();
      src.buffer = buffers[name];
      src.loop = true;
      g.gain.setValueAtTime(0.0001, now);
      src.connect(g);
      g.connect(master);
      src.start(now, Math.random() * buffers[name].duration);
      L = loops[name] = { src: src, g: g, timer: null };
    }
    L.g.gain.cancelScheduledValues(now);
    L.g.gain.setTargetAtTime(level, now, 0.04);
    if (L.timer) clearTimeout(L.timer);
    L.timer = setTimeout(function () { loopStop(name); }, holdMs);
    return true;
  }

  function loopStop(name) {
    var L = loops[name];
    if (!L) return;
    loops[name] = null;
    if (L.timer) clearTimeout(L.timer);
    try {
      var now = ctx.currentTime;
      L.g.gain.cancelScheduledValues(now);
      L.g.gain.setTargetAtTime(0.0001, now, 0.06);
      L.src.stop(now + 0.4);
    } catch (e) {}
  }

  function stopAllLoops() {
    Object.keys(loops).forEach(loopStop);
  }

  /* ---------- 代わりの合成音（音のデータが読めないとき） ---------- */
  function synthTone(type, f0, f1, dur, vol) {
    if (!canPlay()) return;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(f1, now + dur * 0.6);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  /* ---------- 場面ごとの音 ---------- */
  function playPop(freq) {
    var rate = Math.max(0.7, Math.min(1.3, (freq || 600) / 600));
    if (playBuf('pop', LEVEL.pop, rate)) return;
    synthTone('sine', (freq || 520) * 0.75, (freq || 520) * 1.35, 0.11, 0.18);
  }

  function playBoyon() {
    if (playBuf('boyon', LEVEL.boyon, 0.96 + Math.random() * 0.08)) return;
    synthTone('triangle', 240, 620, 0.26, 0.22);
  }

  function playTick() {
    if (playBuf('tick', LEVEL.tick, 0.92 + Math.random() * 0.16)) return;
    synthTone('triangle', 1100, 420, 0.035, 0.12);
  }

  function playSparkle() {
    if (playBuf('sparkle', LEVEL.sparkle)) return;
    [1046.5, 1318.5, 1568, 2093].forEach(function (f, i) {
      setTimeout(function () { synthTone('sine', f, f, 0.22, 0.14); }, i * 55);
    });
  }

  function playShutter() {
    if (playBuf('shutter', LEVEL.shutter)) return;
    synthTone('square', 1800, 600, 0.05, 0.12);
  }

  function playPurrPulse() {
    loopKeep('purr', LEVEL.purr, 420);
  }

  function stopPurr() {
    loopStop('purr');
  }

  // なぞっている速さ（0〜1）に合わせて、鉛筆の音の大きさを変える
  function scribble(speed) {
    var s = Math.max(0, Math.min(1, speed));
    loopKeep('scribble', LEVEL.scribble * (0.35 + 0.65 * s), 160);
  }

  function playFanfare() {
    if (playBuf('fanfare', LEVEL.fanfare)) return;
    [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
      setTimeout(function () { synthTone('triangle', f, f, i === 3 ? 0.42 : 0.13, 0.2); }, [0, 130, 260, 400][i]);
    });
  }

  // ちゃこの声（v01〜v09）。声が入っていなければ何もしない
  // 2つの声を比べている間だけ、B の声（Bv01〜）に切り替えられる
  var voiceSet = '';
  function setVoiceSet(set) {
    voiceSet = set === 'B' ? 'B' : '';
  }
  function hasVoiceB() {
    return !!(window.SFX_DATA && window.SFX_DATA.Bv01);
  }
  var lastVoice = 0;
  function playVoice(key, delay) {
    if (voiceSet && buffers[voiceSet + key]) key = voiceSet + key;
    if (!buffers[key]) return false;
    var now = performance.now();
    if (now - lastVoice < 250) return false;
    lastVoice = now;
    return playBuf(key, LEVEL.voice, 1, delay == null ? 0.06 : delay);
  }

  // 猫の鳴き声（meow で始まる音から1つ選ぶ）
  var lastMeow = 0;
  function playMeow() {
    var keys = Object.keys(buffers).filter(function (k) { return k.indexOf('meow') === 0; });
    if (!keys.length) return false;
    var now = performance.now();
    if (now - lastMeow < 2500) return false;
    lastMeow = now;
    return playBuf(keys[Math.floor(Math.random() * keys.length)], LEVEL.meow, 0.97 + Math.random() * 0.06);
  }

  function setEnabled(flag) {
    enabled = !!flag;
    if (!enabled) stopAllLoops();
  }

  function isEnabled() {
    return enabled;
  }

  // 画面を離れたら、続いている音を止める
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopAllLoops();
  });

  window.Sound = {
    ensureContext: ensureContext,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    playPop: playPop,
    playBoyon: playBoyon,
    playTick: playTick,
    playSparkle: playSparkle,
    playShutter: playShutter,
    playPurrPulse: playPurrPulse,
    stopPurr: stopPurr,
    scribble: scribble,
    playFanfare: playFanfare,
    playVoice: playVoice,
    setVoiceSet: setVoiceSet,
    hasVoiceB: hasVoiceB,
    playMeow: playMeow
  };
})();
