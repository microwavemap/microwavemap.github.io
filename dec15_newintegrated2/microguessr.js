const map = window.APP.map;

const ROUNDS = [
  { id: 1, name: "1", imageUrl: "images/1.jpg", target: { lat: 45.5048, lng: -73.5769 } },
  { id: 2, name: "2", imageUrl: "images/2.jpg", target: { lat: 45.5020, lng: -73.5740 } },
  { id: 3, name: "3", imageUrl: "images/3.jpg", target: { lat: 45.5062, lng: -73.5792 } },
  { id: 4, name: "4", imageUrl: "images/4.jpg", target: { lat: 45.5075, lng: -73.5718 } },
  { id: 5, name: "5", imageUrl: "images/5.jpg", target: { lat: 45.5031, lng: -73.5805 } },
];
const MAX_ROUNDS = ROUNDS.length;

const SCORE = { maxPerRound: 5000, decayMeters: 800 };

const ui = {
  screenInstructions: document.getElementById("screen-instructions"),
  screenRound: document.getElementById("screen-round"),
  screenSummary: document.getElementById("screen-summary"),
  btnStart: document.getElementById("btn-start"),
  btnProceed: document.getElementById("btn-proceed"),
  img: document.getElementById("round-image"),
  roundLabel: document.getElementById("round-label"),
  info: document.getElementById("info-label"),
  total: document.getElementById("total-score"),
  summaryText: document.getElementById("summary-text"),
};

const Phase = {
  INSTRUCTIONS: "INSTRUCTIONS",
  PLACE_GUESS: "PLACE_GUESS", 
  REVEAL_RESULT: "REVEAL_RESULT",
  NEXT_ROUND: "NEXT_ROUND", 
  DONE: "DONE",
};

let phase = Phase.INSTRUCTIONS;
let roundIndex = 0;
let totalScore = 0;
let guesses = [];
let currentGuess = null;

let guessMarker = null;
let targetMarker = null;
let lineToTarget = null;

function getRound() {
  return ROUNDS[roundIndex];
}

function setInfo(text) {
  if (ui.info) ui.info.textContent = text;
}

function setTotal() {
  if (ui.total) ui.total.textContent = `${totalScore}`;
}

function showScreen(which) {
  if (ui.screenInstructions) ui.screenInstructions.hidden = which !== "instructions";
  if (ui.screenRound) ui.screenRound.hidden = which !== "round";
  if (ui.screenSummary) ui.screenSummary.hidden = which !== "summary";
}

function clearOverlays() {
  if (guessMarker) map.removeLayer(guessMarker);
  if (targetMarker) map.removeLayer(targetMarker);
  if (lineToTarget) map.removeLayer(lineToTarget);
  guessMarker = null;
  targetMarker = null;
  lineToTarget = null;
}

function metersBetween(a, b) {
  return map.distance([a.lat, a.lng], [b.lat, b.lng]);
}

function scoreFromDistance(distanceM) {
  const raw = SCORE.maxPerRound * Math.exp(-distanceM / SCORE.decayMeters);
  return Math.max(0, Math.round(raw));
}

function renderRound() {
  const r = getRound();
  clearOverlays();
  currentGuess = null;

  if (ui.img) {
    ui.img.src = r.imageUrl;
    ui.img.alt = `Round ${r.id}`;
  }
  if (ui.roundLabel) ui.roundLabel.textContent = `Round ${r.id} / ${MAX_ROUNDS}`;

  setTotal();
  setInfo("click on the map where you think th(is)(ese) microwave(s) are!");
  if (ui.btnProceed) {
    ui.btnProceed.textContent = "proceed!";
    ui.btnProceed.disabled = true;
  }
}

function placeGuess(latlng) {
  currentGuess = { lat: latlng.lat, lng: latlng.lng };

  if (guessMarker) map.removeLayer(guessMarker);
  guessMarker = L.circleMarker([currentGuess.lat, currentGuess.lng], {
    radius: 7,
    weight: 2,
    fillOpacity: 1,
  }).addTo(map);

  if (ui.btnProceed) ui.btnProceed.disabled = false;
  setInfo("guess placed. click proceed to reveal the answer and score for this round!");
}

function revealAndScore() {
  const r = getRound();
  if (!currentGuess) return null;

  const distanceM = metersBetween(currentGuess, r.target);
  const roundScore = scoreFromDistance(distanceM);
  totalScore += roundScore;

  targetMarker = L.circleMarker([r.target.lat, r.target.lng], {
    radius: 7,
    weight: 2,
    fillOpacity: 1,
  }).addTo(map);

  lineToTarget = L.polyline(
    [
      [currentGuess.lat, currentGuess.lng],
      [r.target.lat, r.target.lng],
    ],
    { weight: 2 }
  ).addTo(map);

  guesses.push({
    roundId: r.id,
    guess: { ...currentGuess },
    target: { ...r.target },
    distanceM,
    score: roundScore,
  });

  setTotal();
  setInfo(`You were ${Math.round(distanceM)} m away. Round score: ${roundScore}.`);

  if (ui.btnProceed) ui.btnProceed.textContent = (roundIndex < MAX_ROUNDS - 1) ? "Next round" : "See results";
  return { distanceM, roundScore };
}

function renderSummary() {
  showScreen("summary");
  const lines = [
    `Final score: ${totalScore}`,
    ...guesses.map(g => `Round ${g.roundId}: ${Math.round(g.distanceM)} m, ${g.score} pts`)
  ];
  if (ui.summaryText) ui.summaryText.textContent = lines.join("\n");
}

function setPhase(p) {
  phase = p;

  if (phase === Phase.INSTRUCTIONS) {
    showScreen("instructions");
  }

  if (phase === Phase.PLACE_GUESS) {
    showScreen("round");
    renderRound();
  }

  if (phase === Phase.REVEAL_RESULT) {
  }

  if (phase === Phase.NEXT_ROUND) {
  }

  if (phase === Phase.DONE) {
    renderSummary();
  }
}

map.on("click", (e) => {
  if (phase !== Phase.PLACE_GUESS) return;
  placeGuess(e.latlng);
});

ui.btnStart?.addEventListener("click", () => {
  roundIndex = 0;
  totalScore = 0;
  guesses = [];
  clearOverlays();
  setPhase(Phase.PLACE_GUESS);
});

ui.btnProceed?.addEventListener("click", () => {
  if (phase === Phase.PLACE_GUESS) {
    if (!currentGuess) {
      setInfo("Click on the map first.");
      return;
    }
    revealAndScore();
    setPhase(Phase.NEXT_ROUND);
    return;
  }

  if (phase === Phase.NEXT_ROUND) {
    if (roundIndex < MAX_ROUNDS - 1) {
      roundIndex += 1;
      setPhase(Phase.PLACE_GUESS);
    } else {
      setPhase(Phase.DONE);
    }
  }
});

setPhase(Phase.INSTRUCTIONS);
