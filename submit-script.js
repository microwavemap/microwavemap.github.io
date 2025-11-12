const map = L.map('map').setView([45.5048, -73.5769], 16);

 L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  maxZoom: 19
}).addTo(map);

  const bounds = L.latLngBounds(
    [45.4985, -73.5865],
    [45.5105, -73.5655]
  );

function showFormPopup(latlng, buildingName) {
  const popupForm = `
    <div class="popup-container">
      <h3>${buildingName}</h3>
      <label># of microwaves:</label>
      <input id="microwave-qty" type="number" min="0" step="1">

      <label>floor number:</label>
      <input id="floor" type="number">

      <label>room name + number:</label>
      <input id="room" type="text">

      <label>key card restriction:</label>
      <select id="key">
        <option value="">Select...</option>
        <option value="restricted">Restricted</option>
        <option value="unrestricted">Unrestricted</option>
      </select>

      <label>notes:</label>
      <textarea id="note" rows="2"></textarea>

      <button onclick="submitMicrowaveData(${latlng.lat}, ${latlng.lng}, '${buildingName.replace(/'/g, "\\'")}')">Submit</button>
    </div>
  `;
  L.popup({ className: 'custom-popup' })
    .setLatLng(latlng)
    .setContent(popupForm)
    .openOn(map);
}

  window.submitMicrowaveData = function(lat, lng, buildingName) {
    const quantity = document.getElementById('microwave-qty').value.trim();
    const floor = document.getElementById('floor').value.trim();
    const room = document.getElementById('room').value.trim();
    const key = document.getElementById('key').value.trim();
    const note = document.getElementById('note').value.trim();

    if (!quantity || !floor || !room) {
      alert("fill out all required fields!");
      return;
    }

    sendToForm(buildingName, quantity, lat, lng, floor, room, key, note);
    map.closePopup();
    alert("thank you for your submission!");
  };

  function sendToForm(building, quantity, lat, lng, floor, room, key, note) {
    const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSd7BytKb1cbf58J6FDiDgCjjtC_anb3bjEikBL79BvE14jnXg/formResponse";
    const formData = new URLSearchParams();
    formData.append("entry.1537829160", building);
    formData.append("entry.413586359", quantity);
    formData.append("entry.2026023737", lat);
    formData.append("entry.1483045271", lng);
    formData.append("entry.1203711364", floor);
    formData.append("entry.933589728", room);
    formData.append("entry.1801280110", key);
    formData.append("entry.179601343", note);

    fetch(formUrl, { method: "POST", mode: "no-cors", body: formData })
      .then(() => console.log("Attempted to send"))
      .catch(err => console.error("Error:", err));
  }

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
  toggleBtn.textContent = panel.classList.contains("collapsed") ? "→" : "←";
});
