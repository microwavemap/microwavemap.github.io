//microguessr.js

/* 
this app creates and reuses a leaflet map and geojson.
first, it initalizes the geojson and map.
next, it defines the preset game rounds.
then, it defines the score calculation.
the screens and buttons go from: instructions, to place, to next, and then done!
modelled after geoguessr.
made possible with help from chatgpt
*/

//initialize map and make reusable
window.APP = window.APP || {};

window.APP.initMicroguessrMap = function () {
  if (window.APP.map) return window.APP.map;

  const map = (window.APP.map = L.map("map").setView([45.5048, -73.5769], 16));

  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    maxZoom: 19
  }).addTo(map);

//create a space for game layers
  window.APP.layers = {
    microguessr: L.featureGroup().addTo(map)
  };

  return map;
};

  let map = null;
  let campusLayer = null;

//render the geojson
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

//add geojson with styling
  campusLayer = L.geoJSON(data, {
    style: {
      color: "#0000ff",
      weight: 2,
      opacity: 0.9,
      dashArray: "1, 5",
    },
  }).addTo(map);
}

//quiz content, defining rounds and correct answers
    const ROUNDS = [
      { id: 1, imageUrl: "IMG_2158.JPG", target: { lat: 45.5055585, lng: -73.57643444}, targetInfo: "in the Engineering Café of McConnell Engineering Building." },
      { id: 2, imageUrl: "IMG_2130.JPG", target: { lat: 45.5047077, lng: -73.57497295 }, targetInfo: "in the Geographic Information Centre (room 512) in Burnside Hall." },
      { id: 3, imageUrl: "IMG_3995.jpeg", target: { lat: 45.50587412, lng: -73.57318516 }, targetInfo: "beside Vihn's Café, on the main floor of the Strathcona Music Building." },
      { id: 4, imageUrl: "IMG_1631.JPG", target: { lat: 45.50353232, lng: -73.57668676 }, targetInfo: "in the basement of Redpath, beside the Cyberthèque." },
      { id: 5, imageUrl: "IMG_2152.JPG", target: { lat: 45.50483473, lng: -73.57496602 }, targetInfo: "niche... in the GSAMS (Graduate Student Association for Mathematics and Statistics) lounge, room 1024 of Burnside Hall." },
    ];

//scoring parameters
const SCORE = {
  maxPerRound: 5000, //max points available per round - the perfect score
  fullScoreWithinMeters: 25, //perfect score within this radius (metres)
  maxScoringDistanceMeters: 600, //score is 0 beyond this distance
  power: 4 //cutoff steepness
};

function scoreFromDistance(m){
  if (!Number.isFinite(m) || m < 0) return 0;
  if (m > SCORE.maxScoringDistanceMeters) return 0;
  if (m <= SCORE.fullScoreWithinMeters) return SCORE.maxPerRound;

  const d = (m - SCORE.fullScoreWithinMeters) / (SCORE.maxScoringDistanceMeters - SCORE.fullScoreWithinMeters);
  const s = SCORE.maxPerRound * Math.pow(1 - d, SCORE.power);
  return Math.max(0, Math.round(s));
}

//save the DOM nodes in the cache
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

//game phases
    const Phase = { INSTRUCTIONS:"INSTRUCTIONS", PLACE:"PLACE", NEXT:"NEXT", DONE:"DONE" };
    

    let phase = Phase.INSTRUCTIONS; //current phase
    let roundIndex = 0; //index into rounds
    let totalScore = 0; //total score
    let guesses = []; //array of roundId, distanceM, score
    let currentGuess = null; //lat/long currentGuess

    //leaflet layers
    let guessMarker = null, targetMarker = null, lineToTarget = null;

    //should instructions be visualized?
    let instructionsDismissed = false;

    //current round indicator
    const getRound = () => ROUNDS[roundIndex];

  function show(which){
    //instructions show only if on instructions screen AND are not dismissed.
    if (ui.screenInstructions) ui.screenInstructions.hidden = (which !== "instructions") || instructionsDismissed;
    //the round UI is visible only when which === "round"
    if (ui.screenRound) ui.screenRound.hidden = which !== "round";
    //the summary UI is visible only when which === "summary"
    if (ui.screenSummary) ui.screenSummary.hidden = which !== "summary";
  }

    //update the info text
    function setInfo(t){ ui.info.textContent = t; }
    //display the score
    function setTotal(){ ui.total.textContent = String(totalScore); }

    //remove the round overlays
    function clearOverlays(){
      if (!map) return;
      [guessMarker, targetMarker, lineToTarget].forEach(l => l && map.removeLayer(l));
      guessMarker = targetMarker = lineToTarget = null;
    }

    function renderRound(){
      const r = getRound();

      //remove the round overlays, clean slate!
      clearOverlays();
      currentGuess = null;

      //update image
      ui.img.src = r.imageUrl;
      ui.img.alt = `round ${r.id}`;
      ui.roundLabel.textContent = `round ${r.id} / ${ROUNDS.length}`; //update round #

      //update score and instructions
      setTotal();
      setInfo("click on the map where you think this microwave photo was taken.");
      ui.btnProceed.textContent = "proceed!";
      ui.btnProceed.disabled = true;
      phase = Phase.PLACE;
    }

    //save guess
    function placeGuess(latlng){
      if (!map) return;
      currentGuess = { lat: latlng.lat, lng: latlng.lng };
      if (guessMarker) map.removeLayer(guessMarker);

    //draw guess
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

    //reveal and score the guess
    function revealAndScore(){
      const r = getRound();
      const dist = map.distance([currentGuess.lat, currentGuess.lng], [r.target.lat, r.target.lng]); //compute distance - leaflet function!
      const pts = scoreFromDistance(dist); //convert distance to points
      totalScore += pts; //append to total score

//display the real microwave location, with a line connecting the guess to the real location
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

//store the result
      guesses.push({ roundId:r.id, distanceM:dist, score:pts });
      setTotal();

//give immediate feedback, like geoguessr!
      setInfo(`you were ${Math.round(dist)} m away. round score: ${pts}. these here microwaves are ${r.targetInfo || "?"}`.trim());
      ui.btnProceed.textContent = (roundIndex < ROUNDS.length - 1) ? "next round" : "see results";
      phase = Phase.NEXT;
    }

//switch to the summary screen, when all rounds completed
    function renderSummary(){
      show("summary");
      ui.summaryText.textContent =
        [`your final score: ${totalScore}`, ...guesses.map(g => `round ${g.roundId}: ${Math.round(g.distanceM)} m away, ${g.score} pts!`)]
        .join("\n");
      phase = Phase.DONE;
    }

//remove instructions
ui.btnStart.addEventListener("click", () => {
  instructionsDismissed = true;

  show("round");

  map = window.APP.initMicroguessrMap();

//map click places a guess only during the place phase
  map.off("click");
  map.on("click", (e) => {
    if (phase === Phase.PLACE) placeGuess(e.latlng);
  });

//reset game
  roundIndex = 0;
  totalScore = 0;
  guesses = [];
  clearOverlays();

//leaflet screen size recalculation
  map.invalidateSize(true);
  requestAnimationFrame(() => {
    map.invalidateSize(true);
    renderCampusGeojson();
    renderRound();
  });
});

//proceed button logic
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

//page reload restarts progress
ui.btnRestart.addEventListener("click", () => location.reload());

//inital screen shows instructions page
show("instructions");
