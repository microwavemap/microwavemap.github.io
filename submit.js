//submit.js

/* 
this app uses leaflet, geojson, and google sheets to allow users to submit microwave locations.
i <3 VGI
made possible with help from chatgpt
*/

console.log("submit.js loaded");

//initialize map
window.APP = window.APP || {};

document.addEventListener("DOMContentLoaded", () => {
  wirePanels();

  const map = initSubmitMap();
  if (!map) return;

//locate geojson loaded in the submit script
  const gj = window.geojsonFeature || window.geojsonData || window.GEOJSON;
  if (gj) addBuildingsLayer(map, gj);
  else console.warn("no geojson found...");
});

//leftside info panel
function wirePanels() {
  const infoPanel = document.getElementById("info-panel");
  const toggleInfo = document.getElementById("toggle-info");
  if (!infoPanel || !toggleInfo) return;

//make the toggle icons adaptive to open/closure state
  function syncLeftToggle() {
    const isCollapsed = infoPanel.classList.contains("collapsed");
    // LEFT panel: "<" = close, ">" = open
    toggleInfo.textContent = isCollapsed ? ">" : "<";
  }

//make map size adaptive based on open/closure state
  toggleInfo.addEventListener("click", () => {
    infoPanel.classList.toggle("collapsed");
    syncLeftToggle();
    window.APP?.map?.invalidateSize?.();
  });

//open on load
  syncLeftToggle();
}

//initialize submit map
function initSubmitMap() {
  const el = document.getElementById("map");
  if (!el) {
    console.error('no element with id="map" found');
    return null;
  }

  if (window.APP.map) return window.APP.map;

//create leaflet map
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
  return map;
}

//prevents duplicate layers
function addBuildingsLayer(map, geojson) {
  if (window.APP.buildingsLayer) {
    map.removeLayer(window.APP.buildingsLayer);
    window.APP.buildingsLayer = null;
  }

  //style the geojson, attach click behavior
  const layer = L.geoJSON(geojson, {
    style: {
      color: "#0000ff",
      weight: 2,
      opacity: 0.9,
      dashArray: "1, 5",
      fillOpacity: 0.15
    },
    onEachFeature: (feature, featureLayer) => {
      featureLayer.on("click", (e) => {
        const buildingName =
          feature?.properties?.Name ||
          feature?.properties?.name ||
          "UNKNOWN";
        showFormPopup(e.latlng, buildingName);
      });
    }
  }).addTo(map);

  //save layer
  window.APP.buildingsLayer = layer;
  return layer;
}
 
//render popup form
function showFormPopup(latlng, buildingName) {
  const map = window.APP.map;
  if (!map) return;

//for safety (if building name contains apostrophe), escape single quotes
  const safeName = String(buildingName).replace(/'/g, "\\'");

//build popup form with known ids for each input
  const popupForm = `
    <div class="popup-container">
      <h3>${buildingName}</h3>

      <label># of microwaves*:</label>
      <input id="microwave-qty" type="text" inputmode="numeric">

      <label>floor number*:</label>
      <input id="floor" type="text">

      <label>room name + number*:</label>
      <input id="room" type="text">

      <label>key card restriction:</label>
      <select id="key">
        <option value="">select...</option>
        <option value="restricted">restricted</option>
        <option value="unrestricted">unrestricted</option>
      </select>

      <label>star rating:</label>
      <select id="rating">
        <option value="">select...</option>
        <option value="1">1 ★</option>
        <option value="2">2 ★★</option>
        <option value="3">3 ★★★</option>
        <option value="4">4 ★★★★</option>
        <option value="5">5 ★★★★★</option>
      </select>

      <label>notes:</label>
      <textarea id="note" rows="2"></textarea>

      <label>contributor name:</label>
      <input id="contributor" type="text">

      <button type="button" onclick="submitMicrowaveData(${latlng.lat}, ${latlng.lng}, '${safeName}')">Submit</button>
    </div>
  `;

//open and close the popup at the user click's location
  L.popup({ className: "custom-popup" })
    .setLatLng(latlng)
    .setContent(popupForm)
    .openOn(map);
}

console.log("about to define submitMicrowaveData");

//form submission
window.submitMicrowaveData = function (lat, lng, buildingName) {
  const map = window.APP.map;

//clean up the data upon submission
  const quantity = document.getElementById("microwave-qty")?.value.trim();
  const floor = document.getElementById("floor")?.value.trim();
  const room = document.getElementById("room")?.value.trim();
  const key = document.getElementById("key")?.value.trim();
  const rating = document.getElementById("rating")?.value.trim();
  const note = document.getElementById("note")?.value.trim();
  const contributor = document.getElementById("contributor")?.value.trim();

//fill out required fields to submit
  if (!quantity || !floor || !room) {
    alert("fill out all required fields!");
    return;
  }

//send these data through to the google form
  sendToForm(buildingName, quantity, lat, lng, floor, room, key, rating, note, contributor);

//close popup, if successful, return this alert
  map?.closePopup();
  alert("thank you for your submission!");
};

//send to form function
function sendToForm(building, quantity, lat, lng, floor, room, key, rating, note, contributor) {
  const formUrl =
    "https://docs.google.com/forms/d/e/1FAIpQLSd7BytKb1cbf58J6FDiDgCjjtC_anb3bjEikBL79BvE14jnXg/formResponse";

//each field has a corresponding input
  const formData = new URLSearchParams();
  formData.append("entry.1537829160", building);
  formData.append("entry.413586359", quantity);
  formData.append("entry.2026023737", lat);
  formData.append("entry.1483045271", lng);
  formData.append("entry.1203711364", floor);
  formData.append("entry.933589728", room);
  formData.append("entry.1801280110", key);
  formData.append("entry.1161890085", rating);
  formData.append("entry.179601343", note);
  formData.append("entry.2066704409", contributor);

//post the data here
  fetch(formUrl, { method: "POST", mode: "no-cors", body: formData })
    .catch((err) => console.error("error:", err));
}
