const map = L.map("map", { preferCanvas: true }).setView([45.5048, -73.5769], 16);

L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap &copy; CARTO",
  maxZoom: 19
}).addTo(map);

const bounds = L.latLngBounds([45.4985, -73.5865], [45.5105, -73.5655]);

map.createPane("buildingPane");
map.getPane("buildingPane").style.zIndex = 450;

map.createPane("microwavePane");
map.getPane("microwavePane").style.zIndex = 650;

const sheetURL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRaYO34fzZ7CHjhWvLbIf0040V0uHVm0jTYjit8QrFDUmrFBg643QhaL5aeL4YrvweXoPlEUH4IPQS1/pub?gid=1743035491&single=true&output=csv";

const group = L.featureGroup().addTo(map);

Papa.parse(sheetURL, {
  download: true,
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,

  complete: ({ data }) => {
    console.log("rows loaded:", data.length);
    if (!data?.length) return;

    const microwaves = {};

    data.forEach((row) => {
      const id = row.microwaveID;
      if (!id) return;

      const lat = parseFloat(row.lat);
      const lng = parseFloat(row.long ?? row.lng ?? row.lon ?? row.longitude);

      if (!microwaves[id]) {
        microwaves[id] = {
          id,
          building: row.building || "",
          lat,
          lng,
          logs: []
        };
      }

      microwaves[id].logs.push({
        quantity: row.quantity ?? "",
        floor: row.floor ?? "",
        room: row.room ?? "",
        key: row.key ?? "",
        note: row.note ?? "",
        contributor: row.contributor ?? "",
        rating: row.rating ?? ""
      });
    });

    Object.values(microwaves).forEach((mw) => {
      if (!Number.isFinite(mw.lat) || !Number.isFinite(mw.lng)) return;

      const wrapper = document.createElement("div");
      wrapper.className = "mw-popup-wrapper";

      // prevent popup interactions from panning/zooming map
      L.DomEvent.disableClickPropagation(wrapper);
      L.DomEvent.disableScrollPropagation(wrapper);

      let index = 0;

      const render = () => {
        const log = mw.logs[index] || {};

        wrapper.innerHTML = `
          <div class="display-popup">
            <p><b style="text-transform:uppercase;">${mw.building}</b></p>
            <hr>

            <p><b>microwave(s):</b> ${log.quantity ?? "-"}</p>
            <p><b>floor #:</b> ${log.floor ?? "-"}</p>
            <p><b>room #:</b> ${log.room ?? "-"}</p>
            <p><b>access:</b> ${log.key ?? "-"}</p>
            <p><b>rating:</b> ${log.rating ? `${log.rating} / 5` : "- / 5"}</p>
            <p><b>note:</b> ${log.note || "-"}</p>
            <p><b>contributed by:</b> ${log.contributor || "-"}</p>

            <hr>
            <p><b>entry:</b> ${index + 1} / ${mw.logs.length}</p>

            ${
              mw.logs.length > 1
                ? `
                  <div class="log-nav">
                    <button type="button" data-action="prev">&lt;</button>
                    <button type="button" data-action="next">&gt;</button>
                  </div>
                `
                : ""
            }
          </div>
        `;
      };

      render();

      wrapper.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;

        const action = btn.dataset.action;
        if (action === "prev") index = (index - 1 + mw.logs.length) % mw.logs.length;
        if (action === "next") index = (index + 1) % mw.logs.length;

        render();
      });

      // visible marker
      const marker = L.circleMarker([mw.lat, mw.lng], {
        pane: "microwavePane",
        radius: 4,
        weight: 1,
        fillOpacity: 1,
        color: "#0000ff",
        fillColor: "#fff933"
      }).addTo(group);

      const hit = L.circleMarker([mw.lat, mw.lng], {
        pane: "microwavePane",
        radius: 10,
        weight: 0,
        opacity: 0,
        fillOpacity: 0
      }).addTo(group);

      marker.bindPopup(wrapper, {
        closeOnClick: false,
        autoClose: true
      });

      hit.on("click", () => marker.openPopup());
    });

    const counts = {};
    data.forEach((r) => {
      const name = (r.contributor || "").trim();
      if (!name || name === "?") return;
      const qty = Number(r.quantity) || 0;
      counts[name] = (counts[name] || 0) + qty;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    document.getElementById("top-contributor-name").textContent = sorted[0]?.[0] || "";
    document.getElementById("top-contributor-total").textContent = sorted[0]?.[1] || 0;

    if (group.getLayers().length > 0) {
      map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }
  },

  error: (err) => console.error("papa parse error:", err)
});

L.geoJSON(geojsonFeature, {
  pane: "buildingPane",
  onEachFeature: (feature, layer) => {
    layer.on("click", (e) => {
      const buildingName = feature.properties?.Name || feature.properties?.name || "Unknown";
      showFormPopup(e.latlng, buildingName);
    });
  },
  style: { color: "#0000ff", weight: 2, opacity: 0.9, dashArray: "1, 5" }
}).addTo(map);

const panel = document.getElementById("info-panel");
const toggleBtn = document.getElementById("toggle-info");

toggleBtn.addEventListener("click", () => {
  panel.classList.toggle("collapsed");
  toggleBtn.textContent = panel.classList.contains("collapsed") ? ">" : "<";
});

document.getElementById("nav-submit").addEventListener("click", () => {
  window.location.href = "index.html";
});

document.getElementById("nav-display").addEventListener("click", () => {
  window.location.href = "display.html";
});
