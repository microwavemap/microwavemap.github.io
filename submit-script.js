////////////
// Map initialization
const map = L.map('map').setView([45.5048, -73.5769], 16);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const bounds = L.latLngBounds(
  [45.4985, -73.5865],
  [45.5105, -73.5655] 
);

////////////////////////////////////////////////////////

var geojsonFeature = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "Name": "Stewart Biology Building"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-73.58068654299996, 45.502670558000034],
          [-73.58097019299998, 45.50280750200005],
          [-73.58125480299998, 45.50251601200006],
          [-73.58068654299996, 45.502670558000034]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "Name": "Mountain 3605"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-73.58206865899996, 45.50167212400004],
          [-73.58211263899994, 45.50162684800006],
          [-73.58223401999999, 45.50150190700003],
          [-73.58206865899996, 45.50167212400004]
        ]]
      }
    }
  ]
};

// Function that creates and opens a popup form at given lat/lng
function showFormPopup(latlng, buildingName) {
  // HTML content of the popup
  const formHTML = `
    <form id="pointForm" class="popup-form">
      <label>Building</label>
      <input type="text" name="building" value="${buildingName || ''}" required>
      <label>Floor</label><input type="number" name="floor">
      <label>Room</label><input type="text" name="room">
      <label>Key</label>
        <select name="key">
          <option value="restricted">restricted</option>
          <option value="unrestricted">unrestricted</option>
        </select>
      <label>Accessible (Elevator)</label>
        <select name="accessible">
          <option value="yes">yes</option>
          <option value="no">no</option>
        </select>
      <label>Note</label><textarea name="note"></textarea>
      <button type="submit">Send to Form</button>
    </form>`;

  // Create the popup and attach it to the map
  const popup = L.popup({ autoPan: false })
    .setLatLng(latlng)
    .setContent(formHTML)
    .openOn(map);

  // Wait for the popup to load into the DOM before adding submit listener
  map.once('popupopen', () => {
    const form = document.getElementById('pointForm');
    if (!form) return;

    // Handle the form submission
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const fd = new FormData(form);
      const entry = Object.fromEntries(fd.entries());
      const lat = latlng.lat.toFixed(6);
      const lng = latlng.lng.toFixed(6);

      // Send data to Google Form
      sendToForm(entry.building, lat, lng, entry.floor, entry.room, entry.key, entry.accessible, entry.note);

      // Add a marker at the clicked location showing what was submitted
      L.marker([lat, lng])
        .bindPopup(`<b>${entry.building}</b><br>Floor ${entry.floor || '-'}, Room ${entry.room || '-'}`)
        .addTo(map);

      map.closePopup();
      alert("Submission sent!");
    });
  });
}

// Function to POST data to Google Form
function sendToForm(building, lat, lng, floor, room, key, accessible, note) {
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSd7BytKb1cbf58J6FDiDgCjjtC_anb3bjEikBL79BvE14jnXg/formResponse";
  const formData = new URLSearchParams();
  formData.append("entry.1537829160", building);
  formData.append("entry.2026023737", lat);
  formData.append("entry.1483045271", lng);
  formData.append("entry.1203711364", floor);
  formData.append("entry.933589728", room);
  formData.append("entry.1801280110", key);
  formData.append("entry.179601343", note);

  fetch(formUrl, { method: "POST", mode: "no-cors", body: formData })
    .catch(err => console.error("Error:", err));
}

// Add polygons to map and connect them to popup form
L.geoJSON(geojsonFeature, {
  // For each feature (building polygon)
  onEachFeature: function (feature, layer) {
    // Attach a click listener
    layer.on('click', function (e) {
      // Get the building name property (handles 'Name' or 'name')
      const buildingName = feature.properties.Name || feature.properties.name || "";
      // Open the form popup with that name prefilled
      showFormPopup(e.latlng, buildingName);
    });
  },
  // Optional style for the polygons
  style: { color: "#ff7800", weight: 2, opacity: 0.7 }
}).addTo(map);
