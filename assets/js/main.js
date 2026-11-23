// Page behaviour: boot, nav, interactive rung, reveals, videos, tabs, copy.
{
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- boot ---------- */
  const ready = () => document.body.classList.add('ready');
  if (reduce) ready(); else setTimeout(ready, 1050);

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const tl = $('.tl');
  const onScroll = () => {
    nav.classList.toggle('solid', scrollY > 40);
    if (tl) { const r = tl.getBoundingClientRect(); tl.style.setProperty('--tl', Math.min(1, Math.max(0, (innerHeight * .6 - r.top) / r.height)).toFixed(3)); }
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const scanEl = $('#scan');
  if (scanEl) setInterval(() => { scanEl.textContent = 8 + Math.floor(Math.random() * 5); }, 900);

  /* ---------- interactive rung (real seal-in logic) ---------- */
  const hud = $('#hud'), state = $('#hudState'), hint = $('#hudHint');
  const navDot = $('#navDot'), navMode = $('#navMode'), camVid = $('#camVid');
  const io = { start: false, stop: false, estop: false, motor: false };
  let touched = false;

  const W = k => $(`.rung [data-w="${k}"]`), C = k => $(`.rung [data-c="${k}"]`);

  function scan() {
    // Y0 = (X0 OR Y0) AND NOT X1 AND NOT X2
    io.motor = (io.start || io.motor) && !io.stop && !io.estop;
    const n1 = io.start || io.motor, n2 = n1 && !io.stop, n3 = n2 && !io.estop;
    C('x0').classList.toggle('closed', io.start); C('x0').classList.toggle('live', io.start);
    C('seal').classList.toggle('closed', io.motor); C('seal').classList.toggle('live', io.motor);
    C('x1').classList.toggle('live', n1 && !io.stop);
    C('x2').classList.toggle('live', n2 && !io.estop);
    W('n1').classList.toggle('live', n1); W('n2').classList.toggle('live', n2);
    W('n3').classList.toggle('live', n3); W('n4').classList.toggle('live', io.motor);
    C('y0').classList.toggle('live', io.motor);

    hud.classList.toggle('on', io.motor); hud.classList.toggle('es', io.estop);
    state.textContent = io.estop ? 'E-STOP' : io.motor ? 'MOTOR RUNNING' : 'MOTOR OFF';
    if (navDot) navDot.className = 'dot' + (io.estop ? ' stop' : io.motor ? ' run' : '');
    if (navMode) navMode.textContent = io.estop ? 'E-STOP' : io.motor ? 'RUN' : 'READY';
    if (io.motor) camVid.play().catch(() => {}); else camVid.pause();

    if (io.estop) hint.innerHTML = 'Emergency stop latched. Release <b>E-STOP</b>, then press START again.';
    else if (io.motor && !io.start) hint.innerHTML = 'Seal-in holding — the motor keeps running on its own. Press <b>STOP</b> to drop it.';
    else if (!io.motor && touched) hint.innerHTML = 'Stopped. Press <b>START</b> to run it again.';

    dispatchEvent(new CustomEvent('plc', { detail: { motor: io.motor, estop: io.estop } }));
  }

  function hold(btn, key) {
    const down = e => { e.preventDefault(); touched = true; io[key] = true; btn.classList.add('down'); scan(); };
    const up = () => { if (!io[key]) return; io[key] = false; btn.classList.remove('down'); scan(); };
    btn.addEventListener('pointerdown', down);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, up));
    btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) down(e); });
    btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') up(); });
  }
  hold($('#bStart'), 'start');
  hold($('#bStop'), 'stop');
  const es = $('#bEstop');
  es.addEventListener('click', () => {
    touched = true; io.estop = !io.estop;
    es.setAttribute('aria-pressed', String(io.estop)); scan();
  });
  scan();

  // Auto-demo: if the visitor hasn't touched anything, pulse START once.
  const demoObs = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    demoObs.disconnect();
    setTimeout(() => {
      if (touched || reduce) return;
      const b = $('#bStart');
      io.start = true; b.classList.add('down'); scan();
      setTimeout(() => { io.start = false; b.classList.remove('down'); scan(); }, 450);
    }, 900);
  }, { threshold: .5 });
  demoObs.observe(hud);

  /* ---------- 3D tilt on cards ---------- */
  if (!reduce && matchMedia('(hover: hover)').matches) {
    $$('.screen, .gal > figure, .repo, .svc__c, .proj__img, .mod').forEach(el => {
      el.classList.add('tilt');
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 8 + 'deg');
        el.style.setProperty('--rx', -((e.clientY - r.top) / r.height - .5) * 8 + 'deg');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---------- reveals + counters ---------- */
  const revealObs = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      $$('.count', e.target).forEach(countUp);
      revealObs.unobserve(e.target);
    }
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => revealObs.observe(el));

  function countUp(el) {
    const n = +el.dataset.n; if (reduce) { el.textContent = n; return; }
    let i = 0; const t = setInterval(() => { el.textContent = ++i; if (i >= n) clearInterval(t); }, 220);
  }

  /* ---------- lazy autoplay videos ---------- */
  const vidObs = new IntersectionObserver(entries => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.src && v.dataset.src) { v.src = v.dataset.src; }
        if (!reduce) v.play().catch(() => {});
      } else v.pause();
    }
  }, { rootMargin: '200px 0px' });
  $$('video.lazyvid').forEach(v => vidObs.observe(v));

  /* ---------- PLC AI Studio tabs ---------- */
  const plcVid = $('#plcVid'), plcCap = $('#plcCap'), tabs = $$('.tab');
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { select((i + 1) % tabs.length); tabs[(i + 1) % tabs.length].focus(); }
      if (e.key === 'ArrowLeft') { const j = (i - 1 + tabs.length) % tabs.length; select(j); tabs[j].focus(); }
    });
  });
  function select(i) {
    tabs.forEach((t, j) => { t.classList.toggle('is-on', i === j); t.setAttribute('aria-selected', String(i === j)); });
    const v = tabs[i].dataset.v;
    plcVid.poster = `assets/vid/${v}.jpg`;
    plcVid.dataset.src = `assets/vid/${v}.mp4`;
    plcVid.src = plcVid.dataset.src;
    if (!reduce) plcVid.play().catch(() => {});
    plcCap.textContent = tabs[i].dataset.t;
  }

  /* ---------- copy email ---------- */
  const copyBtn = $('#copyMail');
  copyBtn.addEventListener('click', async () => {
    const mail = 'sreeharishadow358@gmail.com';
    try { await navigator.clipboard.writeText(mail); copyBtn.textContent = 'Copied ✓'; }
    catch { copyBtn.textContent = mail; }
    setTimeout(() => { copyBtn.textContent = 'Copy email'; }, 2200);
  });
}

