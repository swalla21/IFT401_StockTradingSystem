// ===============================
// E-Stocks App (front-end only)
// ===============================

// ---------- Auth nav toggle ----------
function hydrateAuthNav(){
  const loggedIn = !!localStorage.getItem('role');
  const loginLink  = document.getElementById('navLogin');
  const logoutLink = document.getElementById('navLogout');
  if (loginLink)  loginLink.style.display  = loggedIn ? 'none'  : 'inline';
  if (logoutLink) logoutLink.style.display = loggedIn ? 'inline' : 'none';
}

// Global logout: clears role only and redirects to Login
window.logout = function(){
  localStorage.removeItem('role');   // keep users, cash, positions, market data
  hydrateAuthNav(); // reflect change immediately
  window.location.href = 'Login.html';
};

// ---------- Role chip ----------
function hydrateRole(){
  const role = localStorage.getItem('role') || 'Customer';
  const chip = document.getElementById('roleChip');
  if (chip) chip.textContent = 'Role: ' + role;
}

// ---------- Portfolio state ----------
const state = {
  cash: parseFloat(localStorage.getItem('cash') || '10000'),
  positions: JSON.parse(localStorage.getItem('positions') || '{"AAPL":3,"MSFT":2}')
};
function save(){
  localStorage.setItem('cash', String(state.cash));
  localStorage.setItem('positions', JSON.stringify(state.positions));
}
function fmt(n){ return '$' + Number(n).toFixed(2); }

// ---------- Balance visibility (NEW) ----------
function getShowBalance(){ return localStorage.getItem('showBalance') === 'true'; }
function setShowBalance(v){ localStorage.setItem('showBalance', v ? 'true' : 'false'); }

function renderBalanceChip(){
  const chip = document.getElementById('balanceChip');
  const btn  = document.getElementById('toggleBalBtn');
  if (!chip || !btn) return; // only present on Portfolio
  const show = getShowBalance();
  chip.textContent = 'Balance: ' + (show ? fmt(state.cash) : '••••');
  btn.textContent  = show ? 'Hide Balance' : 'Show Balance';
}

window.toggleBalance = function(){
  setShowBalance(!getShowBalance());
  renderBalanceChip();
};

