function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

const rightPanel = document.getElementById("right-panel");
const rightBox = document.getElementById("right-box");
const toggleRight = document.getElementById("toggle-right");

function openRightPanel(){
  rightPanel.classList.remove("collapsed");
  toggleRight.textContent = ">";
}

function setRightPanelHTML(title, html){
  rightBox.innerHTML = `<p class="intro">${esc(title)}</p>` + html;
  openRightPanel();
}

toggleRight.addEventListener("click", () => {
  rightPanel.classList.toggle("collapsed");
  toggleRight.textContent = rightPanel.classList.contains("collapsed") ? "<" : ">";
});
