window.APP = window.APP || {};

window.APP.initMicroguessrMap = function () {
  if (window.APP.map) return window.APP.map;

  const map = (window.APP.map = L.map("map").setView([45.5048, -73.5769], 16));

  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    maxZoom: 19
  }).addTo(map);

  window.APP.layers = {
    microguessr: L.featureGroup().addTo(map)
  };

  return map;
};