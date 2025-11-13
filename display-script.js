    const map = L.map('map').setView([45.5048, -73.5769], 16);

     L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19
    }).addTo(map);

      const bounds = L.latLngBounds(
        [45.4985, -73.5865],
        [45.5105, -73.5655]
      );

    const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRaYO34fzZ7CHjhWvLbIf0040V0uHVm0jTYjit8QrFDUmrFBg643QhaL5aeL4YrvweXoPlEUH4IPQS1/pub?gid=0&single=true&output=csv";

    const group = L.featureGroup().addTo(map);

    Papa.parse(sheetURL, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        console.log("rows loaded:", data.length);
        if (!data.length) {
          console.warn("no rows! check settings!");
          return;
        }
        console.log("csv columns:", Object.keys(data[0]));

        let count = 0;
        data.forEach(row => {
          const lat = parseFloat(row.lat);
          const lng = parseFloat(row.long);

          if (Number.isFinite(lat) && Number.isFinite(lng)) {

            const building = row.building || '';
            const quantity = row.quantity || '';
            const floor = row.floor || '';
            const room = row.room || '';

            const popupHTML = `
              <div class="display-popup">
                <b>${building}</b><br>
                ${quantity} microwave(s)<br>
                floor #: ${floor}<br>
                room #: ${room}
              </div>
            `;

            const m = L.circleMarker([lat, lng], {
              radius: 5,
              weight: 1,
              fillOpacity: 1,
              color: '#fff933',
              fillColor: '#fff933'
            }).bindPopup(popupHTML);

            m.addTo(group);
          }
        });

        console.log("Markers added:", count);
        if (count > 0) map.fitBounds(group.getBounds(), { padding: [20, 20] });
        else console.warn("parsed rows, but no valid lat/long found.");
      },
      error: (err) => {
        console.error("papa parse error:", err);
      }
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
