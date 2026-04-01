const http = require('http');

async function runTests() {
// global fetch used instead of node-fetch
  console.log("Creating/Logging in test user...");
  // Register or Login first
  let token = "";
  try {
    const res = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'test_stripe@example.com', password: 'password123' })
    });
    const data = await res.json();
    if(data.token) {
       token = data.token;
    } else {
       // Maybe already exists, try login
       const loginRes = await fetch('http://localhost:5000/api/auth/login', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: 'test_stripe@example.com', password: 'password123' })
       });
       const loginData = await loginRes.json();
       token = loginData.token;
    }
  } catch (e) {
    console.error("Login failed:", e);
    return;
  }
  
  if (!token) return console.log("Failed to get token!");
  
  console.log("--- Test 1 — Plan status ---");
  const planRes = await fetch('http://localhost:5000/api/payment/plan-status', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Plan Status Response:", await planRes.json());
  
  console.log("\n--- Test 2 — Create payment intent ---");
  const intentRes = await fetch('http://localhost:5000/api/payment/create-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount: 299, purpose: 'pro_monthly' })
  });
  console.log("Create Intent Response:", await intentRes.json());

  console.log("\nToken for Browser Test:", token);
}

runTests();