/* ---------- slideshows ---------- */
{
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.slides').forEach(box => {
    const slides = [...box.querySelectorAll('.slide')], dots = box.querySelector('.slides__dots');
    let i = 0, hold = false;
    dots.innerHTML = slides.map((_, k) => `<button type="button" role="tab" aria-label="Photo ${k + 1}" aria-selected="${k === 0}"></button>`).join('');
    const btns = [...dots.children];
    const go = k => { i = (k + slides.length) % slides.length; slides.forEach((s, n) => s.classList.toggle('on', n === i)); btns.forEach((b, n) => b.setAttribute('aria-selected', String(n === i))); };
    btns.forEach((b, k) => b.addEventListener('click', () => go(k)));
    box.addEventListener('pointerenter', () => { hold = true; }); box.addEventListener('pointerleave', () => { hold = false; });
    if (!reduce) setInterval(() => { if (!hold && !document.hidden) go(i + 1); }, +box.dataset.interval || 4000);
  });
}

/* ---------- news carousel ---------- */
{
  const track = document.getElementById('newsTrack');
  if (track) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = () => (track.firstElementChild?.getBoundingClientRect().width || 340) + 14;
    const next = () => { if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 8) track.scrollTo({ left: 0, behavior: 'smooth' }); else track.scrollBy({ left: step(), behavior: 'smooth' }); };
    const prev = () => track.scrollBy({ left: -step(), behavior: 'smooth' });
    document.getElementById('newsNext').addEventListener('click', next);
    document.getElementById('newsPrev').addEventListener('click', prev);
    track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); next(); } if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); } });
    let hold = false, seen = false;
    ['pointerenter', 'focusin'].forEach(ev => track.addEventListener(ev, () => { hold = true; }));
    ['pointerleave', 'focusout'].forEach(ev => track.addEventListener(ev, () => { hold = false; }));
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(track);
    if (!reduce) setInterval(() => { if (seen && !hold && !document.hidden) next(); }, 4500);
  }
}
