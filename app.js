/* eslint-disable */
(function () {
  "use strict";

  const DISCOVERY_RADIUS_M = 30;
  const HAMLET_CENTER = [46.41750, 7.78467];
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
    manual: false,
    filter: "all",
    firstFix: false
  };

  // ─── Anchor offset ───────────────────────────────────────
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
  const closestName = $("closestName");
  const closestDist = $("closestDist");
  const discoveredCount = $("discoveredCount");
  const totalCount = $("totalCount");
  const statDiscovered = $("statDiscovered");
  const visibleCount = $("visibleCount");
  const cardsEl = $("cards");
  const compassArrow = $("compassArrow");
  const enableLocationBtn = $("enableLocation");
  const enableLocationLabel = $("enableLocationLabel");
  const enableCompassBtn = $("enableCompass");
  const locationHint = $("locationHint");

  // Modal
  const modal = $("modal");
  const modalTitle = $("modalTitle");
  const modalFigure = $("modalFigure");
  const modalYear = $("modalYear");
  const modalArch = $("modalArch");
  const modalStyle = $("modalStyle");
  const modalAbout = $("modalAbout");
  const modalDetail = $("modalDetail");
  const modalDetailCard = $("modalDetailCard");
  const modalAddress = $("modalAddress");
  const modalCenter = $("modalCenter");

  // Menu
  const menuBtn = $("menuBtn");
  const menuSheet = $("menuSheet");
  const menuAnchor = $("menuAnchor");
  const menuResetRow = $("menuResetRow");
  const menuResetAnchor = $("menuResetAnchor");
  const menuEnableCompass = $("menuEnableCompass");
  const menuCoords = $("menuCoords");

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
  function formatDistance(m) {
    if (m == null || isNaN(m)) return "—";
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(2)} km`;
  }

  // ─── Illustrations (re-used SVG compositions) ────────────
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
      watertower: `
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
        <rect x="60" y="160" width="260" height="80" fill="${light}"/>
        <rect x="60" y="155" width="260" height="6" fill="${dark}"/>
        ${[80,125,170,215,260].map((x)=>`<rect x="${x}" y="180" width="30" height="50" fill="${dark}" opacity="0.55"/>`).join("")}
        <rect x="320" y="80" width="34" height="160" fill="${mid}"/>
        <rect x="328" y="100" width="18" height="120" fill="${light}" opacity="0.3"/>
        <rect x="320" y="72" width="34" height="8" fill="${dark}"/>
        <line x1="337" y1="60" x2="337" y2="72" stroke="${dark}" stroke-width="2"/>
        <line x1="331" y1="66" x2="343" y2="66" stroke="${dark}" stroke-width="2"/>`,
      volta: `
        <rect x="50" y="120" width="300" height="120" fill="${light}"/>
        <rect x="50" y="120" width="300" height="14" fill="${dark}"/>
        ${Array.from({ length: 8 }).map((_, i) =>
          `<rect x="${66 + i * 36}" y="148" width="20" height="22" fill="${dark}" opacity="0.5"/>` +
          `<rect x="${66 + i * 36}" y="184" width="20" height="22" fill="${dark}" opacity="0.5"/>`
        ).join("")}
        <rect x="170" y="200" width="60" height="40" fill="${mid}"/>
        <rect x="186" y="220" width="28" height="20" fill="${dark}"/>`,
      davidsboden: `
        <rect x="40" y="100" width="320" height="140" fill="${light}"/>
        <rect x="40" y="100" width="320" height="6" fill="${mid}"/>
        ${Array.from({ length: 5 }).map((_, row) =>
          Array.from({ length: 9 }).map((_, col) =>
            `<rect x="${56 + col * 34}" y="${118 + row * 24}" width="14" height="16" fill="${dark}" opacity="0.55"/>`
          ).join("")
        ).join("")}
        <rect x="180" y="208" width="40" height="32" fill="${dark}" opacity="0.85"/>`,
      schudel: `
        <rect x="120" y="160" width="200" height="80" fill="${light}"/>
        <rect x="120" y="155" width="200" height="6" fill="${dark}"/>
        <rect x="140" y="175" width="160" height="14" fill="${dark}" opacity="0.55"/>
        <rect x="140" y="200" width="40" height="40" fill="${mid}"/>
        <rect x="190" y="200" width="20" height="40" fill="${dark}" opacity="0.7"/>
        <rect x="220" y="200" width="80" height="20" fill="${dark}" opacity="0.55"/>
        <rect x="80" y="200" width="40" height="40" fill="${mid}" opacity="0.6"/>`,
      pavillon: `
        <polygon points="40,170 200,140 360,170 360,180 200,150 40,180" fill="${dark}"/>
        <line x1="80" y1="170" x2="80" y2="240" stroke="${mid}" stroke-width="6"/>
        <line x1="320" y1="170" x2="320" y2="240" stroke="${mid}" stroke-width="6"/>
        <line x1="200" y1="150" x2="200" y2="240" stroke="${mid}" stroke-width="4"/>
        <rect x="100" y="200" width="200" height="40" fill="${light}" opacity="0.6"/>
        ${[140,180,220,260].map((x)=>`<line x1="${x}" y1="180" x2="${x}" y2="240" stroke="${mid}" stroke-width="2"/>`).join("")}`,
      hechtliacker: `
        <polygon points="40,240 40,180 100,180 100,160 180,160 180,140 260,140 260,160 340,160 340,180 360,180 360,240" fill="${light}"/>
        <polygon points="40,180 100,180 100,160 180,160 180,140 260,140 260,160 340,160 340,180" fill="none" stroke="${dark}" stroke-width="2"/>
        ${[
          [60,200],[88,200],[116,180],[144,180],[172,180],[200,160],[228,160],[256,160],[284,180],[312,180],[340,200]
        ].map(([x,y]) => `<rect x="${x}" y="${y}" width="14" height="20" fill="${dark}" opacity="0.55"/>`).join("")}`,
      schwarzpark: `
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
        <rect y="220" width="400" height="20" fill="#7a8e8a"/>
        <rect x="150" y="170" width="100" height="60" fill="${mid}"/>
        <rect x="150" y="166" width="100" height="6" fill="${dark}"/>
        <polygon points="150,170 250,170 280,150 180,150" fill="${mid}" opacity="0.7"/>
        <rect x="170" y="190" width="60" height="30" fill="${dark}" opacity="0.6"/>
        <rect x="178" y="196" width="44" height="18" fill="${light}" opacity="0.5"/>
        <line x1="120" y1="150" x2="280" y2="150" stroke="${dark}" stroke-width="1.5" opacity="0.4"/>`,
      brunngaesslein: `
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
    return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${sky}${C[tag] || ""}</svg>`;
  }

  // Split each long description into "about" (first half) and "detail"
  // (last sentence) so the modal can render two distinct pastel cards.
  function splitText(text) {
    const sentences = text.match(/[^.!?]+[.!?]/g) || [text];
    if (sentences.length <= 1) return { about: text.trim(), detail: "" };
    const detail = sentences.pop().trim();
    return { about: sentences.join(" ").trim(), detail };
  }

  // ─── Cards ───────────────────────────────────────────────
  function buildingMatchesFilter(b) {
    if (state.filter === "all") return true;
    const tag = b.style.toLowerCase();
    return tag === state.filter;
  }

  function renderCards() {
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

      const el = document.createElement("article");
      el.className = "card" + (discovered ? " discovered" : "");
      el.dataset.id = b.id;
      el.innerHTML = `
        <div class="card-thumb">${illustration(b)}</div>
        <div class="card-body">
          <div>
            <h3 class="card-title">${b.name}</h3>
            <p class="card-meta">${b.style} · ${b.year}<br><strong>${b.architect}</strong></p>
          </div>
          <div class="card-foot">
            <span class="card-dist">Distance: <strong>${distLabel}</strong></span>
            <button class="view-btn" type="button">View Details</button>
          </div>
        </div>
        <div class="lock-badge">${discovered ? "★" : "✦"}</div>`;
      el.addEventListener("click", () => openModal(b));
      cardsEl.appendChild(el);
    });
    visibleCount.textContent = `${shown} of ${BUILDINGS.length}`;
    discoveredCount.textContent = state.discovered.size;
    statDiscovered.textContent = state.discovered.size;
    totalCount.textContent = BUILDINGS.length;
  }

  // ─── Modal ───────────────────────────────────────────────
  let activeModalId = null;
  function openModal(b) {
    activeModalId = b.id;
    modalTitle.textContent = b.name;
    modalFigure.innerHTML = illustration(b);
    modalYear.textContent = b.year;
    modalArch.textContent = b.architect;
    modalStyle.textContent = b.style;
    modalAddress.textContent = b.address;

    const discovered = state.discovered.has(b.id);
    if (discovered) {
      const { about, detail } = splitText(b.text);
      modalAbout.textContent = about;
      if (detail) {
        modalDetail.textContent = detail;
        modalDetailCard.hidden = false;
      } else {
        modalDetailCard.hidden = true;
      }
    } else {
      modalAbout.textContent =
        "This entry unlocks when you walk within 30 metres of the building. " +
        "Allow location to begin discovering — the compass arrow on the map " +
        "always points to the nearest jewel.";
      modalDetailCard.hidden = true;
    }
    modal.hidden = false;
  }
  function closeModal() { modal.hidden = true; activeModalId = null; }
  modal.addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!modal.hidden) closeModal();
      if (!menuSheet.hidden) closeMenu();
    }
  });
  modalCenter.addEventListener("click", () => {
    if (activeModalId == null) return;
    const b = BUILDINGS.find((x) => x.id === activeModalId);
    if (b && state.map) {
      state.map.flyTo([b.lat, b.lon], 18, { duration: 0.6 });
      closeModal();
    }
  });

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

  function vibrateDiscovery() {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try { navigator.vibrate([90, 50, 140]); } catch (e) { /* ignore */ }
    }
  }

  // ─── Map ────────────────────────────────────────────────
  function initMap() {
    state.map = L.map("map", {
      zoomControl: false,
      attributionControl: true
    }).setView(HAMLET_CENTER, 18);
    L.control.zoom({ position: "bottomright" }).addTo(state.map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(state.map);

    BUILDINGS.forEach((b) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="building-marker" data-id="${b.id}">${b.id}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      const m = L.marker([b.lat, b.lon], { icon })
        .addTo(state.map)
        .on("click", () => openModal(b));
      state.markers.set(b.id, m);
    });

    const group = new L.featureGroup(Array.from(state.markers.values()));
    state.map.fitBounds(group.getBounds().pad(0.35));

    // Long-press / right-click → manual position (kept as a backup)
    state.map.on("contextmenu", (e) => setManualPosition(e.latlng));
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
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      state.userMarker = L.marker(ll, { icon, interactive: false }).addTo(state.map);
      state.userCircle = L.circle(ll, {
        radius: DISCOVERY_RADIUS_M,
        color: "#2f7a52",
        weight: 1,
        fillColor: "#2f7a52",
        fillOpacity: 0.1
      }).addTo(state.map);
    } else {
      state.userMarker.setLatLng(ll);
      state.userCircle.setLatLng(ll);
    }
  }

  function setManualPosition(latlng) {
    if (state.watchId != null) {
      navigator.geolocation.clearWatch(state.watchId);
      state.watchId = null;
    }
    state.manual = true;
    state.position = [latlng.lat, latlng.lng];
    state.heading = null;
    onPositionUpdate();
  }

  // ─── Geolocation ─────────────────────────────────────────
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
        "Location permission was denied. Tap the <strong>lock or site-info icon</strong> " +
        "in the address bar → set <em>Location</em> to <em>Allow</em> → reload. On iOS " +
        "also check <em>Settings → Safari → Location</em>."
      );
    }
    if (err.code === 2) {
      return "Your device couldn't get a GPS fix. Step outside and try again.";
    }
    return "Took too long to locate you. Try again.";
  }

  function startGeolocation() {
    if (!("geolocation" in navigator)) {
      showHint("This browser does not support geolocation.", true);
      return;
    }
    if (!isSecureish()) {
      showHint("Geolocation needs <strong>HTTPS</strong> (or localhost).", true);
      return;
    }
    hideHint();
    enableLocationLabel.textContent = "Locating…";
    enableLocationBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => { applyPosition(pos); startWatch(); },
      (err) => {
        console.warn("getCurrentPosition", err);
        if (err.code !== 1) startWatch();
        else handleGeoError(err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }
  function applyPosition(pos) {
    state.manual = false;
    state.position = [pos.coords.latitude, pos.coords.longitude];
    if (typeof pos.coords.heading === "number" && !isNaN(pos.coords.heading)) {
      state.heading = pos.coords.heading;
    }
    onPositionUpdate();
  }
  function handleGeoError(err) {
    enableLocationBtn.disabled = false;
    enableLocationLabel.textContent = "Enable location";
    showHint(geoErrorHint(err), true);
  }
  function startWatch() {
    if (state.watchId != null) return;
    state.watchId = navigator.geolocation.watchPosition(
      (pos) => applyPosition(pos),
      (err) => { console.warn("watchPosition", err); handleGeoError(err); },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    );
  }

  function onPositionUpdate() {
    enableLocationBtn.disabled = false;
    enableLocationLabel.textContent = state.manual ? "Manual position" : "Re-centre";
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
        if (!modal.hidden && activeModalId === b.id) openModal(b);
      }
    });

    state.nearest = nearest;
    if (nearest) {
      closestName.textContent = nearest.name;
      closestDist.textContent = formatDistance(nearest.distance);
      const target = bearingDeg(state.position, [nearest.lat, nearest.lon]);
      const rot = (state.heading == null) ? target : (target - state.heading + 360) % 360;
      compassArrow.style.transform = `rotate(${rot}deg)`;
    }

    discoveredCount.textContent = state.discovered.size;
    statDiscovered.textContent = state.discovered.size;
    updateMarkers();
    renderCards(); // refresh distances on cards

    if (!state.firstFix) {
      state.firstFix = true;
      state.map.setView(state.position, 18);
    }
  }

  function updateCoordsReadout() {
    if (!state.position) { menuCoords.textContent = "—"; return; }
    menuCoords.textContent =
      `${state.position[0].toFixed(5)}, ${state.position[1].toFixed(5)}`;
  }

  enableLocationBtn.addEventListener("click", () => {
    if (state.watchId == null && !state.manual) {
      startGeolocation();
    } else if (state.position) {
      state.map.flyTo(state.position, 18, { duration: 0.6 });
    }
  });

  // ─── Compass ─────────────────────────────────────────────
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
  async function requestCompass() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" &&
          typeof DeviceOrientationEvent.requestPermission === "function") {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== "granted") {
          showHint("Compass permission was denied. The arrow will still use GPS heading when you move.", true);
          return;
        }
      }
      bindCompass();
      setTimeout(() => {
        if (!compassEventsSeen) {
          showHint("No compass sensor detected. The arrow will use GPS movement direction.", false);
        }
      }, 1500);
    } catch (e) {
      console.warn("compass", e);
    }
  }
  enableCompassBtn.addEventListener("click", requestCompass);
  menuEnableCompass.addEventListener("click", () => { requestCompass(); closeMenu(); });

  // ─── Style filter pills ─────────────────────────────────
  document.querySelectorAll(".style-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".style-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.filter = btn.dataset.filter;
      renderCards();
    });
  });

  // ─── Menu sheet ─────────────────────────────────────────
  function openMenu() { menuSheet.hidden = false; }
  function closeMenu() { menuSheet.hidden = true; }
  menuBtn.addEventListener("click", openMenu);
  menuSheet.addEventListener("click", (e) => {
    if (e.target.dataset.menuClose !== undefined) closeMenu();
  });
  menuAnchor.addEventListener("click", () => {
    if (!state.position) {
      showHint("Need a position first — enable location, or long-press the map.", true);
      closeMenu();
      return;
    }
    setAnchorFromPosition(state.position);
    refreshMarkers();
    menuResetRow.hidden = false;
    closeMenu();
    showToast({ name: "Buildings anchored to your position" });
  });
  menuResetAnchor.addEventListener("click", () => {
    clearAnchor();
    refreshMarkers();
    menuResetRow.hidden = true;
    closeMenu();
  });

  function refreshMarkers() {
    state.markers.forEach((m, id) => {
      const b = BUILDINGS.find((x) => x.id === id);
      if (b) m.setLatLng([b.lat, b.lon]);
    });
    const group = new L.featureGroup(Array.from(state.markers.values()));
    state.map.flyToBounds(group.getBounds().pad(0.3), { duration: 0.6 });
  }

  // ─── Boot ───────────────────────────────────────────────
  function boot() {
    rememberOriginalCoords();
    applyAnchorOffset();
    if (loadAnchorOffset()) menuResetRow.hidden = false;
    renderCards();
    initMap();

    enableCompassBtn.hidden = false;

    totalCount.textContent = BUILDINGS.length;
    discoveredCount.textContent = state.discovered.size;
    statDiscovered.textContent = state.discovered.size;

    if (state.discovered.size === 0) {
      closestName.textContent = "Allow location to begin";
      closestDist.textContent = "—";
    }

    if (!isSecureish()) {
      showHint("Geolocation needs <strong>HTTPS</strong> (or localhost).", true);
    }
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
