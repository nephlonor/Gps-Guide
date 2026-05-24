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
    warned5min: false,        // 5-Minuten-Popup nur einmal pro Session

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
  //  DIAL (rotierendes Rad, direkt der Fingerbewegung folgend)
  // ════════════════════════════════════════════════════
  // Mapping: 1° = 1 min. Volle Umdrehung = 360 min = 6 h Maximum.
  // Tagespass wird über den Quick-Button gewählt.
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

  function setMinutes(min) {
    state.payIsDayPass = false;
    state.payMinutes = Math.max(1, Math.min(HOURLY_MAX_MIN, Math.round(min)));
    renderDial();
  }
  function setDayPass() {
    state.payIsDayPass = true;
    state.payMinutes = DAY_PASS_MIN;
    renderDial();
  }
  function syncDialFromMinutes(minutes) {
    if (minutes >= DAY_PASS_MIN) setDayPass();
    else setMinutes(minutes);
  }

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

    // Handle: bei 1° = 1 min sitzt der Punkt direkt bei `minutes` Grad.
    const handleAngle = isDay ? 360 : minutes;
    const handle = document.querySelector(".dial-handle");
    const knob = $("dialKnob");
    const rad = (handleAngle - 90) * Math.PI / 180;
    const cx = knob.clientWidth / 2;
    const cy = knob.clientHeight / 2;
    const radius = cx - 12;
    handle.style.transform = "none";
    handle.style.left = (cx + Math.cos(rad) * radius - 12) + "px";
    handle.style.top  = (cy + Math.sin(rad) * radius - 12) + "px";
    handle.classList.toggle("day", isDay);

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
      try { knob.setPointerCapture(e.pointerId); } catch {}
      const a = dialAngleAt(e.clientX, e.clientY);
      dialLastAngle = a;
      // Tap snappt sofort zur Fingerposition (direktes Folgen).
      setMinutes(a < 0.5 ? 1 : a);
    });
    knob.addEventListener("pointermove", (e) => {
      if (!dialDragging) return;
      const a = dialAngleAt(e.clientX, e.clientY);
      // Delta normalisiert auf ±180°, damit der Übergang über 0/360
      // weich bleibt; der Punkt sitzt nach dem Update wieder genau am
      // Finger.
      let d = a - dialLastAngle;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      setMinutes(state.payMinutes + d);
      dialLastAngle = a;
    });
    const stop = (e) => {
      if (!dialDragging) return;
      dialDragging = false;
      try { knob.releasePointerCapture(e.pointerId); } catch {}
    };
    knob.addEventListener("pointerup", stop);
    knob.addEventListener("pointercancel", stop);
    knob.addEventListener("lostpointercapture", () => { dialDragging = false; });

    document.querySelectorAll(".quick-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const m = Number(b.dataset.min);
        if (m >= DAY_PASS_MIN) setDayPass();
        else setMinutes(m);
      });
    });

    window.addEventListener("resize", renderDial);
    setMinutes(30);
  }

  // ════════════════════════════════════════════════════
  //  ZAHLUNG
  // ════════════════════════════════════════════════════
  function startPaidSession() {
    const minutes = state.payMinutes;
    const ms = minutes * 60 * 1000;
    state.paidTotal = ms;
    state.paidUntil = Date.now() + ms;
    state.warned5min = false; // jede neue Zahlung resettet die Warnung
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
    // 5-Minuten-Warnung — nur einmal je Session, sobald wir die Schwelle
    // unterschreiten. Im App-Screen blenden wir das Sheet ein.
    if (!state.warned5min && totalSec <= 5 * 60 && state.screen === "app") {
      state.warned5min = true;
      showWarnSheet(Math.max(1, Math.ceil(totalSec / 60)));
    }
  }

  function showWarnSheet(minutesLeft) {
    $("warnMinutes").textContent = String(minutesLeft);
    $("warnModal").hidden = false;
  }
  function closeWarnSheet() { $("warnModal").hidden = true; }

  // Berechnet die noch verbleibenden Minuten (auf ganze Minuten gerundet)
  // — wird genutzt, um beim Sprung in die Zeitauswahl das Rad sofort
  // auf den richtigen Punkt zu setzen.
  function remainingMinutesRoundedUp() {
    const rem = Math.max(0, state.paidUntil - Date.now());
    if (rem <= 0) return 1;
    return Math.max(1, Math.ceil(rem / 60000));
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

  // ─── Illustration (SVG-Fallback, detailliert) ───
  function illustration(b) {
    const [light, mid, dark] = b.palette;
    const tag = b.illustration;
    const id = b.id;
    // Atmosphärische Grunddefs: Himmel, Boden, Lichtschein, Schatten.
    const defs = `
      <defs>
        <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f3ead8"/>
          <stop offset="55%" stop-color="#e7dfc8"/>
          <stop offset="100%" stop-color="#d6cbb0"/>
        </linearGradient>
        <linearGradient id="grnd-${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c8b893"/>
          <stop offset="100%" stop-color="#8c7a55"/>
        </linearGradient>
        <linearGradient id="walL-${id}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${light}"/>
          <stop offset="100%" stop-color="${mid}"/>
        </linearGradient>
        <linearGradient id="walD-${id}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${mid}"/>
          <stop offset="100%" stop-color="${dark}"/>
        </linearGradient>
        <radialGradient id="sun-${id}" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#fff5d6" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#fff5d6" stop-opacity="0"/>
        </radialGradient>
        <filter id="shadow-${id}" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="2"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>`;
    const sky = `
      <rect width="400" height="300" fill="url(#sky-${id})"/>
      <circle cx="315" cy="62" r="80" fill="url(#sun-${id})"/>
      <circle cx="315" cy="62" r="18" fill="#fff5d6" opacity="0.75"/>
      <ellipse cx="80" cy="76" rx="48" ry="9" fill="#fff" opacity="0.5"/>
      <ellipse cx="220" cy="48" rx="38" ry="7" fill="#fff" opacity="0.45"/>
      <rect y="232" width="400" height="68" fill="url(#grnd-${id})"/>
      <line x1="0" y1="234" x2="400" y2="234" stroke="${dark}" stroke-width="0.6" opacity="0.4"/>`;

    // Häufige Bausteine
    const wnd = (x, y, w, h) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${dark}" opacity="0.55"/>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h*0.45}" fill="#fff" opacity="0.18"/>` +
      `<line x1="${x+w/2}" y1="${y}" x2="${x+w/2}" y2="${y+h}" stroke="${dark}" stroke-width="0.6" opacity="0.6"/>` +
      `<line x1="${x}" y1="${y+h/2}" x2="${x+w}" y2="${y+h/2}" stroke="${dark}" stroke-width="0.6" opacity="0.6"/>`;
    const shade = (x, y, w, h, op=0.18) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${dark}" opacity="${op}"/>`;

    const C = {
      watertower: () => {
        // Schmaler hexagonaler Wasserturm: Sockel, kannelierter Schaft,
        // Wassertank, Kupferlaterne mit Spitze.
        const cx = 200;
        return `
          <ellipse cx="${cx}" cy="238" rx="80" ry="6" fill="${dark}" opacity="0.25"/>
          <!-- Sockel -->
          <polygon points="${cx-44},232 ${cx+44},232 ${cx+38},212 ${cx-38},212" fill="url(#walD-${id})"/>
          <rect x="${cx-30}" y="212" width="60" height="2" fill="${dark}" opacity="0.6"/>
          <!-- Schaft mit Kanneluren -->
          <rect x="${cx-26}" y="124" width="52" height="88" fill="url(#walL-${id})"/>
          ${[-20,-12,-4,4,12,20].map(o=>`<line x1="${cx+o}" y1="124" x2="${cx+o}" y2="212" stroke="${dark}" stroke-width="0.8" opacity="0.45"/>`).join("")}
          <rect x="${cx-26}" y="124" width="52" height="6" fill="${dark}" opacity="0.5"/>
          <!-- Wassertank -->
          <rect x="${cx-40}" y="96" width="80" height="28" fill="${mid}"/>
          <rect x="${cx-40}" y="96" width="80" height="6" fill="${dark}" opacity="0.6"/>
          <polygon points="${cx-40},96 ${cx+40},96 ${cx+34},86 ${cx-34},86" fill="${dark}"/>
          <!-- Laterne -->
          <rect x="${cx-12}" y="60" width="24" height="26" fill="${mid}"/>
          ${[-6,0,6].map(o=>`<line x1="${cx+o}" y1="60" x2="${cx+o}" y2="86" stroke="${dark}" stroke-width="0.8" opacity="0.45"/>`).join("")}
          <polygon points="${cx-14},60 ${cx+14},60 ${cx},40" fill="#7aa68d"/>
          <polygon points="${cx-14},60 ${cx+14},60 ${cx},40" fill="#fff" opacity="0.12"/>
          <!-- Blitzableiter-Spitze -->
          <rect x="${cx-1.5}" y="22" width="3" height="20" fill="${dark}"/>
          <polygon points="${cx-3},22 ${cx+3},22 ${cx},14" fill="${dark}"/>
          <!-- Baumwerk -->
          <ellipse cx="60" cy="232" rx="36" ry="22" fill="#7ea683" opacity="0.55"/>
          <ellipse cx="44" cy="220" rx="20" ry="14" fill="#7ea683" opacity="0.45"/>
          <ellipse cx="346" cy="234" rx="30" ry="16" fill="#7ea683" opacity="0.45"/>`;
      },
      antonius: () => {
        // Basilika mit Rosenfenster und seitlichem Glockenturm.
        return `
          <ellipse cx="200" cy="240" rx="170" ry="6" fill="${dark}" opacity="0.2"/>
          <!-- Hauptkörper -->
          <rect x="62" y="120" width="218" height="120" fill="url(#walL-${id})"/>
          <rect x="62" y="120" width="218" height="6" fill="${dark}"/>
          <polygon points="62,120 280,120 171,52" fill="${dark}"/>
          <polygon points="62,120 280,120 171,52" fill="#fff" opacity="0.05"/>
          <!-- Rosenfenster -->
          <circle cx="171" cy="158" r="26" fill="${dark}" opacity="0.85"/>
          <circle cx="171" cy="158" r="18" fill="${light}" opacity="0.55"/>
          ${[0,45,90,135].map(a=>`<line x1="${171+Math.cos(a*Math.PI/180)*22}" y1="${158+Math.sin(a*Math.PI/180)*22}" x2="${171-Math.cos(a*Math.PI/180)*22}" y2="${158-Math.sin(a*Math.PI/180)*22}" stroke="${dark}" stroke-width="1.4"/>`).join("")}
          <circle cx="171" cy="158" r="6" fill="${dark}"/>
          <!-- Eingangsportal -->
          <rect x="155" y="200" width="32" height="40" fill="${dark}"/>
          <rect x="159" y="204" width="24" height="32" fill="${mid}"/>
          <line x1="171" y1="204" x2="171" y2="236" stroke="${dark}" stroke-width="0.8"/>
          <!-- Seitliche Fenster -->
          ${[85,115,221,251].map(x=>`<rect x="${x}" y="180" width="14" height="50" fill="${dark}" opacity="0.5"/><line x1="${x+7}" y1="180" x2="${x+7}" y2="230" stroke="${dark}" stroke-width="0.6"/>`).join("")}
          <!-- Glockenturm -->
          <rect x="294" y="62" width="40" height="178" fill="url(#walD-${id})"/>
          <rect x="294" y="62" width="40" height="6" fill="${dark}"/>
          <polygon points="290,62 338,62 314,40" fill="${dark}"/>
          <rect x="302" y="92" width="24" height="36" fill="${dark}" opacity="0.7"/>
          <rect x="302" y="142" width="24" height="36" fill="${light}" opacity="0.5"/>
          <rect x="302" y="192" width="24" height="36" fill="${dark}" opacity="0.6"/>
          <rect x="312" y="26" width="4" height="16" fill="${dark}"/>
          <rect x="305" y="36" width="18" height="3" fill="${dark}"/>`;
      },
      lukas: () => {
        // Modernistische Querbau-Kirche mit freistehendem Glockenturm.
        return `
          <ellipse cx="200" cy="236" rx="180" ry="6" fill="${dark}" opacity="0.2"/>
          <rect x="40" y="148" width="280" height="92" fill="url(#walL-${id})"/>
          <rect x="40" y="142" width="280" height="8" fill="${dark}"/>
          ${[60,108,156,204,252,300].map(x=>wnd(x,170,28,52)).join("")}
          <rect x="40" y="222" width="280" height="18" fill="${dark}" opacity="0.18"/>
          <!-- Freistehender Glockenturm -->
          <rect x="332" y="72" width="36" height="168" fill="url(#walD-${id})"/>
          <rect x="332" y="72" width="36" height="6" fill="${dark}"/>
          <rect x="340" y="92" width="20" height="92" fill="${light}" opacity="0.32"/>
          ${[6,3,3,3,3,3].reduce((acc,_,i)=>acc+`<line x1="340" y1="${100+i*16}" x2="360" y2="${100+i*16}" stroke="${dark}" stroke-width="0.6" opacity="0.5"/>`,"")}
          <rect x="338" y="60" width="24" height="14" fill="${dark}" opacity="0.6"/>
          <line x1="350" y1="36" x2="350" y2="60" stroke="${dark}" stroke-width="2"/>
          <line x1="342" y1="46" x2="358" y2="46" stroke="${dark}" stroke-width="2"/>
          <!-- Lücke betonen -->
          <line x1="324" y1="72" x2="324" y2="240" stroke="#fff" stroke-width="2"/>`;
      },
      volta: () => {
        // Zwei Volumen mit ockerfarbenem Verputz und tief sitzenden Fenstern.
        return `
          <ellipse cx="200" cy="240" rx="180" ry="6" fill="${dark}" opacity="0.2"/>
          <rect x="30" y="120" width="340" height="120" fill="url(#walL-${id})"/>
          <rect x="30" y="120" width="340" height="14" fill="${dark}"/>
          ${Array.from({length:8}).map((_,i)=>{
            const x = 52 + i*40;
            const deep = i % 2 === 0 ? 6 : 0;
            return shade(x-2, 146-deep, 24, 26, 0.55) +
              `<rect x="${x}" y="${146-deep}" width="20" height="22" fill="${dark}" opacity="0.8"/>` +
              `<rect x="${x}" y="${146-deep}" width="20" height="6" fill="#fff" opacity="0.18"/>` +
              shade(x-2, 184-deep, 24, 26, 0.55) +
              `<rect x="${x}" y="${184-deep}" width="20" height="22" fill="${dark}" opacity="0.8"/>` +
              `<rect x="${x}" y="${184-deep}" width="20" height="6" fill="#fff" opacity="0.18"/>`;
          }).join("")}
          <rect x="170" y="200" width="60" height="40" fill="${mid}"/>
          <rect x="186" y="220" width="28" height="20" fill="${dark}"/>
          <line x1="200" y1="220" x2="200" y2="240" stroke="#fff" stroke-width="0.6" opacity="0.5"/>`;
      },
      davidsboden: () => {
        // Streng gerastertes Blockrand-Wohnhaus mit Punktfenstern.
        return `
          <ellipse cx="200" cy="240" rx="180" ry="6" fill="${dark}" opacity="0.2"/>
          <rect x="20" y="84" width="360" height="156" fill="url(#walL-${id})"/>
          <rect x="20" y="84" width="360" height="8" fill="${dark}"/>
          <rect x="20" y="232" width="360" height="10" fill="${dark}" opacity="0.3"/>
          ${Array.from({length:6}).map((_,row)=>
            Array.from({length:10}).map((_,col)=>wnd(36 + col*34, 102 + row*22, 16, 14)).join("")
          ).join("")}
          <rect x="180" y="200" width="40" height="42" fill="${dark}" opacity="0.85"/>
          <rect x="186" y="206" width="28" height="30" fill="${mid}" opacity="0.6"/>`;
      },
      schudel: () => {
        // Funktionalistische Villa mit Bandfenster und auskragendem Sturz.
        return `
          <ellipse cx="200" cy="240" rx="170" ry="6" fill="${dark}" opacity="0.2"/>
          <!-- Garten -->
          <rect x="0" y="232" width="400" height="10" fill="#9c8c64"/>
          <!-- Hauptkubus -->
          <rect x="120" y="140" width="200" height="100" fill="url(#walL-${id})"/>
          <rect x="120" y="134" width="200" height="8" fill="${dark}"/>
          <!-- Bandfenster -->
          <rect x="134" y="156" width="172" height="20" fill="${dark}" opacity="0.85"/>
          <rect x="134" y="156" width="172" height="6" fill="#fff" opacity="0.2"/>
          ${Array.from({length:9}).map((_,i)=>`<line x1="${134+i*19}" y1="156" x2="${134+i*19}" y2="176" stroke="${dark}" stroke-width="0.8" opacity="0.55"/>`).join("")}
          <!-- Eingang -->
          <rect x="140" y="190" width="34" height="50" fill="${dark}"/>
          <rect x="146" y="196" width="22" height="40" fill="${mid}"/>
          <!-- Auskragender Sturz -->
          <rect x="115" y="186" width="100" height="6" fill="${dark}" opacity="0.7"/>
          <!-- Anbau links -->
          <rect x="70" y="180" width="50" height="60" fill="url(#walD-${id})"/>
          <rect x="70" y="200" width="50" height="14" fill="${dark}" opacity="0.6"/>
          <!-- Schornstein -->
          <rect x="280" y="118" width="14" height="22" fill="${dark}"/>`;
      },
      pavillon: () => {
        // V-förmiges Faltdach auf schlanken Stützen, ganz aus Glas.
        return `
          <ellipse cx="200" cy="234" rx="170" ry="5" fill="${dark}" opacity="0.18"/>
          <!-- Faltdach -->
          <polygon points="36,162 200,128 364,162 364,176 200,142 36,176" fill="url(#walD-${id})"/>
          <polygon points="36,162 200,128 364,162" fill="#fff" opacity="0.08"/>
          <!-- Stützen -->
          <rect x="76" y="162" width="6" height="76" fill="${mid}"/>
          <rect x="196" y="142" width="6" height="96" fill="${mid}"/>
          <rect x="316" y="162" width="6" height="76" fill="${mid}"/>
          <!-- Glasfront -->
          <rect x="92" y="172" width="216" height="64" fill="${light}" opacity="0.45"/>
          ${[120,158,196,234,272].map(x=>`<line x1="${x}" y1="172" x2="${x}" y2="236" stroke="${dark}" stroke-width="0.9" opacity="0.55"/>`).join("")}
          <line x1="92" y1="205" x2="308" y2="205" stroke="${dark}" stroke-width="0.6" opacity="0.45"/>
          <!-- Terrazzo Boden Andeutung -->
          <rect x="80" y="232" width="240" height="6" fill="${dark}" opacity="0.45"/>`;
      },
      hechtliacker: () => {
        // Gestaffelte Loggia-Siedlung am Hang.
        return `
          <polygon points="0,240 0,232 40,228 40,220 80,216 120,210 160,200 200,194 240,186 280,180 320,176 360,172 400,168 400,240" fill="#8b9c73" opacity="0.6"/>
          <polygon points="40,240 40,180 100,180 100,160 180,160 180,138 260,138 260,162 340,162 340,184 360,184 360,240" fill="url(#walL-${id})"/>
          <polygon points="40,180 100,180 100,160 180,160 180,138 260,138 260,162 340,162 340,184" fill="none" stroke="${dark}" stroke-width="1.5"/>
          ${[
            [56,196,12,28],[80,196,12,28],[112,176,12,28],[140,176,12,28],
            [168,158,12,26],[196,158,12,26],[224,158,12,26],[252,158,12,26],
            [280,180,12,28],[308,180,12,28],[336,200,12,28]
          ].map(([x,y,w,h])=>shade(x-2,y-2,w+4,h+4,0.18)+`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${dark}" opacity="0.7"/><rect x="${x}" y="${y}" width="${w}" height="${h*0.35}" fill="#fff" opacity="0.15"/>`).join("")}
          <!-- Loggia-Brüstungen -->
          ${[[60,220,16],[84,220,16],[116,200,16],[144,200,16],[172,182,16],[200,182,16],[228,182,16],[256,182,16],[284,204,16],[312,204,16],[340,224,16]].map(([x,y,w])=>`<rect x="${x-2}" y="${y}" width="${w+4}" height="3" fill="${dark}" opacity="0.65"/>`).join("")}`;
      },
      schwarzpark: () => {
        // Einzelner Wohnblock allein im Park, mit Schatten von Bäumen.
        return `
          <ellipse cx="60" cy="232" rx="48" ry="14" fill="${dark}" opacity="0.28"/>
          <ellipse cx="350" cy="234" rx="55" ry="16" fill="${dark}" opacity="0.28"/>
          <ellipse cx="60" cy="206" rx="40" ry="34" fill="#6f8a5e" opacity="0.7"/>
          <ellipse cx="46" cy="190" rx="22" ry="20" fill="#6f8a5e" opacity="0.55"/>
          <ellipse cx="350" cy="208" rx="46" ry="36" fill="#6f8a5e" opacity="0.7"/>
          <ellipse cx="370" cy="190" rx="22" ry="20" fill="#6f8a5e" opacity="0.55"/>
          <!-- Block -->
          <rect x="140" y="80" width="120" height="160" fill="url(#walD-${id})"/>
          <rect x="140" y="80" width="120" height="6" fill="${dark}" opacity="0.6"/>
          <line x1="200" y1="80" x2="200" y2="240" stroke="${dark}" stroke-width="0.7" opacity="0.55"/>
          ${Array.from({length:5}).map((_,row)=>
            Array.from({length:3}).map((_,col)=>{
              const x = 152 + col*36, y = 96 + row*28;
              return shade(x-2,y-2,22,22,0.2)+`<rect x="${x}" y="${y}" width="18" height="18" fill="${light}" opacity="0.55"/><rect x="${x}" y="${y}" width="18" height="6" fill="#fff" opacity="0.15"/>`;
            }).join("")
          ).join("")}
          <!-- Sichtbeton-Bretterstruktur -->
          ${Array.from({length:14}).map((_,i)=>`<line x1="140" y1="${88+i*11}" x2="260" y2="${88+i*11}" stroke="${dark}" stroke-width="0.4" opacity="0.25"/>`).join("")}`;
      },
      buvette: () => {
        // Beton-Kiosk am Rhein mit hochgeklapptem Schiebeladen.
        return `
          <!-- Rhein -->
          <rect y="206" width="400" height="34" fill="#6c8a8a"/>
          ${[210,216,222,228,234].map(y=>`<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="#fff" stroke-width="0.6" opacity="0.18"/>`).join("")}
          <!-- Quai -->
          <rect y="200" width="400" height="8" fill="#9e8c70"/>
          <!-- Buvette -->
          <rect x="150" y="150" width="100" height="56" fill="url(#walD-${id})"/>
          <rect x="150" y="146" width="100" height="6" fill="${dark}"/>
          <!-- Hochgezogener Klappladen -->
          <polygon points="150,150 250,150 282,128 182,128" fill="${mid}"/>
          <polygon points="150,150 250,150 282,128 182,128" fill="#fff" opacity="0.1"/>
          <line x1="150" y1="150" x2="182" y2="128" stroke="${dark}" stroke-width="1"/>
          <line x1="250" y1="150" x2="282" y2="128" stroke="${dark}" stroke-width="1"/>
          <!-- Schmiede-Beschläge -->
          <circle cx="170" cy="150" r="3" fill="${dark}"/>
          <circle cx="230" cy="150" r="3" fill="${dark}"/>
          <!-- Theke -->
          <rect x="166" y="172" width="68" height="32" fill="${dark}" opacity="0.7"/>
          <rect x="174" y="178" width="52" height="22" fill="${light}" opacity="0.55"/>
          <line x1="200" y1="178" x2="200" y2="200" stroke="${dark}" stroke-width="0.6"/>
          <!-- Eckpfosten -->
          <rect x="148" y="146" width="4" height="60" fill="${dark}"/>
          <rect x="248" y="146" width="4" height="60" fill="${dark}"/>`;
      },
      brunngaesslein: () => {
        // Stadt-Reihenhaus zwischen zwei Nachbarn, mit asymmetrischem Balkon.
        return `
          <ellipse cx="200" cy="238" rx="170" ry="6" fill="${dark}" opacity="0.18"/>
          <!-- Linker Nachbar -->
          <rect x="40" y="120" width="80" height="120" fill="${light}" opacity="0.7"/>
          <rect x="40" y="116" width="80" height="6" fill="${dark}" opacity="0.5"/>
          ${Array.from({length:3}).map((_,i)=>wnd(56,138+i*30,18,16)+wnd(86,138+i*30,18,16)).join("")}
          <!-- Rechter Nachbar -->
          <rect x="280" y="100" width="80" height="140" fill="${light}" opacity="0.7"/>
          <rect x="280" y="96" width="80" height="6" fill="${dark}" opacity="0.5"/>
          ${Array.from({length:4}).map((_,i)=>wnd(296,116+i*28,18,16)+wnd(326,116+i*28,18,16)).join("")}
          <!-- Hauptbau -->
          <rect x="120" y="80" width="160" height="160" fill="url(#walL-${id})"/>
          <polygon points="116,80 284,80 200,40" fill="${dark}"/>
          <polygon points="116,80 284,80 200,40" fill="#fff" opacity="0.05"/>
          ${Array.from({length:4}).map((_,row)=>
            Array.from({length:2}).map((_,col)=>wnd(146+col*52,100+row*30,22,22)).join("")
          ).join("")}
          <!-- Asymmetrischer Betonbalkon -->
          <rect x="138" y="180" width="68" height="6" fill="${dark}"/>
          <rect x="138" y="186" width="68" height="14" fill="${mid}"/>
          <line x1="148" y1="186" x2="148" y2="200" stroke="${dark}" stroke-width="0.7"/>
          <line x1="196" y1="186" x2="196" y2="200" stroke="${dark}" stroke-width="0.7"/>
          <!-- Eingang -->
          <rect x="186" y="208" width="28" height="32" fill="${dark}"/>
          <rect x="190" y="214" width="20" height="26" fill="${mid}"/>`;
      }
    };
    const body = (C[tag] || (() => ""))();
    return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${defs}${sky}${body}</svg>`;
  }

  // Foto mit URL-Kette: scheitert eine URL, wird die nächste probiert,
  // ganz am Ende fällt die SVG-Illustration ein. Funktioniert ohne JS-
  // Aufrufe pro Foto, da der img-Selbst-Swap im onerror-Attribut sitzt.
  function photoOrIllustration(b) {
    const urls = Array.isArray(b.photo) ? b.photo : (b.photo ? [b.photo] : []);
    if (!urls.length) return illustration(b);
    const safeAlt = b.name.replace(/"/g, "&quot;");
    return `<img src="${urls[0]}" alt="${safeAlt}" loading="lazy" decoding="async"` +
      ` data-pid="${b.id}" data-pix="0"` +
      ` onerror="window.__nextPhoto(this)">`;
  }
  window.__nextPhoto = function (img) {
    const id = Number(img.dataset.pid);
    const idx = Number(img.dataset.pix) + 1;
    const b = BUILDINGS.find((x) => x.id === id);
    if (!b) return;
    const urls = Array.isArray(b.photo) ? b.photo : [b.photo];
    if (idx < urls.length) {
      img.dataset.pix = String(idx);
      img.src = urls[idx];
    } else {
      img.outerHTML = illustration(b);
    }
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

    // Countdown → Zeit anpassen. Das Rad startet exakt bei der noch
    // verbleibenden Zeit, damit der Punkt korrekt am aktuellen Stand sitzt.
    $("adjustTimeBtn").addEventListener("click", () => {
      const rem = remainingMinutesRoundedUp();
      showScreen("payment");
      syncDialFromMinutes(rem);
    });

    // 5-Minuten-Warnung
    $("warnModal").addEventListener("click", (e) => {
      if (e.target.closest("[data-warn-close]")) closeWarnSheet();
    });
    $("warnExtend").addEventListener("click", () => {
      const rem = remainingMinutesRoundedUp();
      closeWarnSheet();
      showScreen("payment");
      syncDialFromMinutes(rem);
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
