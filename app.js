// ===============================
// CONFIGURACIÓN Y ESTADO GLOBAL
// ===============================

const APP_STATE = {
  selectedBlock: 1,
  selectedLevel: "medio",
  questionCount: 15,
  questions: [],
  currentQuestionIndex: 0,
  answers: [],
  timerInterval: null,
  timeRemaining: 0,
  timeLimit: 0,
  isFinished: false,

  performance: {
    totalTests: 0,
    totalScore: 0,
    blockStats: {
      1: { tests: 0, correct: 0, total: 0 },
      2: { tests: 0, correct: 0, total: 0 }
    }
  },

  wrongQuestions: JSON.parse(localStorage.getItem("wrongQuestions")) || []
};

// ===============================
// ELEMENTOS DOM
// ===============================

const DOM = {
  themeToggle: document.getElementById("theme-toggle"),
  screens: document.querySelectorAll(".screen"),

  blockCards: document.querySelectorAll(".dashboard-block"),
  levelBtns: document.querySelectorAll(".level-btn"),
  startBtn: document.getElementById("start-btn"),

  questionCounter: document.getElementById("question-counter"),
  progressBarFill: document.getElementById("progress-bar-fill"),
  timerDisplay: document.getElementById("timer"),
  questionText: document.getElementById("question-text"),
  optionsContainer: document.getElementById("options-container"),
  prevBtn: document.getElementById("prev-btn"),
  skipBtn: document.getElementById("skip-btn"),
  nextBtn: document.getElementById("next-btn"),
  finishBtn: document.getElementById("finish-btn"),

  finalScore: document.getElementById("final-score"),
  statCorrect: document.getElementById("stat-correct"),
  statIncorrect: document.getElementById("stat-incorrect"),
  statBlank: document.getElementById("stat-blank"),
  statTime: document.getElementById("stat-time"),
  restartBtn: document.getElementById("restart-btn"),

  perfMedia: document.getElementById("perf-media"),
  perfB1: document.getElementById("perf-b1"),
  perfB2: document.getElementById("perf-b2"),

  errorBtn: document.getElementById("error-btn"),
  errorCount: document.getElementById("error-count"),
  errorsContainer: document.getElementById("errors-container")
};

// ===============================
// INIT
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupEventListeners();
  renderPerformance();
  updateErrorCount();
});

// ===============================
function setupEventListeners() {

  DOM.themeToggle?.addEventListener("click", toggleTheme);

  DOM.blockCards.forEach(card => {
    card.addEventListener("click", () => {
      DOM.blockCards.forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      APP_STATE.selectedBlock = parseInt(card.dataset.block, 10);
    });
  });

  DOM.levelBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      DOM.levelBtns.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");

      const label = btn.textContent.toLowerCase();

      if (label.includes("fácil") || label.includes("facil")) {
        APP_STATE.questionCount = 10;
      } else if (label.includes("difícil") || label.includes("dificil")) {
        APP_STATE.questionCount = 20;
      } else {
        APP_STATE.questionCount = 15;
      }
    });
  });

  // 🔎 BOTÓN BUSCAR ERRORES
  DOM.errorBtn?.addEventListener("click", () => {
    renderErrors();
    switchScreen("errors-screen");
  });

  // 🔙 BOTÓN VOLVER DESDE ERRORES
  const backBtn = document.getElementById("back-from-errors");
  backBtn?.addEventListener("click", () => {
    switchScreen("setup-screen");
  });

  DOM.startBtn?.addEventListener("click", startTest);
  DOM.prevBtn?.addEventListener("click", prevQuestion);
  DOM.skipBtn?.addEventListener("click", skipQuestion);
  DOM.nextBtn?.addEventListener("click", nextQuestion);
  DOM.finishBtn?.addEventListener("click", () => finishTest(false));
  DOM.restartBtn?.addEventListener("click", resetApp);
}

// ===============================
// INICIO TEST
// ===============================

