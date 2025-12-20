// explore.js
window.APP = window.APP || {};

document.addEventListener("DOMContentLoaded", () => {
  const map = initExploreMap();
  if (!map) return;

  wirePanels();
  buildControls(map);

  const gj = window.geojsonFeature;
  if (gj) buildBuildingsLayer(map, gj);
  else console.warn("you are having geojson issues!");

  loadCSVAndMakeMarkers(map);

  requestAnimationFrame(() => map.invalidateSize());
});

function initExploreMap() {
  const el = document.getElementById("map");
  if (!el) return null;

  if (window.APP.map) return window.APP.map;

  const bounds = L.latLngBounds([45.4985, -73.5865], [45.5105, -73.5655]);

  const map = L.map("map", {
    center: [45.5048, -73.5769],
    zoom: 16,
    maxZoom: 19,
    preferCanvas: true
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    maxZoom: 19
  }).addTo(map);

  window.APP.map = map;
  window.APP.bounds = bounds;

  window.APP.state = {
    mode: "browse",
    microwavesByBuilding: {},
    microwavesFlat: [],
    markersAll: null,
    markersUnrestricted: null,
    activeMarkers: null,
    buildingsLayer: null,
    selectedLayer: null,
    lastClickedBuilding: null,
    userMarker: null,
    nearestMarker: null,
    nearestLine: null,
    onlyUnrestrictedEl: null
  };

  return map;
}

/* ---------- clear highlight for mode ---------- */
function clearSelectedBuildingHighlight() {
  const st = window.APP.state;
  if (!st.selectedLayer) return;

  st.selectedLayer.setStyle({ weight: 2, fillOpacity: 0.15 }); // match your default
  st.selectedLayer = null;
}

/* ---------- panels ---------- */

function wirePanels() {
  const infoPanel = document.getElementById("info-panel");
  const toggleInfo = document.getElementById("toggle-info");

  const rightPanel = document.getElementById("right-panel");
  const toggleRight = document.getElementById("toggle-right");

  function syncLeftToggle() {
    if (!infoPanel || !toggleInfo) return;
    const isCollapsed = infoPanel.classList.contains("collapsed");
    // LEFT: "<" = close, ">" = open
    toggleInfo.textContent = isCollapsed ? ">" : "<";
  }

  function syncRightToggle() {
    if (!rightPanel || !toggleRight) return;
    const isCollapsed = rightPanel.classList.contains("collapsed");
    // RIGHT: "<" = open, ">" = close
    toggleRight.textContent = isCollapsed ? "<" : ">";
  }

  toggleInfo?.addEventListener("click", () => {
    infoPanel?.classList.toggle("collapsed");
    syncLeftToggle();
    window.APP.map?.invalidateSize();
  });

  toggleRight?.addEventListener("click", () => {
    rightPanel?.classList.toggle("collapsed");
    syncRightToggle();
    window.APP.map?.invalidateSize();
  });

  syncLeftToggle();
  syncRightToggle();
}

function setRightPanelHTML(html) {
  const rightPanel = document.getElementById("right-panel");
  const rightBox = document.getElementById("right-box");
  if (!rightPanel || !rightBox) return;

  rightBox.innerHTML = html;
  rightPanel.classList.remove("collapsed");

  // RIGHT: open state => ">"
  const toggleRight = document.getElementById("toggle-right");
  if (toggleRight) toggleRight.textContent = ">";
}

/* ---------- utilities ---------- */

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isUnrestricted(log) {
  return String(log?.key || "").trim().toLowerCase() === "unrestricted";
}

function floorRank(floorRaw) {
  const s = String(floorRaw ?? "").trim().toLowerCase();
  if (!s) return -999;

  const bMatch = s.match(/^b\s*(\d+)/) || s.match(/basement\s*(\d+)/);
  if (bMatch) return -Number(bMatch[1] || 0);

  const xb = s.match(/^(\d+)\s*b$/);
  if (xb) return -Number(xb[1] || 0);

  if (s.includes("ground") || s === "g" || s === "gf") return 0;

  const n = s.match(/-?\d+/);
  if (n) return Number(n[0]);

  return -999;
}

function resolveBuildingNameFromFeature(feature) {
  const raw = feature.properties?.Name || feature.properties?.name || "";
  return String(raw || "").trim() || "Unknown";
}

