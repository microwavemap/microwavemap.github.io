  const map = window.APP?.map;

  let campusLayer = null;

  function renderCampusGeojson() {
  if (!map) return;

  const data =
    window.geojsonFeature ||
    window.geojsonData ||
    window.GEOJSON ||
    window.campusGeojson;

  if (!data) {
    console.warn("nooo geojson here!");
    return;
  }

  if (campusLayer) map.removeLayer(campusLayer);

  campusLayer = L.geoJSON(data, {
    style: {
      color: "#0000ff",
      weight: 2,
      opacity: 0.9,
      dashArray: "1, 5",
    },
  }).addTo(map);
}

renderCampusGeojson();

    const ROUNDS = [
      { id: 1, imageUrl: "IMG_2158.JPG", target: { lat: 45.5055585, lng: -73.57643444}, targetInfo: "in the Engineering Café of McConnell Engineering Building." },
      { id: 2, imageUrl: "IMG_2130.JPG", target: { lat: 45.5047077, lng: -73.57497295 }, targetInfo: "in the Geographic Information Centre (room 512) in Burnside Hall." },
      { id: 3, imageUrl: "IMG_3995.jpeg", target: { lat: 45.50587412, lng: -73.57318516 }, targetInfo: "beside Vihn's Café, on the main floor of the Strathcona Music Building." },
      { id: 4, imageUrl: "IMG_1631.JPG", target: { lat: 45.50353232, lng: -73.57668676 }, targetInfo: "in the basement of Redpath, beside the Cyberthèque." },
      { id: 5, imageUrl: "IMG_2152.JPG", target: { lat: 45.50483473, lng: -73.57496602 }, targetInfo: "niche... in the GSAMS (Graduate Student Association for Mathematics and Statistics) lounge, room 1024 of Burnside Hall." },
    ];

const SCORE = {
  maxPerRound: 5000,
  decayMeters: 250,
  fullScoreWithinMeters: 25,
};

function scoreFromDistance(m){
  if (m <= SCORE.fullScoreWithinMeters) return SCORE.maxPerRound;
  return Math.max(0, Math.round(SCORE.maxPerRound * Math.exp(-m / SCORE.decayMeters)));
}
    const ui = {
      screenInstructions: document.getElementById("screen-instructions"),
      screenRound: document.getElementById("screen-round"),
      screenSummary: document.getElementById("screen-summary"),
      btnStart: document.getElementById("btn-start"),
      btnProceed: document.getElementById("btn-proceed"),
      btnRestart: document.getElementById("btn-restart"),
      img: document.getElementById("round-image"),
      roundLabel: document.getElementById("round-label"),
      info: document.getElementById("info-label"),
      total: document.getElementById("total-score"),
      summaryText: document.getElementById("summary-text"),
    };

    const Phase = { INSTRUCTIONS:"INSTRUCTIONS", PLACE:"PLACE", NEXT:"NEXT", DONE:"DONE" };
    let phase = Phase.INSTRUCTIONS;
    let roundIndex = 0;
    let totalScore = 0;
    let guesses = [];
    let currentGuess = null;
    let guessMarker = null, targetMarker = null, lineToTarget = null;
  let instructionsDismissed = false;

    const getRound = () => ROUNDS[roundIndex];

  function show(which){
    if (ui.screenInstructions) ui.screenInstructions.hidden = (which !== "instructions") || instructionsDismissed;
    if (ui.screenRound) ui.screenRound.hidden = which !== "round";
    if (ui.screenSummary) ui.screenSummary.hidden = which !== "summary";
  }

    function setInfo(t){ ui.info.textContent = t; }
    function setTotal(){ ui.total.textContent = String(totalScore); }

    function clearOverlays(){
      if (!map) return;
      [guessMarker, targetMarker, lineToTarget].forEach(l => l && map.removeLayer(l));
      guessMarker = targetMarker = lineToTarget = null;
    }

    function scoreFromDistance(m){
      return Math.max(0, Math.round(SCORE.maxPerRound * Math.exp(-m / SCORE.decayMeters)));
    }

    function renderRound(){
      const r = getRound();
      clearOverlays();
      currentGuess = null;

      ui.img.src = r.imageUrl;
      ui.img.alt = `Round ${r.id}`;
      ui.roundLabel.textContent = `Round ${r.id} / ${ROUNDS.length}`;

      setTotal();
      setInfo("click on the map where you think this microwave photo was taken.");
      ui.btnProceed.textContent = "proceed";
      ui.btnProceed.disabled = true;
      phase = Phase.PLACE;
    }

    function placeGuess(latlng){
      if (!map) return;
      currentGuess = { lat: latlng.lat, lng: latlng.lng };

      if (guessMarker) map.removeLayer(guessMarker);
    guessMarker = L.circleMarker([currentGuess.lat, currentGuess.lng], { 
      radius: 6,
      weight: 2,
      fillOpacity: 1,
      color: "#0000ff",
      fillColor: "#fff933"
    }).addTo(map);

      ui.btnProceed.disabled = false;
      setInfo("guess placed. click proceed to reveal and score.");
    }

    function revealAndScore(){
      const r = getRound();
      const dist = map.distance([currentGuess.lat, currentGuess.lng], [r.target.lat, r.target.lng]);
      const pts = scoreFromDistance(dist);
      totalScore += pts;

    targetMarker = L.circleMarker([r.target.lat, r.target.lng], { 
        radius: 8,
        weight: 3,
        fillOpacity: 1,
        color: "#0000ff",
        fillColor: "#fff933"
    }).addTo(map);

      lineToTarget = L.polyline([[currentGuess.lat, currentGuess.lng],[r.target.lat, r.target.lng]], { 
      color: "#0000ff",
      weight: 2,
      dashArray: "4,6"
    }).addTo(map);

      guesses.push({ roundId:r.id, distanceM:dist, score:pts });
      setTotal();

      setInfo(`you were ${Math.round(dist)} m away. round score: ${pts}. these here microwaves are ${r.targetInfo || "?"}`.trim());
      ui.btnProceed.textContent = (roundIndex < ROUNDS.length - 1) ? "next round" : "see results";
      phase = Phase.NEXT;
    }

    function renderSummary(){
      show("summary");
      ui.summaryText.textContent =
        [`Final score: ${totalScore}`, ...guesses.map(g => `Round ${g.roundId}: ${Math.round(g.distanceM)} m, ${g.score} pts`)]
        .join("\n");
      phase = Phase.DONE;
    }

    if (map){
      map.on("click", (e) => { if (phase === Phase.PLACE) placeGuess(e.latlng); });
    }

    ui.btnStart.addEventListener("click", () => {
      instructionsDismissed = true;
      roundIndex = 0; totalScore = 0; guesses = []; clearOverlays();
      show("round");
      renderRound();
    });

    ui.btnProceed.addEventListener("click", () => {
      if (phase === Phase.PLACE){
        if (!currentGuess) return setInfo("click on the map first.");
        revealAndScore();
        return;
      }
      if (phase === Phase.NEXT){
        if (roundIndex < ROUNDS.length - 1){
          roundIndex += 1;
          renderRound();
        } else {
          renderSummary();
        }
      }
    });

    ui.btnRestart.addEventListener("click", () => location.reload());

    show("instructions");
