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

// ================= LOAD REAL THERAPISTS FROM DB =================

// Colors cycle through for the initials avatar background
const cardColors = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5'];

// Build initials from name — "Dr. Asha Verma" → "AV"
function getInitials(name) {
  return name
    .split(' ')
    .filter(w => !w.includes('.'))   // skip "Dr."
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

async function loadTherapists() {
  const cardsContainer = document.getElementById('therapistCards');
  const emptyState = document.getElementById('therapistEmpty');
  const filterRow = document.getElementById('therapistFilters');
  const loadingEl = document.getElementById('therapistLoading');

  try {
    const res = await fetch(`${API_BASE}/therapists`);
    const list = await res.json();

    // Hide loading spinner
    if (loadingEl) loadingEl.style.display = 'none';

    if (!Array.isArray(list) || list.length === 0) {
      // No verified therapists yet — show empty state
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    // Show filter buttons only when there are therapists
    if (filterRow) filterRow.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';

    // Store globally so filter can work on them
    window._therapistList = list;

    renderTherapistCards(list);

  } catch (err) {
    console.error('Failed to load therapists:', err);
    if (loadingEl) loadingEl.innerHTML = '<p style="color:#e74c3c;">Could not load therapists. Is the backend running?</p>';
  }
}

function renderTherapistCards(list) {
  const container = document.getElementById('therapistCards');
  const loadingEl = document.getElementById('therapistLoading');

  // Remove loading if still there
  if (loadingEl) loadingEl.style.display = 'none';

  if (list.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#9ca3af;font-size:14px;">
        No therapists match this filter.
      </div>`;
    return;
  }

  container.innerHTML = list.map((t, i) => {
    const initials = getInitials(t.name);
    const colorClass = cardColors[i % cardColors.length];

    // Build tags from specialization field if tags array is empty
    const tags = (t.tags && t.tags.length > 0)
      ? t.tags
      : (t.specialization ? t.specialization.split(',').map(s => s.trim()) : []);

    const languages = (t.languages && t.languages.length > 0)
      ? t.languages.join(', ')
      : 'English';

    const fee = t.sessionFee || 299;
    const experience = t.experience || 'Experienced';
    const mode = t.mode || 'Online';
    const role = t.specialization || t.role || 'Therapist';

    return `
      <div class="therapist-card" data-tags="${tags.join(' ').toLowerCase()}">

        <div class="card-photo">
          <div class="card-photo-initials ${colorClass}">${initials}</div>
          <div class="card-verified-badge">✓ Verified</div>
        </div>

        <div class="card-info">
          <h3>${t.name}</h3>
          <div class="card-role">${role}</div>

          <div class="card-meta">
            <div class="card-meta-row">
              <span>💼</span> ${experience}
            </div>
            <div class="card-meta-row">
              <span>🖥️</span> ${mode}
            </div>
            <div class="card-meta-row">
              <span>🗣️</span> ${languages}
            </div>
            ${t.institution ? `
            <div class="card-meta-row">
              <span>🎓</span> ${t.institution}
            </div>` : ''}
          </div>

          ${tags.length > 0 ? `
          <div class="card-tags">
            ${tags.slice(0, 4).map(tag => `<span class="card-tag">${tag}</span>`).join('')}
          </div>` : ''}
        </div>

        <div class="card-footer-row">
          <div class="card-fee">₹${fee} <span>/ session</span></div>
          <button class="request-btn"
            onclick="openBookingModal('${t.name}', '${role}', '${t._id}')">
            Book Session
          </button>
        </div>

      </div>
    `;
  }).join('');
}

// Filter cards by tag keyword
function filterTherapists(btn, tag) {
  document.querySelectorAll('.t-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  if (!window._therapistList) return;

  if (tag === 'all') {
    renderTherapistCards(window._therapistList);
    return;
  }

  const filtered = window._therapistList.filter(t => {
    const tags = (t.tags || []).join(' ').toLowerCase();
    const spec = (t.specialization || '').toLowerCase();
    return tags.includes(tag) || spec.includes(tag);
  });

  renderTherapistCards(filtered);
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

    const token = localStorage.getItem('mindoraToken');
    if (token) {
      // The saving and rate-limiting is handled by the AI endpoint itself (/api/ai/chat)
    }
    setTimeout(() => {
      typingIndicator.style.display = 'none';
      addMessage(getBotReply(text), 'bot');
      suggestMusicFromChat(text.toLowerCase());
    }, 900 + Math.random() * 600);

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

  setupNavbar();
  loadTherapists();
  loadWallet();


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
    // saveChatMessage(sender, text); - Removed as it's redundant/broken
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

  async function renderSessionHistory() {
    const container = document.getElementById("sessionListContainer");
    const metaEl = document.getElementById("sessionHistoryMeta");
    if (!container) return;

    container.innerHTML = `<div class="session-history-empty"><span>⏳</span> Loading sessions...</div>`;

    try {
      const token = localStorage.getItem('mindoraToken');
      if (!token) {
        container.innerHTML = `<div class="session-history-empty"><span>🔒</span> Please log in to see sessions.</div>`;
        return;
      }

      const res = await fetch(`${API_BASE}/sessions/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      let sessions = data?.data?.sessions || [];
      sessions = sessions.filter(s => s.status !== 'pending' && s.paymentStatus === 'paid');

      if (metaEl) metaEl.textContent = sessions.length === 0
        ? "No sessions yet"
        : `${sessions.length} session${sessions.length > 1 ? 's' : ''} booked`;

      if (sessions.length === 0) {
        container.innerHTML = `<div class="session-history-empty"><span>🗓️</span> You haven't booked any sessions yet.</div>`;
        return;
      }

      container.innerHTML = `<div class="session-list">${sessions.map(s => {
        const therapist = s.therapistId;
        const name = therapist?.fullName || 'Therapist';
        const initials = name.split(' ').filter(w => !w.includes('.')).map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const date = new Date(s.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const time = new Date(s.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const statusClass = s.status === 'confirmed' ? 'confirmed' : s.status === 'cancelled' ? 'cancelled' : 'pending';
        return `
        <div class="session-item">
          <div class="session-avatar" style="background:#52796f;">${initials}</div>
          <div class="session-info">
            <h5>${name}</h5>
            <p>${s.sessionType} Session • ₹${s.sessionFee}</p>
          </div>
          <div class="session-meta">
            <div class="session-status ${statusClass}">${s.status}</div>
            <div class="session-date">${date} · ${time}</div>
          </div>
        </div>`;
      }).join('')}</div>`;

    } catch (err) {
      console.error('Failed to load sessions:', err);
      container.innerHTML = `<div class="session-history-empty"><span>⚠️</span> Could not load sessions.</div>`;
    }
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

  function openBookingModal(name, role, therapistId) {
    // Redirect to the full book-session page (calendar + Stripe payment)
    if (therapistId) {
      window.location.href = `book-session.html?therapistId=${therapistId}`;
    } else {
      alert('Could not find therapist details. Please try from Browse Therapists.');
    }
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

  async function modalNext() {
    if (!validateStep()) return;
    if (currentStep === 2) buildConfirmBox();

    if (currentStep === 3) {
      const token = localStorage.getItem('mindoraToken');

      const concerns = [...document.querySelectorAll('.concern-chip.selected')]
        .map(c => c.textContent).join(', ') || 'General';

      const typeMap = {
        'Video call (Zoom / Google Meet)': 'Video',
        'Phone call': 'Audio',
        'Chat / Text session': 'Chat'
      };

      const convertTo24Hour = (timeStr) => {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
        return `${String(hours).padStart(2, '0')}:${minutes}`;
      };

      const bookingData = {
        therapistId: currentDoc.therapistId,
        date: document.getElementById('fieldDate').value,
        time: convertTo24Hour(selectedSlot),
        sessionType: typeMap[document.getElementById('fieldMode').value] || document.getElementById('fieldMode').value,
        concerns,
        note: document.getElementById('fieldNote')?.value || ''
      };

      try {
        const res = await fetch(`${API_BASE}/sessions/book`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(bookingData)
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.code === 'UPGRADE_REQUIRED') {
            closeModal();
            const go = confirm(
              '⭐ Booking sessions requires the Pro plan.\n\n' +
              'Pro includes:\n' +
              '• Unlimited therapist bookings\n' +
              '• Unlimited AI messages\n' +
              '• Full history & wallet\n\n' +
              'Go to pricing page?'
            );
            if (go) window.location.href = 'pricing.html';
          } else {
            alert(data.message || 'Booking failed. Please try again.');
          }
          return;
        }
        // Show success screen
        const successName = document.getElementById('successDocName');
        const bookingRef = document.getElementById('bookingRef');
        if (successName) successName.textContent = currentDoc.name;
        if (bookingRef) bookingRef.textContent = data.data?.sessionId || 'Confirmed';

        currentStep = 4;
        updateModalUI();

      } catch (err) {
        alert('Could not connect to server. Make sure backend is running.');
        console.error(err);
      }

      return;  // important — stop here
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
      const tid = btn.dataset.id || btn.closest(".therapist-card")?.dataset.id || "";
      openBookingModal(name, role, tid);
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
          <button class="request-btn" onclick="openBookingModal('${t.name}', '${t.specialization || t.role || 'Therapist'}', '${t._id}')">
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
    if (!res.ok) return; // No wallet for this user yet — silently skip
    const data = await res.json();
    const bal = data?.data?.balance ?? data?.balance ?? 0;
    const walletBadge = document.getElementById('walletBadge');
    if (walletBadge) walletBadge.innerHTML = `💰 <span id="walletAmount">₹${bal}</span>`;
  } catch (err) {
    console.error('Could not load wallet:', err);
  }
}

// Call loadWallet inside DOMContentLoaded alongside loadTherapists()
// ================= NAVBAR PROFILE SETUP =================

function setupNavbar() {
  const userData = JSON.parse(localStorage.getItem('mindoraUser') || '{}');
  const initial = (userData.name || 'U')[0].toUpperCase();
  const name = userData.name || 'User';
  const email = userData.email || '';

  // Set initials and name in navbar
  if (document.getElementById('profileAvatar')) document.getElementById('profileAvatar').textContent = initial;
  if (document.getElementById('profileName')) document.getElementById('profileName').textContent = name;
  if (document.getElementById('pdAvatar')) document.getElementById('pdAvatar').textContent = initial;
  if (document.getElementById('pdName')) document.getElementById('pdName').textContent = name;
  if (document.getElementById('pdEmail')) document.getElementById('pdEmail').textContent = email;
  if (document.getElementById('welcomeUser')) document.getElementById('welcomeUser').textContent = `Hi, ${name} 👋`;
}

// Toggle dropdown
function toggleProfileMenu() {
  const dropdown = document.getElementById('profileDropdown');
  const btn = document.getElementById('profileBtn');
  dropdown.classList.toggle('open');
  btn.classList.toggle('open');

  // Close when clicking outside
  if (dropdown.classList.contains('open')) {
    setTimeout(() => {
      document.addEventListener('click', closeProfileMenuOutside);
    }, 10);
  }
}

function closeProfileMenuOutside(e) {
  const wrap = document.querySelector('.profile-btn-wrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('profileDropdown').classList.remove('open');
    document.getElementById('profileBtn').classList.remove('open');
    document.removeEventListener('click', closeProfileMenuOutside);
  }
}

// ================= PROFILE PANEL =================

const moodEmojis = { awful: '😞', low: '😔', okay: '😐', good: '🙂', great: '😊' };

function openProfilePanel(tab) {
  // Close dropdown
  document.getElementById('profileDropdown').classList.remove('open');
  document.getElementById('profileBtn').classList.remove('open');

  // Open panel
  document.getElementById('profileOverlay').classList.add('open');
  document.getElementById('profilePanel').classList.add('open');

  if (tab === 'wallet') loadWalletPanel();
  if (tab === 'sessions') loadSessionsPanel();

  if (tab === 'billing') loadBillingPanel();
}

function closeProfilePanel() {
  document.getElementById('profileOverlay').classList.remove('open');
  document.getElementById('profilePanel').classList.remove('open');
}

// ── Wallet Panel ──
async function loadWalletPanel() {
  document.getElementById('ppTitle').textContent = '💰 Wallet';
  document.getElementById('ppBody').innerHTML = '<p style="color:#9ca3af;font-size:13px;">Loading...</p>';

  const token = localStorage.getItem('mindoraToken');
  if (!token) { document.getElementById('ppBody').innerHTML = '<p>Please log in.</p>'; return; }

  try {
    const res = await fetch(`${API_BASE}/wallet`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    const balance = data?.data?.balance ?? data?.balance ?? 0;
    const txns = data?.data?.transactions || data?.transactions || [];

    document.getElementById('ppBody').innerHTML = `
      <div class="wallet-balance-card">
        <div class="wallet-balance-label">Available Balance</div>
        <div class="wallet-balance-amount">₹${balance}</div>
      </div>

      <div class="topup-row">
        <input type="number" class="topup-input" id="topupAmount" placeholder="Enter amount (₹)" min="50"/>
        <button class="topup-btn" onclick="addWalletFunds()">Add Money</button>
      </div>
      <p id="topupMsg" style="font-size:13px;color:#52796f;margin-bottom:16px;"></p>

      <div class="txn-title">Transaction History</div>
      ${txns.length === 0
        ? '<p style="color:#9ca3af;font-size:13px;">No transactions yet.</p>'
        : txns.slice().reverse().map(t => `
          <div class="txn-item">
            <div>
              <div class="txn-desc">${t.description}</div>
              <div class="txn-date">${new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
            <div class="txn-amount ${t.type === 'credit' ? 'txn-credit' : 'txn-debit'}">
              ${t.type === 'credit' ? '+' : '−'}₹${t.amount}
            </div>
          </div>`).join('')
      }
    `;
  } catch (err) {
    document.getElementById('ppBody').innerHTML = '<p style="color:#e74c3c;">Could not load wallet. Is backend running?</p>';
  }
}

function addWalletFunds() {
  // ── Wallet top-up using Stripe ──
  // Opens the pricing page's payment modal adapted for wallet top-up
  const amountInput = document.getElementById('topupAmount');
  const amount = amountInput ? Number(amountInput.value) : 0;

  if (!amount || amount < 10) {
    alert('Please enter a minimum top-up of ₹10');
    return;
  }

  // Redirect to pricing page with top-up amount as a URL param
  // The pricing page handles the Stripe payment flow
  window.location.href = `pricing.html?topup=${amount}`;
}

// ── Sessions Panel ──
async function loadSessionsPanel() {
  document.getElementById('ppTitle').textContent = '📅 My Sessions';
  const ppBody = document.getElementById('ppBody');
  ppBody.innerHTML = '<p style="color:#9ca3af;font-size:13px;">Loading...</p>';

  const token = localStorage.getItem('mindoraToken');
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/sessions/my`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    let sessions = data?.data?.sessions || [];
    // Show only upcoming confirmed and paid sessions
    const now = new Date();
    sessions = sessions.filter(s => 
      s.status === 'confirmed' && 
      s.paymentStatus === 'paid' && 
      new Date(s.scheduledAt) >= now
    );

    if (sessions.length === 0) {
      ppBody.innerHTML = `
        <p style="color:#9ca3af;font-size:13px;text-align:center;margin-top:40px;">
          No sessions booked yet.<br>Browse therapists to book your first session.
        </p>`;
      return;
    }

    ppBody.innerHTML = sessions.map(s => {
      const therapist = s.therapistId;
      const name = therapist?.fullName || 'Therapist';
      const date = new Date(s.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const time = new Date(s.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      return `
      <div class="session-item-card">
        <div class="si-top">
          <div class="si-name">${name}</div>
          <span class="si-status si-${s.status}">${s.status}</span>
        </div>
        <div class="si-detail">📅 ${date} · ${time}</div>
        <div class="si-detail">🖥️ ${s.sessionType} Session · ₹${s.sessionFee}</div>
        ${s.status === 'confirmed' ? `<button onclick="window.location.href='video-session.html?sessionId=${s._id}&role=user'" style="margin-top:10px;padding:6px 12px;background:#6c63ff;color:#fff;border-radius:6px;border:none;cursor:pointer;font-size:12px;width:100%;">Enter Session</button>` : ''}
      </div>`;
    }).join('') + `
      <div style="margin-top:20px; text-align:center; padding:10px 0;">
        <a href="my-sessions.html" style="color:#6c63ff; font-weight:600; font-size:13px; text-decoration:none; border-bottom:1px solid #6c63ff; padding-bottom:2px;">
          View Session History →
        </a>
      </div>`;
  } catch (err) {
    ppBody.innerHTML = '<p style="color:#e74c3c;">Could not load sessions.</p>';
  }
}



// ── Logout ──
function logoutUser() {
  localStorage.removeItem('mindoraToken');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('mindoraUser');
  localStorage.removeItem('sessionExpiry');
  window.location.href = 'login.html';
}

async function loadBillingPanel() {
  document.getElementById('ppTitle').textContent = '🧾 Billing & Plan';
  document.getElementById('ppBody').innerHTML = '<p style="color:#9ca3af;font-size:13px;">Loading...</p>';

  const token = localStorage.getItem('mindoraToken');
  if (!token) {
    document.getElementById('ppBody').innerHTML = '<p style="color:#9ca3af;">Please log in.</p>';
    return;
  }

  try {
    const [planRes, billRes] = await Promise.all([
      fetch(`${API_BASE}/payment/plan-status`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_BASE}/payment/billing-history`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    const plan = await planRes.json();
    const bills = await billRes.json();

    const purposeLabels = {
      wallet_topup: '💰 Wallet Top-up',
      pro_monthly: '⭐ Pro Plan (Monthly)',
      pro_yearly: '⭐ Pro Plan (Yearly)'
    };

    const expiryText = plan.plan === 'pro' && plan.planExpiresAt
      ? `Expires ${new Date(plan.planExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : '';

    const aiInfo = plan.plan === 'free'
      ? `${plan.aiMessagesLeft} of ${plan.aiMessagesLimit} AI messages left today`
      : 'Unlimited AI messages';

    document.getElementById('ppBody').innerHTML = `

      <!-- Current plan card -->
      <div style="background:${plan.plan === 'pro' ? 'linear-gradient(135deg,#dbeafe,#eff6ff)' : 'linear-gradient(135deg,#f0faf5,#e8f5ef)'};
                  border-radius:16px; padding:20px; margin-bottom:20px;
                  border:1px solid ${plan.plan === 'pro' ? '#93c5fd' : '#b2deca'};">
        <div style="font-size:16px;font-weight:700;color:${plan.plan === 'pro' ? '#1e40af' : '#065f46'};margin-bottom:4px;">
          ${plan.plan === 'pro' ? '⭐ Pro Plan' : '🌱 Free Plan'}
        </div>
        <div style="font-size:12.5px;color:#6b7280;margin-bottom:2px;">${expiryText || 'No expiry'}</div>
        <div style="font-size:12.5px;color:#6b7280;">${aiInfo}</div>
        ${plan.plan === 'free' ? `
          <a href="pricing.html" style="display:inline-block;margin-top:12px;padding:9px 20px;
             border-radius:20px;background:#52796f;color:white;font-size:12.5px;
             font-weight:500;text-decoration:none;transition:background 0.2s;">
             Upgrade to Pro →
          </a>` : `
          <a href="pricing.html" style="display:inline-block;margin-top:12px;padding:9px 20px;
             border-radius:20px;background:#1d4ed8;color:white;font-size:12.5px;
             font-weight:500;text-decoration:none;">
             Renew / Manage Plan
          </a>`
      }
      </div>

      <!-- Stripe badge -->
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#9ca3af;margin-bottom:18px;">
        🔒 Payments secured by Stripe
      </div>

      <!-- Payment history -->
      <div style="font-size:14px;font-weight:600;color:#1e2d2b;margin-bottom:12px;">Payment History</div>

      ${!Array.isArray(bills) || bills.length === 0
        ? `<p style="color:#9ca3af;font-size:13px;text-align:center;padding:24px 0;">
             No payments yet.
           </p>`
        : bills.map(b => `
          <div class="txn-item">
            <div>
              <div class="txn-desc">${purposeLabels[b.purpose] || b.purpose}</div>
              <div class="txn-date">${new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              <div style="font-size:11px;color:#d1d5db;margin-top:2px;font-family:monospace;">
                ${b.stripePaymentIntentId ? b.stripePaymentIntentId.slice(0, 28) + '...' : b.status}
              </div>
            </div>
            <div>
              <div class="txn-amount ${b.status === 'succeeded' ? 'txn-credit' : ''}">
                ₹${b.amountDisplay}
              </div>
              <div style="font-size:11px;color:${b.status === 'succeeded' ? '#6ee7b7' : b.status === 'failed' ? '#fca5a5' : '#fcd34d'};text-align:right;margin-top:3px;">
                ${b.status}
              </div>
            </div>
          </div>`).join('')
      }
    `;
  } catch (err) {
    document.getElementById('ppBody').innerHTML =
      '<p style="color:#e74c3c;font-size:13px;">Could not load billing info. Is the backend running?</p>';
    console.error(err);
  }
}