// config.js
// This file automatically switches between local and production API

const API_BASE = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
)
    ? ''   // local development — uses relative /api/... paths
    : 'https://mindora-backend-4m3a.onrender.com';  // ← paste your Render URL here

window.API_BASE = API_BASE;