function highlightFeatureLayer(map, layer) {
  const st = window.APP.state;
  if (st.selectedLayer) st.selectedLayer.setStyle({ weight: 2, fillOpacity: 0.15 });
  st.selectedLayer = layer;
  layer.setStyle({ weight: 4, fillOpacity: 0.3 });
}

function clearDistanceGraphics(map) {
  const st = window.APP.state;
  if (st.userMarker) { map.removeLayer(st.userMarker); st.userMarker = null; }
  if (st.nearestMarker) { map.removeLayer(st.nearestMarker); st.nearestMarker = null; }
  if (st.nearestLine) { map.removeLayer(st.nearestLine); st.nearestLine = null; }
}

function roomTitle(firstLog) {
  const r = String(firstLog?.room ?? "").trim();
  return r || "microwave location";
}

/* ---------- UI controls ---------- */

function buildControls(map) {
  const st = window.APP.state;

  // only unrestricted
  const FilterControl = L.Control.extend({
    options: { position: "topleft" },
    onAdd: function () {
      const container = L.DomUtil.create("div", "leaflet-control mw-filter-control");
      container.innerHTML = `
        <label class="mw-filter-toggle">
          <input type="checkbox" id="only-unrestricted-map">
          only unrestricted
        </label>
      `;
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      return container;
    }
  });
  map.addControl(new FilterControl());
  st.onlyUnrestrictedEl = document.getElementById("only-unrestricted-map");

  st.onlyUnrestrictedEl?.addEventListener("change", () => {
    if (!st.markersAll || !st.markersUnrestricted) return;

    if (st.activeMarkers) map.removeLayer(st.activeMarkers);
    st.activeMarkers = st.onlyUnrestrictedEl.checked ? st.markersUnrestricted : st.markersAll;
    map.addLayer(st.activeMarkers);

    if (st.lastClickedBuilding) {
      renderBuildingLogs(st.lastClickedBuilding, st.microwavesByBuilding[st.lastClickedBuilding] || []);
    }
    clearDistanceGraphics(map);
  });

  const ModeControl = L.Control.extend({
    options: { position: "topleft" },
    onAdd: function(){
      const container = L.DomUtil.create("div", "leaflet-control mw-mode-control");
      container.innerHTML = `
        <div class="mw-mode-buttons">
          <button id="mode-explore" class="mw-map-btn active" type="button">free explore</button>
          <button id="mode-nearest" class="mw-map-btn" type="button">find nearest</button>
        </div>
      `;
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      return container;
    }
  });

  map.addControl(new ModeControl());

  const exploreBtn = document.getElementById("mode-explore");
  const nearestBtn = document.getElementById("mode-nearest");

function setMode(next){
  st.mode = next;

  exploreBtn?.classList.toggle("active", st.mode === "browse");
  nearestBtn?.classList.toggle("active", st.mode === "nearest");

  map.getContainer().style.cursor = (st.mode === "nearest") ? "crosshair" : "";

  if (st.mode === "nearest") {
    clearSelectedBuildingHighlight();
    st.lastClickedBuilding = null; 
  }

  clearDistanceGraphics(map);
}

  map.on("click", (e) => {
    if (st.mode !== "nearest") return;

    clearDistanceGraphics(map);

    st.userMarker = L.circleMarker(e.latlng, {
      radius: 6, weight: 2, fillOpacity: 1,
      color: "#0000ff", fillColor: "#fff933"
    }).addTo(map);

    const onlyUnrestricted = !!(st.onlyUnrestrictedEl && st.onlyUnrestrictedEl.checked);
    const candidates = onlyUnrestricted
      ? st.microwavesFlat.filter(p => isUnrestricted(p.firstLog))
      : st.microwavesFlat;

    if (!candidates.length) {
      setRightPanelHTML(`
        <div>
          <p class="instruction">no microwaves available under current filter.</p>
        </div>
      `);
      return;
    }

    let best = null;
    let bestDist = Infinity;
    for (const p of candidates) {
      const d = e.latlng.distanceTo(p.latlng);
      if (d < bestDist) { bestDist = d; best = p; }
    }

    st.nearestMarker = L.circleMarker(best.latlng, {
      radius: 8, weight: 3, fillOpacity: 0.2,
      color: "#0000ff", fillColor: "#fff933", interactive: false
    }).addTo(map);

    st.nearestLine = L.polyline([e.latlng, best.latlng], {
      color: "#0000ff", weight: 2, dashArray: "4,6"
    }).addTo(map);

    const meters = Math.round(bestDist);
    const first = best.firstLog || {};
    const logs = Array.isArray(best.logs) ? best.logs : [];

    const title = roomTitle(first);

    setRightPanelHTML(`
      <div>
        <p class="building-title">nearest microwave</p>
        <p class="building-subtitle">${meters} m away ${onlyUnrestricted ? "(unrestricted only)" : ""}</p>

        <div class="mw-card mw-card-location">
          <div class="mw-card-head">
            <div class="mw-card-title"><b>${esc(title)}</b></div>
            <div class="mw-card-meta">
              ${[first.floor ? `floor ${esc(first.floor)}` : "", first.key ? esc(first.key) : ""].filter(Boolean).join(" · ")}
            </div>
          </div>

          <div class="mw-objective mw-objective-compact">
            <div><b>building:</b> ${esc(best.building || "-")}</div>
            <div><b>microwave(s):</b> ${esc(first.quantity ?? "-")}</div>}
          </div>

          <details class="mw-details">
            <summary class="mw-summary">reviews (${logs.length})</summary>
            <div class="mw-details-body">
              ${logs.map((log, i) => `
                <div class="mw-review">
                  <div class="mw-review-title"><b>review:</b> ${i + 1} / ${logs.length}</div>
                  <div><b>rating:</b> ${esc(log.rating || "-")} / 5</div>
                  <div><b>note:</b> ${esc(log.note || "-")}</div>
                  <div class="mw-byline"><b>contributed by:</b> ${esc(log.contributor || "-")}</div>
                </div>
              `).join("")}
            </div>
          </details>
        </div>
      </div>
    `);
  });
}

