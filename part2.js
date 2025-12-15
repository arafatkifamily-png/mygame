(function () {

  const ADMIN_PASSWORD = "8265079517h";

  const USER_POINTS_KEY = "userPoints_v1";
  const currentMobile = localStorage.getItem("currentUser") || "guest";

  const STORAGE = {
    codes: "ps_codes_pool_v1",
    allHistory: "ps_all_history_v1",
    points(mobile) {
      return `${USER_POINTS_KEY}_${mobile}`;
    }
  };

  /* ==========================
        BASIC STORAGE HELPERS
  =========================== */
  function load(k, f) {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : (typeof f !== "undefined" ? f : null);
  }

  function save(k, v) {
    localStorage.setItem(k, JSON.stringify(v));
  }

  /* ====== FIXED TIME FORMAT ====== */
  function now() {
    const d = new Date();
    return (
      d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0") + " " +
      String(d.getHours()).padStart(2, "0") + ":" +
      String(d.getMinutes()).padStart(2, "0") + ":" +
      String(d.getSeconds()).padStart(2, "0")
    );
  }

  /* ---------- GET USER POINTS (DASHBOARD STYLE) ---------- */
  function getUserPoints() {
    return Number(localStorage.getItem(STORAGE.points(currentMobile))) || 0;
  }

  function setUserPoints(val) {
    localStorage.setItem(STORAGE.points(currentMobile), Number(val));
  }

  /* ==========================
           INIT SYSTEM
  =========================== */
  function init() {

    if (!localStorage.getItem(STORAGE.codes)) {
      save(STORAGE.codes, {
        10: [], 20: [], 30: [], 50: [], 100: [], 150: [], 200: []
      });
    }

    updateUI();
  }

  /* ==========================
            UPDATE UI
  =========================== */
  function updateUI() {

    const p = document.getElementById("userPoints");
    if (p) p.innerText = getUserPoints() + " Points";

    renderUserHistory();
    renderAdminHistory();
  }

  /* ==========================
         USER HISTORY RENDER
  =========================== */
  function renderUserHistory() {
    const box = document.getElementById("userHistory");
    const all = load(STORAGE.allHistory, []);

    if (!box) return;

    if (!all || all.length === 0) {
      box.innerHTML = "<div>No history yet.</div>";
      return;
    }

    box.innerHTML = "";
    all.forEach(rec => {
      box.innerHTML += `
        <div class="history-item">
          <strong>₹${rec.amount}</strong> — ${rec.code ?? rec.status}
          <div style="font-size:12px;color:#aaa">${rec.time}</div>
        </div>`;
    });
  }

  /* ==========================
            APPLY REDEEM
  =========================== */
  window.applyRedeem = function () {

    const amount = Number(document.getElementById("redeemAmount").value);
    const pts = getUserPoints();
    const need = amount * 20;

    const msg = document.getElementById("redeemMsg");
    msg.style.display = "block";

    if (pts < need) {
      msg.innerText = "Not enough points. Need " + need + " pts.";
      msg.className = "msg msg-error";
      setTimeout(() => msg.style.display = "none", 2300);
      return;
    }

    const pool = load(STORAGE.codes, {});
    if (!pool[amount] || pool[amount].length === 0) {

      msg.innerText = "Service Down! Admin will add codes.";
      msg.className = "msg msg-error";
      setTimeout(() => msg.style.display = "none", 2300);

      const all = load(STORAGE.allHistory, []);
      all.unshift({
        mobile: currentMobile,
        amount,
        status: "Pending",
        code: null,
        time: now()
      });
      save(STORAGE.allHistory, all);

      updateUI();
      return;
    }

    // Deduct points
    setUserPoints(pts - need);

    // fetch code
    const code = pool[amount].shift();
    save(STORAGE.codes, pool);

    // push history
    const all = load(STORAGE.allHistory, []);
    all.unshift({
      mobile: currentMobile,
      amount,
      status: "Delivered",
      code,
      time: now()
    });
    save(STORAGE.allHistory, all);

    document.getElementById("redeemCode").innerText = code;
    document.getElementById("redeemCodeBox").style.display = "block";

    msg.innerText = "Code delivered!";
    msg.className = "msg msg-success";
    setTimeout(() => msg.style.display = "none", 2300);

    updateUI();
  };


  /* ==========================
             ADMIN PANEL
  =========================== */
  window.openAdmin = function () {
    document.getElementById("adminPanel").style.display = "block";

    const m = document.getElementById("adminLoginMsg");
    if (m) { m.style.display = "none"; m.innerText = ""; }

    document.getElementById("adminPass").value = "";
  };

  window.adminLogin = function () {
    const pass = document.getElementById("adminPass").value;
    const msg = document.getElementById("adminLoginMsg");

    if (pass === ADMIN_PASSWORD) {
      msg.innerText = "Unlocked!";
      msg.className = "msg msg-success";
      msg.style.display = "block";

      document.getElementById("adminContent").style.display = "block";
      renderAdminHistory();

      setTimeout(() => msg.style.display = "none", 1500);
    } else {
      msg.innerText = "Wrong password";
      msg.className = "msg msg-error";
      msg.style.display = "block";
      setTimeout(() => msg.style.display = "none", 1500);
    }
  };

  /* ==========================
         ADMIN HISTORY RENDER
  =========================== */
  function renderAdminHistory() {
    const box = document.getElementById("allHistory");
    if (!box) return;

    const list = load(STORAGE.allHistory, []);

    if (list.length === 0) {
      box.innerHTML = "<div>No records yet.</div>";
      return;
    }

    box.innerHTML = "";
    list.forEach(r => {
      box.innerHTML += `
        <div class="history-item">
          ₹${r.amount} — ${r.code ?? r.status}
          <div style="font-size:12px;color:#aaa">${r.time}</div>
        </div>
      `;
    });
  }

  /* ==========================
         ADMIN ADD CODE
  =========================== */
  window.saveRedeemCode = function () {
    const amount = Number(document.getElementById("adminAmount").value);
    const raw = document.getElementById("adminCode").value.trim();

    const msg = document.getElementById("adminCodeMsg");

    if (!raw) {
      msg.innerText = "Enter code(s)";
      msg.className = "msg msg-error";
      msg.style.display = "block";
      setTimeout(() => msg.style.display = "none", 1600);
      return;
    }

    const arr = raw
      .replace(/\n/g, ",")
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 1);

    const pool = load(STORAGE.codes, {});
    pool[amount] = (pool[amount] || []).concat(arr);
    save(STORAGE.codes, pool);

    msg.innerText = arr.length + " code(s) added!";
    msg.className = "msg msg-success";
    msg.style.display = "block";
    setTimeout(() => msg.style.display = "none", 1600);

    document.getElementById("adminCode").value = "";
    renderAdminHistory();
  };

  /* ==========================
             MENU + LOGOUT
  =========================== */
  window.toggleMenu = function () {
    const menu = document.getElementById("menuBox");
    menu.style.display = (menu.style.display === "block" ? "none" : "block");
  };

  window.logoutUser = function () {
    localStorage.removeItem("currentUser");
    location.href = "dashboard.html";
  };

  init();
})();