/* =============================================================
   Mindora — Crisis Detection & Escalation
   Server-side check BEFORE sending message to AI.
   Returns crisis response immediately and logs the event.
   ============================================================= */

const CRISIS_KEYWORDS = [
  'suicide', 'suicidal', 'kill myself', 'end my life',
  'want to die', 'don\'t want to live', 'no reason to live',
  'hurt myself', 'self harm', 'self-harm', 'cut myself',
  'overdose', 'jump off', 'hang myself'
];

const CRISIS_RESPONSE = `You matter deeply, and what you're feeling right now is real 💙

Please reach out for immediate support:
📞 **iCall (India):** 9152987821
📞 **Vandrevala Foundation:** 1860-2662-345 (24/7)
📞 **NIMHANS:** 080-46110007

You are not alone in this. Please talk to someone you trust, or go to your nearest hospital if you are in immediate danger.

I'm here with you 🤍`;

/**
 * Check if a message contains crisis keywords
 * @param {string} message - user's message
 * @returns {{ isCrisis: boolean, response: string|null }}
 */
function detectCrisis(message) {
  const lower = message.toLowerCase();
  const found = CRISIS_KEYWORDS.some(keyword => lower.includes(keyword));

  if (found) {
    // Log the crisis event (in production, save to DB or alert system)
    console.warn(`[CRISIS DETECTED] at ${new Date().toISOString()}: "${message.slice(0, 80)}..."`);
    return { isCrisis: true, response: CRISIS_RESPONSE };
  }

  return { isCrisis: false, response: null };
}

module.exports = { detectCrisis };