/* =======================================================
   MINDORA — script.js
   Original code preserved + Chat & Therapist enhanced
   ======================================================= */

// ================= AUTH GUARD =================
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
  document.getElementById("welcomeUser").innerText = `Hi, ${userData.name} 👋`;
}


document.addEventListener("DOMContentLoaded", () => {

  // ✅ Protect index.html — session check
  const isLoggedIn    = localStorage.getItem("isLoggedIn") === "true";
  const user          = JSON.parse(localStorage.getItem("mindoraUser"));
  const expiry        = Number(localStorage.getItem("sessionExpiry") || "0");
  const sessionExpired = !expiry || Date.now() > expiry;

  if (!isLoggedIn || !user || sessionExpired) {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("mindoraUser");
    localStorage.removeItem("sessionExpiry");
    window.location.replace("login.html");
    return;
  }


  /* ─────────────────────────────────────────────
     SESSION BANNER COUNTDOWN
  ───────────────────────────────────────────── */
  const banner  = document.getElementById("sessionBanner");
  const timerEl = document.getElementById("sessionTimer");

  function startSessionCountdown() {
    if (!banner || !timerEl) return;
    banner.style.display = "block";

    const interval = setInterval(() => {
      const exp       = Number(localStorage.getItem("sessionExpiry"));
      const remaining = exp - Date.now();

      if (!exp || remaining <= 0) {
        banner.style.display = "none";
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      timerEl.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

      banner.classList.remove("warning", "danger");
      if (minutes < 5)  banner.classList.add("danger");
      else if (minutes < 10) banner.classList.add("warning");

    }, 1000);
  }

  startSessionCountdown();


  /* ─────────────────────────────────────────────
     LOGOUT BUTTON
  ───────────────────────────────────────────── */
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("mindoraUser");
      localStorage.removeItem("sessionExpiry");
      window.location.href = "login.html";
    });
  }


  /* ═══════════════════════════════════════════
     ██  CHATBOT  ██
  ═══════════════════════════════════════════ */

  const chatBox         = document.getElementById("chatBox");
  const userInput       = document.getElementById("userInput");
  const typingIndicator = document.getElementById("typingIndicator");

  const botResponses = [
    { keywords:["stress","stressed","pressure","tension"],         response:"It sounds like you're carrying a lot right now 💙 Want to tell me what's making things feel so heavy?" },
    { keywords:["sad","unhappy","cry","low","down","depressed"],   response:"I'm really sorry you're feeling this way. It's okay not to be okay sometimes. I'm right here with you 🤍" },
    { keywords:["overthink","overthinking","can't stop thinking"], response:"Overthinking can make even small things feel huge. Let's slow down together — one breath at a time 🌿" },
    { keywords:["anxiety","panic","nervous","anxious"],            response:"Anxiety can feel overwhelming, but it will pass. Try breathing in for 4 counts, hold 4, out 4. You've got this 💚" },
    { keywords:["sleep","insomnia","tired","exhausted"],           response:"Sleep troubles are tough — they affect everything else. Have you tried any wind-down routines before bed? 🌙" },
    { keywords:["burnout","overwhelm","overloaded"],               response:"It sounds like you've been pushing yourself really hard. Rest isn't laziness — it's necessary 🌿" },
    { keywords:["lonely","alone","isolated"],                      response:"Feeling alone can hurt deeply. But you're not invisible here — I'm listening to every word 🤍" },
    { keywords:["therapist","doctor","book","session"],            response:"That's a wonderful step 💙 Scroll down to meet our therapists — Dr. Asha, Dr. Rohan, and Dr. Neha are all available." },
    { keywords:["breath","breathing","exercise","calm"],           response:"Let's do a quick breathing exercise 🌬️\n\nBreathe IN… 1, 2, 3, 4\nHold… 1, 2, 3, 4\nBreathe OUT… 1, 2, 3, 4\n\nRepeat 3 times. You're doing great 💚" },
    { keywords:["happy","good","great","better","fine"],           response:"That's lovely to hear 🌟 What's been making life feel a little lighter today?" }
  ];
  const emergencyKeywords = ["suicide","kill myself","end my life","want to die","hurt myself","self harm"];
  const defaultReplies = [
    "Thank you for sharing that with me 🤍 Can you tell me a little more?",
    "I hear you. Sometimes just saying it out loud helps. What else is on your mind?",
    "You're not alone in this. I'm with you 🌿 Tell me more."
  ];

  function getTime() { return new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}); }

  function addMessage(text, sender) {
    const qr = document.getElementById("quickReplies");
    if (qr) qr.remove();
    const msg = document.createElement("div");
    msg.className = `message ${sender}`;
    msg.innerHTML = `${text.replace(/\n/g,"<br>")}<span class="message-time">${getTime()}</span>`;
    chatBox.insertBefore(msg, typingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function getBotReply(text) {
    const m = text.toLowerCase();
    for (const w of emergencyKeywords) {
      if (m.includes(w)) return "You matter more than you know 💙 Please reach out to someone you trust or call iCall: 9152987821. You are not alone.";
    }
    for (const item of botResponses) {
      if (item.keywords.some(k => m.includes(k))) return item.response;
    }
    return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
  }

  function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    addMessage(text, "user");
    userInput.value = "";
    typingIndicator.style.display = "flex";
    chatBox.scrollTop = chatBox.scrollHeight;
    setTimeout(() => {
      typingIndicator.style.display = "none";
      addMessage(getBotReply(text), "bot");
      suggestMusicFromChat(text.toLowerCase());
    }, 900 + Math.random() * 600);
  }

  function sendQuick(btn) { userInput.value = btn.textContent.trim(); sendMessage(); }
  function fillInput(btn) { userInput.value = btn.textContent.trim(); userInput.focus(); }
  function setMood(btn, mood) {
    document.querySelectorAll(".mood-pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    userInput.value = mood;
    sendMessage();
  }

  if (userInput) {
    userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) sendBtn.addEventListener("click", sendMessage);

  document.querySelectorAll(".mood-chip-btn").forEach(btn => {
    btn.addEventListener("click", () => sendMessage(btn.dataset.msg || btn.textContent.trim()));
  });


  /* ═══════════════════════════════════════════
     ██  THERAPIST SECTION  ██
  ═══════════════════════════════════════════ */

  /* ── Filter buttons ── */
  function filterTherapists(btn, tag) {
    document.querySelectorAll(".t-filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".therapist-card").forEach(card => {
      const tags = card.dataset.tags || "";
      card.style.display = (tag === "all" || tags.includes(tag)) ? "" : "none";
    });
  }

  document.querySelectorAll(".t-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => filterTherapists(btn, btn.dataset.filter || "all"));
  });

  /* ── Session history helpers ── */
  const avatarColors   = { green:"#52796f", purple:"#6c63ff", blue:"#4a90d9" };
  const avatarInitials = { "Dr. Asha Verma":"AV", "Dr. Rohan Mehta":"RM", "Dr. Neha Sharma":"NS" };

  function getSessions()     { return JSON.parse(localStorage.getItem("mindoraSessions") || "[]"); }
  function saveSessions(arr) { localStorage.setItem("mindoraSessions", JSON.stringify(arr)); }

  function renderSessionHistory() {
    const sessions = getSessions();
    const countEl  = document.getElementById("sessionsCount");
    const metaEl   = document.getElementById("sessionHistoryMeta");
    if (countEl) countEl.textContent = sessions.length;
    if (metaEl)  metaEl.textContent  =
      sessions.length === 0 ? "No sessions yet" : `${sessions.length} session${sessions.length > 1 ? "s" : ""} booked`;

    const container = document.getElementById("sessionListContainer");
    if (!container) return;

    if (sessions.length === 0) {
      container.innerHTML = `<div class="session-history-empty"><span>🗓️</span>You haven't booked any sessions yet. Request one below!</div>`;
      return;
    }

    const sorted = [...sessions].reverse();
    container.innerHTML = `<div class="session-list">${sorted.map(s => {
      const color    = avatarColors[s.color] || "#52796f";
      const initials = avatarInitials[s.docName] || "?";
      return `
      <div class="session-item">
        <div class="session-avatar" style="background:${color};">${initials}</div>
        <div class="session-info">
          <h5>${s.docName}</h5>
          <p>${s.role} · ${s.mode}</p>
          <p style="margin-top:2px;color:#9ca3af;font-size:11.5px;">${s.concerns}</p>
        </div>
        <div class="session-meta">
          <div class="session-status confirmed">Confirmed</div>
          <div class="session-date">${s.date} · ${s.time}</div>
          <div class="session-date" style="margin-top:2px;font-size:11px;">${s.ref}</div>
        </div>
      </div>`;
    }).join("")}</div>`;
  }

  function toggleSessionHistory() {
    const panel = document.getElementById("sessionHistory");
    if (!panel) return;
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) {
      renderSessionHistory();
      panel.scrollIntoView({ behavior:"smooth", block:"nearest" });
    }
  }

  /* ── Booking modal ── */
  let currentStep  = 1;
  let selectedSlot = "";
  let currentDoc   = { name:"", role:"", color:"green" };

  function openBookingModal(name, role, color) {
    currentDoc  = { name, role, color };
    currentStep = 1;
    selectedSlot = "";

    ["fieldName","fieldAge","fieldEmail","fieldPhone","fieldNote"].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = "";
    });
    const fp = document.getElementById("fieldPrior"); if (fp) fp.value = "";
    const fm = document.getElementById("fieldMode");  if (fm) fm.value = "";
    const fd = document.getElementById("fieldDate");  if (fd) fd.value = "";
    document.querySelectorAll(".concern-chip").forEach(c => c.classList.remove("selected"));
    document.querySelectorAll(".time-slot:not(.unavailable)").forEach(s => s.classList.remove("selected"));

    const saved = JSON.parse(localStorage.getItem("mindoraUser") || "null");
    if (saved) {
      const fn = document.getElementById("fieldName");  if (fn && saved.name)  fn.value  = saved.name;
      const fe = document.getElementById("fieldEmail"); if (fe && saved.email) fe.value = saved.email;
    }

    const fdDate = document.getElementById("fieldDate");
    if (fdDate) fdDate.min = new Date().toISOString().split("T")[0];

    const docNameEl   = document.getElementById("modalDocName");
    const docRoleEl   = document.getElementById("modalDocRole");
    const docAvatarEl = document.getElementById("modalDocAvatar");
    if (docNameEl)   docNameEl.textContent   = name;
    if (docRoleEl)   docRoleEl.textContent   = role;
    if (docAvatarEl) {
      docAvatarEl.textContent      = avatarInitials[name] || name.slice(3,5);
      docAvatarEl.style.background = avatarColors[color] || "#52796f";
    }

    updateModalUI();
    const modal = document.getElementById("bookingModal");
    if (modal) modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    const modal = document.getElementById("bookingModal");
    if (modal) modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  const bookingModal = document.getElementById("bookingModal");
  if (bookingModal) {
    bookingModal.addEventListener("click", function(e) {
      if (e.target === this) closeModal();
    });
  }

  function updateModalUI() {
    for (let i = 1; i <= 4; i++) {
      const p = document.getElementById("step" + i);
      if (p) p.classList.toggle("active", i === currentStep);
    }
    for (let i = 1; i <= 3; i++) {
      const ind = document.getElementById("step-ind-" + i);
      if (!ind) continue;
      ind.classList.remove("active","done");
      if (i < currentStep)       ind.classList.add("done");
      else if (i === currentStep) ind.classList.add("active");
    }

    const footer = document.getElementById("modalFooter");
    if (currentStep === 4) {
      if (footer) footer.innerHTML = `<button class="btn-done" onclick="closeModal(); setTimeout(()=>{ if(document.getElementById('sessionHistory').classList.contains('open')) renderSessionHistory(); }, 100)">View My Sessions →</button>`;
      return;
    }

    const btnBack = document.getElementById("btnBack");
    const btnNext = document.getElementById("btnNext");
    if (btnBack) btnBack.style.visibility = currentStep > 1 ? "visible" : "hidden";
    if (btnNext) btnNext.textContent = currentStep === 3 ? "Confirm Booking ✓" : "Next →";
  }

  function toggleChip(btn) { btn.classList.toggle("selected"); }

  function selectSlot(btn) {
    document.querySelectorAll(".time-slot:not(.unavailable)").forEach(s => s.classList.remove("selected"));
    btn.classList.add("selected");
    selectedSlot = btn.textContent.trim();
  }

  function validateStep() {
    if (currentStep === 1) {
      if (!document.getElementById("fieldName").value.trim())  { alert("Please enter your full name."); return false; }
      if (!document.getElementById("fieldAge").value.trim())   { alert("Please enter your age."); return false; }
      const email = document.getElementById("fieldEmail").value.trim();
      if (!email)                                               { alert("Please enter your email."); return false; }
      if (!/\S+@\S+\.\S+/.test(email))                         { alert("Please enter a valid email."); return false; }
    }
    if (currentStep === 2) {
      if (!document.getElementById("fieldDate").value)  { alert("Please select a date."); return false; }
      if (!document.getElementById("fieldMode").value)  { alert("Please select a session type."); return false; }
      if (!selectedSlot)                                 { alert("Please pick a time slot."); return false; }
    }
    return true;
  }

  function buildConfirmBox() {
    const name     = document.getElementById("fieldName").value.trim();
    const date     = document.getElementById("fieldDate").value;
    const mode     = document.getElementById("fieldMode").value;
    const concerns = [...document.querySelectorAll(".concern-chip.selected")].map(c => c.textContent).join(", ") || "Not specified";
    const note     = document.getElementById("fieldNote").value.trim();
    const formatted = new Date(date).toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"});

    const confirmBox = document.getElementById("confirmBox");
    if (confirmBox) confirmBox.innerHTML = `
      <div class="confirm-row"><span>Patient</span><span>${name}</span></div>
      <div class="confirm-row"><span>Therapist</span><span>${currentDoc.name}</span></div>
      <div class="confirm-row"><span>Date</span><span>${formatted}</span></div>
      <div class="confirm-row"><span>Time</span><span>${selectedSlot}</span></div>
      <div class="confirm-row"><span>Session type</span><span>${mode}</span></div>
      <div class="confirm-row"><span>Concerns</span><span>${concerns}</span></div>
      ${note ? `<div class="confirm-row"><span>Note</span><span style="font-style:italic;">"${note}"</span></div>` : ""}
    `;
  }

  function modalNext() {
    if (!validateStep()) return;
    if (currentStep === 2) buildConfirmBox();

    if (currentStep === 3) {
      const sessions  = getSessions();
      const ref       = "REF-" + Math.random().toString(36).substr(2,6).toUpperCase();
      const dateVal   = document.getElementById("fieldDate").value;
      const formatted = new Date(dateVal).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
      const concerns  = [...document.querySelectorAll(".concern-chip.selected")].map(c => c.textContent).join(", ") || "General";

      sessions.push({
        ref,
        docName:  currentDoc.name,
        role:     currentDoc.role,
        color:    currentDoc.color,
        date:     formatted,
        time:     selectedSlot,
        mode:     document.getElementById("fieldMode").value,
        concerns,
        bookedOn: new Date().toLocaleDateString("en-IN")
      });
      saveSessions(sessions);
      renderSessionHistory();

      const sdn = document.getElementById("successDocName");
      const brf = document.getElementById("bookingRef");
      if (sdn) sdn.textContent = currentDoc.name;
      if (brf) brf.textContent = ref;
      currentStep = 4;
      updateModalUI();
      return;
    }

    currentStep++;
    updateModalUI();
  }

  function modalBack() {
    if (currentStep > 1) { currentStep--; updateModalUI(); }
  }

  // ── Book session button on therapist cards ──
  document.querySelectorAll(".request-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const name  = btn.dataset.name  || btn.closest(".therapist-card")?.querySelector("h3")?.textContent.trim() || "";
      const role  = btn.dataset.role  || "Mental Health Professional";
      const color = btn.dataset.color || "green";
      openBookingModal(name, role, color);
    });
  });

  // Expose functions needed by inline HTML onclick attributes
  window.openBookingModal     = openBookingModal;
  window.closeModal           = closeModal;
  window.modalNext            = modalNext;
  window.modalBack            = modalBack;
  window.toggleChip           = toggleChip;
  window.selectSlot           = selectSlot;
  window.toggleSessionHistory = toggleSessionHistory;
  window.renderSessionHistory = renderSessionHistory;
  window.sendQuick            = sendQuick;
  window.fillInput            = fillInput;
  window.setMood              = setMood;
  window.filterTherapists     = filterTherapists;

  // Init session history on load
  renderSessionHistory();


  /* ═══════════════════════════════════════════
     ██  MUSIC SECTION  ██  (original kept)
  ═══════════════════════════════════════════ */

  const audios = document.querySelectorAll(".music-card audio");
  let currentAudio = null;
  let fadeInterval = null;

  function fadeIn(audio) {
    clearInterval(fadeInterval);
    audio.volume = 0;
    fadeInterval = setInterval(() => {
      if (audio.volume < 0.95) audio.volume += 0.05;
      else clearInterval(fadeInterval);
    }, 150);
  }

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

  audios.forEach((audio) => {
    audio.loop = true;

    audio.addEventListener("play", () => {
      if (currentAudio && currentAudio !== audio) fadeOut(currentAudio);
      currentAudio = audio;
      fadeIn(audio);

      document.querySelectorAll(".music-card").forEach(c => c.classList.remove("active"));
      audio.closest(".music-card").classList.add("active");
    });

    audio.addEventListener("pause", () => {
      audio.closest(".music-card").classList.remove("active");
    });

    audio.addEventListener("ended", () => {
      audio.closest(".music-card").classList.remove("active");
    });
  });


  /* ═══════════════════════════════════════════
     ██  MOOD FILTER (Music section)  ██  (original kept)
  ═══════════════════════════════════════════ */

  const moodButtons = document.querySelectorAll(".mood-btn");
  const musicCards  = document.querySelectorAll(".music-card");

  moodButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      moodButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const mood = btn.dataset.filter;

      musicCards.forEach((card) => {
        if (mood === "all" || card.dataset.mood === mood) {
          card.style.display = "block";
        } else {
          const audio = card.querySelector("audio");
          audio.pause();
          audio.currentTime = 0;
          card.classList.remove("active");
          card.style.display = "none";
        }
      });
    });
  });


  /* ═══════════════════════════════════════════
     ██  CHATBOT → MUSIC LINK  ██  (original kept)
  ═══════════════════════════════════════════ */

  const moodMap = {
    calm:    ["anxiety", "panic", "nervous", "stress", "stressed"],
    healing: ["sad", "cry", "lonely", "alone", "low"],
    sleep:   ["sleep", "tired", "insomnia", "rest"]
  };

  function suggestMusicFromChat(message) {
    for (const mood in moodMap) {
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

    document.querySelectorAll(".music-card audio").forEach(a => {
      a.pause();
      a.currentTime = 0;
    });

    audio.play();
    card.classList.add("active");

    setTimeout(() => {
      addMessage(`I've played some ${mood} music for you 🎵`, "bot");
    }, 500);
  }

}); // end DOMContentLoaded