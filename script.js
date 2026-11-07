// ---- Edit these -----------------------------------------------------------
const CONFIG = {
  // Google Form that receives the address form. Paste the form's PRE-FILLED
  // link here, made with the answers NAME, ADDRESS and EMAIL typed into the
  // three questions (Google Form > ⋮ > Get pre-filled link). It looks like:
  // 'https://docs.google.com/forms/d/e/1FAIpQL.../viewform?usp=pp_url&entry.123=NAME&entry.456=ADDRESS&entry.789=EMAIL'
  // Leave empty and the form shows but can't be submitted.
  googleFormPrefilledLink: 'https://docs.google.com/forms/d/e/1FAIpQLSfFxCszAob73x_Dab1RZpjmMmbWsxTHMms2MJDQ-thDLQLSDA/viewform?usp=pp_url&entry.406777629=NAME&entry.252920302=ADDRESS&entry.636677916=EMAIL',

  // All-day calendar event (dates are YYYYMMDD; end date is the day after).
  calendar: {
    title: "Rahul & Mansi's Wedding",
    location: 'Princeton, NJ',
    details: 'Save the date! Formal invitation to follow.',
    start: '20270822',
    end: '20270823',
  },
};
// ---------------------------------------------------------------------------

(() => {
  const $ = (s) => document.querySelector(s);
  const strip = $('#strip');
  const win = $('#window');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Card size ------------------------------------------------------------
  // Scale the 330px-wide card/strip up to 1.25x, but never wider than the screen.
  const MAX_SCALE = 1.25;
  function sizeStage() {
    const s = Math.min(MAX_SCALE, (document.documentElement.clientWidth - 32) / 330);
    document.documentElement.style.setProperty('--s', Math.max(0.8, s).toFixed(3));
  }
  sizeStage();
  window.addEventListener('resize', sizeStage);

  // ---- Sliding photo-strip reveal -----------------------------------------
  // Must match the px values in styles.css (.strip / .window).
  const REVEAL = {
    travel: 436,        // px the strip slides down (photo 4 -> label in window)
    stripLeft: 117, stripTop: -104,
    windowLeft: 125, windowTop: 340,
    fadeIn: 1400,       // ms for the card to fade in (matches styles.css)
    delay: 600,         // ms pause after the fade before the strip moves
    duration: 6800,     // ms of sliding
    scrollPause: 700,   // ms to linger on the finished strip before scrolling
  };

  // Show the strip through the card window with a copy that moves in sync.
  const twin = strip.cloneNode(true);
  twin.removeAttribute('id');
  twin.style.left = (REVEAL.stripLeft - REVEAL.windowLeft) + 'px';
  twin.style.top = (REVEAL.stripTop - REVEAL.windowTop) + 'px';
  win.appendChild(twin);

  const target = $('#invitation');
  const endTransform = `translateY(${REVEAL.travel}px)`;
  let userTookOver = false;
  const takeOver = () => { userTookOver = true; };
  for (const ev of ['wheel', 'touchstart', 'keydown', 'mousedown']) {
    window.addEventListener(ev, takeOver, { passive: true, once: true });
  }

  function finishReveal() {
    strip.style.transform = twin.style.transform = endTransform;
  }

  function scrollToDetails() {
    if (userTookOver) return;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  // Keep the growing strip + tassel on screen while it slides.
  function followStrip(anim) {
    const tassel = strip.querySelector('.tassel');
    const root = document.documentElement;
    // The page uses CSS smooth scrolling; turn it off while we track the strip
    // frame by frame, otherwise each small scroll would lag and stutter.
    root.style.scrollBehavior = 'auto';
    // Follow only the strip's own movement. If the tassel already starts near
    // (or below) the bottom of the screen, that starting position becomes the
    // line to hold, so the page never "catches up" with a sudden jump; it just
    // moves in step with the strip, using the strip's own easing.
    const startY = window.scrollY;
    const holdLine = Math.max(window.innerHeight - 60, tassel.getBoundingClientRect().bottom);
    const step = () => {
      if (anim.playState !== 'running') { root.style.scrollBehavior = ''; return; }
      if (!userTookOver) {
        const tasselDocBottom = tassel.getBoundingClientRect().bottom + window.scrollY;
        const wanted = Math.max(startY, tasselDocBottom - holdLine);
        if (wanted > window.scrollY) window.scrollTo(0, wanted);
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function playReveal() {
    if (reduceMotion || !strip.animate) {
      finishReveal();
      return;
    }
    const opts = { duration: REVEAL.duration, easing: 'cubic-bezier(.37,0,.25,1)', fill: 'forwards' };
    const frames = [{ transform: 'translateY(0)' }, { transform: endTransform }];
    const anim = strip.animate(frames, opts);
    twin.animate(frames, opts);
    followStrip(anim);
    anim.onfinish = () => setTimeout(scrollToDetails, REVEAL.scrollPause);
  }

  // The animation plays on every load and refresh. For testing, add ?skip to the
  // address to jump straight to the finished state.
  const revealEl = $('#reveal');
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);   // drop any leftover #hash
  if (new URLSearchParams(location.search).has('skip')) {
    finishReveal();
    revealEl.classList.add('is-in');
  } else {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      revealEl.classList.add('is-in');
      setTimeout(playReveal, reduceMotion ? 0 : REVEAL.fadeIn + REVEAL.delay);
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(start, start);
    setTimeout(start, 2500);   // don't wait forever if the fonts are slow
  }

  // "Share your address" scrolls down without writing #details into the address bar,
  // so refreshing the page replays the animation instead of skipping it.
  $('#toDetails').addEventListener('click', (e) => {
    e.preventDefault();
    $('#details').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  // ---- Add to calendar ----------------------------------------------------
  const c = CONFIG.calendar;
  $('#gcal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(c.title)
    + '&dates=' + c.start + '/' + c.end
    + '&location=' + encodeURIComponent(c.location)
    + '&details=' + encodeURIComponent(c.details);

  const icsEscape = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rahul and Mansi//Save the Date//EN',
    'BEGIN:VEVENT',
    'UID:rahul-mansi-' + c.start + '@save-the-date',
    'DTSTAMP:' + stamp,
    'DTSTART;VALUE=DATE:' + c.start,
    'DTEND;VALUE=DATE:' + c.end,
    'SUMMARY:' + icsEscape(c.title),
    'LOCATION:' + icsEscape(c.location),
    'DESCRIPTION:' + icsEscape(c.details),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  $('#ics').href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));

  // ---- Address form -------------------------------------------------------
  // Our own styled form, posting straight into the Google Form's responses.
  const formHost = $('#formHost');
  formHost.appendChild($('#addressFormTpl').content.cloneNode(true));
  const form = formHost.querySelector('form');
  const status = form.querySelector('.note');
  const button = form.querySelector('button');

  function parseGoogleForm(link) {
    try {
      const url = new URL(link);
      const m = url.pathname.match(/\/forms\/d\/e\/([^/]+)\//);
      if (!m) return null;
      const fields = {};
      for (const [key, value] of url.searchParams) {
        if (key.startsWith('entry.')) fields[value.trim().toUpperCase()] = key;
      }
      if (!fields.NAME || !fields.ADDRESS) return null;
      return { action: `https://docs.google.com/forms/d/e/${m[1]}/formResponse`, fields };
    } catch (_) { return null; }
  }

  const gf = CONFIG.googleFormPrefilledLink ? parseGoogleForm(CONFIG.googleFormPrefilledLink) : null;
  if (!gf) {
    // Not connected yet: show the form but keep it disabled.
    form.querySelectorAll('input, textarea, button').forEach((el) => { el.disabled = true; });
    if (CONFIG.googleFormPrefilledLink) console.warn('googleFormPrefilledLink is not a valid pre-filled link');
  } else {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const body = new URLSearchParams();
      body.append(gf.fields.NAME, form.elements.name.value.trim());
      body.append(gf.fields.ADDRESS, form.elements.address.value.trim());
      if (gf.fields.EMAIL) body.append(gf.fields.EMAIL, form.elements.email.value.trim());
      button.disabled = true;
      status.hidden = false;
      status.textContent = 'Sending…';
      try {
        // Google doesn't allow reading the reply from another site ("no-cors"),
        // so a completed request is treated as success.
        await fetch(gf.action, { method: 'POST', mode: 'no-cors', body });
        form.reset();
        status.textContent = 'Thank you! We can’t wait to celebrate with you.';
      } catch (_) {
        status.textContent = 'Something went wrong. Please try again.';
        button.disabled = false;
      }
    });
  }
})();
