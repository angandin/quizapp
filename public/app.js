(function () {
  let username = "";
  let questions = [];
  let currentIndex = 0;
  let selectedValue = null;

  // DOM elements
  const pageUsername = document.getElementById("page-username");
  const pageQuestion = document.getElementById("page-question");
  const pageThanks = document.getElementById("page-thanks");

  const usernameInput = document.getElementById("username-input");
  const btnUsernameNext = document.getElementById("btn-username-next");

  const questionText = document.getElementById("question-text");
  const optionsContainer = document.getElementById("options-container");
  const btnSend = document.getElementById("btn-send");
  const btnNext = document.getElementById("btn-next");

  // --- Username page ---
  usernameInput.addEventListener("input", () => {
    btnUsernameNext.disabled = usernameInput.value.trim() === "";
  });

  btnUsernameNext.addEventListener("click", async () => {
    username = usernameInput.value.trim();
    if (!username) return;
    await loadQuestions();
    showPage(pageQuestion);
    renderQuestion();
  });

  // --- Load questions from server ---
  async function loadQuestions() {
    const res = await fetch("/api/questions");
    const data = await res.json();
    questions = data.questions;
  }

  // --- Show a page, hide others ---
  function showPage(page) {
    [pageUsername, pageQuestion, pageThanks].forEach((p) =>
      p.classList.remove("active")
    );
    page.classList.add("active");
  }

  // --- Render current question ---
  function renderQuestion() {
    const q = questions[currentIndex];
    questionText.textContent = q.text;
    optionsContainer.innerHTML = "";
    selectedValue = null;
    btnSend.disabled = true;
    btnNext.disabled = true;

    q.options.forEach((opt) => {
      const box = document.createElement("div");
      box.className = "option-box";
      box.textContent = opt;
      box.addEventListener("click", () => selectOption(box, opt));
      optionsContainer.appendChild(box);
    });
  }

  // --- Select an option ---
  function selectOption(box, value) {
    // Don't allow changes after send
    if (btnNext.disabled === false) return;

    document.querySelectorAll(".option-box").forEach((b) => {
      b.classList.remove("selected");
    });
    box.classList.add("selected");
    selectedValue = value;
    btnSend.disabled = false;
  }

  // --- Send answer ---
  btnSend.addEventListener("click", async () => {
    if (selectedValue === null) return;

    btnSend.disabled = true;

    const q = questions[currentIndex];
    await sendAnswer(username, q.id, selectedValue);

    // Lock option boxes
    document.querySelectorAll(".option-box").forEach((b) => {
      b.classList.add("locked");
    });

    btnNext.disabled = false;
  });

  // --- Next question or thanks ---
  btnNext.addEventListener("click", () => {
    currentIndex++;
    if (currentIndex < questions.length) {
      renderQuestion();
    } else {
      showPage(pageThanks);
    }
  });

  // --- Send to backend ---
  async function sendAnswer(username, questionId, value) {
    try {
      await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          question_id: questionId,
          value: value,
        }),
      });
    } catch (err) {
      console.error("Failed to send answer:", err);
    }
  }
})();
