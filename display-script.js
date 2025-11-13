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
            const m = L.circleMarker([lat, lng], {
              radius: 7,
              weight: 1,
              fillOpacity: 0.9
            }).bindPopup(`Lat: ${lat}<br>Lng: ${lng}`);
            m.addTo(group);
            count++;
          }
        });

        console.log("Markers added:", count);
        if (count > 0) map.fitBounds(group.getBounds(), { padding: [20, 20] });
        else console.warn("Parsed rows, but no valid lat/long found.");
      },
      error: (err) => {
        console.error("Papa parse error:", err);
      }
    });

    document.getElementById("nav-submit").addEventListener("click", () => {
      window.location.href = "index.html";
    });

    document.getElementById("nav-display").addEventListener("click", () => {
      window.location.href = "display.html";
    });