window.MODES = window.MODES || {};
let currentMode = null;

function setActiveNav(id){
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
}

function setBodyModeClass(mode){
  document.body.classList.remove("mode-submit", "mode-explore", "mode-microguessr");
  document.body.classList.add("mode-" + mode);
}

function setMode(name){
  if (!window.MODES[name]) return;
  if (currentMode) window.MODES[currentMode]?.exit?.();
  currentMode = name;
  sessionStorage.setItem("mwMode", name);
  window.MODES[currentMode].enter();
  setBodyModeClass(currentMode);
  setActiveNav(name + "Btn");
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("submitBtn")?.addEventListener("click", () => setMode("submit"));
  document.getElementById("exploreBtn")?.addEventListener("click", () => setMode("explore"));
  document.getElementById("microguessrBtn")?.addEventListener("click", (e) => {
    if (e.currentTarget.tagName !== "A") {
      e.preventDefault();
      setMode("microguessr");
    }
  });

  const savedMode = sessionStorage.getItem("mwMode") || "explore";
  setMode(savedMode);
});
