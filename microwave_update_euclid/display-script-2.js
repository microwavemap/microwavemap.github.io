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
            const rating = row.rating || '';
            const note = row.note || '-';
            const contributor =  row.contributor || '';

            const popupHTML = `
              <div class="display-popup">
                <p><b style="text-transform: uppercase;">${building}</b></p>
                <p><b>microwave(s):</b> ${quantity}</p>
                <p><b>floor #:</b> ${floor}</p>
                <p><b>room #:</b> ${room}</p>
                <p><b>rating:</b> ${rating}/5</p>
                <p><b>note:</b> ${note}</p>
                <p><b>contributed by:</b> ${contributor}</p>
              </div>
            `;

            const m = L.circleMarker([lat, lng], {
              radius: 4,
              weight: 1,
              fillOpacity: 1,
              color: '#fff933',
              fillColor: '#fff933'
            }).bindPopup(popupHTML);

            m.addTo(group);
          }
        });

        const counts = {};
        data.forEach(r => {
          if (r.contributor && r.contributor.trim() !== "?") {
            const qty = Number(r.quantity) || 0;
            counts[r.contributor] = (counts[r.contributor] || 0) + qty;
          }
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const topName = sorted[0]?.[0] || "";
        const topTotal = sorted[0]?.[1] || 0;
        document.getElementById("top-contributor-name").textContent = topName;
        document.getElementById("top-contributor-total").textContent = topTotal;

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
