const BASE_URL = "https://api.ogcollege.io/api/v1/cutoffs/predict-college/6298363b-49bd-45f0-af9b-971545c00997";
const FIXED_PARAMS = {
  page_no: 0,
  page_size: 10000,
  search: "",
  program_ids: "[]",
  institute_types: "[]",
};

const state = {
  crl_rank: null,
  home_state: null,
  gender: null,
  category: null,
  is_pwd: null
};

const telegram = window.Telegram?.WebApp;

const stepTitle = document.getElementById("stepTitle");
const stepDesc = document.getElementById("stepDesc");
const rankStep = document.getElementById("rankStep");
const homeStateStep = document.getElementById("homeStateStep");
const genderStep = document.getElementById("genderStep");
const categoryStep = document.getElementById("categoryStep");
const pwdStep = document.getElementById("pwdStep");
const summaryStep = document.getElementById("summaryStep");
const summaryBox = document.getElementById("summaryBox");
const statusBox = document.getElementById("statusBox");
const resultsBox = document.getElementById("resultsBox");
const debugBox = document.getElementById("debugBox");
const downloadBtn = document.getElementById("downloadBtn");
const pdfStatus = document.getElementById("pdfStatus");

function showDebug(msg) {
  debugBox.textContent = msg || "";
}

function showOnly(step) {
  [rankStep, homeStateStep, genderStep, categoryStep, pwdStep, summaryStep].forEach(el => el.classList.add("hidden"));
  step.classList.remove("hidden");
}

function setTitle(title, desc) {
  stepTitle.textContent = title;
  stepDesc.textContent = desc;
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload.filter(item => item && typeof item === "object");

  if (payload && typeof payload === "object") {
    const possibleKeys = ["data", "results", "items", "colleges", "predictions", "rows", "docs"];

    for (const key of possibleKeys) {
      const value = payload[key];
      if (Array.isArray(value)) return value.filter(item => item && typeof item === "object");
      if (value && typeof value === "object") {
        for (const subkey of possibleKeys) {
          const subvalue = value[subkey];
          if (Array.isArray(subvalue)) return subvalue.filter(item => item && typeof item === "object");
        }
      }
    }
  }

  return [];
}

function valueFromKeys(item, keys, fallback = "N/A") {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function formatItem(item, index) {
  const college = item.college || {};
  const collegeName = college.name || valueFromKeys(item, ["college_name", "institute_name", "name"], "N/A");
  const programs = item.programs || item.program || [];
  const prog = Array.isArray(programs) ? (programs[0] || {}) : (programs || {});

  const branch = valueFromKeys(prog, ["name", "program_name", "branch_name"], "N/A");
  const courseType = valueFromKeys(prog, ["course_type", "type"], "N/A");
  const opening = valueFromKeys(prog, ["opening_rank", "opening", "open_rank"], "N/A");
  const closing = valueFromKeys(prog, ["closing_rank", "closing", "close_rank"], "N/A");
  const quota = valueFromKeys(prog, ["quota"], "N/A");
  const category = valueFromKeys(prog, ["category"], "N/A");

  return `
    <div class="result-item">
      <h3>${index}. ${collegeName}</h3>
      <p><b>Program:</b> ${branch} (${courseType})</p>
      <p><b>Opening Rank:</b> ${opening}</p>
      <p><b>Closing Rank:</b> ${closing}</p>
      <p><b>Quota:</b> ${quota}</p>
      <p><b>Category:</b> ${category}</p>
      <span class="tag">College match</span>
      <span class="tag">API data</span>
    </div>
  `;
}

function setTelegramTheme() {
  if (!telegram) return;

  const tp = telegram.themeParams || {};
  document.documentElement.style.setProperty("--tg-bg", tp.bg_color || "#f4f5f7");
  document.documentElement.style.setProperty("--tg-text", tp.text_color || "#111827");
  document.documentElement.style.setProperty("--tg-accent", tp.button_color || "#2aabee");
  document.documentElement.style.setProperty("--tg-accent-dark", tp.button_color || "#229ed9");

  if (telegram.colorScheme === "dark") {
    document.body.classList.add("telegram-dark");
  }
}

function initTelegram() {
  if (!telegram) return;
  telegram.ready();
  telegram.expand();
  setTelegramTheme();

  telegram.onEvent("themeChanged", () => {
    setTelegramTheme();
    document.body.classList.toggle("telegram-dark", telegram.colorScheme === "dark");
  });
}
// TOP 5 FUNCTION
function renderTop5(items) {
  const top5 = items.slice(0, 5);
  resultsBox.innerHTML = top5.map((item, i) => 
    `<div class="college-card fade-in" style="animation-delay:${i*120}ms">${formatItem(item, i+1)}</div>`
  ).join('');
  pdfStatus.innerHTML = 'Full college list PDF generated.';
  downloadBtn.classList.remove('hidden');
}

// LOADING
function showLoadingAnimation() {
  resultsBox.innerHTML = '<div class="loader-wrap"><div class="spinner"></div><p>Loading top colleges...</p></div>';
}

// DOWNLOAD CLICK
downloadBtn?.addEventListener('click', () => {
  pdfStatus.innerHTML = 'To get full PDF contact <a href="https://telegram.me/Night8killer">@Night8killer</a>';
});
document.getElementById("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("telegram-dark");
});

