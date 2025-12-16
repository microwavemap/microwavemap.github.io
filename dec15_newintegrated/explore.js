window.MODES = window.MODES || {};
window.APP = window.APP || {};

(function(){
  const map = window.APP.map;
  const bounds = window.APP.bounds;
  const rootLayer = window.APP.layers.explore;

  let handlers = [];
  let selectedLayer = null;
  let lastClickedBuilding = null;

  let microwavesByBuilding = {};
  let microwavesFlat = [];

  let markersAll = null;
  let markersUnrestricted = null;
  let activeMarkers = null;

  let mode = "explore";
  let userMarker = null;
  let nearestMarker = null;
  let nearestLine = null;

  let onlyUnrestrictedMapEl = null;

  let filterControl = null;
  let modeControl = null;

  let buildingsLayer = null;

  function on(el, evt, fn){
    if (!el) return;
    el.addEventListener(evt, fn);
    handlers.push(["dom", el, evt, fn]);
  }
  function onMap(evt, fn){
    map.on(evt, fn);
    handlers.push(["map", evt, fn]);
  }

  function cleanupHandlers(){
    for (const h of handlers){
      if (h[0] === "dom"){
        const [, el, evt, fn] = h;
        el.removeEventListener(evt, fn);
      } else if (h[0] === "map"){
        const [, evt, fn] = h;
        map.off(evt, fn);
      }
    }
    handlers = [];
  }

  function isUnrestricted(log){
    return String(log?.key || "").trim().toLowerCase() === "unrestricted";
  }

  function floorRank(floorRaw){
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

  function normalizeBuildingName(s){
    return String(s || "").trim();
  }

  const buildingNameMap = {};

  function resolveBuildingNameFromFeature(feature){
    const raw = feature.properties?.Name || feature.properties?.name || "";
    const polyName = normalizeBuildingName(raw);
    return buildingNameMap[polyName] || polyName;
  }

  function clearDistanceGraphics(){
    if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
    if (nearestMarker) { map.removeLayer(nearestMarker); nearestMarker = null; }
    if (nearestLine) { map.removeLayer(nearestLine); nearestLine = null; }
  }

  function setExploreMode(next){
    mode = next;
    clearDistanceGraphics();
    map.getContainer().style.cursor = (mode === "nearest") ? "crosshair" : "";

    const bExplore = document.getElementById("mode-explore");
    const bNearest = document.getElementById("mode-nearest");
    if (bExplore && bNearest){
      bExplore.classList.toggle("active", mode === "explore");
      bNearest.classList.toggle("active", mode === "nearest");
    }
  }

  function highlight(layer){
    if (selectedLayer) selectedLayer.setStyle({ weight: 2, fillOpacity: 0.08 });
    selectedLayer = layer;
    layer.setStyle({ weight: 4, fillOpacity: 0.18 });
  }

  function renderBuildingLogs(buildingName, microwavesInBuilding){
    const onlyUnrestricted = !!(onlyUnrestrictedMapEl && onlyUnrestrictedMapEl.checked);

    const filteredMicrowaves = (microwavesInBuilding || [])
      .map(m => {
        const logs = Array.isArray(m.logs) ? m.logs : [];
        const keptLogs = onlyUnrestricted ? logs.filter(isUnrestricted) : logs;
        return { ...m, logs: keptLogs };
      })
      .filter(m => m.logs.length > 0);

    const totalMicros = filteredMicrowaves.length;
    const totalEntries = filteredMicrowaves.reduce((sum, m) => sum + m.logs.length, 0);

    filteredMicrowaves.sort((a, b) => {
      const ra = floorRank(a.logs?.[0]?.floor);
      const rb = floorRank(b.logs?.[0]?.floor);
      if (rb !== ra) return rb - ra;
      return String(a.logs?.[0]?.room ?? "").localeCompare(String(b.logs?.[0]?.room ?? ""));
    });

    const cards = filteredMicrowaves.map(m => {
      const first = m.logs[0] || {};

      const header = `
        <div class="mw-objective">
          <div><b>microwave(s):</b> ${esc(first.quantity ?? "-")}</div>
          <div><b>floor #:</b> ${esc(first.floor ?? "-")}</div>
          <div><b>room #:</b> ${esc(first.room ?? "-")}</div>
          <div><b>access:</b> ${esc(first.key ?? "-")}</div>
        </div>
      `;

      const reviews = m.logs.map((log, i) => `
        <div class="mw-review">
          <div class="mw-review-title"><b>review:</b> ${i + 1} / ${m.logs.length}</div>
          <div><b>rating:</b> ${esc(log.rating || "-")} / 5</div>
          <div><b>note:</b> ${esc(log.note || "-")}</div>
          <div><b>contributed by:</b> ${esc(log.contributor || "-")}</div>
        </div>
      `).join("");

      return `<div class="mw-card">${header}${reviews}</div>`;
    }).join("");

    setRightPanelHTML("", `
        <p class="building-title">nearest microwave</p>
      <div>
        <p class="building-title">${esc(buildingName)}</p>
        <p class="building-subtitle">
          ${totalMicros} microwave location(s), ${totalEntries} review entr${totalEntries === 1 ? "y" : "ies"}
          ${onlyUnrestricted ? " (unrestricted only)" : ""}
        </p>
        ${cards || "<p>no microwaves match this filter for this building.</p>"}
      </div>
    `);
  }

  function buildControls(){
    // Filter control
    const FilterControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd: function(){
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

    filterControl = new FilterControl();
    map.addControl(filterControl);

    onlyUnrestrictedMapEl = document.getElementById("only-unrestricted-map");

    on(onlyUnrestrictedMapEl, "change", () => {
      if (!markersAll || !markersUnrestricted) return;

      map.removeLayer(activeMarkers);
      activeMarkers = onlyUnrestrictedMapEl.checked ? markersUnrestricted : markersAll;
      map.addLayer(activeMarkers);

      if (lastClickedBuilding){
        renderBuildingLogs(lastClickedBuilding, microwavesByBuilding[lastClickedBuilding] || []);
      }

      clearDistanceGraphics();
    });

    const ModeControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd: function(){
        const container = L.DomUtil.create("div", "leaflet-control mw-mode-control");
        container.innerHTML = `
          <div class="mw-mode-title">mode</div>
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

    modeControl = new ModeControl();
    map.addControl(modeControl);

    on(document.getElementById("mode-explore"), "click", () => setExploreMode("explore"));
    on(document.getElementById("mode-nearest"), "click", () => setExploreMode("nearest"));
  }

  function buildBuildingsLayer(){
    buildingsLayer = L.geoJSON(geojsonFeature, {
      style: {
        color: "#0000ff",
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.01,
        dashArray: "1, 5"
      },
      onEachFeature: (feature, layer) => {
        layer.on("click", () => {
          if (mode !== "explore") return;

          const buildingName = resolveBuildingNameFromFeature(feature);
          lastClickedBuilding = buildingName;

          const list = microwavesByBuilding[buildingName] || [];
          highlight(layer);
          renderBuildingLogs(buildingName, list);
        });
      }
    });

    buildingsLayer.addTo(rootLayer);
  }

  function parseMicrowavesAndMakeMarkers(data){
    const microwaves = {};

    data.forEach(row => {
      const id = row.microwaveID;
      if (!id) return;

      if (!microwaves[id]){
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
    microwavesByBuilding = byBuilding;

    microwavesFlat = Object.values(microwaves)
      .filter(m => Number.isFinite(m.lat) && Number.isFinite(m.lng))
      .map(m => ({
        latlng: L.latLng(m.lat, m.lng),
        building: m.building,
        firstLog: m.logs?.[0] || {},
        logs: m.logs || []
      }));

    markersAll = L.layerGroup().addTo(map);
    markersUnrestricted = L.layerGroup();
    activeMarkers = markersAll;

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

      marker.addTo(markersAll);
      if (unrestricted) marker.addTo(markersUnrestricted);
    });

    const counts = {};
    data.forEach(r => {
      const name = String(r.contributor || "").trim();
      if (!name || name === "?") return;
      const qty = Number(r.quantity) || 0;
      counts[name] = (counts[name] || 0) + qty;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const nameEl = document.getElementById("top-contributor-name");
    const totalEl = document.getElementById("top-contributor-total");
    if (nameEl) nameEl.textContent = sorted[0]?.[0] || "";
    if (totalEl) totalEl.textContent = sorted[0]?.[1] || 0;

    const b = markersAll.getLayers().length ? markersAll.getBounds() : bounds;
    map.fitBounds(b, { padding: [20, 20] });
  }

  function wireNearestModeClick(){
    onMap("click", (e) => {
      if (mode !== "nearest") return;
      if (!microwavesFlat.length) return;

      clearDistanceGraphics();

      userMarker = L.circleMarker(e.latlng, {
        radius: 6,
        weight: 2,
        fillOpacity: 1,
        color: "#0000ff",
        fillColor: "#fff933"
      }).addTo(map);

      const onlyUnrestricted = !!(onlyUnrestrictedMapEl && onlyUnrestrictedMapEl.checked);
      const candidates = onlyUnrestricted
        ? microwavesFlat.filter(p => isUnrestricted(p.firstLog))
        : microwavesFlat;

      if (!candidates.length){
        setRightPanelHTML("", `
          <div>
            <p class="building-title">no matches</p>
            <p class="building-subtitle">no microwaves available under current filter.</p>
          </div>
        `);
        return;
      }

      let best = null;
      let bestDist = Infinity;

      for (const p of candidates){
        const d = e.latlng.distanceTo(p.latlng);
        if (d < bestDist){
          bestDist = d;
          best = p;
        }
      }

      nearestMarker = L.circleMarker(best.latlng, {
        radius: 8,
        weight: 3,
        fillOpacity: 0.2,
        color: "#0000ff",
        fillColor: "#fff933",
        interactive: false
      }).addTo(map);

      nearestLine = L.polyline([e.latlng, best.latlng], {
        color: "#0000ff",
        weight: 2,
        dashArray: "4,6"
      }).addTo(map);

      const meters = Math.round(bestDist);
      const first = best.firstLog || {};
      const logs = Array.isArray(best.logs) ? best.logs : [];

      setRightPanelHTML("", `
        <div>
          <p class="building-title"></p>
          <p class="building-subtitle">${meters} m away ${onlyUnrestricted ? "(unrestricted only)" : ""}</p>

          <div class="mw-card">
            <div class="mw-objective">
              <div><b>building:</b> ${esc(best.building || "-")}</div>
              <div><b>microwave(s):</b> ${esc(first.quantity ?? "-")}</div>
              <div><b>floor #:</b> ${esc(first.floor ?? "-")}</div>
              <div><b>room #:</b> ${esc(first.room ?? "-")}</div>
              <div><b>access:</b> ${esc(first.key ?? "-")}</div>
            </div>

            ${logs.map((log, i) => `
              <div class="mw-review">
                <div class="mw-review-title"><b>review:</b> ${i + 1} / ${logs.length}</div>
                <div><b>rating:</b> ${esc(log.rating || "-")} / 5</div>
                <div><b>note:</b> ${esc(log.note || "-")}</div>
                <div><b>contributed by:</b> ${esc(log.contributor || "-")}</div>
              </div>
            `).join("")}
          </div>
        </div>
      `);
    });
  }

  function loadCSV(){
    const sheetURL =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRaYO34fzZ7CHjhWvLbIf0040V0uHVm0jTYjit8QrFDUmrFBg643QhaL5aeL4YrvweXoPlEUH4IPQS1/pub?gid=1743035491&single=true&output=csv";

    Papa.parse(sheetURL, {
      download:true,
      header:true,
      dynamicTyping:true,
      skipEmptyLines:true,
      complete: ({ data }) => {
        if (!Array.isArray(data) || !data.length) return;
        parseMicrowavesAndMakeMarkers(data);
      },
      error: (err) => console.error("papa parse error:", err)
    });
  }

  function enter(){
    map.addLayer(rootLayer);

    const rp = document.getElementById("right-panel");
    if (rp) rp.classList.remove("collapsed");

    mode = "explore";
    clearDistanceGraphics();
    selectedLayer = null;
    lastClickedBuilding = null;

    rootLayer.clearLayers();

    buildControls();

    buildBuildingsLayer();

    loadCSV();

    wireNearestModeClick();

    requestAnimationFrame(() => map.invalidateSize());
  }

  function exit(){
    cleanupHandlers();

    if (filterControl) { map.removeControl(filterControl); filterControl = null; }
    if (modeControl) { map.removeControl(modeControl); modeControl = null; }
    onlyUnrestrictedMapEl = null;

    if (markersAll) { map.removeLayer(markersAll); markersAll = null; }
    if (markersUnrestricted) { map.removeLayer(markersUnrestricted); markersUnrestricted = null; }
    activeMarkers = null;

    clearDistanceGraphics();
    rootLayer.clearLayers();
    map.removeLayer(rootLayer);
    map.closePopup();
  }

  window.MODES.explore = { enter, exit };
})();
