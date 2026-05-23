/* eslint-disable */
(function () {
  "use strict";

  const DISCOVERY_RADIUS_M = 3;
  const HAMLET_CENTER = [46.41750, 7.78467];
  const ANCHOR_KEY = "anchorOffset";
  const COORDS_VERSION = "biel-survey-1";
  const COORDS_VERSION_KEY = "coordsVersion";

  // Tarife
  const RATE_CHF_PER_MIN = 2 / 60;
  const DAY_PASS_CHF = 12;
  const DAY_PASS_MIN = 1440;
  const HOURLY_MAX_MIN = 360;

  // Einmalige Migration alter Anker-/Override-Werte.
  (function migrateStaleAnchors() {
    try {
      if (localStorage.getItem(COORDS_VERSION_KEY) !== COORDS_VERSION) {
        localStorage.removeItem(ANCHOR_KEY);
        localStorage.removeItem("manualOverrides");
        localStorage.setItem(COORDS_VERSION_KEY, COORDS_VERSION);
      }
    } catch { /* ignorieren */ }
  })();

  const STYLE_LABELS = {
    Modernism: "Moderne",
    Bauhaus: "Bauhaus",
    "Post-war": "Nachkriegszeit",
    Contemporary: "Zeitgenössisch",
    Sacred: "Sakralbau"
  };

  const state = {
    screen: "tour",          // 'tour' | 'payment' | 'app'
    selectedTourId: null,
    payMinutes: 30,           // ausgewählte Zeit in Minuten
    payIsDayPass: false,
    paidUntil: 0,             // timestamp ms
    paidTotal: 0,             // ms total
    countdownTimer: null,

    // Karte / Standort
    position: null,
    heading: null,
    nearest: null,
    discovered: new Set(JSON.parse(localStorage.getItem("discovered") || "[]")),
    watchId: null,
    map: null,
    markers: new Map(),
    userMarker: null,
    userCircle: null,
    filter: "all",
    firstFix: false,
    appBooted: false
  };

  const $ = (id) => document.getElementById(id);

  // ════════════════════════════════════════════════════
  //  SCREEN-WECHSEL
  // ════════════════════════════════════════════════════
  function showScreen(name) {
    state.screen = name;
    $("tourScreen").hidden = name !== "tour";
    $("paymentScreen").hidden = name !== "payment";
    $("appScreen").hidden = name !== "app";
    window.scrollTo(0, 0);
  }

  // ════════════════════════════════════════════════════
  //  TOUR-AUSWAHL
  // ════════════════════════════════════════════════════
  function renderTours() {
    const list = $("tourList");
    list.innerHTML = "";
    TOURS.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tour-card" + (t.available ? "" : " unavailable");
      btn.disabled = !t.available;
      btn.innerHTML = `
        <div class="tour-meta">
          <span class="tour-city">${t.city}</span>
          <h3 class="tour-name">${t.name}</h3>
          <p class="tour-count">${t.count} Stationen</p>
          ${t.available ? "" : `<p class="tour-status">Diese Tour ist noch im Aufbau</p>`}
        </div>
        <span class="tour-cta">${t.available ? "→" : "🔒"}</span>`;
      if (t.available) {
        btn.addEventListener("click", () => {
          state.selectedTourId = t.id;
          $("paymentTitle").textContent = t.name;
          showScreen("payment");
          syncDialFromMinutes(state.payMinutes);
        });
      }
      list.appendChild(btn);
    });
  }

  // ════════════════════════════════════════════════════
  //  DIAL (rotierendes Rad)
  // ════════════════════════════════════════════════════
  // Wir tracken einen absoluten Winkel (Grad). Eine volle Umdrehung
  // entspricht 60 Minuten — so reichen ca. 6 Umdrehungen für das
  // Hourly-Maximum, danach wechselt das Modell auf den Tagespass.
  const DEG_PER_MIN = 6;
  let dialAccum = 30 * DEG_PER_MIN; // Startwert: 30 min
  let dialLastAngle = null;
  let dialDragging = false;

  function dialAngleAt(clientX, clientY) {
    const knob = $("dialKnob");
    const rect = knob.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // 0° = oben, im Uhrzeigersinn positiv
    return (Math.atan2(clientX - cx, cy - clientY) * 180 / Math.PI + 360) % 360;
  }

  function clampMinutes(min) {
    if (min < 1) return 1;
    if (min > HOURLY_MAX_MIN + 1) return DAY_PASS_MIN; // Übergang zum Tagespass
    if (min > HOURLY_MAX_MIN) return HOURLY_MAX_MIN;
    return min;
  }

  function priceFor(minutes) {
    if (minutes >= DAY_PASS_MIN || minutes >= HOURLY_MAX_MIN) return DAY_PASS_CHF;
    return Math.max(0.05, minutes * RATE_CHF_PER_MIN);
  }

  function formatDuration(minutes) {
    if (minutes >= DAY_PASS_MIN) return "24 h";
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m === 0 ? `${h} h` : `${h} h ${m} min`;
    }
    return `${minutes} min`;
  }

  function applyDial(forceMinutes) {
    let minutes;
    if (forceMinutes != null) {
      dialAccum = forceMinutes * DEG_PER_MIN;
      minutes = forceMinutes;
    } else {
      minutes = Math.round(dialAccum / DEG_PER_MIN);
    }
    minutes = clampMinutes(minutes);
    if (minutes === DAY_PASS_MIN) {
      dialAccum = Math.max(dialAccum, HOURLY_MAX_MIN * DEG_PER_MIN + 60); // bleibe oberhalb 360 min
    } else {
      dialAccum = minutes * DEG_PER_MIN;
    }
    state.payMinutes = minutes;
    state.payIsDayPass = minutes >= DAY_PASS_MIN;
    renderDial();
  }

  function syncDialFromMinutes(minutes) { applyDial(minutes); }

  function renderDial() {
    const minutes = state.payMinutes;
    const isDay = state.payIsDayPass;
    $("dialTime").textContent = formatDuration(minutes);
    $("dialPrice").textContent = "CHF " + priceFor(minutes).toFixed(2);
    $("dialMode").hidden = !isDay;

    // Fortschrittsring: 0% bei 1 min, 100% bei 360 min.
    const progress = isDay ? 360 : (minutes / HOURLY_MAX_MIN) * 360;
    const arc = $("dialProgress");
    arc.setAttribute("stroke-dashoffset", String(360 - progress));
    arc.classList.toggle("day", isDay);

    // Handle-Position: gleich Winkel im Uhrzeigersinn, 0° = oben.
    const handleAngle = isDay ? 360 : (minutes / HOURLY_MAX_MIN) * 360;
    const handle = document.querySelector(".dial-handle");
    const knob = $("dialKnob");
    const r = knob.getBoundingClientRect().width / 2 - 4;
    handle.style.transformOrigin = "50% " + (r) + "px";
    handle.style.transform = `translate(-50%, 0) rotate(${handleAngle}deg) translate(0, 0)`;
    // Einfacher: über Rotation des Knobs als Container? Nutzen wir hier:
    handle.style.position = "absolute";
    const rad = (handleAngle - 90) * Math.PI / 180;
    const cx = knob.clientWidth / 2;
    const cy = knob.clientHeight / 2;
    const radius = cx - 12;
    handle.style.transform = "none";
    handle.style.left = (cx + Math.cos(rad) * radius - 12) + "px";
    handle.style.top  = (cy + Math.sin(rad) * radius - 12) + "px";
    handle.classList.toggle("day", isDay);

    // Quick-Buttons aktivieren
    document.querySelectorAll(".quick-btn").forEach((b) => {
      const m = Number(b.dataset.min);
      b.classList.toggle("active", (isDay && m === DAY_PASS_MIN) || (!isDay && m === minutes));
    });

    $("dialKnob").setAttribute("aria-valuenow", String(minutes));
  }

  function initDial() {
    const knob = $("dialKnob");

    knob.addEventListener("pointerdown", (e) => {
      dialDragging = true;
      dialLastAngle = dialAngleAt(e.clientX, e.clientY);
      knob.setPointerCapture(e.pointerId);
    });
    knob.addEventListener("pointermove", (e) => {
      if (!dialDragging) return;
      const a = dialAngleAt(e.clientX, e.clientY);
      let d = a - dialLastAngle;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      dialAccum = Math.max(DEG_PER_MIN, dialAccum + d);
      dialLastAngle = a;
      applyDial();
    });
    const stop = (e) => {
      if (!dialDragging) return;
      dialDragging = false;
      try { knob.releasePointerCapture(e.pointerId); } catch {}
    };
    knob.addEventListener("pointerup", stop);
    knob.addEventListener("pointercancel", stop);
    knob.addEventListener("lostpointercapture", () => { dialDragging = false; });

    // Schnellauswahl
    document.querySelectorAll(".quick-btn").forEach((b) => {
      b.addEventListener("click", () => applyDial(Number(b.dataset.min)));
    });

    // Initial
    window.addEventListener("resize", renderDial);
    applyDial(30);
  }

  // ════════════════════════════════════════════════════
  //  ZAHLUNG
  // ════════════════════════════════════════════════════
  function startPaidSession() {
    const minutes = state.payMinutes;
    const ms = minutes * 60 * 1000;
    state.paidTotal = ms;
    state.paidUntil = Date.now() + ms;
    showSuccessToast();
    bootApp();
    showScreen("app");
    startCountdown();
  }

  function showSuccessToast() {
    let t = document.querySelector(".toast.success");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast success";
      t.innerHTML = `<span class="toast-icon">✓</span><span class="toast-text">Zahlung erfolgreich!</span>`;
      document.body.appendChild(t);
    }
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2400);
  }

  function startCountdown() {
    if (state.countdownTimer) clearInterval(state.countdownTimer);
    updateCountdown();
    state.countdownTimer = setInterval(updateCountdown, 1000);
  }

  function updateCountdown() {
    const remaining = Math.max(0, state.paidUntil - Date.now());
    const cdEl = $("countdownTime");
    const bar = document.querySelector(".countdown-bar");
    if (remaining <= 0) {
      cdEl.textContent = "Abgelaufen";
      bar.classList.add("expired");
      clearInterval(state.countdownTimer);
      state.countdownTimer = null;
      return;
    }
    const totalSec = Math.floor(remaining / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      cdEl.textContent = `${h}h ${String(m).padStart(2,"0")}min`;
    } else {
      cdEl.textContent = `${m}:${String(s).padStart(2,"0")}`;
    }
  }

  // ════════════════════════════════════════════════════
  //  HAUPT-APP (Karte, Discovery)
  // ════════════════════════════════════════════════════
  function bootApp() {
    if (state.appBooted) {
      // Re-fit der Karte falls bereits initialisiert
      if (state.map) state.map.invalidateSize();
      return;
    }
    state.appBooted = true;
    rememberOriginalCoords();
    applyAnchorOffset();
    if (loadAnchorOffset()) $("menuResetRow").hidden = false;
    renderCards();
    initMap();
    $("totalCount").textContent = BUILDINGS.length;
    $("discoveredCount").textContent = state.discovered.size;
    if (state.discovered.size === 0) {
      $("closestName").textContent = "Standort aktivieren";
      $("closestDist").textContent = "—";
      $("bigArrowName").textContent = "—";
      $("bigArrowDist").textContent = "—";
    }
    if (!isSecureish()) {
      showHint("Standortbestimmung benötigt <strong>HTTPS</strong> (oder localhost).", true);
    }
  }

  // ─── Anker ───
  function loadAnchorOffset() {
    try {
      const raw = localStorage.getItem(ANCHOR_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (typeof o.dLat === "number" && typeof o.dLon === "number") return o;
    } catch {}
    return null;
  }
  function rememberOriginalCoords() {
    for (const b of BUILDINGS) {
      if (b._origLat === undefined) { b._origLat = b.lat; b._origLon = b.lon; }
    }
  }
  function applyAnchorOffset() {
    const off = loadAnchorOffset();
    if (!off) return;
    for (const b of BUILDINGS) {
      b.lat = b._origLat + off.dLat;
      b.lon = b._origLon + off.dLon;
    }
  }
  function setAnchorFromPosition(pos) {
    rememberOriginalCoords();
    const c = (() => {
      let lat = 0, lon = 0;
      for (const b of BUILDINGS) { lat += b._origLat; lon += b._origLon; }
      return [lat / BUILDINGS.length, lon / BUILDINGS.length];
    })();
    const offset = { dLat: pos[0] - c[0], dLon: pos[1] - c[1] };
    localStorage.setItem(ANCHOR_KEY, JSON.stringify(offset));
    applyAnchorOffset();
  }
  function clearAnchor() {
    localStorage.removeItem(ANCHOR_KEY);
    rememberOriginalCoords();
    for (const b of BUILDINGS) { b.lat = b._origLat; b.lon = b._origLon; }
  }

  // ─── Geo-Hilfsfunktionen ───
  function haversineMeters(a, b) {
    const R = 6371008.8;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function bearingDeg(from, to) {
    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;
    const lat1 = toRad(from[0]);
    const lat2 = toRad(to[0]);
    const dLon = toRad(to[1] - from[1]);
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }
  function formatDistance(m) {
    if (m == null || isNaN(m)) return "—";
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(2)} km`;
  }
  function styleLabel(s) { return STYLE_LABELS[s] || s; }

  // ─── Illustration (SVG-Fallback) ───
  function illustration(b) {
    const [light, mid, dark] = b.palette;
    const tag = b.illustration;
    const sky = `
      <defs>
        <linearGradient id="sky-${b.id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${light}"/>
          <stop offset="100%" stop-color="#e8e0cf"/>
        </linearGradient>
        <linearGradient id="grnd-${b.id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#cdbf9c"/>
          <stop offset="100%" stop-color="#a39473"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#sky-${b.id})"/>
      <rect y="240" width="400" height="60" fill="url(#grnd-${b.id})"/>
      <circle cx="320" cy="60" r="22" fill="#f4e8c8" opacity="0.7"/>`;
    const C = {
      watertower: `<polygon points="160,240 240,240 230,210 170,210" fill="${mid}"/><rect x="172" y="120" width="56" height="90" fill="${light}"/>${[180,190,200,210,220].map((x)=>`<line x1="${x}" y1="120" x2="${x}" y2="210" stroke="${mid}" stroke-width="1"/>`).join("")}<polygon points="160,120 240,120 230,100 170,100" fill="${dark}"/><rect x="190" y="60" width="20" height="40" fill="${mid}"/><polygon points="186,60 214,60 200,40" fill="#7ea693"/><rect x="198" y="30" width="4" height="14" fill="${dark}"/>`,
      antonius: `<rect x="70" y="170" width="260" height="70" fill="${mid}"/><rect x="70" y="100" width="260" height="70" fill="${light}"/><polygon points="60,100 340,100 200,40" fill="${dark}"/><circle cx="200" cy="135" r="22" fill="${dark}" opacity="0.85"/><circle cx="200" cy="135" r="14" fill="${light}" opacity="0.7"/><line x1="200" y1="121" x2="200" y2="149" stroke="${dark}" stroke-width="1.5"/><line x1="186" y1="135" x2="214" y2="135" stroke="${dark}" stroke-width="1.5"/><rect x="280" y="40" width="30" height="200" fill="${dark}"/><rect x="285" y="60" width="20" height="40" fill="${light}" opacity="0.6"/><rect x="285" y="110" width="20" height="40" fill="${light}" opacity="0.5"/><polygon points="278,40 312,40 295,22" fill="${dark}"/><rect x="110" y="195" width="20" height="45" fill="${dark}"/><rect x="270" y="195" width="20" height="45" fill="${dark}"/>`,
      lukas: `<rect x="60" y="160" width="260" height="80" fill="${light}"/><rect x="60" y="155" width="260" height="6" fill="${dark}"/>${[80,125,170,215,260].map((x)=>`<rect x="${x}" y="180" width="30" height="50" fill="${dark}" opacity="0.55"/>`).join("")}<rect x="320" y="80" width="34" height="160" fill="${mid}"/><rect x="328" y="100" width="18" height="120" fill="${light}" opacity="0.3"/><rect x="320" y="72" width="34" height="8" fill="${dark}"/><line x1="337" y1="60" x2="337" y2="72" stroke="${dark}" stroke-width="2"/><line x1="331" y1="66" x2="343" y2="66" stroke="${dark}" stroke-width="2"/>`,
      volta: `<rect x="50" y="120" width="300" height="120" fill="${light}"/><rect x="50" y="120" width="300" height="14" fill="${dark}"/>${Array.from({length:8}).map((_,i)=>`<rect x="${66+i*36}" y="148" width="20" height="22" fill="${dark}" opacity="0.5"/><rect x="${66+i*36}" y="184" width="20" height="22" fill="${dark}" opacity="0.5"/>`).join("")}<rect x="170" y="200" width="60" height="40" fill="${mid}"/><rect x="186" y="220" width="28" height="20" fill="${dark}"/>`,
      davidsboden: `<rect x="40" y="100" width="320" height="140" fill="${light}"/><rect x="40" y="100" width="320" height="6" fill="${mid}"/>${Array.from({length:5}).map((_,row)=>Array.from({length:9}).map((_,col)=>`<rect x="${56+col*34}" y="${118+row*24}" width="14" height="16" fill="${dark}" opacity="0.55"/>`).join("")).join("")}<rect x="180" y="208" width="40" height="32" fill="${dark}" opacity="0.85"/>`,
      schudel: `<rect x="120" y="160" width="200" height="80" fill="${light}"/><rect x="120" y="155" width="200" height="6" fill="${dark}"/><rect x="140" y="175" width="160" height="14" fill="${dark}" opacity="0.55"/><rect x="140" y="200" width="40" height="40" fill="${mid}"/><rect x="190" y="200" width="20" height="40" fill="${dark}" opacity="0.7"/><rect x="220" y="200" width="80" height="20" fill="${dark}" opacity="0.55"/><rect x="80" y="200" width="40" height="40" fill="${mid}" opacity="0.6"/>`,
      pavillon: `<polygon points="40,170 200,140 360,170 360,180 200,150 40,180" fill="${dark}"/><line x1="80" y1="170" x2="80" y2="240" stroke="${mid}" stroke-width="6"/><line x1="320" y1="170" x2="320" y2="240" stroke="${mid}" stroke-width="6"/><line x1="200" y1="150" x2="200" y2="240" stroke="${mid}" stroke-width="4"/><rect x="100" y="200" width="200" height="40" fill="${light}" opacity="0.6"/>${[140,180,220,260].map((x)=>`<line x1="${x}" y1="180" x2="${x}" y2="240" stroke="${mid}" stroke-width="2"/>`).join("")}`,
      hechtliacker: `<polygon points="40,240 40,180 100,180 100,160 180,160 180,140 260,140 260,160 340,160 340,180 360,180 360,240" fill="${light}"/><polygon points="40,180 100,180 100,160 180,160 180,140 260,140 260,160 340,160 340,180" fill="none" stroke="${dark}" stroke-width="2"/>${[[60,200],[88,200],[116,180],[144,180],[172,180],[200,160],[228,160],[256,160],[284,180],[312,180],[340,200]].map(([x,y])=>`<rect x="${x}" y="${y}" width="14" height="20" fill="${dark}" opacity="0.55"/>`).join("")}`,
      schwarzpark: `<ellipse cx="80" cy="240" rx="50" ry="14" fill="${dark}" opacity="0.25"/><ellipse cx="340" cy="240" rx="60" ry="16" fill="${dark}" opacity="0.25"/><rect x="150" y="80" width="100" height="160" fill="${mid}"/>${Array.from({length:5}).map((_,row)=>Array.from({length:3}).map((_,col)=>`<rect x="${162+col*28}" y="${100+row*28}" width="18" height="18" fill="${light}" opacity="0.6"/>`).join("")).join("")}<line x1="200" y1="80" x2="200" y2="240" stroke="${dark}" stroke-width="1.5" opacity="0.5"/>`,
      buvette: `<rect y="220" width="400" height="20" fill="#7a8e8a"/><rect x="150" y="170" width="100" height="60" fill="${mid}"/><rect x="150" y="166" width="100" height="6" fill="${dark}"/><polygon points="150,170 250,170 280,150 180,150" fill="${mid}" opacity="0.7"/><rect x="170" y="190" width="60" height="30" fill="${dark}" opacity="0.6"/><rect x="178" y="196" width="44" height="18" fill="${light}" opacity="0.5"/><line x1="120" y1="150" x2="280" y2="150" stroke="${dark}" stroke-width="1.5" opacity="0.4"/>`,
      brunngaesslein: `<rect x="80" y="120" width="60" height="120" fill="${light}" opacity="0.85"/><rect x="260" y="100" width="60" height="140" fill="${light}" opacity="0.85"/><rect x="150" y="80" width="100" height="160" fill="${light}"/><polygon points="148,80 252,80 200,40" fill="${dark}"/>${Array.from({length:4}).map((_,row)=>Array.from({length:2}).map((_,col)=>`<rect x="${166+col*30}" y="${100+row*30}" width="18" height="22" fill="${dark}" opacity="0.55"/>`).join("")).join("")}<rect x="165" y="180" width="70" height="14" fill="${mid}"/>`
    };
    return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${sky}${C[tag] || ""}</svg>`;
  }

  // Foto-Bild mit SVG-Fallback. Wenn die Wikimedia-URL nicht auflöst,
  // wird das Bild beim onerror durch die Illustration ersetzt.
  function photoOrIllustration(b) {
    if (!b.photo) return illustration(b);
    const safeAlt = b.name.replace(/"/g, "&quot;");
    return `<img src="${b.photo}" alt="${safeAlt}" loading="lazy" decoding="async"` +
      ` onerror="this.outerHTML = window.__buildingFallback(${b.id})">`;
  }
  window.__buildingFallback = function (id) {
    const b = BUILDINGS.find((x) => x.id === id);
    return b ? illustration(b) : "";
  };

  // ─── Karten ───
  function buildingMatchesFilter(b) {
    if (state.filter === "all") return true;
    return b.style.toLowerCase() === state.filter;
  }
  function renderCards() {
    const cardsEl = $("cards");
    cardsEl.innerHTML = "";
    let shown = 0;
    BUILDINGS.forEach((b) => {
      if (!buildingMatchesFilter(b)) return;
      shown++;
      const discovered = state.discovered.has(b.id);
      const dist = state.position
        ? haversineMeters(state.position, [b.lat, b.lon])
        : null;
      const distLabel = dist == null ? "—" : formatDistance(dist);
      const preview = b.text.split(/[.!?]/)[0].trim().slice(0, 130) + "…";

      const el = document.createElement("article");
      el.className = "card" + (discovered ? " discovered" : "");
      el.dataset.id = b.id;
      el.innerHTML = `
        <div class="card-thumb">
          ${photoOrIllustration(b)}
          <span class="card-style-chip">${styleLabel(b.style)}</span>
        </div>
        <div class="lock-badge">${discovered ? "★" : "✦"}</div>
        <div class="card-body">
          <span class="card-num">Nr. ${String(b.id).padStart(2,"0")} · <span class="card-year">${b.year}</span></span>
          <h3 class="card-title">${b.name}</h3>
          <p class="card-arch"><strong>${b.architect}</strong></p>
          <p class="card-preview">${preview}</p>
          <div class="card-foot">
            <span class="card-dist">📍 <strong>${distLabel}</strong></span>
            <button class="view-btn" type="button">Details</button>
          </div>
        </div>`;
      el.addEventListener("click", () => openModal(b));
      cardsEl.appendChild(el);
    });
    $("visibleCount").textContent = `${shown} von ${BUILDINGS.length}`;
    $("discoveredCount").textContent = state.discovered.size;
    $("totalCount").textContent = BUILDINGS.length;
  }

  // ─── Modal ───
  let activeModalId = null;
  function openModal(b) {
    activeModalId = b.id;
    consumeHaptic();
    $("modalTitle").textContent = b.name;
    $("modalFigure").innerHTML = photoOrIllustration(b);
    $("modalYear").textContent = b.year;
    $("modalArch").textContent = b.architect;
    $("modalStyle").textContent = styleLabel(b.style);
    $("modalAddress").textContent = b.address;

    const discovered = state.discovered.has(b.id);
    const detailCard = $("modalDetailCard");
    if (discovered) {
      $("modalAbout").textContent = b.text;
      $("modalDetail").textContent = b.interesting || "";
      detailCard.hidden = !b.interesting;
    } else {
      $("modalAbout").textContent =
        "Dieser Eintrag wird freigeschaltet, sobald du dich auf " +
        DISCOVERY_RADIUS_M + " Meter näherst. Aktiviere den Standort, " +
        "damit der grosse Pfeil unter der Karte auf das nächstgelegene Juwel zeigt.";
      detailCard.hidden = true;
    }
    $("modal").hidden = false;
  }
  function closeModal() { $("modal").hidden = true; activeModalId = null; }
  $("modal").addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("modal").hidden) closeModal();
      else if (!$("menuSheet").hidden) closeMenu();
    }
  });
  $("modalCenter").addEventListener("click", () => {
    if (activeModalId == null) return;
    const b = BUILDINGS.find((x) => x.id === activeModalId);
    if (b && state.map) {
      state.map.flyTo([b.lat, b.lon], 19, { duration: 0.6 });
      closeModal();
    }
  });

  // ─── Toast / Haptik ───
  let toastTimer = null;
  let toastBuildingId = null;
  function showToast(b) {
    let t = document.querySelector(".toast:not(.success)");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      t.innerHTML = `<span class="toast-icon">★</span><span class="toast-text"></span>`;
      document.body.appendChild(t);
      t.addEventListener("click", () => {
        consumeHaptic();
        if (toastBuildingId != null) {
          const found = BUILDINGS.find((x) => x.id === toastBuildingId);
          if (found) openModal(found);
        }
        t.classList.remove("show");
      });
    }
    toastBuildingId = b.id ?? null;
    t.querySelector(".toast-text").textContent = b.id ? `Entdeckt: ${b.name}` : b.name;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
  }
  const VIBRATION_PATTERN = [220, 90, 360];
  function vibrate(pattern) {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
    try { return navigator.vibrate(pattern || VIBRATION_PATTERN); } catch { return false; }
  }
  let pendingHaptic = false;
  function vibrateDiscovery() { pendingHaptic = true; vibrate(VIBRATION_PATTERN); }
  function consumeHaptic() {
    if (!pendingHaptic) return;
    if (vibrate(VIBRATION_PATTERN)) pendingHaptic = false;
  }

  // ─── Karte ───
  function initMap() {
    state.map = L.map("map", { zoomControl: false, attributionControl: true }).setView(HAMLET_CENTER, 18);
    L.control.zoom({ position: "bottomright" }).addTo(state.map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(state.map);
    BUILDINGS.forEach((b) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="building-marker" data-id="${b.id}">${b.id}</div>`,
        iconSize: [36, 36], iconAnchor: [18, 18]
      });
      const m = L.marker([b.lat, b.lon], { icon })
        .addTo(state.map)
        .on("click", () => openModal(b));
      state.markers.set(b.id, m);
    });
    const group = new L.featureGroup(Array.from(state.markers.values()));
    state.map.fitBounds(group.getBounds().pad(0.35));
  }
  function updateMarkers() {
    state.markers.forEach((marker, id) => {
      const el = marker.getElement()?.querySelector(".building-marker");
      if (!el) return;
      el.classList.toggle("discovered", state.discovered.has(id));
      el.classList.toggle("active", state.nearest && state.nearest.id === id);
    });
  }
  function updateUserPosition() {
    if (!state.position) return;
    const ll = [state.position[0], state.position[1]];
    if (!state.userMarker) {
      const icon = L.divIcon({ className: "", html: '<div class="user-marker"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
      state.userMarker = L.marker(ll, { icon, interactive: false }).addTo(state.map);
      state.userCircle = L.circle(ll, {
        radius: DISCOVERY_RADIUS_M, color: "#2f7a52", weight: 1, fillColor: "#2f7a52", fillOpacity: 0.1
      }).addTo(state.map);
    } else {
      state.userMarker.setLatLng(ll);
      state.userCircle.setLatLng(ll);
    }
  }

  // ─── Geolocation ───
  function showHint(html, isError) {
    const h = $("locationHint");
    h.hidden = false;
    h.classList.toggle("error", !!isError);
    h.innerHTML = html;
  }
  function hideHint() { $("locationHint").hidden = true; }
  function isSecureish() {
    return location.protocol === "https:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1";
  }
  function geoErrorHint(err) {
    if (err.code === 1) {
      return "Standortberechtigung wurde verweigert. Öffne das <strong>Schloss-Symbol</strong> in der Adressleiste und stelle <em>Standort</em> auf <em>Erlauben</em>.";
    }
    if (err.code === 2) return "Dein Gerät konnte keinen GPS-Fix erhalten. Versuche es draussen erneut.";
    return "Die Standortbestimmung hat zu lange gedauert. Bitte erneut versuchen.";
  }
  function startGeolocation() {
    if (!("geolocation" in navigator)) { showHint("Dieser Browser unterstützt keine Standortbestimmung.", true); return; }
    if (!isSecureish()) { showHint("Standortbestimmung benötigt <strong>HTTPS</strong> (oder localhost).", true); return; }
    hideHint();
    $("enableLocationLabel").textContent = "Suche Standort …";
    $("enableLocation").disabled = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => { applyPosition(pos); startWatch(); },
      (err) => {
        console.warn(err);
        if (err.code !== 1) startWatch();
        else handleGeoError(err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }
  function applyPosition(pos) {
    state.position = [pos.coords.latitude, pos.coords.longitude];
    if (typeof pos.coords.heading === "number" && !isNaN(pos.coords.heading)) {
      state.heading = pos.coords.heading;
    }
    onPositionUpdate();
  }
  function handleGeoError(err) {
    $("enableLocation").disabled = false;
    $("enableLocationLabel").textContent = "Standort aktivieren";
    showHint(geoErrorHint(err), true);
  }
  function startWatch() {
    if (state.watchId != null) return;
    state.watchId = navigator.geolocation.watchPosition(
      (pos) => applyPosition(pos),
      (err) => { console.warn(err); handleGeoError(err); },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    );
  }
  function onPositionUpdate() {
    $("enableLocation").disabled = false;
    $("enableLocationLabel").textContent = "Zentrieren";
    updateUserPosition();
    updateCoordsReadout();

    let nearest = null;
    let minD = Infinity;
    BUILDINGS.forEach((b) => {
      const d = haversineMeters(state.position, [b.lat, b.lon]);
      if (d < minD) { minD = d; nearest = { ...b, distance: d }; }
      if (d <= DISCOVERY_RADIUS_M && !state.discovered.has(b.id)) {
        state.discovered.add(b.id);
        localStorage.setItem("discovered", JSON.stringify([...state.discovered]));
        vibrateDiscovery();
        showToast(b);
        renderCards();
        if (!$("modal").hidden && activeModalId === b.id) openModal(b);
      }
    });
    state.nearest = nearest;
    if (nearest) {
      $("closestName").textContent = nearest.name;
      $("closestDist").textContent = formatDistance(nearest.distance);
      $("bigArrowName").textContent = nearest.name;
      $("bigArrowDist").textContent = formatDistance(nearest.distance);

      const target = bearingDeg(state.position, [nearest.lat, nearest.lon]);
      const rot = (state.heading == null) ? target : (target - state.heading + 360) % 360;
      $("compassArrow").style.transform = `rotate(${rot}deg)`;
    }
    $("discoveredCount").textContent = state.discovered.size;
    updateMarkers();
    renderCards();
    if (!state.firstFix) { state.firstFix = true; state.map.setView(state.position, 19); }
  }
  function updateCoordsReadout() {
    if (!state.position) { $("menuCoords").textContent = "—"; return; }
    $("menuCoords").textContent = `${state.position[0].toFixed(5)}, ${state.position[1].toFixed(5)}`;
  }

  // ─── Kompass-Sensor ───
  let compassEventsSeen = false;
  function bindCompass() {
    const apply = (e) => {
      const heading = e.webkitCompassHeading != null
        ? e.webkitCompassHeading
        : (e.alpha != null ? (360 - e.alpha) % 360 : null);
      if (heading != null && !isNaN(heading)) {
        compassEventsSeen = true;
        state.heading = heading;
        if (state.nearest && state.position) {
          const target = bearingDeg(state.position, [state.nearest.lat, state.nearest.lon]);
          const rot = (target - state.heading + 360) % 360;
          $("compassArrow").style.transform = `rotate(${rot}deg)`;
        }
      }
    };
    window.addEventListener("deviceorientationabsolute", apply, true);
    window.addEventListener("deviceorientation", apply, true);
  }
  async function requestCompass() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" &&
          typeof DeviceOrientationEvent.requestPermission === "function") {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== "granted") {
          showHint("Kompass-Berechtigung wurde verweigert. Der Pfeil nutzt weiterhin die GPS-Bewegungsrichtung.", true);
          return;
        }
      }
      bindCompass();
      setTimeout(() => {
        if (!compassEventsSeen) {
          showHint("Kein Kompass-Sensor erkannt. Der Pfeil nutzt die GPS-Bewegungsrichtung, sobald du dich bewegst.", false);
        }
      }, 1500);
    } catch (e) { console.warn(e); }
  }

  // ─── Globale Events ───
  function wireEvents() {
    $("enableLocation").addEventListener("click", () => {
      if (state.watchId == null) startGeolocation();
      else if (state.position) state.map.flyTo(state.position, 19, { duration: 0.6 });
    });

    document.querySelectorAll(".style-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".style-pill").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.filter = btn.dataset.filter;
        renderCards();
      });
    });

    // Menü
    $("menuBtn").addEventListener("click", () => $("menuSheet").hidden = false);
    $("menuSheet").addEventListener("click", (e) => {
      if (e.target.closest("[data-menu-close]")) closeMenu();
    });
    $("menuEnableCompass").addEventListener("click", () => { requestCompass(); closeMenu(); });
    $("menuAnchor").addEventListener("click", () => {
      if (!state.position) {
        showHint("Es wird zuerst ein Standort benötigt — bitte den Standort aktivieren.", true);
        closeMenu(); return;
      }
      setAnchorFromPosition(state.position);
      refreshMarkers();
      $("menuResetRow").hidden = false;
      closeMenu();
      showToast({ name: "Gebäude an deinen Standort verankert" });
    });
    $("menuResetAnchor").addEventListener("click", () => {
      clearAnchor();
      refreshMarkers();
      $("menuResetRow").hidden = true;
      closeMenu();
    });

    // Topbar-Zurück: erst Sheet schließen, dann nach oben scrollen
    $("backBtn").addEventListener("click", () => {
      if (!$("modal").hidden) { closeModal(); return; }
      if (!$("menuSheet").hidden) { closeMenu(); return; }
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Countdown → Zeit anpassen
    $("adjustTimeBtn").addEventListener("click", () => {
      showScreen("payment");
      syncDialFromMinutes(state.payMinutes);
    });

    // Zahlungs-Buttons
    $("paymentBack").addEventListener("click", () => {
      // Wenn schon bezahlt wurde: zurück zur App, sonst zur Tour-Auswahl
      if (state.paidUntil > Date.now()) showScreen("app");
      else showScreen("tour");
    });
    document.querySelectorAll(".pay-method").forEach((b) => {
      b.addEventListener("click", () => startPaidSession());
    });
  }
  function closeMenu() { $("menuSheet").hidden = true; }
  function refreshMarkers() {
    state.markers.forEach((m, id) => {
      const b = BUILDINGS.find((x) => x.id === id);
      if (b) m.setLatLng([b.lat, b.lon]);
    });
    const group = new L.featureGroup(Array.from(state.markers.values()));
    state.map.flyToBounds(group.getBounds().pad(0.3), { duration: 0.6 });
  }

  // ════════════════════════════════════════════════════
  //  BOOT
  // ════════════════════════════════════════════════════
  document.addEventListener("DOMContentLoaded", () => {
    renderTours();
    initDial();
    wireEvents();
    showScreen("tour");
  });
})();