/* ---------- buildings layer ---------- */

function buildBuildingsLayer(map, geojson) {
  const st = window.APP.state;

  if (st.buildingsLayer) map.removeLayer(st.buildingsLayer);

  st.buildingsLayer = L.geoJSON(geojson, {
    style: {
      color: "#0000ff",
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.15,
      dashArray: "1, 5"
    },
    onEachFeature: (feature, layer) => {
      layer.on("click", () => {
        if (st.mode === "nearest") return;

        const buildingName = resolveBuildingNameFromFeature(feature);
        st.lastClickedBuilding = buildingName;

        const list = st.microwavesByBuilding[buildingName] || [];
        highlightFeatureLayer(map, layer);
        renderBuildingLogs(buildingName, list);
      });
    }
  }).addTo(map);
}

/* ---------- right panel rendering ---------- */

function renderBuildingLogs(buildingName, microwavesInBuilding) {
  const st = window.APP.state;
  const onlyUnrestricted = !!(st.onlyUnrestrictedEl && st.onlyUnrestrictedEl.checked);

  const filteredMicrowaves = (microwavesInBuilding || [])
    .map(m => {
      const logs = Array.isArray(m.logs) ? m.logs : [];
      const keptLogs = onlyUnrestricted ? logs.filter(isUnrestricted) : logs;
      return { ...m, logs: keptLogs };
    })
    .filter(m => m.logs.length > 0);

  filteredMicrowaves.sort((a, b) => {
    const ra = floorRank(a.logs?.[0]?.floor);
    const rb = floorRank(b.logs?.[0]?.floor);
    if (rb !== ra) return rb - ra;
    return String(a.logs?.[0]?.room ?? "").localeCompare(String(b.logs?.[0]?.room ?? ""));
  });

  const totalMicros = filteredMicrowaves.length;
  const totalEntries = filteredMicrowaves.reduce((sum, m) => sum + m.logs.length, 0);

  const cards = filteredMicrowaves.map((m) => {
    const first = m.logs[0] || {};
    const title = roomTitle(first);

    const metaLine = [
      first.floor ? `floor ${esc(first.floor)}` : "",
      first.key ? esc(first.key) : ""
    ].filter(Boolean).join(" · ");

    const reviews = m.logs.map((log, i) => `
      <div class="mw-review">
        <div class="mw-review-title"><b>review:</b> ${i + 1} / ${m.logs.length}</div>
        <div><b>rating:</b> ${esc(log.rating || "-")} / 5</div>
        <div><b>note:</b> ${esc(log.note || "-")}</div>
        <div class="mw-byline"><b>contributed by:</b> ${esc(log.contributor || "-")}</div>
      </div>
    `).join("");

    return `
      <div class="mw-card mw-card-location">
        <div class="mw-card-head">
          <div class="mw-card-title"><b>${esc(title)}</b></div>
          <div class="mw-card-meta">${esc(metaLine || "")}</div>
        </div>

        <div class="mw-objective mw-objective-compact">
          <div><b>microwave(s):</b> ${esc(first.quantity ?? "-")}</div>
        </div>

        <details class="mw-details">
          <summary class="mw-summary">reviews (${m.logs.length})</summary>
          <div class="mw-details-body">
            ${reviews}
          </div>
        </details>
      </div>
    `;
  }).join("");

  setRightPanelHTML(`
    <div>
      <p class="building-title">${esc(buildingName)}</p>
      ${cards || "<p class='instruction'>no microwaves match this filter for this building.</p>"}
    </div>
  `);
}