// ---------- Portfolio render ----------
function hydratePortfolio(){
  const cashSpot = document.getElementById('cashVal');
  if (cashSpot) cashSpot.textContent = fmt(state.cash);
  const tbody = document.querySelector('#posTable tbody');
  if (tbody){
    tbody.innerHTML = '';
    Object.entries(state.positions).forEach(([t,q])=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${t}</td><td>${q}</td>`;
      tbody.appendChild(tr);
    });
  }
  renderBalanceChip(); // keep balance chip synced (NEW)
}

// ---------- Portfolio actions ----------
window.deposit = function(){
  const el = document.getElementById('depAmt');
  const msg = document.getElementById('depMsg');
  const amt = parseFloat((el && el.value) || '0');
  if (amt <= 0){ if(msg) msg.textContent = 'Enter amount > 0'; return; }
  state.cash += amt; save(); hydratePortfolio();
  renderBalanceChip(); // NEW
  if (msg) msg.textContent = 'Deposit successful';
};

window.buy = function(){
  const t = (document.getElementById('buyTicker')?.value || '').toUpperCase().trim();
  const q = parseInt(document.getElementById('buyQty')?.value || '0', 10);
  const msg = document.getElementById('buyMsg');
  if (!t || q <= 0){ if(msg) msg.textContent = 'Enter ticker and qty > 0'; return; }
  const price = 100, cost = q * price;
  if (cost > state.cash){ if(msg) msg.textContent = 'Insufficient cash'; return; }
  state.cash -= cost;
  state.positions[t] = (state.positions[t] || 0) + q;
  save(); hydratePortfolio();
  renderBalanceChip(); // NEW
  if (msg) msg.textContent = `Bought ${q} ${t} @ $${price}`;
};

window.sell = function(){
  const t = (document.getElementById('sellTicker')?.value || '').toUpperCase().trim();
  const q = parseInt(document.getElementById('sellQty')?.value || '0', 10);
  const msg = document.getElementById('sellMsg');
  if (!t || q <= 0){ if(msg) msg.textContent = 'Enter ticker and qty > 0'; return; }
  const held = state.positions[t] || 0;
  if (q > held){ if(msg) msg.textContent = 'Insufficient holdings'; return; }
  const price = 100, proceeds = q * price;
  state.positions[t] = held - q; if (state.positions[t] === 0) delete state.positions[t];
  state.cash += proceeds; save(); hydratePortfolio();
  renderBalanceChip(); // NEW
  if (msg) msg.textContent = `Sold ${q} ${t} @ $${price}`;
};

// ---------- Prefill Buy (from Market) ----------
(function(){
  const t = sessionStorage.getItem('prefillBuyTicker');
  if (t && document.getElementById('buyTicker')) {
    document.getElementById('buyTicker').value = t;
    sessionStorage.removeItem('prefillBuyTicker');
  }
})();


// ===============================
// Login + User Store + Forgot Password
// ===============================

// --- Simple user store in localStorage ---
function loadUsers(){
  try { return JSON.parse(localStorage.getItem('users') || '{}'); }
  catch { return {}; }
}
function saveUsers(u){ localStorage.setItem('users', JSON.stringify(u)); }

// Seed default admin (only once)
(function seedAdmin(){
  const u = loadUsers();
  if (!u.admin){
    u.admin = { password: 'pass123', role: 'Admin' };
    saveUsers(u);
  }
})();

// --- Login handler (compatible with your flow) ---
function attachLogin(){
  const form = document.getElementById('loginForm');
  if (!form) return;

  const userEl = document.getElementById('username');
  const passEl = document.getElementById('password');
  const msg = document.getElementById('errorMessage');

  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    const user = (userEl?.value || '').trim();
    const pass = (passEl?.value || '').trim();

    if (!user || !pass){
      if (msg) msg.textContent = 'Please enter username and password.';
      return;
    }

    const users = loadUsers();

    // If user exists, validate; if not, create (first-time login).
    if (users[user]){
      if (users[user].password !== pass){
        if (msg) msg.textContent = 'Invalid credentials.';
        return;
      }
      localStorage.setItem('role', users[user].role || (user.toLowerCase()==='admin' ? 'Admin' : 'Customer'));
    } else {
      // First-time user becomes Customer (or Admin if username is "admin")
      users[user] = { password: pass, role: (user.toLowerCase()==='admin' ? 'Admin' : 'Customer') };
      saveUsers(users);
      localStorage.setItem('role', users[user].role);
    }

    if (msg) msg.textContent = '';
    hydrateAuthNav();               // toggle nav immediately
    window.location.href = 'Portfolio.html';
  });
}

// --- Forgot Password modal wiring ---
(function forgotPassword(){
  const link = document.getElementById('forgotLink');
  const modal = document.getElementById('resetModal');
  if(!link || !modal) return; // only on Login.html

  const cancelBtn = document.getElementById('resetCancel');
  const submitBtn = document.getElementById('resetSubmit');
  const userIn = document.getElementById('resetUser');
  const p1 = document.getElementById('resetPass');
  const p2 = document.getElementById('resetPass2');
  const msg = document.getElementById('resetMsg');

  function open(){ modal.style.display = 'flex'; msg.textContent=''; }
  function close(){ modal.style.display = 'none'; userIn.value=''; p1.value=''; p2.value=''; msg.textContent=''; }

  link.addEventListener('click', (e)=>{ e.preventDefault(); open(); });
  cancelBtn?.addEventListener('click', (e)=>{ e.preventDefault(); close(); });

  submitBtn?.addEventListener('click', (e)=>{
    e.preventDefault();
    const u = (userIn?.value || '').trim();
    const np1 = (p1?.value || '').trim();
    const np2 = (p2?.value || '').trim();

    if (!u){ msg.textContent = 'Enter your username.'; return; }
    if (np1.length < 6){ msg.textContent = 'Password must be at least 6 characters.'; return; }
    if (np1 !== np2){ msg.textContent = 'Passwords do not match.'; return; }

    const users = loadUsers();
    if (!users[u]){
      // Optional behavior: create the user on reset.
      users[u] = { password: np1, role: (u.toLowerCase()==='admin' ? 'Admin' : 'Customer') };
    } else {
      users[u].password = np1;
    }
    saveUsers(users);
    msg.textContent = 'Password updated. You can log in now.';
    setTimeout(close, 900);
  });
})();


// ===============================
// Market Page Logic
// ===============================
(function () {
  const SAMPLE = [
    { t: 'AAPL', p: 183.12 },
    { t: 'MSFT', p: 412.33 },
    { t: 'NVDA', p: 117.84 },
    { t: 'AMZN', p: 175.05 },
    { t: 'TSLA', p: 198.10 }
  ];

  function loadMarket() {
    try { return JSON.parse(localStorage.getItem('marketData') || '[]'); }
    catch { return []; }
  }
  function saveMarket(rows) {
    localStorage.setItem('marketData', JSON.stringify(rows));
  }

  function renderMarket() {
    const tbody = document.querySelector('#marketTable tbody');
    if (!tbody) return;
    const rows = loadMarket();
    tbody.innerHTML = '';
    rows.forEach((row, idx) => {
      const price = Number(row.p);
      const ch = (row.c ?? 0);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.t}</td>
        <td>$${price.toFixed(2)}</td>
        <td style="color:${ch>=0?'#7CFFB2':'#FF9B9B'}">${ch>=0?'+':''}${ch.toFixed(2)}%</td>
        <td>
          <button class="btn" style="border:none;border-radius:10px;padding:6px 10px"
                  onclick="prefillBuy('${row.t}')">Buy</button>
          <button class="btn" style="border:none;border-radius:10px;padding:6px 10px; margin-left:6px; background:#888"
                  onclick="removeMarket(${idx})">Remove</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  // Public Market functions
  window.addMarketTicker = function () {
    const t = (document.getElementById('mktTicker')?.value || '').toUpperCase().trim();
    const pStr = document.getElementById('mktPrice')?.value || '';
    const msg = document.getElementById('mktMsg');

    if (!t || !/^[A-Z]{1,6}$/.test(t)) { if(msg) msg.textContent = 'Enter a valid ticker (A–Z, up to 6).'; return; }
    const p = pStr ? Number(pStr) : (50 + Math.random()*200);
    const rows = loadMarket();

    if (rows.some(r => r.t === t)) { if (msg) msg.textContent = `${t} is already listed.`; return; }

    rows.push({ t, p, c: 0 });
    saveMarket(rows);
    if (msg) msg.textContent = `Added ${t} at $${p.toFixed(2)}.`;
    renderMarket();
  };

  window.refreshMarketPrices = function () {
    const rows = loadMarket();
    rows.forEach(r => {
      const pct = (Math.random()*2 - 1) * 2.5; // -2.5% .. +2.5%
      r.c = pct;
      r.p = Math.max(0.01, r.p * (1 + pct/100));
    });
    saveMarket(rows);
    renderMarket();
    const msg = document.getElementById('mktMsg');
    if (msg) msg.textContent = 'Prices refreshed.';
  };

  window.seedMarket = function () {
    const rows = loadMarket();
    if (rows.length === 0) {
      saveMarket(SAMPLE.map(x => ({ t:x.t, p:x.p, c:0 })));
      const msg = document.getElementById('mktMsg');
      if (msg) msg.textContent = 'Loaded sample market data.';
      renderMarket();
    } else {
      const msg = document.getElementById('mktMsg');
      if (msg) msg.textContent = 'Market already has data.';
    }
  };

  window.removeMarket = function (idx) {
    const rows = loadMarket();
    rows.splice(idx, 1);
    saveMarket(rows);
    renderMarket();
  };

  // Buy button → Portfolio prefill
  window.prefillBuy = function (ticker) {
    sessionStorage.setItem('prefillBuyTicker', ticker.toUpperCase());
    window.location.href = 'Portfolio.html';
  };

  // Market page init
  document.addEventListener('DOMContentLoaded', function () {
    const chip = document.getElementById('roleChip');
    if (chip) chip.textContent = 'Role: ' + (localStorage.getItem('role') || 'Guest');
    if (document.getElementById('marketTable')) renderMarket();
  });
})();


// ===============================
// Global init
// ===============================
document.addEventListener('DOMContentLoaded', function(){
  attachLogin();          // Login page (if present)
  hydrateRole();          // Any page with role chip
  hydratePortfolio();     // Portfolio page (calls renderBalanceChip)
  hydrateAuthNav();       // Toggle LOGIN/LOG OUT
});
