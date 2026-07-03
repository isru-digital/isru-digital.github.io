/* ============================================================
   MAISON - נכסי יוקרה
   1) Scrubs ONE concatenated villa film to the scroll position.
   2) House-to-house cinematic transition overlay (click a property →
      "warp" fly-in → that house's loop + caption).
   Vanilla JS, no dependencies, degrades gracefully.
   CUSTOMIZE: set DUR to the real per-clip durations once the film is built.
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mqMobile = window.matchMedia("(max-width: 820px), (orientation: portrait)");

  var film  = document.getElementById("film");
  var video = document.getElementById("filmVideo");
  var caps  = Array.prototype.slice.call(document.querySelectorAll(".cap"));
  var dots  = Array.prototype.slice.call(document.querySelectorAll(".dots a"));
  var cue   = document.getElementById("scrollCue");
  var nav   = document.getElementById("nav");
  var pbar  = document.getElementById("progress");

  /* per-clip durations → scene bands as fractions of the whole film.
     PLACEHOLDER film = 7 × 6s. Update after the real film is assembled. */
  var DUR = [6, 6, 6, 6, 6, 6, 6];
  var TOTAL = DUR.reduce(function (a, b) { return a + b; }, 0);
  var bands = (function () {
    var out = [], acc = 0;
    DUR.forEach(function (d) { var from = acc / TOTAL; acc += d; out.push({ from: from, to: acc / TOTAL }); });
    return out;
  })();

  /* ---------- film source (PC vs mobile) + priming ---------- */
  var ready = false, primed = false;
  function wantSrc() { return mqMobile.matches ? video.dataset.srcM : video.dataset.src; }
  function loadFilm() {
    var want = wantSrc();
    if (video.getAttribute("src") !== want) {
      video.setAttribute("src", want);
      video.load();
      ready = false; primed = false;
    }
  }
  video.addEventListener("loadedmetadata", function () { ready = true; update(); });
  function prime() {
    if (primed) return;
    primed = true;
    var p = video.play();
    if (p && p.then) p.then(function () { video.pause(); }).catch(function () { primed = false; });
    else { try { video.pause(); } catch (e) {} }
  }

  /* ---------- scrub engine (scroll position -> film time) ---------- */
  function dur() { return (video.duration && isFinite(video.duration)) ? video.duration : TOTAL; }
  function filmProgress() {
    var scrollable = film.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    var top = film.getBoundingClientRect().top;
    var p = -top / scrollable;
    return p < 0 ? 0 : (p > 1 ? 1 : p);
  }
  function activeIndex(p) {
    for (var i = 0; i < bands.length; i++) { if (p < bands[i].to) return i; }
    return bands.length - 1;
  }
  var lastP = 0;
  function bufferedEnd() {
    try { return video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0; } catch (e) { return 0; }
  }
  function seek(t) {
    if (!ready) return;
    var safe = Math.min(t, Math.max(0, bufferedEnd() - 0.05));
    try { video.currentTime = safe; } catch (e) {}
  }

  function update() {
    var p = filmProgress();
    lastP = p;
    var idx = activeIndex(p);
    for (var i = 0; i < caps.length; i++) caps[i].classList.toggle("is-active", i === idx);
    for (var j = 0; j < dots.length; j++) dots[j].classList.toggle("is-active", j === idx);
    if (cue) cue.style.opacity = p > 0.02 ? "0" : "";
    seek(p * dur());
  }

  var revealEls = [];
  function runReveals() {
    var vh = window.innerHeight || 800;
    for (var k = 0; k < revealEls.length; k++) {
      if (!revealEls[k].classList.contains("is-in") &&
          revealEls[k].getBoundingClientRect().top < vh * 0.92) {
        revealEls[k].classList.add("is-in");
      }
    }
  }

  function onScroll() {
    update();
    var st = window.scrollY || window.pageYOffset;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (pbar) pbar.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
    if (nav) nav.classList.toggle("is-scrolled", st > 40);
    runReveals();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", update, { passive: true });

  /* ---------- init ---------- */
  loadFilm();
  prime();
  revealEls = Array.prototype.slice.call(document.querySelectorAll(".estate, .stats li, .contact__block"));
  if (!prefersReduced) document.documentElement.classList.add("reveal-on");
  video.addEventListener("progress", function () { seek(lastP * dur()); });
  ["touchstart", "pointerdown", "click", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, prime, { once: true, passive: true });
  });
  onScroll();

  function onMQ() { loadFilm(); prime(); update(); }
  if (mqMobile.addEventListener) mqMobile.addEventListener("change", onMQ);
  else if (mqMobile.addListener) mqMobile.addListener(onMQ);

  /* dots → jump to a scene's point in the film */
  function scrollToBand(i) {
    var scrollable = film.offsetHeight - window.innerHeight;
    var mid = (bands[i].from + bands[i].to) / 2;
    window.scrollTo({ top: Math.round(film.offsetTop + mid * scrollable), behavior: "smooth" });
  }
  dots.forEach(function (d, i) {
    d.addEventListener("click", function (e) { e.preventDefault(); scrollToBand(i); });
  });
  if (cue) cue.addEventListener("click", function (e) { e.preventDefault(); scrollToBand(1); });

  /* ---------- mobile menu ---------- */
  var toggle = document.getElementById("navToggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }
  document.querySelectorAll("[data-link]").forEach(function (a) {
    a.addEventListener("click", function () { if (nav) nav.classList.remove("is-open"); });
  });

  /* ============================================================
     HOUSE-TO-HOUSE cinematic transition
     ============================================================ */
  var HOUSES = {
    seaside: {
      title: "וילת הים · קיסריה",
      eyebrow: "טסים אל קו הים",
      body: "קירות זכוכית מול הים, סלון שנפתח למרפסת אינסופית, ובריכה שממשיכה אל האופק. 6 חדרים, 420 מ״ר, פרטיות מוחלטת.",
      thumb: "linear-gradient(160deg,#2a3d46,#0e1a20)",
      images: ["media/houses/seaside_1.jpg", "media/houses/seaside_2.jpg", "media/houses/seaside_3.jpg"]
    },
    penthouse: {
      title: "פנטהאוז השמיים · תל אביב",
      eyebrow: "עולים אל הגג",
      body: "קומה שלמה מעל העיר, מרפסת גג עם בריכה פרטית וקו רקיע שלא נגמר. 5 חדרים, 310 מ״ר, נוף לכל הכיוונים.",
      thumb: "linear-gradient(160deg,#332536,#120b16)",
      images: ["media/houses/penthouse_1.jpg", "media/houses/penthouse_2.jpg", "media/houses/penthouse_3.jpg"]
    },
    manor: {
      title: "אחוזת הכרמים · רמת השרון",
      eyebrow: "נכנסים דרך שער האבן",
      body: "אחוזת אבן על מגרש דונם, כרמים פרטיים, חצר פנימית ובריכה בין העצים. 8 חדרים, 640 מ״ר של שקט.",
      thumb: "linear-gradient(160deg,#3a3325,#17130b)",
      images: ["media/houses/manor_1.jpg", "media/houses/manor_2.jpg", "media/houses/manor_3.jpg"]
    }
  };

  var houseEl    = document.getElementById("house");
  var houseStage = document.getElementById("houseStage");
  var houseWarp  = document.getElementById("houseWarp");
  var houseClose = document.getElementById("houseClose");
  var hEyebrow   = document.getElementById("houseEyebrow");
  var hTitle     = document.getElementById("houseTitle");
  var hBody      = document.getElementById("houseBody");
  var lastFocus  = null;
  var tourTimer  = null;

  /* cross-fading image mini-tour ("fly through the house") */
  function stopTour() { if (tourTimer) { clearInterval(tourTimer); tourTimer = null; } }
  function startTour(images) {
    stopTour();
    houseStage.innerHTML = "";
    houseStage.style.background = "";
    var imgs = images.map(function (src) {
      var im = document.createElement("img");
      im.className = "house__img";
      im.src = src;
      im.alt = "";
      houseStage.appendChild(im);
      return im;
    });
    if (!imgs.length) return;
    var idx = 0;
    imgs[0].classList.add("is-shown");
    if (imgs.length < 2 || prefersReduced) return;
    tourTimer = setInterval(function () {
      imgs[idx].classList.remove("is-shown");
      idx = (idx + 1) % imgs.length;
      imgs[idx].classList.add("is-shown");
    }, 3500);
  }

  function openHouse(id) {
    var h = HOUSES[id];
    if (!h || !houseEl) return;
    lastFocus = document.activeElement;

    hEyebrow.textContent = h.eyebrow;
    hTitle.textContent   = h.title;
    hBody.textContent    = h.body;
    houseEl.style.background = "#000";
    houseWarp.style.setProperty("--warp-thumb", h.thumb);

    if (h.images && h.images.length) {
      startTour(h.images);
    } else {
      /* colored fallback until this house's real images are added */
      stopTour();
      houseStage.innerHTML = "";
      houseStage.style.background = h.thumb;
    }

    houseEl.classList.add("is-open");
    if (!prefersReduced) {
      houseEl.classList.remove("is-warping");
      /* force reflow to restart the warp animation each open */
      void houseEl.offsetWidth;
      houseEl.classList.add("is-warping");
    }
    houseEl.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    houseClose.focus();
  }

  function closeHouse() {
    if (!houseEl) return;
    houseEl.classList.remove("is-open", "is-warping");
    houseEl.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    stopTour();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.querySelectorAll(".estate").forEach(function (card) {
    var id = card.getAttribute("data-house");
    var btn = card.querySelector(".estate__enter");
    if (btn) btn.addEventListener("click", function (e) { e.stopPropagation(); openHouse(id); });
    card.addEventListener("click", function () { openHouse(id); });
  });
  if (houseClose) houseClose.addEventListener("click", closeHouse);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && houseEl && houseEl.classList.contains("is-open")) closeHouse();
  });

  /* ---------- contact form (showcase only) ---------- */
  function toast(msg) {
    var t = document.createElement("div");
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    t.textContent = msg;
    t.style.cssText =
      "position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);" +
      "background:rgba(20,16,11,.97);color:#f6efe1;border:1px solid rgba(201,162,75,.55);" +
      "padding:14px 22px;border-radius:8px;font:600 14px/1.4 Assistant,sans-serif;z-index:9998;" +
      "max-width:88vw;text-align:center;box-shadow:0 14px 40px rgba(0,0,0,.5);opacity:0;" +
      "transition:opacity .3s ease,transform .3s ease;";
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = "1"; t.style.transform = "translateX(-50%) translateY(0)"; });
    setTimeout(function () {
      t.style.opacity = "0"; t.style.transform = "translateX(-50%) translateY(20px)";
      setTimeout(function () { t.remove(); }, 350);
    }, 4200);
  }
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.querySelector("#cf-name");
      var phone = form.querySelector("#cf-phone");
      if (!name.value.trim() || !phone.value.trim()) {
        toast("נא למלא שם וטלפון.");
        (!name.value.trim() ? name : phone).focus();
        return;
      }
      form.reset();
      toast("תודה! זהו אתר תצוגה - במערכת אמיתית הפנייה הייתה נשלחת לסוכן.");
    });
  }
})();
