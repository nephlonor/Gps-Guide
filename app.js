/* eslint-disable */
(function () {
  "use strict";

  const DISCOVERY_RADIUS_M = 30;
  const HAMLET_CENTER = [46.41349, 7.87248];
  const ANCHOR_KEY = "anchorOffset";

  const state = {
    position: null,
    heading: null,
    nearest: null,
    discovered: new Set(JSON.parse(localStorage.getItem("discovered") || "[]")),
    watchId: null,
    map: null,
    markers: new Map(),
    userMarker: null,
    userCircle: null,
    demo: { active: false, raf: null, t0: 0, route: [] },
    manual: false
  };

  // ─── Anchor offset ───────────────────────────────────────
  // The user can press "Anchor here" while standing in the real hamlet;
  // we record the delta between their GPS position and the geometric
  // centroid of the eleven buildings, then apply that delta on every
  // load so the markers sit on the real houses.
  function loadAnchorOffset() {
    try {
      const raw = localStorage.getItem(ANCHOR_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (typeof o.dLat === "number" && typeof o.dLon === "number") return o;
    } catch { /* ignore */ }
    return null;
  }
  function centroid(points) {
    let lat = 0, lon = 0;
    for (const p of points) { lat += p[0]; lon += p[1]; }
    return [lat / points.length, lon / points.length];
  }
  function applyAnchorOffset() {
    const off = loadAnchorOffset();
    if (!off) return;
    for (const b of BUILDINGS) {
      b.lat = b._origLat + off.dLat;
      b.lon = b._origLon + off.dLon;
    }
  }
  function rememberOriginalCoords() {
    for (const b of BUILDINGS) {
      if (b._origLat === undefined) { b._origLat = b.lat; b._origLon = b.lon; }
    }
  }
  function setAnchorFromPosition(pos) {
    rememberOriginalCoords();
    const c = centroid(BUILDINGS.map((b) => [b._origLat, b._origLon]));
    const offset = { dLat: pos[0] - c[0], dLon: pos[1] - c[1] };
    localStorage.setItem(ANCHOR_KEY, JSON.stringify(offset));
    applyAnchorOffset();
  }
  function clearAnchor() {
    localStorage.removeItem(ANCHOR_KEY);
    rememberOriginalCoords();
    for (const b of BUILDINGS) { b.lat = b._origLat; b.lon = b._origLon; }
  }

  // ─── DOM ─────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const statusEl = $("status");
  const statusText = $("statusText");
  const distanceValue = $("distanceValue");
  const compassArrow = $("compassArrow");
  const targetNum = $("targetNum");
  const targetName = $("targetName");
  const targetMeta = $("targetMeta");
  const enableLocationBtn = $("enableLocation");
  const enableCompassBtn = $("enableCompass");
  const demoWalkBtn = $("demoWalk");
  const anchorBtn = $("anchorHere");
  const resetAnchorBtn = $("resetAnchor");
  const coordsEl = $("coords");
  const locationHint = $("locationHint");
  const discoveredCount = $("discoveredCount");
  const totalCount = $("totalCount");
  const cardsEl = $("cards");
  const modal = $("modal");
  const modalFigure = $("modalFigure");
  const modalTag = $("modalTag");
  const modalTitle = $("modalTitle");
  const modalArch = $("modalArch");
  const modalText = $("modalText");
  const modalFoot = $("modalFoot");

  // ─── Geo helpers ─────────────────────────────────────────
  function haversineMeters(a, b) {
    const R = 6371008.8;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function bearingDeg(from, to) {
    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;
    const lat1 = toRad(from[0]);
    const lat2 = toRad(to[0]);
    const dLon = toRad(to[1] - from[1]);
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  // ─── Illustration generator ──────────────────────────────
  // Lightweight SVG architectural portraits — each building gets a unique
  // composition matched to its character.
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

    const compositions = {
      watertower: `
        ${sky}
        <rect x="170" y="240" width="60" height="6" fill="${dark}" opacity="0.4"/>
        <polygon points="160,240 240,240 230,210 170,210" fill="${mid}"/>
        <rect x="172" y="120" width="56" height="90" fill="${light}"/>
        <line x1="180" y1="120" x2="180" y2="210" stroke="${mid}" stroke-width="1"/>
        <line x1="190" y1="120" x2="190" y2="210" stroke="${mid}" stroke-width="1"/>
        <line x1="200" y1="120" x2="200" y2="210" stroke="${mid}" stroke-width="1"/>
        <line x1="210" y1="120" x2="210" y2="210" stroke="${mid}" stroke-width="1"/>
        <line x1="220" y1="120" x2="220" y2="210" stroke="${mid}" stroke-width="1"/>
        <polygon points="160,120 240,120 230,100 170,100" fill="${dark}"/>
        <rect x="190" y="60" width="20" height="40" fill="${mid}"/>
        <polygon points="186,60 214,60 200,40" fill="#7ea693"/>
        <rect x="198" y="30" width="4" height="14" fill="${dark}"/>`,
      antonius: `
        ${sky}
        <rect x="70" y="170" width="260" height="70" fill="${mid}"/>
        <rect x="70" y="100" width="260" height="70" fill="${light}"/>
        <polygon points="60,100 340,100 200,40" fill="${dark}"/>
        <circle cx="200" cy="135" r="22" fill="${dark}" opacity="0.85"/>
        <circle cx="200" cy="135" r="14" fill="${light}" opacity="0.7"/>
        <line x1="200" y1="121" x2="200" y2="149" stroke="${dark}" stroke-width="1.5"/>
        <line x1="186" y1="135" x2="214" y2="135" stroke="${dark}" stroke-width="1.5"/>
        <rect x="280" y="40" width="30" height="200" fill="${dark}"/>
        <rect x="285" y="60" width="20" height="40" fill="${light}" opacity="0.6"/>
        <rect x="285" y="110" width="20" height="40" fill="${light}" opacity="0.5"/>
        <polygon points="278,40 312,40 295,22" fill="${dark}"/>
        <rect x="110" y="195" width="20" height="45" fill="${dark}"/>
        <rect x="270" y="195" width="20" height="45" fill="${dark}"/>`,
      lukas: `
        ${sky}
        <rect x="60" y="160" width="260" height="80" fill="${light}"/>
        <rect x="60" y="155" width="260" height="6" fill="${dark}"/>
        <rect x="80" y="180" width="30" height="50" fill="${dark}" opacity="0.55"/>
        <rect x="125" y="180" width="30" height="50" fill="${dark}" opacity="0.55"/>
        <rect x="170" y="180" width="30" height="50" fill="${dark}" opacity="0.55"/>
        <rect x="215" y="180" width="30" height="50" fill="${dark}" opacity="0.55"/>
        <rect x="260" y="180" width="30" height="50" fill="${dark}" opacity="0.55"/>
        <rect x="320" y="80" width="34" height="160" fill="${mid}"/>
        <rect x="328" y="100" width="18" height="120" fill="${light}" opacity="0.3"/>
        <rect x="320" y="72" width="34" height="8" fill="${dark}"/>
        <line x1="337" y1="60" x2="337" y2="72" stroke="${dark}" stroke-width="2"/>
        <line x1="331" y1="66" x2="343" y2="66" stroke="${dark}" stroke-width="2"/>`,
      volta: `
        ${sky}
        <rect x="50" y="120" width="300" height="120" fill="${light}"/>
        <rect x="50" y="120" width="300" height="14" fill="${dark}"/>
        ${Array.from({ length: 8 }).map((_, i) =>
          `<rect x="${66 + i * 36}" y="148" width="20" height="22" fill="${dark}" opacity="0.5"/>` +
          `<rect x="${66 + i * 36}" y="184" width="20" height="22" fill="${dark}" opacity="0.5"/>`
        ).join("")}
        <rect x="170" y="200" width="60" height="40" fill="${mid}"/>
        <rect x="186" y="220" width="28" height="20" fill="${dark}"/>`,
      davidsboden: `
        ${sky}
        <rect x="40" y="100" width="320" height="140" fill="${light}"/>
        <rect x="40" y="100" width="320" height="6" fill="${mid}"/>
        ${Array.from({ length: 5 }).map((_, row) =>
          Array.from({ length: 9 }).map((_, col) =>
            `<rect x="${56 + col * 34}" y="${118 + row * 24}" width="14" height="16" fill="${dark}" opacity="0.55"/>`
          ).join("")
        ).join("")}
        <rect x="180" y="208" width="40" height="32" fill="${dark}" opacity="0.85"/>`,
      schudel: `
        ${sky}
        <rect x="120" y="160" width="200" height="80" fill="${light}"/>
        <rect x="120" y="155" width="200" height="6" fill="${dark}"/>
        <rect x="140" y="175" width="160" height="14" fill="${dark}" opacity="0.55"/>
        <rect x="140" y="200" width="40" height="40" fill="${mid}"/>
        <rect x="190" y="200" width="20" height="40" fill="${dark}" opacity="0.7"/>
        <rect x="220" y="200" width="80" height="20" fill="${dark}" opacity="0.55"/>
        <rect x="80" y="200" width="40" height="40" fill="${mid}" opacity="0.6"/>`,
      pavillon: `
        ${sky}
        <polygon points="40,170 200,140 360,170 360,180 200,150 40,180" fill="${dark}"/>
        <line x1="80" y1="170" x2="80" y2="240" stroke="${mid}" stroke-width="6"/>
        <line x1="320" y1="170" x2="320" y2="240" stroke="${mid}" stroke-width="6"/>
        <line x1="200" y1="150" x2="200" y2="240" stroke="${mid}" stroke-width="4"/>
        <rect x="100" y="200" width="200" height="40" fill="${light}" opacity="0.6"/>
        <line x1="140" y1="180" x2="140" y2="240" stroke="${mid}" stroke-width="2"/>
        <line x1="180" y1="180" x2="180" y2="240" stroke="${mid}" stroke-width="2"/>
        <line x1="220" y1="180" x2="220" y2="240" stroke="${mid}" stroke-width="2"/>
        <line x1="260" y1="180" x2="260" y2="240" stroke="${mid}" stroke-width="2"/>`,
      hechtliacker: `
        ${sky}
        <polygon points="40,240 40,180 100,180 100,160 180,160 180,140 260,140 260,160 340,160 340,180 360,180 360,240" fill="${light}"/>
        <polygon points="40,180 100,180 100,160 180,160 180,140 260,140 260,160 340,160 340,180" fill="none" stroke="${dark}" stroke-width="2"/>
        ${[
          [60,200],[88,200],[116,180],[144,180],[172,180],[200,160],[228,160],[256,160],[284,180],[312,180],[340,200]
        ].map(([x,y]) => `<rect x="${x}" y="${y}" width="14" height="20" fill="${dark}" opacity="0.55"/>`).join("")}`,
      schwarzpark: `
        ${sky}
        <ellipse cx="80" cy="240" rx="50" ry="14" fill="${dark}" opacity="0.25"/>
        <ellipse cx="340" cy="240" rx="60" ry="16" fill="${dark}" opacity="0.25"/>
        <rect x="150" y="80" width="100" height="160" fill="${mid}"/>
        ${Array.from({ length: 5 }).map((_, row) =>
          Array.from({ length: 3 }).map((_, col) =>
            `<rect x="${162 + col * 28}" y="${100 + row * 28}" width="18" height="18" fill="${light}" opacity="0.6"/>`
          ).join("")
        ).join("")}
        <line x1="200" y1="80" x2="200" y2="240" stroke="${dark}" stroke-width="1.5" opacity="0.5"/>`,
      buvette: `
        ${sky}
        <rect y="220" width="400" height="20" fill="#7a8e8a"/>
        <rect x="150" y="170" width="100" height="60" fill="${mid}"/>
        <rect x="150" y="166" width="100" height="6" fill="${dark}"/>
        <polygon points="150,170 250,170 280,150 180,150" fill="${mid}" opacity="0.7"/>
        <rect x="170" y="190" width="60" height="30" fill="${dark}" opacity="0.6"/>
        <rect x="178" y="196" width="44" height="18" fill="${light}" opacity="0.5"/>
        <line x1="120" y1="150" x2="280" y2="150" stroke="${dark}" stroke-width="1.5" opacity="0.4"/>`,
      brunngaesslein: `
        ${sky}
        <rect x="80" y="240" width="60" height="0" fill="${dark}"/>
        <rect x="80" y="120" width="60" height="120" fill="${light}" opacity="0.85"/>
        <rect x="260" y="100" width="60" height="140" fill="${light}" opacity="0.85"/>
        <rect x="150" y="80" width="100" height="160" fill="${light}"/>
        <polygon points="148,80 252,80 200,40" fill="${dark}"/>
        ${Array.from({ length: 4 }).map((_, row) =>
          Array.from({ length: 2 }).map((_, col) =>
            `<rect x="${166 + col * 30}" y="${100 + row * 30}" width="18" height="22" fill="${dark}" opacity="0.55"/>`
          ).join("")
        ).join("")}
        <rect x="165" y="180" width="70" height="14" fill="${mid}"/>`
    };

    return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      ${compositions[tag] || sky}
    </svg>`;
  }

  // ─── Cards ───────────────────────────────────────────────
  function renderCards() {
    cardsEl.innerHTML = "";
    BUILDINGS.forEach((b) => {
      const discovered = state.discovered.has(b.id);
      const el = document.createElement("article");
      el.className = "card" + (discovered ? " discovered" : "");
      el.dataset.id = b.id;
      el.innerHTML = `
        <div class="card-figure">${illustration(b)}</div>
        <div class="card-lock">${discovered ? "★" : "✦"}</div>
        <div class="card-body">
          <span class="card-num">No. ${String(b.id).padStart(2, "0")} · ${b.year}</span>
          <h3 class="card-title">${b.name}</h3>
          <p class="card-arch">${b.architect}</p>
        </div>`;
      el.addEventListener("click", () => openModal(b));
      cardsEl.appendChild(el);
    });
    totalCount.textContent = BUILDINGS.length;
    discoveredCount.textContent = state.discovered.size;
  }

  // ─── Modal ───────────────────────────────────────────────
  function openModal(b) {
    const discovered = state.discovered.has(b.id);
    modalFigure.innerHTML = illustration(b);
    modalTag.textContent = `No. ${String(b.id).padStart(2, "0")} · ${b.year}`;
    modalTitle.textContent = b.name;
    modalArch.textContent = b.architect;
    if (discovered) {
      modalText.textContent = b.text;
      modalFoot.textContent = b.address;
    } else {
      modalText.textContent =
        "This entry is still locked. Walk within 30 metres of the building to unlock " +
        "the full description from the Architekturführer.";
      modalFoot.textContent = "Locked · approach the building to reveal";
    }
    modal.hidden = false;
  }
  function closeModal() { modal.hidden = true; }
  modal.addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // ─── Vibration ──────────────────────────────────────────
  // Two-pulse haptic on discovery. No-op on browsers without the API
  // (iOS Safari) — Android Chrome/Firefox respect the pattern.
  function vibrateDiscovery() {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try { navigator.vibrate([90, 50, 140]); } catch (e) { /* ignore */ }
    }
  }

  // ─── Toast ──────────────────────────────────────────────
  let toastTimer = null;
  function showToast(b) {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      t.innerHTML = `<span class="toast-icon">★</span><span class="toast-text"></span>`;
      document.body.appendChild(t);
    }
    t.querySelector(".toast-text").textContent = `Unlocked: ${b.name}`;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
  }

  // ─── Map ────────────────────────────────────────────────
  function initMap() {
    state.map = L.map("map", {
      zoomControl: true,
      attributionControl: true
    }).setView(HAMLET_CENTER, 18);

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    ).addTo(state.map);

    BUILDINGS.forEach((b) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="building-marker" data-id="${b.id}">${b.id}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      const m = L.marker([b.lat, b.lon], { icon })
        .addTo(state.map)
        .on("click", () => openModal(b));
      state.markers.set(b.id, m);
    });

    // Fit to all buildings on first load
    const group = new L.featureGroup(Array.from(state.markers.values()));
    state.map.fitBounds(group.getBounds().pad(0.35));

    // Manual position fallback: long-press / right-click on the map to drop
    // a simulated position there. Useful when GPS is denied or unavailable.
    state.map.on("contextmenu", (e) => setManualPosition(e.latlng));
    let pressTimer = null;
    state.map.on("mousedown touchstart", (e) => {
      if (state.demo.active) return;
      pressTimer = setTimeout(() => {
        if (e.latlng) setManualPosition(e.latlng);
      }, 650);
    });
    state.map.on("mouseup mouseout touchend touchmove dragstart zoomstart", () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    });
  }

  function setManualPosition(latlng) {
    if (state.watchId != null) {
      navigator.geolocation.clearWatch(state.watchId);
      state.watchId = null;
    }
    if (state.demo.active) stopDemoWalk();
    state.manual = true;
    state.position = [latlng.lat, latlng.lng];
    state.heading = null;
    onPositionUpdate();
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
      const icon = L.divIcon({
        className: "",
        html: '<div class="user-marker"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      state.userMarker = L.marker(ll, { icon, interactive: false }).addTo(state.map);
      state.userCircle = L.circle(ll, {
        radius: DISCOVERY_RADIUS_M,
        color: "#c0392b",
        weight: 1,
        fillColor: "#c0392b",
        fillOpacity: 0.08
      }).addTo(state.map);
    } else {
      state.userMarker.setLatLng(ll);
      state.userCircle.setLatLng(ll);
    }
  }

  // ─── Geolocation ────────────────────────────────────────
  function showHint(html, isError) {
    locationHint.hidden = false;
    locationHint.classList.toggle("error", !!isError);
    locationHint.innerHTML = html;
  }
  function hideHint() { locationHint.hidden = true; }

  function isSecureish() {
    return location.protocol === "https:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1";
  }

  function geoErrorHint(err) {
    if (err.code === 1) {
      return (
        "Location permission was denied. To enable it: tap the <strong>lock " +
        "or site-info icon</strong> next to the address bar → set " +
        "<em>Location</em> to <em>Allow</em> → reload the page. On iOS also " +
        "check <em>Settings → Safari → Location</em>. Meanwhile, try " +
        "<strong>Start demo walk</strong>."
      );
    }
    if (err.code === 2) {
      return "Your device couldn't get a GPS fix. Step outside or try <strong>Start demo walk</strong>.";
    }
    return "Took too long to locate you. Try again, or use <strong>Start demo walk</strong>.";
  }

  function startGeolocation() {
    if (!("geolocation" in navigator)) {
      setStatus("warn", "Geolocation unavailable");
      showHint("This browser does not support geolocation. Use <strong>Start demo walk</strong>.", true);
      return;
    }
    if (!isSecureish()) {
      setStatus("warn", "HTTPS required");
      showHint("Geolocation needs <strong>HTTPS</strong> (or localhost). Use <strong>Start demo walk</strong>.", true);
      return;
    }

    setStatus(null, "Locating…");
    hideHint();
    enableLocationBtn.disabled = true;
    enableLocationBtn.textContent = "Locating…";

    // Force the browser to surface its permission prompt with a one-shot
    // call before starting the watch — many browsers ignore watchPosition
    // when the permission state is stale.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyPosition(pos);
        startWatch();
      },
      (err) => {
        console.warn("getCurrentPosition error", err);
        // On error code 1 (denied), fall back to demo walk hint. But still try
        // watchPosition once — some browsers (Firefox on Linux) only respond
        // via watch after a denial-then-allow flow.
        if (err.code !== 1) startWatch();
        else handleGeoError(err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }

  function applyPosition(pos) {
    if (state.demo.active) return;
    state.manual = false;
    state.position = [pos.coords.latitude, pos.coords.longitude];
    if (typeof pos.coords.heading === "number" && !isNaN(pos.coords.heading)) {
      state.heading = pos.coords.heading;
    }
    onPositionUpdate();
  }

  function handleGeoError(err) {
    enableLocationBtn.disabled = false;
    enableLocationBtn.textContent = "Enable location";
    setStatus("warn",
      err.code === 1 ? "Location denied" :
      err.code === 2 ? "Position unavailable" : "Location timed out"
    );
    showHint(geoErrorHint(err), true);
  }

  function startWatch() {
    if (state.watchId != null) return;
    state.watchId = navigator.geolocation.watchPosition(
      (pos) => applyPosition(pos),
      (err) => {
        console.warn("watchPosition error", err);
        handleGeoError(err);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    );
  }

  function setStatus(kind, text) {
    statusEl.classList.remove("live", "warn");
    if (kind) statusEl.classList.add(kind);
    statusText.textContent = text;
  }

  function onPositionUpdate() {
    setStatus("live",
      state.demo.active ? "Demo walk" :
      state.manual ? "Manual position" :
      "Live location"
    );
    enableLocationBtn.textContent =
      (state.demo.active || state.manual) ? "Enable location" : "Tracking — re-centre";
    enableLocationBtn.disabled = false;
    updateCoordsReadout();
    anchorBtn.disabled = false;
    updateUserPosition();

    // Find nearest
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
        if (modal.hidden === false && modalTitle.textContent === b.name) openModal(b);
      }
    });

    state.nearest = nearest;
    if (nearest) {
      distanceValue.textContent = formatDistance(nearest.distance);
      targetNum.textContent = String(nearest.id).padStart(2, "0");
      targetName.textContent = nearest.name;
      targetMeta.textContent =
        (nearest.distance <= DISCOVERY_RADIUS_M ? "In range — " : "") +
        `${nearest.architect}, ${nearest.year}`;

      const target = bearingDeg(state.position, [nearest.lat, nearest.lon]);
      const rot = (state.heading == null) ? target : (target - state.heading + 360) % 360;
      compassArrow.style.transform = `rotate(${rot}deg)`;
    }
    discoveredCount.textContent = state.discovered.size;
    updateMarkers();

    // Recenter on first fix
    if (!state.firstFix) {
      state.firstFix = true;
      state.map.setView(state.position, 18);
    }
  }

  function formatDistance(m) {
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(2)} km`;
  }

  function updateCoordsReadout() {
    if (!state.position) { coordsEl.hidden = true; return; }
    coordsEl.hidden = false;
    coordsEl.textContent =
      `${state.position[0].toFixed(5)}, ${state.position[1].toFixed(5)}`;
  }

  // ─── Anchor button handlers ─────────────────────────────
  function refitMap() {
    if (!state.map) return;
    const group = new L.featureGroup(Array.from(state.markers.values()));
    state.map.flyToBounds(group.getBounds().pad(0.3), { duration: 0.6 });
  }
  function refreshMarkerPositions() {
    state.markers.forEach((m, id) => {
      const b = BUILDINGS.find((x) => x.id === id);
      if (b) m.setLatLng([b.lat, b.lon]);
    });
  }

  anchorBtn.disabled = true;
  anchorBtn.addEventListener("click", () => {
    if (!state.position) {
      showHint("Need a position first — enable location, start the demo walk, or long-press the map.", true);
      return;
    }
    setAnchorFromPosition(state.position);
    refreshMarkerPositions();
    refitMap();
    resetAnchorBtn.hidden = false;
    showHint(
      "Anchored. The 11 buildings are now centred on your current position. " +
      "If you walk to the actual house of any building, you can re-anchor again to sharpen the fit.",
      false
    );
  });
  resetAnchorBtn.addEventListener("click", () => {
    clearAnchor();
    refreshMarkerPositions();
    refitMap();
    resetAnchorBtn.hidden = true;
    showHint("Anchor cleared — using default Biel coordinates.", false);
  });

  // Recenter button reuses the same button after geolocation starts
  enableLocationBtn.addEventListener("click", () => {
    if (state.demo.active) stopDemoWalk();
    if (state.watchId == null) {
      startGeolocation();
    } else if (state.position) {
      state.map.flyTo(state.position, 18, { duration: 0.6 });
    }
  });

  // ─── Demo walk ──────────────────────────────────────────
  // Animate a smooth route that passes inside the 30 m radius of each
  // of the 11 buildings in numeric order. Lets visitors experience the
  // arrow, distance, and discovery flow without granting GPS.
  function buildRoute() {
    const start = HAMLET_CENTER;
    const stops = BUILDINGS.map((b) => [b.lat, b.lon]);
    return [start, ...stops, start];
  }
  function interpolate(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  function startDemoWalk() {
    if (state.watchId != null) {
      navigator.geolocation.clearWatch(state.watchId);
      state.watchId = null;
    }
    state.manual = false;
    state.demo.active = true;
    state.demo.route = buildRoute();
    state.demo.t0 = performance.now();
    demoWalkBtn.textContent = "Stop demo";
    demoWalkBtn.classList.add("active");
    enableLocationBtn.textContent = "Enable location";
    enableLocationBtn.disabled = false;
    hideHint();
    setStatus("live", "Demo walk");

    const segMs = 4500; // ms per segment
    const total = state.demo.route.length - 1;

    function tick(now) {
      if (!state.demo.active) return;
      const elapsed = now - state.demo.t0;
      const segF = Math.min(elapsed / segMs, total);
      const i = Math.min(Math.floor(segF), total - 1);
      const t = segF - i;
      state.position = interpolate(state.demo.route[i], state.demo.route[i + 1], t);
      // Synthetic heading from movement vector
      const next = interpolate(state.demo.route[i], state.demo.route[i + 1], Math.min(t + 0.05, 1));
      state.heading = bearingDeg(state.position, next);
      onPositionUpdate();
      if (segF >= total) { stopDemoWalk(); return; }
      state.demo.raf = requestAnimationFrame(tick);
    }
    state.demo.raf = requestAnimationFrame(tick);
  }

  function stopDemoWalk() {
    if (!state.demo.active) return;
    state.demo.active = false;
    if (state.demo.raf) cancelAnimationFrame(state.demo.raf);
    demoWalkBtn.textContent = "Start demo walk";
    demoWalkBtn.classList.remove("active");
    setStatus(null, "Demo paused");
  }

  demoWalkBtn.addEventListener("click", () => {
    if (state.demo.active) stopDemoWalk();
    else startDemoWalk();
  });

  // ─── Compass (device orientation) ───────────────────────
  let compassEventsSeen = false;
  function bindCompass() {
    const apply = (e) => {
      const heading =
        e.webkitCompassHeading != null
          ? e.webkitCompassHeading
          : (e.alpha != null ? (360 - e.alpha) % 360 : null);
      if (heading != null && !isNaN(heading)) {
        compassEventsSeen = true;
        state.heading = heading;
        if (state.nearest && state.position) {
          const target = bearingDeg(state.position, [state.nearest.lat, state.nearest.lon]);
          const rot = (target - state.heading + 360) % 360;
          compassArrow.style.transform = `rotate(${rot}deg)`;
        }
      }
    };
    window.addEventListener("deviceorientationabsolute", apply, true);
    window.addEventListener("deviceorientation", apply, true);
  }

  enableCompassBtn.addEventListener("click", async () => {
    enableCompassBtn.disabled = true;
    enableCompassBtn.textContent = "Requesting…";
    try {
      if (typeof DeviceOrientationEvent !== "undefined" &&
          typeof DeviceOrientationEvent.requestPermission === "function") {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== "granted") {
          showHint("Compass permission was denied. The arrow will still use GPS heading when you move.", true);
          enableCompassBtn.disabled = false;
          enableCompassBtn.textContent = "Enable compass";
          return;
        }
      }
      bindCompass();
      enableCompassBtn.textContent = "Compass on";
      // Check after a moment whether events actually arrived
      setTimeout(() => {
        if (!compassEventsSeen) {
          showHint("No compass sensor detected. The arrow will use GPS movement direction when you walk.", false);
          enableCompassBtn.textContent = "Compass unavailable";
        } else {
          enableCompassBtn.hidden = true;
        }
      }, 1500);
    } catch (e) {
      console.warn("compass error", e);
      enableCompassBtn.disabled = false;
      enableCompassBtn.textContent = "Enable compass";
      showHint("Could not enable the compass: " + (e && e.message || e), true);
    }
  });

  // ─── Boot ───────────────────────────────────────────────
  function boot() {
    rememberOriginalCoords();
    applyAnchorOffset();
    if (loadAnchorOffset()) resetAnchorBtn.hidden = false;
    renderCards();
    initMap();

    // Show the compass button unconditionally so users can grant access
    // on demand on iOS, Android Chrome, and desktop browsers that gate
    // motion APIs behind a user gesture.
    enableCompassBtn.hidden = false;

    discoveredCount.textContent = state.discovered.size;
    totalCount.textContent = BUILDINGS.length;
    targetName.textContent = "Allow location to begin";
    targetMeta.textContent = "11 hidden gems along Weritzalpstrasse";

    if (!isSecureish()) {
      showHint("Geolocation needs <strong>HTTPS</strong> (or localhost). Try <strong>Start demo walk</strong>.", true);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
