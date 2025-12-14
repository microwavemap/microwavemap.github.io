const map = L.map('map').setView([45.5048, -73.5769], 16);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png', {
attribution: '&copy; OpenStreetMap &copy; CARTO',
maxZoom: 19
}).addTo(map);

const bounds = L.latLngBounds(
[45.4985, -73.5865],
[45.5105, -73.5655]
);

const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRaYO34fzZ7CHjhWvLbIf0040V0uHVm0jTYjit8QrFDUmrFBg643QhaL5aeL4YrvweXoPlEUH4IPQS1/pub?gid=1743035491&single=true&output=csv";

const group = L.featureGroup().addTo(map);

Papa.parse(sheetURL, {
download: true,
header: true,
dynamicTyping: true,
skipEmptyLines: true,
complete: ({ data }) => {
console.log("rows loaded:", data.length);
if (!data.length) return;

const microwaves = {};

data.forEach(row => {
const id = row.microwaveID;
if (!id) return;

if (!microwaves[id]) {
microwaves[id] = {
id: id,
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

Object.values(microwaves).forEach(m => {
if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) return;

const wrapper = document.createElement("div");
wrapper.className = "mw-popup-wrapper";

L.DomEvent.disableClickPropagation(wrapper);
L.DomEvent.disableScrollPropagation(wrapper);

let index = 0;

function updatePopup() {
const log = m.logs[index];

wrapper.innerHTML = `
<div class="display-popup">
<p><b style="text-transform:uppercase;">${m.building}</b></p>

<hr>

<p><b>microwave(s):</b> ${log.quantity}</p>
<p><b>floor #:</b> ${log.floor}</p>
<p><b>room #:</b> ${log.room}</p>
<p><b>access:</b> ${log.key}</p>
<p><b>rating:</b> ${log.rating || "-"} / 5</p>
<p><b>note:</b> ${log.note || "-"}</p>
<p><b>contributed by:</b> ${log.contributor || "-"}</p>

<hr>

<p><b>entry:</b> ${index + 1} / ${m.logs.length}</p>

${m.logs.length > 1 ? `
<div class="log-nav">
<button id="prevLog"><</button>
<button id="nextLog">></button>
</div>
` : ""}
</div>
`;

const inner = wrapper.querySelector(".display-popup");
if (inner) {
L.DomEvent.disableClickPropagation(inner);
L.DomEvent.disableScrollPropagation(inner);
}
}

updatePopup();

wrapper.addEventListener("click", e => {
if (e.target.id === "prevLog") {
index = (index - 1 + m.logs.length) % m.logs.length;
updatePopup();
}
if (e.target.id === "nextLog") {
index = (index + 1) % m.logs.length;
updatePopup();
}
});

const marker = L.circleMarker([m.lat, m.lng], {
radius: 4,
weight: 1,
fillOpacity: 1,
color: '#0000ff',
fillColor: '#fff933'
}).addTo(group);

const hit = L.circleMarker([m.lat, m.lng], {
radius: 8,
opacity: 0,
fillOpacity: 0
}).addTo(group);

hit.on("click", () => {
visible.openPopup();
});

marker.bindPopup(wrapper, {
closeOnClick: false,
autoClose: true
});
});

const counts = {};
data.forEach(r => {
if (r.contributor && r.contributor.trim() !== "?") {
const qty = Number(r.quantity) || 0;
counts[r.contributor] = (counts[r.contributor] || 0) + qty;
}
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
onEachFeature: function (feature, layer) {
layer.on('click', function (e) {
const buildingName = feature.properties.Name || feature.properties.name || "Unknown";
showFormPopup(e.latlng, buildingName);
});
},

style: { color: "#0000ff", weight: 2, opacity: 0.9, dashArray: "1, 5" }
}).addTo(map);

const panel = document.getElementById("info-panel");
const toggleBtn = document.getElementById("toggle-info");

toggleBtn.addEventListener("click", () => {
panel.classList.toggle("collapsed");
toggleBtn.textContent = panel.classList.contains("collapsed") ? ">" : "<";;
});

document.getElementById("nav-submit").addEventListener("click", () => {
window.location.href = "index.html";
});

document.getElementById("nav-display").addEventListener("click", () => {
window.location.href = "display.html";
});