function togglePw(id, btn) {
      const input = document.getElementById(id);
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁';
      }
    }
    function togglePw(id, btn) {
      const input = document.getElementById(id);
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁';
      }
    }
 
    // Password strength indicator
    document.getElementById('signupPassword').addEventListener('input', function() {
      const val = this.value;
      const fill = document.getElementById('pwFill');
      const label = document.getElementById('pwLabel');
 
      let strength = 0;
      if (val.length >= 6)  strength++;
      if (val.length >= 10) strength++;
      if (/[A-Z]/.test(val)) strength++;
      if (/[0-9]/.test(val)) strength++;
      if (/[^A-Za-z0-9]/.test(val)) strength++;
 
      const levels = [
        { pct: '0%',   color: '#e5e7eb', text: 'Enter a password' },
        { pct: '25%',  color: '#f87171', text: 'Too weak' },
        { pct: '50%',  color: '#fb923c', text: 'Could be stronger' },
        { pct: '75%',  color: '#facc15', text: 'Getting better' },
        { pct: '90%',  color: '#4ade80', text: 'Strong' },
        { pct: '100%', color: '#22c55e', text: 'Very strong 💪' },
      ];
 
      const lvl = val.length === 0 ? levels[0] : levels[Math.min(strength, 5)];
      fill.style.width = lvl.pct;
      fill.style.background = lvl.color;
      label.textContent = lvl.text;
      label.style.color = lvl.color === '#e5e7eb' ? '#9ca3af' : lvl.color;
    });