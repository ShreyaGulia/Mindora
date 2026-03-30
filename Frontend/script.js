const API_BASE = 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('mindoraToken');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

// Load therapists from DB on page load
async function loadTherapists() {
  try {
    const res = await fetch(`${API_BASE}/therapists`);
    const list = await res.json();
    console.log('Therapists from DB:', list);
    // list is now a real array from MongoDB
  } catch (err) {
    console.error('Failed to load therapists:', err);
  }
}

// Auto-save every chat message to backend
async function saveChatMessage(sender, text) {
  if (!getToken()) return;
  try {
    await fetch(`${API_BASE}/chat/save`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ sender, text })
    });
  } catch (err) {
    console.error('Chat save failed:', err);
  }
}

// Auto-save mood when user picks one
async function saveMood(mood, note = '') {
  if (!getToken()) return;
  try {
    await fetch(`${API_BASE}/mood`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ mood, note })
    });
  } catch (err) {
    console.error('Mood save failed:', err);
  }
}
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

  /* =============================================================
   Mindora — AI Chat Patch for script.js  (Phase 4)

   INSTRUCTIONS:
   In your Frontend/script.js, REPLACE the existing
   sendMessage() and getBotReply() functions with this block.
   Keep everything else (music, therapist, etc.) unchanged.
   ============================================================= */

  const AI_API_URL = 'http://localhost:5000/api/ai/chat';

  // In-memory conversation history for context window
  // Keeps last 20 messages so AI remembers the conversation
  const conversationHistory = [];

  // ── Send message — now calls real AI backend ──
  async function sendMessage(overrideText) {
    const text = (overrideText || userInput.value).trim();
    if (!text) return;

    // Add user message to UI
    addMessage(text, 'user');
    conversationHistory.push({ sender: 'user', text });
    userInput.value = '';

    // Show typing indicator
    typingIndicator.style.display = 'flex';
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
      // Call the AI backend
      const token = localStorage.getItem('mindoraToken');

      const res = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include',
        body: JSON.stringify({
          message: text,
          history: conversationHistory.slice(-10).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          }))   // send last 10 for context, converted to API format
        })
      });

      typingIndicator.style.display = 'none';

      if (!res.ok) {
        // Handle rate limiting
        if (res.status === 429) {
          addMessage("You've reached the chat limit for this hour 🌿 Please take a short break and come back soon.", 'bot');
          return;
        }
        throw new Error('API error');
      }

      const data = await res.json();
      const reply = data.reply || data.response || "I'm here for you 🤍";

      // Add bot reply to UI and history
      addMessage(reply, 'bot');
      conversationHistory.push({ sender: 'bot', text: reply });

      // If crisis detected, style the message differently
      if (data.isCrisis) {
        const lastMsg = chatBox.querySelector('.message.bot:last-of-type');
        if (lastMsg) {
          lastMsg.style.background = '#fff3cd';
          lastMsg.style.borderLeft = '3px solid #f59e0b';
          lastMsg.style.color = '#92400e';
        }
      }

      // Suggest music based on message (keep original feature)
      suggestMusicFromChat(text.toLowerCase());

    } catch (err) {
      typingIndicator.style.display = 'none';
      console.error('AI chat error:', err);

      // Fallback to a kind message — never leave user with a broken UI
      addMessage("I'm having a little trouble connecting right now 🌿 Please try again in a moment.", 'bot');
    }
  }

  // ── Mood chip buttons — send preset message ──
  document.querySelectorAll('.mood-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const msg = btn.dataset.msg || btn.textContent.trim();
      sendMessage(msg);
    });
  });

  // ✅ Protect index.html — session check
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const user = JSON.parse(localStorage.getItem("mindoraUser"));
  const expiry = Number(localStorage.getItem("sessionExpiry") || "0");
  const sessionExpired = !expiry || Date.now() > expiry;

  if (!isLoggedIn || !user || sessionExpired) {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("mindoraUser");
    localStorage.removeItem("sessionExpiry");
    window.location.replace("login.html");
    return;
  }

  loadTherapists();
  loadWallet();
  /* ─────────────────────────────────────────────
     SESSION BANNER COUNTDOWN
  ───────────────────────────────────────────── */
  const banner = document.getElementById("sessionBanner");
  const timerEl = document.getElementById("sessionTimer");

  function startSessionCountdown() {
    if (!banner || !timerEl) return;
    banner.style.display = "block";

    const interval = setInterval(() => {
      const exp = Number(localStorage.getItem("sessionExpiry"));
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
      if (minutes < 5) banner.classList.add("danger");
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

  const chatBox = document.getElementById("chatBox");
  const userInput = document.getElementById("userInput");
  const typingIndicator = document.getElementById("typingIndicator");

  function getTime() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

  function addMessage(text, sender) {
    const qr = document.getElementById("quickReplies");
    if (qr) qr.remove();
    const msg = document.createElement("div");
    msg.className = `message ${sender}`;
    msg.innerHTML = `${text.replace(/\n/g, "<br>")}<span class="message-time">${getTime()}</span>`;
    chatBox.insertBefore(msg, typingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;
    saveChatMessage(sender, text);
  }

  if (userInput) {
    userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) sendBtn.addEventListener("click", sendMessage);


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
  const avatarColors = { green: "#52796f", purple: "#6c63ff", blue: "#4a90d9" };
  const avatarInitials = { "Dr. Asha Verma": "AV", "Dr. Rohan Mehta": "RM", "Dr. Neha Sharma": "NS" };

  function getSessions() { return JSON.parse(localStorage.getItem("mindoraSessions") || "[]"); }
  function saveSessions(arr) { localStorage.setItem("mindoraSessions", JSON.stringify(arr)); }

  function renderSessionHistory() {
    const sessions = getSessions();
    const countEl = document.getElementById("sessionsCount");
    const metaEl = document.getElementById("sessionHistoryMeta");
    if (countEl) countEl.textContent = sessions.length;
    if (metaEl) metaEl.textContent =
      sessions.length === 0 ? "No sessions yet" : `${sessions.length} session${sessions.length > 1 ? "s" : ""} booked`;

    const container = document.getElementById("sessionListContainer");
    if (!container) return;

    if (sessions.length === 0) {
      container.innerHTML = `<div class="session-history-empty"><span>🗓️</span>You haven't booked any sessions yet. Request one below!</div>`;
      return;
    }

    const sorted = [...sessions].reverse();
    container.innerHTML = `<div class="session-list">${sorted.map(s => {
      const color = avatarColors[s.color] || "#52796f";
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
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /* ── Booking modal ── */
  let currentStep = 1;
  let selectedSlot = "";
  let currentDoc = { name: "", role: "", color: "green" };

  function openBookingModal(name, role, color) {
    currentDoc = { name, role, color };
    currentStep = 1;
    selectedSlot = "";

    ["fieldName", "fieldAge", "fieldEmail", "fieldPhone", "fieldNote"].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = "";
    });
    const fp = document.getElementById("fieldPrior"); if (fp) fp.value = "";
    const fm = document.getElementById("fieldMode"); if (fm) fm.value = "";
    const fd = document.getElementById("fieldDate"); if (fd) fd.value = "";
    document.querySelectorAll(".concern-chip").forEach(c => c.classList.remove("selected"));
    document.querySelectorAll(".time-slot:not(.unavailable)").forEach(s => s.classList.remove("selected"));

    const saved = JSON.parse(localStorage.getItem("mindoraUser") || "null");
    if (saved) {
      const fn = document.getElementById("fieldName"); if (fn && saved.name) fn.value = saved.name;
      const fe = document.getElementById("fieldEmail"); if (fe && saved.email) fe.value = saved.email;
    }

    const fdDate = document.getElementById("fieldDate");
    if (fdDate) fdDate.min = new Date().toISOString().split("T")[0];

    const docNameEl = document.getElementById("modalDocName");
    const docRoleEl = document.getElementById("modalDocRole");
    const docAvatarEl = document.getElementById("modalDocAvatar");
    if (docNameEl) docNameEl.textContent = name;
    if (docRoleEl) docRoleEl.textContent = role;
    if (docAvatarEl) {
      docAvatarEl.textContent = avatarInitials[name] || name.slice(3, 5);
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
    bookingModal.addEventListener("click", function (e) {
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
      ind.classList.remove("active", "done");
      if (i < currentStep) ind.classList.add("done");
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
      if (!document.getElementById("fieldName").value.trim()) { alert("Please enter your full name."); return false; }
      if (!document.getElementById("fieldAge").value.trim()) { alert("Please enter your age."); return false; }
      const email = document.getElementById("fieldEmail").value.trim();
      if (!email) { alert("Please enter your email."); return false; }
      if (!/\S+@\S+\.\S+/.test(email)) { alert("Please enter a valid email."); return false; }
    }
    if (currentStep === 2) {
      if (!document.getElementById("fieldDate").value) { alert("Please select a date."); return false; }
      if (!document.getElementById("fieldMode").value) { alert("Please select a session type."); return false; }
      if (!selectedSlot) { alert("Please pick a time slot."); return false; }
    }
    return true;
  }

  function buildConfirmBox() {
    const name = document.getElementById("fieldName").value.trim();
    const date = document.getElementById("fieldDate").value;
    const mode = document.getElementById("fieldMode").value;
    const concerns = [...document.querySelectorAll(".concern-chip.selected")].map(c => c.textContent).join(", ") || "Not specified";
    const note = document.getElementById("fieldNote").value.trim();
    const formatted = new Date(date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

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
      const sessions = getSessions();
      const ref = "REF-" + Math.random().toString(36).substr(2, 6).toUpperCase();
      const dateVal = document.getElementById("fieldDate").value;
      const formatted = new Date(dateVal).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      const concerns = [...document.querySelectorAll(".concern-chip.selected")].map(c => c.textContent).join(", ") || "General";

      sessions.push({
        ref,
        docName: currentDoc.name,
        role: currentDoc.role,
        color: currentDoc.color,
        date: formatted,
        time: selectedSlot,
        mode: document.getElementById("fieldMode").value,
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
      const name = btn.dataset.name || btn.closest(".therapist-card")?.querySelector("h3")?.textContent.trim() || "";
      const role = btn.dataset.role || "Mental Health Professional";
      const color = btn.dataset.color || "green";
      openBookingModal(name, role, color);
    });
  });

  // Expose functions needed by inline HTML onclick attributes
  window.openBookingModal = openBookingModal;
  window.closeModal = closeModal;
  window.modalNext = modalNext;
  window.modalBack = modalBack;
  window.toggleChip = toggleChip;
  window.selectSlot = selectSlot;
  window.toggleSessionHistory = toggleSessionHistory;
  window.renderSessionHistory = renderSessionHistory;
  window.filterTherapists = filterTherapists;

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
  const musicCards = document.querySelectorAll(".music-card");

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
    calm: ["anxiety", "panic", "nervous", "stress", "stressed"],
    healing: ["sad", "cry", "lonely", "alone", "low"],
    sleep: ["sleep", "tired", "insomnia", "rest"]
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

// ================= WELLNESS ENGINE =================

let selectedMood = '';
let selectedConcerns = [];

// Step 1: mood selection — single select, auto-advance to step 2
document.querySelectorAll('#moodOptions .wf-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#moodOptions .wf-opt').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMood = btn.dataset.value;

    // auto advance after short delay
    setTimeout(() => {
      document.getElementById('wfStep1').style.display = 'none';
      document.getElementById('wfStep2').style.display = 'block';
    }, 300);
  });
});

// Step 2: concerns — multi select
document.querySelectorAll('#concernOptions .wf-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('selected');
    const val = btn.dataset.value;
    if (selectedConcerns.includes(val)) {
      selectedConcerns = selectedConcerns.filter(c => c !== val);
    } else {
      selectedConcerns.push(val);
    }
  });
});

function goToStep3() {
  document.getElementById('wfStep2').style.display = 'none';
  document.getElementById('wfStep3').style.display = 'block';
}

// Step 3: run assessment — calls backend wellness engine
async function runWellnessAssessment() {
  const language = document.getElementById('wfLanguage').value;
  const budget = document.getElementById('wfBudget').value;
  const token = localStorage.getItem('mindoraToken');

  // show loading state
  document.querySelector('.wf-next-btn').textContent = 'Finding your match...';

  try {
    const res = await fetch(`${API_BASE}/wellness/assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        mood: selectedMood,
        concerns: selectedConcerns,
        language: language,
        budget: budget || undefined
      })
    });

    const data = await res.json();

    // hide form, show results
    document.getElementById('wellnessForm').style.display = 'none';
    document.getElementById('wellnessResults').style.display = 'block';

    // render insights
    const insightsEl = document.getElementById('wellnessInsights');
    insightsEl.innerHTML = data.insights.map(i =>
      `<div class="insight-card">💡 ${i}</div>`
    ).join('');

    // render matched therapist cards (reuse existing card HTML structure)
    const cardsEl = document.getElementById('matchedTherapistCards');
    cardsEl.innerHTML = data.matchedTherapists.map(t => `
      <div class="therapist-card" style="text-align:left;">
        <div class="card-photo">
          <div class="card-photo-initials bg${t.color === 'green' ? '1' : t.color === 'purple' ? '2' : '3'}">
            ${t.name.split(' ').map(w => w[0]).join('').slice(1, 3)}
          </div>
          <div class="availability-dot">Available</div>
        </div>
        <div class="card-info">
          <h3>${t.name}</h3>
          <div class="card-role">${t.role}</div>
          <div class="card-meta">
            <div class="card-meta-row"><span>💼</span> ${t.experience}</div>
            <div class="card-meta-row"><span>🗣️</span> ${t.languages.join(', ')}</div>
            <div class="card-meta-row"><span>💰</span> ₹${t.sessionFee} per session</div>
          </div>
          <div class="card-tags">
            ${t.tags.slice(0, 3).map(tag => `<span class="card-tag">${tag}</span>`).join('')}
          </div>
        </div>
        <div class="card-footer-row">
          <div class="card-rating-small">★ ${t.rating} <span>· ${t.reviewCount} reviews</span></div>
          <button class="request-btn" onclick="openBookingModal('${t.name}', '${t.role}', '${t.color}')">
            Book ₹${t.sessionFee}
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Wellness assessment failed:', err);
    alert('Could not connect to server. Make sure backend is running.');
    document.querySelector('.wf-next-btn').textContent = 'Find My Match 🔍';
  }
}

function resetWellnessForm() {
  selectedMood = '';
  selectedConcerns = [];

  document.querySelectorAll('.wf-opt').forEach(b => b.classList.remove('selected'));
  document.getElementById('wfStep1').style.display = 'block';
  document.getElementById('wfStep2').style.display = 'none';
  document.getElementById('wfStep3').style.display = 'none';
  document.getElementById('wellnessForm').style.display = 'block';
  document.getElementById('wellnessResults').style.display = 'none';
  document.querySelector('.wf-next-btn') && (document.querySelector('.wf-next-btn').textContent = 'Find My Match 🔍');
}

// ================= LIVE SESSION (SOCKET.IO) =================

let socket = null;
let activeSession = null;
let sessionSeconds = 0;
let timerInterval = null;

// Load Socket.io client — add this script tag to index.html:
// <script src="http://localhost:5000/socket.io/socket.io.js"></script>
// Then call startLiveSession() when user starts a booked session

function startLiveSession(sessionRef, therapistName) {
  activeSession = sessionRef;

  // Show live session section, hide others
  document.getElementById('liveSession').style.display = 'block';
  document.getElementById('sessionTherapistName').textContent = therapistName;
  document.getElementById('liveSession').scrollIntoView({ behavior: 'smooth' });

  // Connect to Socket.io server
  socket = io('http://localhost:5000');

  socket.on('connect', () => {
    socket.emit('join_session', sessionRef);
    addSessionMessage('System', 'You are connected. Session has started.');
  });

  socket.on('receive_message', ({ sender, text, time }) => {
    addSessionMessage(sender, text);
  });

  socket.on('session_ended', () => {
    clearInterval(timerInterval);
    addSessionMessage('System', 'Session ended. Thank you.');
  });

  // Start session timer
  sessionSeconds = 0;
  timerInterval = setInterval(() => {
    sessionSeconds++;
    const m = String(Math.floor(sessionSeconds / 60)).padStart(2, '0');
    const s = String(sessionSeconds % 60).padStart(2, '0');
    document.getElementById('sessionTimer').textContent = `${m}:${s}`;
  }, 1000);
}

function sendSessionMessage() {
  const input = document.getElementById('sessionInput');
  const text = input.value.trim();
  if (!text || !socket) return;

  const userData = JSON.parse(localStorage.getItem('mindoraUser') || '{}');
  const sender = userData.name || 'User';

  // Show immediately on sender's screen
  addSessionMessage(sender, text);

  // Emit to room
  socket.emit('send_message', {
    sessionRef: activeSession,
    sender,
    text,
    time: new Date().toISOString()
  });

  input.value = '';
}

function addSessionMessage(sender, text) {
  const box = document.getElementById('sessionChatBox');
  const div = document.createElement('div');
  const isSystem = sender === 'System';
  const userData = JSON.parse(localStorage.getItem('mindoraUser') || '{}');
  const isMe = sender === userData.name;

  div.className = `message ${isMe ? 'user' : isSystem ? 'system-msg' : 'bot'}`;
  div.innerHTML = `
    ${!isSystem ? `<strong style="font-size:11px;display:block;margin-bottom:2px;">${sender}</strong>` : ''}
    ${text}
    <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
  `;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function endSession() {
  if (socket && activeSession) {
    socket.emit('session_ended', activeSession);
  }
  clearInterval(timerInterval);
  document.getElementById('liveSession').style.display = 'none';
  socket && socket.disconnect();
  socket = null;
  activeSession = null;
}
// ================= WALLET =================

async function loadWallet() {
  const token = localStorage.getItem('mindoraToken');
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/wallet`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const wallet = await res.json();
    document.getElementById('walletBadge').textContent = `💰 ₹${wallet.balance}`;
  } catch (err) {
    console.error('Could not load wallet:', err);
  }
}

// Call loadWallet inside DOMContentLoaded alongside loadTherapists()