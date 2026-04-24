(function () {
  const ADMIN_USERNAME = "angadmin";
  let username = "";
  let questions = [];
  let currentIndex = 0;
  let selectedValue = null;
  let hasSent = false;
  let pollInterval = null;

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
    // Warm up Event Hub connection in the background
    fetch("/api/warmup", { method: "POST" }).catch(() => {});
    // Hide Next button for non-admin users (navigation is centrally managed)
    if (username !== ADMIN_USERNAME) {
      btnNext.style.display = "none";
    }
    showPage(pageQuestion);
    renderQuestion();
    // Start polling for non-admin users
    if (username !== ADMIN_USERNAME) {
      startPolling();
    }
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
    hasSent = false;
    btnSend.disabled = true;
    btnNext.disabled = true;

    q.options.forEach((opt) => {
      const box = document.createElement("div");
      box.className = "option-box";
      box.textContent = opt;
      box.addEventListener("click", () => selectOption(box, opt));
      optionsContainer.appendChild(box);
    });

    // Admin: auto-select first option and auto-send after a short delay
    if (username === ADMIN_USERNAME) {
      const firstBox = optionsContainer.querySelector(".option-box");
      if (firstBox) {
        selectOption(firstBox, q.options[0]);
        setTimeout(() => btnSend.click(), 300);
      }
    }
  }

  // --- Select an option ---
  function selectOption(box, value) {
    // Don't allow changes after send
    if (hasSent) return;

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
    hasSent = true;

    const q = questions[currentIndex];
    await sendAnswer(username, q.id, selectedValue);

    // Lock option boxes
    document.querySelectorAll(".option-box").forEach((b) => {
      b.classList.add("locked");
    });

    // Admin can always proceed immediately (their send advances the step)
    if (username === ADMIN_USERNAME) {
      btnNext.disabled = false;
    }
    // Non-admin: polling will enable Next when admin advances
  });

  // --- Next question or thanks ---
  btnNext.addEventListener("click", async () => {
    // Admin: advance the global step so all users move forward
    if (username === ADMIN_USERNAME) {
      await fetch("/api/advance-step", { method: "POST" });
    }
    currentIndex++;
    if (currentIndex < questions.length) {
      renderQuestion();
    } else {
      if (pollInterval) clearInterval(pollInterval);
      showPage(pageThanks);
    }
  });

  // --- Polling for step control (non-admin users) ---
  function startPolling() {
    pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/current-step");
        const data = await res.json();
        // allowed_step > currentIndex means admin has moved past this question
        if (hasSent && data.allowed_step > currentIndex) {
          // Auto-advance to the next question
          currentIndex++;
          if (currentIndex < questions.length) {
            renderQuestion();
          } else {
            clearInterval(pollInterval);
            showPage(pageThanks);
          }
        }
      } catch (e) {
        // ignore polling errors
      }
    }, 2000);
  }

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