document.getElementById("rankNextBtn").addEventListener("click", () => {
  const value = document.getElementById("rankInput").value.trim().replace(/,/g, "");
  if (!value || isNaN(Number(value))) {
    alert("Please enter a valid numeric CRL rank.");
    return;
  }

  state.crl_rank = Number(value);
  setTitle("Select Home State", "Choose whether you belong to Uttar Pradesh or Other State.");
  showOnly(homeStateStep);
});

homeStateStep.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-home]");
  if (!btn) return;
  state.home_state = btn.dataset.home;
  setTitle("Select Gender", "Now choose your gender.");
  showOnly(genderStep);
});

genderStep.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-gender]");
  if (!btn) return;

  state.gender = btn.dataset.gender;

  if (state.home_state === "Other State") {
    state.category = "GEN";
    state.is_pwd = null;
    summaryBox.innerHTML = `
      <b>Home State:</b> Other State<br>
      <b>Gender:</b> ${state.gender}<br>
      <b>Category:</b> GEN (auto-set because home state is Other State)<br>
      <b>PwD:</b> Will be asked next
    `;
    setTitle("Select PwD Status", "Since home state is Other State, category is auto GEN.");
    showOnly(pwdStep);
  } else {
    setTitle("Select Category", "Choose your category.");
    showOnly(categoryStep);
  }
});

categoryStep.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-category]");
  if (!btn) return;

  state.category = btn.dataset.category;
  setTitle("Select PwD Status", "Choose whether you are PwD eligible.");
  showOnly(pwdStep);
});

pwdStep.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-pwd]");
  if (!btn) return;

  state.is_pwd = btn.dataset.pwd;

  summaryBox.innerHTML = `
    <b>Rank:</b> ${state.crl_rank}<br>
    <b>Home State:</b> ${state.home_state}<br>
    <b>Gender:</b> ${state.gender}<br>
    <b>Category:</b> ${state.category || "GEN"}<br>
    <b>PwD:</b> ${state.is_pwd}
  `;
  setTitle("Review Details", "Check your inputs before fetching colleges.");
  showOnly(summaryStep);
});

document.getElementById("restartBtn").addEventListener("click", () => {
  state.crl_rank = null;
  state.home_state = null;
  state.gender = null;
  state.category = null;
  state.is_pwd = null;

  document.getElementById("rankInput").value = "";
  resultsBox.innerHTML = "";
  statusBox.className = "status idle";
  statusBox.textContent = "No search performed yet.";
  showDebug("");
  setTitle("Enter your CRL Rank", "Start by entering your rank. Then continue step by step.");
  showOnly(rankStep);
});

document.getElementById("fetchBtn").addEventListener("click", async () => {
  const url = `/api/predict?token=collegePredictor2026&home_state=${encodeURIComponent(state.home_state)}&gender=${encodeURIComponent(state.gender)}&category=${encodeURIComponent(state.category)}&is_pwd=${encodeURIComponent(state.is_pwd)}&crl_rank=${encodeURIComponent(state.crl_rank)}`;

  showDebug(`Proxy URL:
${url}

Fetching...`);
  statusBox.className = "status loading";
  statusBox.textContent = `Fetching colleges with:
Rank: ${state.crl_rank}
Home State: ${state.home_state}
Gender: ${state.gender}
Category: ${state.category}
PwD: ${state.is_pwd}

Loading...`;

  try {
    const response = await fetch(url);
    const text = await response.text();

    showDebug(`Proxy URL:
${url}

Status: ${response.status} ${response.statusText}

Raw response preview:
${text.slice(0, 500)}`);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      throw new Error("Response is not valid JSON");
    }

    const items = extractItems(payload);

    if (!items.length) {
      statusBox.className = "status error";
      statusBox.textContent = "No colleges found.";
      resultsBox.innerHTML = "";
      return;
    }

    statusBox.className = "status success";
    statusBox.textContent = `Success. Found ${items.length} matching records.`;
    showLoadingAnimation();
    setTimeout(() => renderTop5(items), 800);
  } catch (err) {
    statusBox.className = "status error";
    statusBox.textContent = `API request failed: ${err.message}`;
    showDebug(`Proxy URL:
${url}

Error:
${err.message}`);
    resultsBox.innerHTML = "";
  }
});

showOnly(rankStep);
initTelegram();
