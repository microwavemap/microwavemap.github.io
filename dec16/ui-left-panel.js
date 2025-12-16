(function wireLeftPanelToggleOnce(){
  const panel = document.getElementById("info-panel");
  const toggleBtn = document.getElementById("toggle-info");
  if (!panel || !toggleBtn) return;

  if (toggleBtn.dataset.wired === "1") return; // prevent double-wiring
  toggleBtn.dataset.wired = "1";

  toggleBtn.addEventListener("click", () => {
    panel.classList.toggle("collapsed");
    toggleBtn.textContent = panel.classList.contains("collapsed") ? ">" : "<";
  });
})();