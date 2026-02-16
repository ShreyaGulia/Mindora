// 🔐 Auth Guard (ONLY for index.html)
if (!window.location.pathname.includes("login.html") &&
    !window.location.pathname.includes("signup.html")) {

  if (localStorage.getItem("isLoggedIn") !== "true") {
    window.location.href = "login.html";
  }
}

if (localStorage.getItem("isLoggedIn") !== "true") {
  window.location.href = "login.html";
}
const userData = JSON.parse(localStorage.getItem("mindoraUser"));

if (userData && document.getElementById("welcomeUser")) {
  document.getElementById("welcomeUser").innerText =
    `Hi, ${userData.name} 👋`;
}

document.addEventListener("DOMContentLoaded", () => {

  // ✅ Protect index.html (main app)
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const user = JSON.parse(localStorage.getItem("mindoraUser"));
  const expiry = Number(localStorage.getItem("sessionExpiry") || "0");
  const sessionExpired = !expiry || Date.now() > expiry;
  if (!isLoggedIn || !user || sessionExpired) {
    localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("mindoraUser");
  localStorage.removeItem("sessionExpiry");
    window.location.replace("login.html");
    return; // stop running rest JS
  }
  /* ================= SESSION BANNER LOGIC ================= */

const banner = document.getElementById("sessionBanner");
const timerEl = document.getElementById("sessionTimer");

function startSessionCountdown() {
  banner.style.display = "block";

  const interval = setInterval(() => {
    const expiry = Number(localStorage.getItem("sessionExpiry"));
    if (!expiry) {
      banner.style.display = "none";
      clearInterval(interval);
      return;
    }

    const remaining = expiry - Date.now();

    if (remaining <= 0) {
      banner.style.display = "none";
      clearInterval(interval);
      return;
    }

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    timerEl.textContent =
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    // Visual warnings
    banner.classList.remove("warning", "danger");

    if (minutes < 5) banner.classList.add("danger");
    else if (minutes < 10) banner.classList.add("warning");

  }, 1000);
}

startSessionCountdown();

  /* ================= CHATBOT ================= */

  // Select elements
const chatBox = document.querySelector(".chat-box");
const chatInput = document.querySelector(".chat-input input");
const sendButton = document.querySelector(".chat-input button");
const typingIndicator = document.getElementById("typingIndicator");

// Bot responses
const botResponses = [
  {
    keywords: ["stress", "stressed", "pressure", "tension"],
    response: "It sounds like you’re carrying a lot right now 💙 Want to tell me more?"
  },
  {
    keywords: ["sad", "unhappy", "cry", "low"],
    response: "I’m really sorry you’re feeling this way 🤍 I’m here with you."
  },
  {
    keywords: ["overthinking", "overthink"],
    response: "Overthinking can make things heavy. Let’s slow down together 🌿"
  },
  {
    keywords: ["anxiety", "panic", "nervous"],
    response: "Anxiety can feel scary, but it will pass. Breathe with me."
  },
  {
    keywords: ["lonely", "alone"],
    response: "You’re not alone here 💙 I’m listening."
  }
];

// Emergency keywords
const emergencyKeywords = ["suicide", "kill myself", "end my life"];

// Send message
function sendMessage() {
  const userText = chatInput.value.trim();
  if (!userText) return;

  addMessage(userText, "user");
  chatInput.value = "";

  typingIndicator.style.display = "flex";

  setTimeout(() => {
    typingIndicator.style.display = "none";
    const lowerMsg = userText.toLowerCase();
    addMessage(getBotReply(lowerMsg), "bot");
    suggestMusicFromChat(lowerMsg);
    // ================= LOGOUT =================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
  });
}

  }, 1200); 
}

// Get bot reply
function getBotReply(message) {
  if (emergencyKeywords.some(word => message.includes(word))) {
    return "You matter 💙 Please reach out to a trusted person or professional right now.";
  }

  for (let item of botResponses) {
    if (item.keywords.some(keyword => message.includes(keyword))) {
      return item.response;
    }
  }

  return "I'm Listening 🤍.";
}

// Add message to chat
function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);

  msg.innerHTML = `
    ${text}
    <span class="message-time">
      ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  `;

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}
// Event listeners
sendButton.addEventListener("click", sendMessage);
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});


  /* ================= MUSIC ================= */

  // ================= MUSIC ENHANCEMENT =================

const audios = document.querySelectorAll(".music-card audio");

let currentAudio = null;
let fadeInterval = null;

// Fade in effect
function fadeIn(audio) {
  clearInterval(fadeInterval);
  audio.volume = 0;
  fadeInterval = setInterval(() => {
    if (audio.volume < 0.95) {
      audio.volume += 0.05;
    } else {
      clearInterval(fadeInterval);
    }
  }, 150);
}

// Fade out effect
function fadeOut(audio, callback) {
  clearInterval(fadeInterval);
  fadeInterval = setInterval(() => {
    if (audio.volume > 0.05) {
      audio.volume -= 0.05;
    } else {
      clearInterval(fadeInterval);
      audio.pause();
      audio.currentTime = 0;
      if (callback) callback();
    }
  }, 150);
}

audios.forEach(audio => {

  // Auto loop for relaxation
  audio.loop = true;

  audio.addEventListener("play", () => {

    // Stop previous audio smoothly
    if (currentAudio && currentAudio !== audio) {
      fadeOut(currentAudio);
    }

    currentAudio = audio;
    fadeIn(audio);

    // UI highlight
    document.querySelectorAll(".music-card")
      .forEach(card => card.classList.remove("active"));
    audio.closest(".music-card").classList.add("active");
  });

  audio.addEventListener("pause", () => {
    audio.closest(".music-card").classList.remove("active");
  });

  audio.addEventListener("ended", () => {
    audio.closest(".music-card").classList.remove("active");
  });
});

});

// ================= MOOD FILTER LOGIC =================

const moodButtons = document.querySelectorAll(".mood-btn");
const musicCards = document.querySelectorAll(".music-card");

moodButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const mood = btn.dataset.filter;

    musicCards.forEach(card => {
      if (mood === "all" || card.dataset.mood === mood) {
        card.style.display = "block";
      } else {
        // stop audio if hidden
        const audio = card.querySelector("audio");
        audio.pause();
        audio.currentTime = 0;
        card.classList.remove("active");
        card.style.display = "none";
      }
    });
  });
});
// ================= CHATBOT → MUSIC LINK =================

// map keywords to moods
const moodMap = {
  calm: ["anxiety", "panic", "nervous", "stress", "stressed"],
  healing: ["sad", "cry", "lonely", "alone", "low"],
  sleep: ["sleep", "tired", "insomnia", "rest"]
};

function suggestMusicFromChat(message) {
  for (let mood in moodMap) {
    if (moodMap[mood].some(word => message.includes(word))) {
      playMusicByMood(mood);
      return;
    }
  }
}

function playMusicByMood(mood) {
  const card = document.querySelector(`.music-card[data-mood="${mood}"]`);
  if (!card) return;

  const audio = card.querySelector("audio");

  // stop all others
  document.querySelectorAll(".music-card audio").forEach(a => {
    a.pause();
    a.currentTime = 0;
  });

  audio.play();
  card.classList.add("active");

  // optional chatbot message
  setTimeout(() => {
    addMessage(`I’ve played some ${mood} music for you 🎵`, "bot");
  }, 500);
}
// ================= LOGOUT =================
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("isLoggedIn");
    window.location.href = "login.html";
  });
}

