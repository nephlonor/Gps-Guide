/* eslint-disable */
(function () {
  "use strict";

  const DISCOVERY_RADIUS_M = 30;
  const HAMLET_CENTER = [46.40835, 7.87148];

  const state = {
    position: null,
    heading: null,
    nearest: null,
    discovered: new Set(JSON.parse(localStorage.getItem("discovered") || "[]")),
    watchId: null,
    map: null,
    markers: new Map(),
    userMarker: null,
    userCircle: null
  };

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
  function startGeolocation() {
    if (!("geolocation" in navigator)) {
      setStatus("warn", "Geolocation unavailable");
      return;
    }
    setStatus(null, "Locating…");
    enableLocationBtn.disabled = true;

    state.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        state.position = [pos.coords.latitude, pos.coords.longitude];
        if (typeof pos.coords.heading === "number" && !isNaN(pos.coords.heading)) {
          state.heading = pos.coords.heading;
        }
        onPositionUpdate();
      },
      (err) => {
        console.warn(err);
        setStatus("warn", err.code === 1 ? "Location denied" : "Location unavailable");
        enableLocationBtn.disabled = false;
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 }
    );
  }

  function setStatus(kind, text) {
    statusEl.classList.remove("live", "warn");
    if (kind) statusEl.classList.add(kind);
    statusText.textContent = text;
  }

  function onPositionUpdate() {
    setStatus("live", "Live location");
    enableLocationBtn.textContent = "Tracking — re-centre";
    enableLocationBtn.disabled = false;
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

  // Recenter button reuses the same button after geolocation starts
  enableLocationBtn.addEventListener("click", () => {
    if (state.watchId == null) {
      startGeolocation();
    } else if (state.position) {
      state.map.flyTo(state.position, 18, { duration: 0.6 });
    }
  });

  // ─── Compass (device orientation) ───────────────────────
  function bindCompass() {
    const apply = (e) => {
      const heading =
        e.webkitCompassHeading != null
          ? e.webkitCompassHeading
          : (e.alpha != null ? (360 - e.alpha) % 360 : null);
      if (heading != null && !isNaN(heading)) {
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
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res === "granted") {
          bindCompass();
          enableCompassBtn.hidden = true;
        }
      } catch (e) { console.warn(e); }
    } else {
      bindCompass();
      enableCompassBtn.hidden = true;
    }
  });

  // ─── Boot ───────────────────────────────────────────────
  function boot() {
    renderCards();
    initMap();

    // iOS Safari needs explicit permission for orientation
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
      enableCompassBtn.hidden = false;
    } else {
      bindCompass();
    }

    discoveredCount.textContent = state.discovered.size;
    totalCount.textContent = BUILDINGS.length;
    targetName.textContent = "Allow location to begin";
    targetMeta.textContent = "11 hidden gems within ~120 m";
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
