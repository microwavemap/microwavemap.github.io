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

    document.getElementById("nav-euclid").addEventListener("click", () => {
      window.location.href = "navigate-2.html";
    });