function startTest() {
  const blockQuestions =
    APP_STATE.selectedBlock === 1
      ? window.bloque1Questions
      : window.bloque2Questions;

  if (!blockQuestions?.length) {
    alert("No hay preguntas disponibles.");
    return;
  }

  const count = Math.min(APP_STATE.questionCount, blockQuestions.length);

  APP_STATE.questions = shuffleArray([...blockQuestions]).slice(0, count);
  APP_STATE.currentQuestionIndex = 0;
  APP_STATE.answers = new Array(count).fill(null);
  APP_STATE.timeLimit = count * 60;
  APP_STATE.timeRemaining = APP_STATE.timeLimit;
  APP_STATE.isFinished = false;

  DOM.timerDisplay.textContent = "⏱️ " + formatTime(APP_STATE.timeRemaining);

  switchScreen("test-screen");
  renderQuestion();
  startTimer();
}

// ===============================
// RENDER
// ===============================

function renderQuestion() {
  const qIndex = APP_STATE.currentQuestionIndex;
  const question = APP_STATE.questions[qIndex];
  if (!question) return;

  DOM.questionCounter.textContent =
    `Pregunta ${qIndex + 1} de ${APP_STATE.questions.length}`;

  DOM.progressBarFill.style.width =
    ((qIndex + 1) / APP_STATE.questions.length) * 100 + "%";

  DOM.questionText.textContent = question.text;
  DOM.optionsContainer.innerHTML = "";

  question.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = `${String.fromCharCode(65 + i)}) ${opt}`;
    if (APP_STATE.answers[qIndex] === i) btn.classList.add("selected");
    btn.onclick = () => selectOption(i);
    DOM.optionsContainer.appendChild(btn);
  });

  updateNavigationButtons();
}

// ===============================
// SELECCIÓN
// ===============================

function selectOption(index) {
  const q = APP_STATE.currentQuestionIndex;
  APP_STATE.answers[q] =
    APP_STATE.answers[q] === index ? null : index;

  renderQuestion();
}

// ===============================
// NAVEGACIÓN
// ===============================

function updateNavigationButtons() {
  const q = APP_STATE.currentQuestionIndex;
  DOM.prevBtn.disabled = q === 0;

  if (q === APP_STATE.questions.length - 1) {
    DOM.nextBtn.classList.add("hidden");
    DOM.skipBtn.classList.add("hidden");
    DOM.finishBtn.classList.remove("hidden");
  } else {
    DOM.nextBtn.classList.remove("hidden");
    DOM.skipBtn.classList.remove("hidden");
    DOM.finishBtn.classList.add("hidden");
  }
}

function prevQuestion() {
  if (APP_STATE.currentQuestionIndex > 0) {
    APP_STATE.currentQuestionIndex--;
    renderQuestion();
  }
}

function skipQuestion() {
  APP_STATE.answers[APP_STATE.currentQuestionIndex] = -1;
  nextQuestion();
}

function nextQuestion() {
  if (APP_STATE.currentQuestionIndex < APP_STATE.questions.length - 1) {
    APP_STATE.currentQuestionIndex++;
    renderQuestion();
  }
}

// ===============================
// FINALIZAR
// ===============================

function finishTest(force = false) {
  if (APP_STATE.isFinished) return;
  clearInterval(APP_STATE.timerInterval);

  if (!force) {
    const blanks = APP_STATE.answers.filter(a => a === null).length;
    if (blanks && !confirm(`Tienes ${blanks} preguntas en blanco. ¿Finalizar?`)) {
      startTimer();
      return;
    }
  }

  APP_STATE.isFinished = true;
  calculateResults();
  switchScreen("results-screen");
}

// ===============================
// RESULTADOS + ERRORES
// ===============================

function calculateResults() {
  let correct = 0;
  let incorrect = 0;
  let blank = 0;

  APP_STATE.questions.forEach((q, i) => {
    const ans = APP_STATE.answers[i];

    if (ans === null || ans === -1) {
      blank++;
    } else if (ans === q.correctIndex) {
      correct++;
      APP_STATE.wrongQuestions =
        APP_STATE.wrongQuestions.filter(w => w.text !== q.text);
    } else {
      incorrect++;
      if (!APP_STATE.wrongQuestions.some(w => w.text === q.text)) {
        APP_STATE.wrongQuestions.push(q);
      }
    }
  });

  localStorage.setItem(
    "wrongQuestions",
    JSON.stringify(APP_STATE.wrongQuestions)
  );

  updateErrorCount();

  let score = correct - incorrect * 0.33;
  if (score < 0) score = 0;

  const scoreBase10 =
    (score / APP_STATE.questions.length) * 10;

  DOM.finalScore.textContent = scoreBase10.toFixed(2);
  DOM.statCorrect.textContent = correct;
  DOM.statIncorrect.textContent = incorrect;
  DOM.statBlank.textContent = blank;

  updatePerformance(correct, APP_STATE.questions.length, scoreBase10);
}

