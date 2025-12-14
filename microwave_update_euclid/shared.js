    const map = L.map('map').setView([45.5048, -73.5769], 16);

     L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19
    }).addTo(map);

      const bounds = L.latLngBounds(
        [45.4985, -73.5865],
        [45.5105, -73.5655]
      );

    const panel = document.getElementById("info-panel");
    const toggleBtn = document.getElementById("toggle-info");

    toggleBtn.addEventListener("click", () => {
      panel.classList.toggle("collapsed");
      toggleBtn.textContent = panel.classList.contains("collapsed") ? ">" : "<";;
    });

    document.getElementById("nav-submit").addEventListener("click", () => {
      window.location.href = "submit-2.html";
    });

    document.getElementById("nav-display").addEventListener("click", () => {
      window.location.href = "display-2.html";
    });