/* ---------- CSV + markers + leaderboard ---------- */

function loadCSVAndMakeMarkers(map) {
  const sheetURL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRaYO34fzZ7CHjhWvLbIf0040V0uHVm0jTYjit8QrFDUmrFBg643QhaL5aeL4YrvweXoPlEUH4IPQS1/pub?gid=1743035491&single=true&output=csv";

  Papa.parse(sheetURL, {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: ({ data }) => {
      if (!Array.isArray(data) || !data.length) return;

      parseMicrowavesAndMakeMarkers(map, data);

      // leaderboard
const counts = {};
      data.forEach(r => {
        const name = String(r.contributor ?? "").trim();
        if (!name || name === "?") return;

        const qty = Number(r.quantity) || 0;
        counts[name] = (counts[name] || 0) + qty;
      });

      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const topName = sorted[0]?.[0] || "-";
      const topTotal = sorted[0]?.[1] || 0;

      const nameEl = document.getElementById("top-contributor-name");
      const totalEl = document.getElementById("top-contributor-total");
      if (nameEl) nameEl.textContent = topName;
      if (totalEl) totalEl.textContent = String(topTotal);
    },
    error: (err) => console.error("papa parse error:", err)
  });
}

function parseMicrowavesAndMakeMarkers(map, data) {
  const st = window.APP.state;
  const bounds = window.APP.bounds;

  const microwaves = {};

  data.forEach(row => {
    const id = row.microwaveID;
    if (!id) return;

    if (!microwaves[id]) {
      microwaves[id] = {
        id,
        building: row.building,
        lat: parseFloat(row.lat),
        lng: parseFloat(row.long),
        logs: []
      };
    }

    microwaves[id].logs.push({
      quantity: row.quantity,
      floor: row.floor,
      room: row.room,
      key: row.key,
      note: row.note,
      contributor: row.contributor,
      rating: row.rating
    });
  });

  const byBuilding = {};
  Object.values(microwaves).forEach(m => {
    const b = String(m.building || "").trim();
    if (!b) return;
    if (!byBuilding[b]) byBuilding[b] = [];
    byBuilding[b].push(m);
  });
  st.microwavesByBuilding = byBuilding;

  st.microwavesFlat = Object.values(microwaves)
    .filter(m => Number.isFinite(m.lat) && Number.isFinite(m.lng))
    .map(m => ({
      latlng: L.latLng(m.lat, m.lng),
      building: m.building,
      firstLog: m.logs?.[0] || {},
      logs: m.logs || []
    }));

  if (st.markersAll) map.removeLayer(st.markersAll);
  if (st.markersUnrestricted) map.removeLayer(st.markersUnrestricted);

  st.markersAll = L.featureGroup().addTo(map);
  st.markersUnrestricted = L.featureGroup();
  st.activeMarkers = st.markersAll;

  Object.values(microwaves).forEach(m => {
    if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) return;

    const first = m.logs?.[0] || {};
    const unrestricted = isUnrestricted(first);

    const marker = L.circleMarker([m.lat, m.lng], {
      radius: 4,
      weight: 1,
      fillOpacity: 1,
      color: "#0000ff",
      fillColor: "#fff933",
      interactive: false
    });

    marker.addTo(st.markersAll);
    if (unrestricted) marker.addTo(st.markersUnrestricted);
  });

  const b = st.markersAll.getLayers().length ? st.markersAll.getBounds() : bounds;
  map.fitBounds(b, { padding: [20, 20] });
}
