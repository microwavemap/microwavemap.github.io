window.APP = window.APP || {};

window.APP.map = L.map("map").setView([45.5048, -73.5769], 16);

L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap &copy; CARTO",
  maxZoom: 19
}).addTo(window.APP.map);

window.APP.bounds = L.latLngBounds(
  [45.4985, -73.5865],
  [45.5105, -73.5655]
);

window.APP.layers = {
  submit: L.featureGroup().addTo(window.APP.map),
  explore: L.featureGroup().addTo(window.APP.map),
  microguessr: L.featureGroup().addTo(window.APP.map)
};