// ===============================
// RENDIMIENTO
// ===============================

function updatePerformance(correct, total, scoreBase10) {
  const perf = APP_STATE.performance;
  const block = APP_STATE.selectedBlock;

  perf.totalTests++;
  perf.totalScore += scoreBase10;

  perf.blockStats[block].tests++;
  perf.blockStats[block].correct += correct;
  perf.blockStats[block].total += total;

  renderPerformance();
}

function renderPerformance() {
  const perf = APP_STATE.performance;

  const media =
    perf.totalTests === 0
      ? 0
      : perf.totalScore / perf.totalTests;

  DOM.perfMedia.textContent = media.toFixed(2);

  [1, 2].forEach(block => {
    const b = perf.blockStats[block];
    const percent = b.total === 0 ? 0 : (b.correct / b.total) * 100;

    if (block === 1) DOM.perfB1.textContent = percent.toFixed(0) + "%";
    if (block === 2) DOM.perfB2.textContent = percent.toFixed(0) + "%";
  });
}

// ===============================
// ERRORES
// ===============================

function updateErrorCount() {
  DOM.errorCount &&
    (DOM.errorCount.textContent = APP_STATE.wrongQuestions.length);
}

function renderErrors() {
  if (!DOM.errorsContainer) return;

  DOM.errorsContainer.innerHTML = "";

  if (APP_STATE.wrongQuestions.length === 0) {
    DOM.errorsContainer.innerHTML =
      "<p>No tienes preguntas falladas 🎉</p>";
    return;
  }

  APP_STATE.wrongQuestions.forEach((q, index) => {
    const div = document.createElement("div");
    div.className = "review-item";

    let optionsHtml = "";
    q.options.forEach((opt, i) => {
      const letter = String.fromCharCode(65 + i);
      const isCorrect = i === q.correctIndex;
      optionsHtml += `
        <div class="review-opt ${isCorrect ? "is-correct" : ""}">
          ${letter}) ${opt}
        </div>
      `;
    });

    div.innerHTML = `
      <p><strong>Pregunta ${index + 1}</strong></p>
      <p>${q.text}</p>
      ${optionsHtml}
      <div><strong>Explicación:</strong> ${q.explanation || ""}</div>
      <hr>
    `;

    DOM.errorsContainer.appendChild(div);
  });
}

// ===============================
// TIMER
// ===============================

function startTimer() {
  clearInterval(APP_STATE.timerInterval);

  APP_STATE.timerInterval = setInterval(() => {
    if (APP_STATE.timeRemaining <= 0) {
      finishTest(true);
      return;
    }

    APP_STATE.timeRemaining--;
    DOM.timerDisplay.textContent =
      "⏱️ " + formatTime(APP_STATE.timeRemaining);

  }, 1000);
}

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// ===============================
// UTILIDADES
// ===============================

function switchScreen(id) {
  DOM.screens.forEach(s => s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
}

function resetApp() {
  clearInterval(APP_STATE.timerInterval);
  APP_STATE.isFinished = false;
  switchScreen("setup-screen");
}

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

// ===============================
// TEMA
// ===============================

function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.body.setAttribute("data-theme", "dark");
    DOM.themeToggle.textContent = "☀️";
  }
}

function toggleTheme() {
  const dark =
    document.body.getAttribute("data-theme") === "dark";

  document.body.setAttribute("data-theme", dark ? "light" : "dark");
  localStorage.setItem("theme", dark ? "light" : "dark");
  DOM.themeToggle.textContent = dark ? "🌙" : "☀️";
}