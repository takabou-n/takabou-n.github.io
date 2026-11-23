'use strict';

(function () {
  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function updateHashSafe(hashValue, push) {
    const targetHash = hashValue.startsWith('#') ? hashValue : '#' + hashValue;
    if (window.location.hash === targetHash) return;
    try {
      if (push && window.history && window.history.pushState) {
        window.history.pushState(null, '', targetHash);
      } else if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', targetHash);
      } else {
        window.location.hash = targetHash;
      }
    } catch {
      window.location.hash = targetHash;
    }
  }

  function initTabs() {
    const tablist = document.querySelector('.category-tabs');
    const grid = document.getElementById('card-grid');
    if (!tablist || !grid) return;

    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const cards = Array.from(grid.querySelectorAll('.work-card'));
    const validSlugs = new Set(tabs.map((t) => t.dataset.cat));

    function selectCategory(slug, shouldUpdateHash) {
      const activeSlug = validSlugs.has(slug) ? slug : 'all';

      tabs.forEach((tab) => {
        const isActive = tab.dataset.cat === activeSlug;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      let visibleWorks = 0;
      cards.forEach((card) => {
        const isPinned = card.dataset.pinned === 'true';
        const visible =
          activeSlug === 'all'
            ? true
            : !isPinned && card.dataset.cat === activeSlug;
        card.hidden = !visible;
        if (visible) {
          card.classList.add('is-visible');
          if (!isPinned) visibleWorks += 1;
        }
      });
      const empty = document.getElementById('works-empty');
      if (empty) empty.hidden = visibleWorks > 0;

      if (shouldUpdateHash) {
        updateHashSafe('#cat=' + activeSlug, false);
      }
    }

    function applyFromHash() {
      const hash = window.location.hash;
      if (hash.startsWith('#cat=')) {
        const slug = decodeURIComponent(hash.slice(5));
        selectCategory(slug, false);
      }
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        selectCategory(tab.dataset.cat || 'all', true);
      });
    });

    window.addEventListener('hashchange', applyFromHash);
    applyFromHash();
  }

  function initAboutNavigation() {
    const details = document.getElementById('about');
    if (!details) return;

    function openAndScrollToId(id) {
      if (!id) return false;
      const target = document.getElementById(id);
      if (!target) return false;
      if (target !== details && !details.contains(target)) return false;

      details.open = true;
      window.requestAnimationFrame(() => {
        target.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start',
        });
      });
      return true;
    }

    function handleHash() {
      const raw = window.location.hash;
      if (!raw || raw.length < 2 || raw.startsWith('#cat=')) return;
      const id = decodeURIComponent(raw.slice(1));
      openAndScrollToId(id);
    }

    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.length < 2) return;
      const id = decodeURIComponent(href.slice(1));
      const target = document.getElementById(id);
      if (!target) return;
      if (target === details || details.contains(target)) {
        event.preventDefault();
        updateHashSafe('#' + id, true);
        openAndScrollToId(id);
      }
    });

    window.addEventListener('hashchange', handleHash);
    handleHash();
  }

  function initMailIcons() {
    document.querySelectorAll('.js-mail-icon').forEach((link) => {
      const user = link.dataset.u || '';
      const domain = link.dataset.d || '';
      if (!user || !domain) return;
      link.href =
        'mailto:' + user + '@' + domain + '?subject=' + encodeURIComponent(link.dataset.s || '');
    });
  }

  function initMailSlots() {
    const slots = document.querySelectorAll('.js-mail-slot');
    slots.forEach((slot) => {
      const user = slot.dataset.u || '';
      const domain = slot.dataset.d || '';
      const subject = slot.dataset.s || '';
      const label = slot.dataset.l || '';
      if (!user || !domain) return;

      const address = user + '@' + domain;
      const href =
        'mailto:' + address + '?subject=' + encodeURIComponent(subject);

      const btn = document.createElement('a');
      btn.className = 'btn btn-secondary mail-btn';
      btn.href = href;
      btn.textContent = label;

      const text = document.createElement('p');
      text.className = 'mail-address';
      text.textContent = address;

      slot.replaceChildren(btn, text);
    });
  }

  function initBottomBar() {
    const bar = document.getElementById('bottom-bar');
    const contact = document.getElementById('contact');
    if (!bar || !contact || typeof IntersectionObserver !== 'function') return;

    const barLinks = Array.from(bar.querySelectorAll('a, button'));

    function setHidden(hidden) {
      bar.classList.toggle('is-hidden', hidden);
      if (hidden) {
        bar.setAttribute('aria-hidden', 'true');
        barLinks.forEach((el) => el.setAttribute('tabindex', '-1'));
      } else {
        bar.removeAttribute('aria-hidden');
        barLinks.forEach((el) => el.removeAttribute('tabindex'));
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === contact) {
            setHidden(entry.isIntersecting);
          }
        }
      },
      { threshold: 0 }
    );

    observer.observe(contact);
  }

  function initCardReveal() {
    const cards = Array.from(document.querySelectorAll('.work-card'));
    if (
      cards.length === 0 ||
      prefersReducedMotion() ||
      typeof IntersectionObserver !== 'function'
    ) {
      return;
    }

    document.documentElement.classList.add('js-reveal');

    const observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08 }
    );

    cards.forEach((card) => {
      if (!card.hidden) {
        observer.observe(card);
      }
    });
  }

  // できること：前へ・次へのボタンで横に送る（端ではボタンを押せなくする）
  function initSkillsScroller() {
    const track = document.getElementById('skills-track');
    if (!track) {
      return;
    }
    const buttons = Array.from(document.querySelectorAll('.skills-btn'));
    const step = () => {
      const item = track.querySelector('.skill-item');
      const gap = parseFloat(getComputedStyle(track).columnGap) || 16;
      const one = item ? item.getBoundingClientRect().width + gap : 240;
      return Math.max(one, Math.floor(track.clientWidth / one) * one);
    };
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      buttons.forEach((btn) => {
        btn.disabled = btn.dataset.dir === '-1' ? track.scrollLeft <= 2 : track.scrollLeft >= max;
      });
    };
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        track.scrollBy({ left: step() * Number(btn.dataset.dir), behavior: 'smooth' });
      });
    });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  initTabs();
  initAboutNavigation();
  initMailIcons();
  initMailSlots();
  initBottomBar();
  initCardReveal();
  initSkillsScroller();
})();
