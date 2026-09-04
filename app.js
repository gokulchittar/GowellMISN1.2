// ══════════════════════════════════════════════════════════════
// RECRUITMENT MIS — app.js v3.0 (Data Pool Architecture)
// ══════════════════════════════════════════════════════════════

// ── Global State ─────────────────────────────────────────────
const state = {
  projects:          [],
  candidates:        [],      // recruiter's own candidates (from Data Pool)
  managerCandidates: [],      // all candidates across recruiters (manager view)
  futureBench:       [],      // global future bench pool
  employees:         [],
  submittedDocs:     [],
  distributionLog:   [],
  rawLeads:          [],
  activeProjectId:   null,
  recruiterStatusFilter: "all",
  searchQuery:       "",
  currentCandidateId: null,
  activeManagerTab:  "dashboard",
  reportDateRange:   "today",  // today | week | month | year | all | custom
  reportDateFrom:    "",
  reportDateTo:      "",
  reportRecruiter:   "all",
  reportProject:     "all",
  recruiterDateRange: "all",
  docDateRange:      "today",  // today | week | month | year | all | custom
  docDateFrom:       "",
  docDateTo:         "",
  docRecruiterFilter: "all",
};

// ── Mock Raw Leads ────────────────────────────────────────────
const MOCK_RAW_LEADS = [];

// ── Default Employees ─────────────────────────────────────────
function getDefaultEmployees() {
  return [
    { name:"Prebin",  designation:"Recruiter", username:"prebin",  password:"111111" },
    { name:"Mahadev", designation:"Recruiter", username:"mahadev", password:"222222" },
    { name:"Gokul",   designation:"Manager",   username:"gokul",   password:"111222" },
  ];
}

function isManagerRole(role) {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === "manager" || r === "md" || r === "gm" || r === "assistant manager";
}

// ── API URL ───────────────────────────────────────────────────
const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbyn2xjBTNuJul5fK0lf0hxYmPSBCtYlOvceSOX1QmE_HSDKG8kgr2rNvM-iXXRfELw1Qw/exec";

function getApiUrl() {
  const stored = localStorage.getItem("recruitment_mis_api_url");
  if (!stored || stored === "null" || stored === "undefined" || stored === "") {
    localStorage.setItem("recruitment_mis_api_url", DEFAULT_API_URL);
    return DEFAULT_API_URL;
  }
  return stored;
}

// ── Loader ────────────────────────────────────────────────────
function showLoader(text="Loading...") {
  const el = document.getElementById("global-loader");
  const t  = document.getElementById("loader-text");
  if (el) { if (t) t.textContent = text; el.classList.remove("hidden"); }
}
function hideLoader() {
  const el = document.getElementById("global-loader");
  if (el) el.classList.add("hidden");
}

// ── Connection Status ─────────────────────────────────────────
function updateConnectionStatus() {
  const synced = !!getApiUrl();
  ["connection-status-selection","connection-status-dashboard","connection-status-manager"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (synced) {
      el.className = "inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-green-50 text-green-700 border border-green-100";
      el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>Cloud Synced`;
    } else {
      el.className = "inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-100";
      el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>Local Mode`;
    }
  });
}

// ── View Controller ───────────────────────────────────────────
function showView(id) {
  ["login-view","project-selection-view","dashboard-view","manager-view"].forEach(v => {
    const el = document.getElementById(v);
    if (!el) return;
    if (v === id) { el.classList.remove("hidden"); el.classList.add("animate-fade-in"); }
    else { el.classList.add("hidden"); el.classList.remove("animate-fade-in"); }
  });
  closeCandidateDrawer();
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(title, message, type="success") {
  const toast   = document.getElementById("toast-notification");
  const titleEl = document.getElementById("toast-title");
  const msgEl   = document.getElementById("toast-message");
  const iconEl  = document.getElementById("toast-icon-bg");
  if (!toast) return;
  if (titleEl) titleEl.textContent = title;
  if (msgEl)   msgEl.textContent   = message;
  if (iconEl) {
    iconEl.className = "flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg";
    if (type === "success") { iconEl.classList.add("bg-emerald-100","text-emerald-600"); iconEl.innerHTML = `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`; }
    else if (type === "warning") { iconEl.classList.add("bg-amber-100","text-amber-600"); iconEl.innerHTML = `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`; }
    else { iconEl.classList.add("bg-brand-100","text-brand-600"); iconEl.innerHTML = `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`; }
  }
  toast.classList.remove("translate-y-5","opacity-0","pointer-events-none");
  toast.classList.add("translate-y-0","opacity-100");
  if (window._toastTimer) clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.add("translate-y-5","opacity-0","pointer-events-none");
    toast.classList.remove("translate-y-0","opacity-100");
  }, 4000);
}

// ── Sanitization Helpers ──────────────────────────────────────
function cleanNA(val) {
  if (!val) return "";
  const s = String(val).trim();
  return s.toLowerCase() === "n/a" ? "" : s;
}

function cleanMeta(val) {
  if (!val) return "";
  const s = String(val).trim();
  return s.toLowerCase() === "meta" ? "" : s;
}

// ── Date Helpers ──────────────────────────────────────────────
function fmtDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
}

function todayStr() {
  return new Date().toISOString().slice(0,10);
}

function isToday(dateStr) {
  if (!dateStr) return false;
  return String(dateStr).slice(0,10) === todayStr();
}

function getDateRangeBounds(range) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let from, to;
  if (range === "today") {
    from = today;
    to   = new Date(today.getTime() + 86399999);
  } else if (range === "week") {
    const day = today.getDay();
    from = new Date(today); from.setDate(today.getDate() - day);
    to   = new Date(from);  to.setDate(from.getDate() + 6);
  } else if (range === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (range === "year") {
    from = new Date(now.getFullYear(), 0, 1);
    to   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  } else if (range === "custom") {
    from = state.reportDateFrom ? new Date(state.reportDateFrom) : null;
    to   = state.reportDateTo   ? new Date(state.reportDateTo + "T23:59:59") : null;
  } else {
    return { from: null, to: null };
  }
  return { from, to };
}

function inDateRange(dateStr, range) {
  if (range === "all") return true;
  const { from, to } = getDateRangeBounds(range);
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (from && d < from) return false;
  if (to   && d > to)   return false;
  return true;
}

function getDocDateRangeBounds(range) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let from, to;
  if (range === "today") {
    from = today;
    to   = new Date(today.getTime() + 86399999);
  } else if (range === "week") {
    const day = today.getDay();
    from = new Date(today); from.setDate(today.getDate() - day);
    to   = new Date(from);  to.setDate(from.getDate() + 6);
  } else if (range === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (range === "year") {
    from = new Date(now.getFullYear(), 0, 1);
    to   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  } else if (range === "custom") {
    from = state.docDateFrom ? new Date(state.docDateFrom) : null;
    to   = state.docDateTo   ? new Date(state.docDateTo + "T23:59:59") : null;
  } else {
    return { from: null, to: null };
  }
  return { from, to };
}

function inDocDateRange(dateStr, range) {
  if (range === "all") return true;
  const { from, to } = getDocDateRangeBounds(range);
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (from && d < from) return false;
  if (to   && d > to)   return false;
  return true;
}

// ── Status CSS class helper ───────────────────────────────────
function statusClass(status) {
  if (!status) return "status-badge status-fresh";
  const s = status.toLowerCase();
  if (s === "fresh")                       return "status-badge status-fresh";
  if (s === "interested")                  return "status-badge status-interested";
  if (s === "not interested")              return "status-badge status-rejected";
  if (s.startsWith("follow"))              return "status-badge status-followup";
  if (s === "not suitable")                return "status-badge status-bench";
  if (s.startsWith("call not"))            return "status-badge status-rnr";
  if (s.startsWith("willing"))             return "status-badge status-willing";
  if (s.startsWith("cv sub"))              return "status-badge bg-purple-50 text-purple-700 border border-purple-100";
  if (s.startsWith("document sub"))        return "status-badge bg-amber-50 text-amber-700 border border-amber-100";
  if (s.includes("passed"))                return "status-badge status-passed";
  if (s === "selected")                    return "status-badge status-completed";
  if (s.includes("process"))               return "status-badge status-completed";
  if (s === "travelled")                   return "status-badge status-travelled";
  return "status-badge status-fresh";
}

// ══════════════════════════════════════════════════════════════
// INIT & WORKSPACE LOGIC
// ══════════════════════════════════════════════════════════════
function initApp() {
  console.log("MIS App Init: Starting initApp...");
  const DATA_VERSION = "3.5";
  if (localStorage.getItem("mis_data_version") !== DATA_VERSION) {
    ["recruitment_mis_projects","recruitment_mis_candidates","recruitment_mis_employees",
     "recruitment_mis_bench","recruitment_mis_distlog","recruitment_mis_submitted_docs"].forEach(k => localStorage.removeItem(k));
    localStorage.setItem("mis_data_version", DATA_VERSION);
  }

  if (!localStorage.getItem("recruitment_mis_projects"))
    localStorage.setItem("recruitment_mis_projects", JSON.stringify(INITIAL_MOCK_DATA.projects));
  if (!localStorage.getItem("recruitment_mis_candidates"))
    localStorage.setItem("recruitment_mis_candidates", JSON.stringify(INITIAL_MOCK_DATA.candidates));
  if (!localStorage.getItem("recruitment_mis_employees"))
    localStorage.setItem("recruitment_mis_employees", JSON.stringify(getDefaultEmployees()));
  if (!localStorage.getItem("recruitment_mis_bench"))
    localStorage.setItem("recruitment_mis_bench", JSON.stringify([]));
  if (!localStorage.getItem("recruitment_mis_distlog"))
    localStorage.setItem("recruitment_mis_distlog", JSON.stringify([]));
  if (!localStorage.getItem("recruitment_mis_submitted_docs")) {
    localStorage.setItem("recruitment_mis_submitted_docs", JSON.stringify([]));
  }

  state.projects   = JSON.parse(localStorage.getItem("recruitment_mis_projects"));
  state.employees  = JSON.parse(localStorage.getItem("recruitment_mis_employees"));
  state.futureBench = JSON.parse(localStorage.getItem("recruitment_mis_bench")) || [];
  state.distributionLog = JSON.parse(localStorage.getItem("recruitment_mis_distlog")) || [];
  state.submittedDocs = JSON.parse(localStorage.getItem("recruitment_mis_submitted_docs")) || [];

  const settingsInput = document.getElementById("settings-api-url");
  if (settingsInput) settingsInput.value = getApiUrl();

  updateConnectionStatus();
  setupEventListeners();

  const SESSION_TIMEOUT_MS = 4 * 60 * 60 * 1000;
  let activityTimer;
  function resetActivityTimer() {
    clearTimeout(activityTimer);
    const user = sessionStorage.getItem("recruitment_mis_user");
    if (!user) return;
    activityTimer = setTimeout(() => {
      showToast("Session Expired", "You have been logged out due to inactivity.", "warning");
      setTimeout(handleLogout, 2000);
    }, SESSION_TIMEOUT_MS);
  }
  ["click","keydown","mousemove","touchstart"].forEach(ev => {
    document.addEventListener(ev, resetActivityTimer, { passive: true });
  });
  resetActivityTimer();

  setTimeout(drainPendingSync, 3000);

  const user = sessionStorage.getItem("recruitment_mis_user");
  const role = sessionStorage.getItem("recruitment_mis_role");
  const savedProj = localStorage.getItem("recruitment_mis_active_project");

  if (!user) {
    showView("login-view");
  } else if (isManagerRole(role)) {
    document.getElementById("manager-display-name").textContent = user;
    if (savedProj && state.projects.some(p => p.id === savedProj)) {
      state.activeProjectId = savedProj;
      showView("manager-view");
      loadManagerData();
    } else {
      showView("project-selection-view");
      loadManagerData();
    }
  } else {
    const userDisplay = document.getElementById("user-display-name");
    if (userDisplay) userDisplay.textContent = user;
    if (savedProj && state.projects.some(p => p.id === savedProj)) {
      state.activeProjectId = savedProj;
      showView("dashboard-view");
      loadWorkspaceData();
    } else {
      showView("project-selection-view");
      renderProjectSelection();
    }
  }
}

function setupEventListeners() {
  on("login-form",            "submit", handleLoginSubmit);
  on("logout-btn",            "click",  handleLogout);
  on("dashboard-logout-btn",  "click",  handleLogout);
  on("manager-logout-btn",    "click",  handleLogout);

  on("switch-project-btn",    "click",  () => {
    localStorage.removeItem("recruitment_mis_active_project");
    state.activeProjectId = null;
    showView("project-selection-view");
    renderProjectSelection();
  });
  on("manager-switch-project-btn", "click",  () => {
    localStorage.removeItem("recruitment_mis_active_project");
    state.activeProjectId = null;
    showView("project-selection-view");
    renderProjectSelection();
  });

  on("recruiter-status-filter", "change", e => {
    state.recruiterStatusFilter = e.target.value;
    renderCandidatesTable();
  });

  on("table-search", "input", e => { state.searchQuery = e.target.value.trim().toLowerCase(); renderCandidatesTable(); });

  on("close-drawer-btn",   "click", closeCandidateDrawer);
  on("drawer-overlay",     "click", closeCandidateDrawer);
  on("drawer-call-status", "change", e => toggleDrawerFields(e.target.value));

  on("doc-merged-checkbox", "change", checkUploadTrigger);
  on("drawer-file-input", "change", handleFileUpload);
  on("lead-action-form", "submit", handleSaveLeadSubmit);

  on("add-candidate-btn",     "click",  openAddCandidateModal);
  on("close-add-modal-btn",   "click",  closeAddCandidateModal);
  on("add-candidate-form",    "submit", handleAddCandidateSubmit);

  document.querySelectorAll(".mgr-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => switchManagerTab(btn.dataset.tab));
  });

  on("create-project-form",   "submit", handleCreateProjectSubmit);
  on("add-role-btn",          "click",  addJobRoleField);
  on("add-custom-field-btn",  "click",  addCustomFieldRow);

  on("add-employee-form",     "submit", handleAddEmployeeSubmit);
  on("refresh-employees-btn", "click",  renderEmployeesList);

  on("distribute-all-btn",     "click",  handleDistributeAll);
  on("distribute-project",     "change", onDistributeProjectChange);
  on("leads-csv-file",         "change", handleCsvFileUpload);

  const dropZone = document.getElementById("drop-zone");
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add("border-brand-500", "bg-brand-50/50");
      }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove("border-brand-500", "bg-brand-50/50");
      }, false);
    });
    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      const fileInput = document.getElementById("leads-csv-file");
      if (files.length && fileInput) {
        fileInput.files = files;
        fileInput.dispatchEvent(new Event('change'));
      }
    }, false);
  }

  on("clear-file-btn", "click", () => {
    const fileInput = document.getElementById("leads-csv-file");
    if (fileInput) fileInput.value = "";
    state.rawLeads = [];
    document.getElementById("loaded-leads-panel")?.classList.add("hidden");
    document.getElementById("file-info-panel")?.classList.add("hidden");
    renderBulkAssignTable();
  });

  const benchSearch = document.getElementById("bench-search");
  if (benchSearch) benchSearch.addEventListener("input", () => applyBenchFilters());

  on("apply-report-filters",   "click",  applyReportFilters);
  on("apply-bench-filters",    "click",  applyBenchFilters);

  document.querySelectorAll(".date-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".date-filter-btn").forEach(b => b.classList.remove("active-date-filter","text-white","border-brand-500"));
      btn.classList.add("active-date-filter","text-white","border-brand-500");
      state.reportDateRange = btn.dataset.range;
    });
  });

  document.querySelectorAll(".rec-date-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".rec-date-filter-btn").forEach(b => {
        b.classList.remove("active-date-filter", "bg-brand-500", "text-white");
        b.classList.add("text-slate-600", "font-medium");
      });
      btn.classList.add("active-date-filter", "bg-brand-500", "text-white");
      btn.classList.remove("text-slate-600", "font-medium");
      state.recruiterDateRange = btn.dataset.range;
      renderKPIs();
      renderCandidatesTable();
    });
  });

  document.querySelectorAll(".doc-date-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".doc-date-btn").forEach(b => {
        b.classList.remove("bg-brand-500", "text-white", "active-doc-date");
        b.classList.add("text-slate-600", "hover:text-brand-600");
      });
      btn.classList.add("bg-brand-500", "text-white", "active-doc-date");
      btn.classList.remove("text-slate-600", "hover:text-brand-600");
      state.docDateRange = btn.dataset.docRange;
      renderSubmittedDocumentsTab();
    });
  });

  on("doc-apply-custom-date", "click", () => {
    const fromVal = document.getElementById("doc-date-from")?.value;
    const toVal   = document.getElementById("doc-date-to")?.value;
    if (!fromVal || !toVal) {
      showToast("Required Fields", "Please select both from and to dates.", "error");
      return;
    }
    document.querySelectorAll(".doc-date-btn").forEach(b => {
      b.classList.remove("bg-brand-500", "text-white", "active-doc-date");
      b.classList.add("text-slate-600", "hover:text-brand-600");
    });
    state.docDateRange = "custom";
    state.docDateFrom  = fromVal;
    state.docDateTo    = toVal;
    renderSubmittedDocumentsTab();
  });

  on("doc-recruiter-filter", "change", e => {
    state.docRecruiterFilter = e.target.value;
    renderSubmittedDocumentsTab();
  });

  on("edit-project-form", "submit", handleEditProjectSubmit);
  on("save-api-url-btn", "click", saveApiUrl);
}

function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el && !el.dataset[`_${event}`]) { el.addEventListener(event, handler); el.dataset[`_${event}`] = "1"; }
}

// ─── LOGIN & SESSION ──────────────────────────────────────────
function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl  = document.getElementById("login-error-msg");

  if (!username || !password) {
    errorEl.textContent = "Please fill in all fields."; errorEl.classList.remove("hidden"); return;
  }

  const performLocalLogin = (msgOnSuccess = "") => {
    const employees = JSON.parse(localStorage.getItem("recruitment_mis_employees")) || getDefaultEmployees();
    const emp = employees.find(e =>
      e.username.toLowerCase() === username.toLowerCase() && String(e.password) === password
    );
    if (emp) {
      loginSuccess(emp.name, emp.designation);
      if (msgOnSuccess) {
        setTimeout(() => showToast("Local Mode", msgOnSuccess, "warning"), 1000);
      }
      return true;
    }
    return false;
  };

  const apiUrl = getApiUrl();
  if (apiUrl) {
    showLoader("Validating credentials from Google Sheets...");
    fetch(`${apiUrl}?action=getEmployees`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const emp = data.data.find(e =>
            e.username.toLowerCase() === username.toLowerCase() && String(e.password) === password
          );
          if (emp) {
            loginSuccess(emp.name, emp.designation);
          } else {
            const success = performLocalLogin("Credentials not found on Google Sheet. Logged in using local credentials.");
            if (!success) {
              errorEl.textContent = "Invalid credentials."; errorEl.classList.remove("hidden");
            }
          }
        } else {
          const success = performLocalLogin("Could not authenticate with Sheets. Logged in locally.");
          if (!success) {
            errorEl.textContent = data.error || "Auth error."; errorEl.classList.remove("hidden");
          }
        }
      })
      .catch((err) => {
        console.error("Auth fetch failed:", err);
        const success = performLocalLogin("Sheets API offline. Logged in using local credentials.");
        if (!success) {
          errorEl.innerHTML = `Cannot reach Google Sheets API, and credentials do not match local database.<br/>
                               <button type="button" onclick="localStorage.removeItem('recruitment_mis_api_url'); location.reload();" 
                                       class="mt-2 text-xs text-brand-500 font-bold underline bg-transparent border-0 cursor-pointer">
                                 Reset API URL (Switch to Local Mode)
                               </button>`;
          errorEl.classList.remove("hidden");
        }
      })
      .finally(hideLoader);
  } else {
    const success = performLocalLogin();
    if (!success) {
      errorEl.textContent = "Invalid credentials."; errorEl.classList.remove("hidden");
    }
  }
}

function loginSuccess(name, role) {
  document.getElementById("login-error-msg")?.classList.add("hidden");
  document.getElementById("login-username").value = "";
  document.getElementById("login-password").value = "";
  sessionStorage.setItem("recruitment_mis_user", name);
  sessionStorage.setItem("recruitment_mis_role", role);
  showToast("Welcome back!", `Logged in as ${name} (${role})`, "success");

  if (isManagerRole(role)) {
    document.getElementById("manager-display-name").textContent = name;
    state.activeManagerTab = "dashboard";
    switchManagerTab("dashboard");
    const savedProj = localStorage.getItem("recruitment_mis_active_project");
    if (savedProj && state.projects.some(p => p.id === savedProj)) {
      state.activeProjectId = savedProj;
      showView("manager-view");
      loadManagerData();
    } else {
      showView("project-selection-view");
      loadManagerData();
    }
  } else {
    const userDisplay = document.getElementById("user-display-name");
    if (userDisplay) userDisplay.textContent = name;
    showView("project-selection-view");
    renderProjectSelection();
  }
}

function handleLogout() {
  sessionStorage.removeItem("recruitment_mis_user");
  sessionStorage.removeItem("recruitment_mis_role");
  localStorage.removeItem("recruitment_mis_active_project");
  state.activeProjectId = null;
  state.activeManagerTab = "dashboard";
  showView("login-view");
  showToast("Signed out", "You have logged out successfully.", "info");
}

// ══════════════════════════════════════════════════════════════
// PROJECT SELECTION
// ══════════════════════════════════════════════════════════════
function renderProjectSelection() {
  const container = document.getElementById("project-grid");
  if (!container) return;
  container.innerHTML = "";
  updateConnectionStatus();

  const recruiter = sessionStorage.getItem("recruitment_mis_user") || "";
  const role = sessionStorage.getItem("recruitment_mis_role") || "";
  
  let list = [];
  let candidatesForCount = [];

  if (isManagerRole(role)) {
    list = state.projects.filter(p => p.status === "Active" || !p.status);
    candidatesForCount = state.managerCandidates || [];
  } else {
    const allCands = JSON.parse(localStorage.getItem("recruitment_mis_candidates")) || [];
    state.candidates = allCands.filter(c => (c.recruiterName || "").toLowerCase() === recruiter.toLowerCase());
    list = state.projects.filter(p =>
      (p.status === "Active" || !p.status) &&
      (!p.assignedRecruiters || p.assignedRecruiters.length === 0 || 
       p.assignedRecruiters.some(r => r.toLowerCase() === recruiter.toLowerCase()))
    );
    candidatesForCount = state.candidates;
  }

  const selectionUserDisplay = document.getElementById("user-display-name");
  if (selectionUserDisplay) selectionUserDisplay.textContent = recruiter;
  const selectionHeader = document.querySelector("#project-selection-view header p");
  if (selectionHeader) {
    selectionHeader.textContent = isManagerRole(role) ? "Select project workspace" : "Select your active project";
  }

  if (list.length === 0 && !isManagerRole(role)) {
    container.innerHTML = `<div class="col-span-3 text-center py-16 text-slate-400 text-sm">No active projects.</div>`;
    return;
  }

  list.forEach(proj => {
    const leads   = candidatesForCount.filter(c => c.projectId === proj.id);
    const fresh   = leads.filter(c => c.status === "Fresh").length;
    const card = document.createElement("div");
    card.className = "premium-card bg-white rounded-2xl shadow-sm border border-slate-100 p-6 cursor-pointer flex flex-col justify-between";
    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">${proj.location || 'India'}</span>
          <span class="text-xs text-slate-400 font-medium">${proj.openings || 0} Vacancies</span>
        </div>
        <h3 class="text-base font-bold text-slate-800 mb-1">${proj.name}</h3>
        <p class="text-xs text-slate-500 mb-4 line-clamp-2">${proj.details || ''}</p>
        ${proj.jobRoles && proj.jobRoles.length ? `<div class="flex flex-wrap gap-1 mb-4">${proj.jobRoles.slice(0,3).map(r=>`<span class="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">${r}</span>`).join('')}${proj.jobRoles.length>3?`<span class="text-[10px] text-slate-400">+${proj.jobRoles.length-3}</span>`:''}</div>` : ''}
      </div>
      <div class="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
        <span><span class="font-bold text-slate-800">${leads.length}</span> Leads</span>
        <span class="flex items-center text-emerald-600 font-medium"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>${fresh} Fresh</span>
      </div>
    `;
    card.addEventListener("click", () => selectProject(proj.id));
    container.appendChild(card);
  });

  if (isManagerRole(role)) {
    const managerCard = document.createElement("div");
    managerCard.className = "premium-card bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 cursor-pointer flex flex-col justify-center items-center text-center hover:bg-slate-100 hover:border-slate-400 transition-all min-h-[200px]";
    managerCard.innerHTML = `
      <div class="flex flex-col items-center">
        <div class="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mb-4">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 class="text-base font-bold text-slate-700 mb-1">Open Manager Workspace</h3>
        <p class="text-xs text-slate-500 max-w-[200px]">Access global dashboards, manage projects, and distribute leads.</p>
      </div>
    `;
    managerCard.addEventListener("click", () => {
      state.activeProjectId = null;
      localStorage.removeItem("recruitment_mis_active_project");
      showView("manager-view");
      loadManagerData();
      showToast("Global Workspace", "Manager workspace opened without filtering.", "success");
    });
    container.appendChild(managerCard);
  }
}

function selectProject(id) {
  state.activeProjectId = id;
  localStorage.setItem("recruitment_mis_active_project", id);
  const role = sessionStorage.getItem("recruitment_mis_role");
  if (isManagerRole(role)) {
    showView("manager-view");
    loadManagerData();
  } else {
    state.activeQueue = "fresh";
    showView("dashboard-view");
    loadWorkspaceData();
  }
  showToast("Project Loaded", "Workspace is ready.", "success");
}

// ══════════════════════════════════════════════════════════════
// RECRUITER DASHBOARD
// ══════════════════════════════════════════════════════════════
function saveCandidatesToLocalStorage(candidatesToUpdate) {
  const existing = JSON.parse(localStorage.getItem("recruitment_mis_candidates")) || [];
  candidatesToUpdate.forEach(cand => {
    const idx = existing.findIndex(c => c.id === cand.id);
    if (idx !== -1) {
      existing[idx] = cand;
    } else {
      existing.push(cand);
    }
  });
  localStorage.setItem("recruitment_mis_candidates", JSON.stringify(existing));
}

function loadWorkspaceData() {
  const apiUrl    = getApiUrl();
  const recruiter = sessionStorage.getItem("recruitment_mis_user") || "";

  const unpackProfileFields = (list) => {
    return list.map(c => {
      const mapped = { ...c, history: c.history || [] };
      if (mapped.customFieldData) {
        if (!mapped.age) mapped.age = mapped.customFieldData.age || "";
        if (!mapped.gender) mapped.gender = mapped.customFieldData.gender || "";
        if (!mapped.currentJob) mapped.currentJob = mapped.customFieldData.currentJob || "";
      }
      mapped.yearsOfExperience = cleanNA(mapped.yearsOfExperience || mapped.experience || "");
      mapped.experience = cleanNA(mapped.experience || mapped.yearsOfExperience || "");
      mapped.highestQualification = cleanMeta(mapped.highestQualification || mapped.qualification || "");
      mapped.qualification = cleanMeta(mapped.qualification || mapped.highestQualification || "");
      return mapped;
    });
  };

  if (apiUrl && recruiter) {
    showLoader("Fetching candidates from Google Sheets...");
    fetch(`${apiUrl}?action=getCandidates&employee=${encodeURIComponent(recruiter)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          state.candidates = unpackProfileFields(data.data);
          saveCandidatesToLocalStorage(state.candidates);
          showToast("Synced", `Loaded ${state.candidates.length} candidates.`, "success");
        } else {
          const all = unpackProfileFields(JSON.parse(localStorage.getItem("recruitment_mis_candidates")) || []);
          state.candidates = all.filter(c => (c.recruiterName || "").toLowerCase() === recruiter.toLowerCase());
        }
      })
      .catch(() => {
        const all = unpackProfileFields(JSON.parse(localStorage.getItem("recruitment_mis_candidates")) || []);
        state.candidates = all.filter(c => (c.recruiterName || "").toLowerCase() === recruiter.toLowerCase());
      })
      .finally(() => { hideLoader(); renderDashboard(); });
  } else {
    const all = unpackProfileFields(JSON.parse(localStorage.getItem("recruitment_mis_candidates")) || []);
    state.candidates = all.filter(c => (c.recruiterName || "").toLowerCase() === recruiter.toLowerCase());
    renderDashboard();
  }
}

function renderDashboard() {
  const proj = state.projects.find(p => p.id === state.activeProjectId);
  const titleEl = document.getElementById("active-workspace-title");
  if (titleEl && proj) {
    titleEl.textContent = `${proj.name} Workspace`;
  }
  renderKPIs();
  renderCandidatesTable();
}

function renderKPIs() {
  const activeProjCandidates = state.candidates.filter(c => c.projectId === state.activeProjectId);
  
  const total  = activeProjCandidates.length;
  const called = activeProjCandidates.filter(c => c.status !== "Fresh").length;
  const inter  = activeProjCandidates.filter(c => c.status === "Interested" || c.status.startsWith("Willing")).length;
  const notConn = activeProjCandidates.filter(c => c.status === "Call Not Connected").length;
  const followup = activeProjCandidates.filter(c => c.status === "Follow up").length;
  const docSubm  = activeProjCandidates.filter(c => c.status === "Document Submitted" || c.status === "CV Submitted").length;

  set("metric-total-leads", total);
  set("metric-calls-made",  called);
  set("metric-interested",  inter);
  set("metric-not-connected", notConn);
  set("metric-follow-up",   followup);
  set("metric-docs-submitted", docSubm);

  function set(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
  }
}

function getFilteredCandidates() {
  let list = state.candidates.filter(c => c.projectId === state.activeProjectId);
  const filter = state.recruiterStatusFilter || "all";
  if (filter !== "all") {
    list = list.filter(c => c.status === filter);
  }
  if (state.searchQuery) {
    const q = state.searchQuery;
    list = list.filter(c =>
      (c.name||"").toLowerCase().includes(q) ||
      (c.phone||"").includes(q) ||
      (c.highestQualification||"").toLowerCase().includes(q) ||
      (c.jobRole||"").toLowerCase().includes(q) ||
      (c.primarySkills||"").toLowerCase().includes(q)
    );
  }
  return list;
}

function renderCandidatesTable() {
  const tbody   = document.getElementById("candidates-tbody");
  const empty   = document.getElementById("table-empty-state");
  const wrapper = document.getElementById("table-wrapper");
  if (!tbody) return;

  const list = getFilteredCandidates();
  if (list.length === 0) {
    tbody.innerHTML = "";
    wrapper?.classList.add("hidden");
    empty?.classList.remove("hidden");
    return;
  }

  wrapper?.classList.remove("hidden");
  empty?.classList.add("hidden");
  tbody.innerHTML = "";

  list.forEach(cand => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 last:border-0";
    tr.innerHTML = `
      <td class="px-5 py-3.5 whitespace-nowrap">
        <div class="flex flex-col">
          <span class="text-sm font-semibold text-slate-800">${cand.name || "No Name"}</span>
          <span class="text-base font-extrabold text-slate-900 mt-0.5">${cand.phone}</span>
        </div>
      </td>
      <td class="px-5 py-3.5 text-xs text-slate-600">${cand.jobRole || '—'}</td>
      <td class="px-5 py-3.5 text-xs text-slate-600 max-w-[160px] truncate">${cand.highestQualification || '—'}</td>
      <td class="px-5 py-3.5"><span class="${statusClass(cand.status)}">${cand.status}</span></td>
      <td class="px-5 py-3.5 text-right text-xs text-slate-400 font-medium">${fmtDate(cand.lastUpdated || cand.dateAdded)}</td>
    `;
    tr.addEventListener("click", () => openCandidateDrawer(cand.id));
    tbody.appendChild(tr);
  });
}

// ══════════════════════════════════════════════════════════════
// CANDIDATE DRAWER
// ══════════════════════════════════════════════════════════════
function openCandidateDrawer(id) {
  const cand = state.candidates.find(c => c.id === id);
  if (!cand) return;
  state.currentCandidateId = id;

  document.getElementById("drawer-name").value                 = cand.name || "";
  document.getElementById("drawer-phone").value                = cand.phone || "";
  document.getElementById("drawer-email").value                = cand.email || "";
  document.getElementById("drawer-age").value                  = cand.age || "";
  document.getElementById("drawer-gender").value               = cand.gender || "";
  document.getElementById("drawer-experience").value           = cleanNA(cand.yearsOfExperience || cand.experience || "");
  document.getElementById("drawer-currentjob").value           = cand.currentJob || "";
  document.getElementById("drawer-qualification").value        = cleanMeta(cand.highestQualification || cand.qualification || "");
  document.getElementById("drawer-skills").value               = cand.primarySkills || cand.skills || "";
  document.getElementById("drawer-source").value               = cand.source || "Bulk Sheet";

  const roleBadge = document.getElementById("drawer-job-role-badge");
  if (roleBadge) roleBadge.textContent = cand.jobRole || "";

  const statusSel = document.getElementById("drawer-call-status");
  statusSel.value = cand.status || "Fresh";
  toggleDrawerFields(cand.status);

  if (cand.status === "Follow up") {
    document.getElementById("drawer-callback-time").value = cand.callbackTime || "";
  } else if (cand.status === "Document Submitted") {
    const isMerged = cand.documents?.merged || false;
    const mergedCheckbox = document.getElementById("doc-merged-checkbox");
    if (mergedCheckbox) mergedCheckbox.checked = isMerged;
    checkUploadTrigger();
  } else if (cand.status === "Not Suitable") {
    const fc = document.getElementById("drawer-future-category");
    const fr = document.getElementById("drawer-future-remarks");
    if (fc) fc.value = cand.futureCategory || "";
    if (fr) fr.value = cand.futureRemarks || cand.recruiterRemarks || "";
  }

  document.getElementById("drawer-doc-link-container").classList.toggle("hidden", !cand.documentLink);
  if (cand.documentLink) document.getElementById("drawer-doc-link").href = cand.documentLink;

  document.getElementById("upload-status")?.classList.add("hidden");
  document.getElementById("drawer-file-input").value = "";
  document.getElementById("drawer-notes").value = "";

  renderDrawerCustomFields(cand);
  renderHistory(cand);

  const panel   = document.getElementById("action-drawer");
  const overlay = document.getElementById("drawer-overlay");
  overlay.classList.remove("hidden");
  panel.classList.remove("hidden","translate-x-full");
}

function closeCandidateDrawer() {
  const panel   = document.getElementById("action-drawer");
  const overlay = document.getElementById("drawer-overlay");
  if (panel && overlay) {
    panel.classList.add("translate-x-full");
    overlay.classList.add("hidden");
    state.currentCandidateId = null;
  }
}

function renderDrawerCustomFields(cand) {
  const container = document.getElementById("drawer-custom-fields-container");
  const list      = document.getElementById("drawer-custom-fields-list");
  if (!container || !list) return;

  const proj = state.projects.find(p => p.id === cand.projectId);
  const fields = proj?.customFields || [];

  if (fields.length === 0) { container.classList.add("hidden"); return; }
  container.classList.remove("hidden");
  list.innerHTML = "";

  const savedData = cand.customFieldData || {};

  fields.forEach(f => {
    const wrap = document.createElement("div");
    wrap.className = "space-y-1";
    let input = "";
    if (f.type === "dropdown") {
      const opts = (f.options || []).map(o => `<option value="${o}" ${savedData[f.id]===o?"selected":""}>${o}</option>`).join("");
      input = `<select data-field-id="${f.id}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white">${opts}</select>`;
    } else if (f.type === "checkbox") {
      input = `<label class="flex items-center space-x-2"><input type="checkbox" data-field-id="${f.id}" class="h-4 w-4 text-brand-500 rounded" ${savedData[f.id]?"checked":""}><span class="text-xs text-slate-600">${f.label}</span></label>`;
    } else if (f.type === "number") {
      input = `<input type="number" data-field-id="${f.id}" value="${savedData[f.id]||''}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="Enter number">`;
    } else if (f.type === "date") {
      input = `<input type="date" data-field-id="${f.id}" value="${savedData[f.id]||''}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500">`;
    } else {
      input = `<input type="text" data-field-id="${f.id}" value="${savedData[f.id]||''}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="${f.label}">`;
    }
    if (f.type !== "checkbox") {
      wrap.innerHTML = `<label class="text-[10px] font-bold text-slate-500">${f.label}${f.required?' *':''}</label>${input}`;
    } else {
      wrap.innerHTML = input;
    }
    list.appendChild(wrap);
  });
}

function collectCustomFieldData() {
  const data = {};
  document.querySelectorAll("[data-field-id]").forEach(el => {
    const id = el.dataset.fieldId;
    if (el.type === "checkbox") data[id] = el.checked;
    else data[id] = el.value;
  });
  return data;
}

function toggleDrawerFields(status) {
  const followup = document.getElementById("drawer-followup-container");
  const docs     = document.getElementById("drawer-docs-container");
  const bench    = document.getElementById("drawer-futurebench-container");
  const upload   = document.getElementById("drawer-upload-container");

  [followup, docs, bench, upload].forEach(el => el?.classList.add("hidden"));
  if (status === "Follow up") {
    followup?.classList.remove("hidden");
  } else if (status === "Document Submitted") {
    docs?.classList.remove("hidden");
    checkUploadTrigger();
  } else if (status === "Not Suitable") {
    bench?.classList.remove("hidden");
  }
}

function checkUploadTrigger() {
  const isDoc = document.getElementById("drawer-call-status")?.value === "Document Submitted";
  const mergedChecked = document.getElementById("doc-merged-checkbox")?.checked;
  document.getElementById("drawer-upload-container")?.classList.toggle("hidden", !(isDoc && mergedChecked));
}

function renderHistory(cand) {
  const container = document.getElementById("drawer-history-timeline");
  if (!container) return;
  container.innerHTML = "";
  const history = cand.history || [];
  if (history.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 italic">No interaction history.</p>`;
    return;
  }
  [...history].sort((a,b) => new Date(b.date)-new Date(a.date)).forEach(h => {
    const div = document.createElement("div");
    div.className = "flex space-x-3 text-xs";
    div.innerHTML = `
      <div class="flex flex-col items-center">
        <div class="w-2 h-2 bg-brand-500 rounded-full mt-1.5 ring-4 ring-brand-50"></div>
        <div class="w-0.5 flex-grow bg-slate-100 mt-2"></div>
      </div>
      <div class="flex-grow bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-2">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] text-slate-400">${new Date(h.date).toLocaleString()}</span>
          <span class="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">${h.recruiter}</span>
        </div>
        <div class="text-[11px] font-semibold">${h.fromStatus ? `${h.fromStatus} → ` : ''}${h.toStatus}</div>
        ${h.notes ? `<div class="text-slate-500 italic mt-1 border-l-2 border-slate-200 pl-2">"${h.notes}"</div>` : ''}
      </div>
    `;
    container.appendChild(div);
  });
}

function handleSaveLeadSubmit(e) {
  e.preventDefault();
  const cand = state.candidates.find(c => c.id === state.currentCandidateId);
  if (!cand) return;

  const newStatus  = document.getElementById("drawer-call-status").value;
  const newNotes   = document.getElementById("drawer-notes").value.trim();
  const recruiter  = sessionStorage.getItem("recruitment_mis_user") || "Recruiter";
  const origStatus = cand.status;

  const editedName = document.getElementById("drawer-name").value.trim();
  const editedPhone = document.getElementById("drawer-phone").value.trim();
  const editedEmail = document.getElementById("drawer-email").value.trim();
  const editedAge = document.getElementById("drawer-age").value.trim();
  const editedGender = document.getElementById("drawer-gender").value;
  const editedExperience = document.getElementById("drawer-experience").value.trim();
  const editedCurrentJob = document.getElementById("drawer-currentjob").value.trim();
  const editedQualification = document.getElementById("drawer-qualification").value.trim();
  const editedSkills = document.getElementById("drawer-skills").value.trim();
  const editedSource = document.getElementById("drawer-source").value;

  if (editedName) cand.name = editedName;
  cand.phone = editedPhone;
  cand.email = editedEmail;
  cand.age = editedAge;
  cand.gender = editedGender;
  cand.yearsOfExperience = editedExperience;
  cand.currentJob = editedCurrentJob;
  cand.highestQualification = editedQualification;
  cand.primarySkills = editedSkills;
  cand.source = editedSource;

  let callbackTime = "";
  let docs = cand.documents || { merged: false };
  let futureCat="", futureRemarks="";

  if (newStatus === "Follow up") {
    callbackTime = document.getElementById("drawer-callback-time").value;
    if (!callbackTime) { showToast("Required", "Please set a callback date/time.", "warning"); return; }
  } else if (newStatus === "Document Submitted") {
    docs = { merged: document.getElementById("doc-merged-checkbox")?.checked || false };
  } else if (newStatus === "Not Suitable") {
    futureCat  = document.getElementById("drawer-future-category").value.trim();
    futureRemarks = document.getElementById("drawer-future-remarks").value.trim();
    if (!futureCat || !futureRemarks) { showToast("Required", "Enter Skilled Area and remarks.", "warning"); return; }
  }

  const customData = collectCustomFieldData();

  cand.status = newStatus; cand.callbackTime = callbackTime; cand.documents = docs;
  cand.futureCategory = futureCat; cand.futureRemarks = futureRemarks;
  cand.customFieldData = customData;
  cand.lastUpdated = new Date().toISOString();
  if (newNotes) cand.recruiterRemarks = newNotes;
  if (!cand.history) cand.history = [];
  cand.history.push({ date: new Date().toISOString(), fromStatus: origStatus, toStatus: newStatus, notes: newNotes, recruiter });

  if (newStatus === "Not Suitable") {
    const proj = state.projects.find(p => p.id === cand.projectId);
    const benchEntry = {
      benchId: "bench-"+Date.now(), candidateId: cand.id, name: cand.name, phone: cand.phone,
      qualification: cand.highestQualification, category: futureCat, coreQualification: cand.highestQualification,
      skills: cand.primarySkills || "", remarks: futureRemarks || newNotes, recruiterName: recruiter,
      dateTagged: new Date().toISOString(), sourceProjectId: cand.projectId, sourceProjectName: proj?.name||""
    };
    state.futureBench.push(benchEntry);
    localStorage.setItem("recruitment_mis_bench", JSON.stringify(state.futureBench));

    const apiUrl = getApiUrl();
    if (apiUrl) {
      fetch(apiUrl, { method:"POST", headers:{"Content-Type":"text/plain"}, body: JSON.stringify({ action:"addToFutureBench", benchEntry }) }).catch(()=>{});
    }
  }

  saveCandidatesToLocalStorage([cand]);
  closeCandidateDrawer();
  renderKPIs();
  renderCandidatesTable();

  const apiUrl = getApiUrl();
  if (apiUrl) {
    showLoader("Saving to Google Sheets...");
    fetch(apiUrl, { method:"POST", headers:{"Content-Type":"text/plain"}, body: JSON.stringify({ action:"saveCandidate", employee: recruiter, candidate: cand }) })
      .then(r => r.json())
      .then(d => { if(d.success) showToast("Saved", `${cand.name} updated in Sheets.`, "success"); else showToast("Warn", d.error, "warning"); })
      .catch(() => showToast("Offline", `${cand.name} saved locally.`, "warning"))
      .finally(hideLoader);
  } else {
    showToast("Saved", `${cand.name} updated locally.`, "success");
  }
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file || !file.name.endsWith(".pdf")) { showToast("Error", "Please select a PDF file.", "warning"); e.target.value=""; return; }
  const statusEl = document.getElementById("upload-status");
  const statusTxt = document.getElementById("upload-status-text");
  statusEl?.classList.remove("hidden"); if (statusTxt) statusTxt.textContent = "Encoding PDF...";
  const reader = new FileReader();
  reader.onload = () => uploadDocument(file.name, file.type, reader.result);
  reader.readAsDataURL(file);
}

function uploadDocument(name, type, base64) {
  const recruiter = sessionStorage.getItem("recruitment_mis_user") || "Recruiter";
  const cand = state.candidates.find(c => c.id === state.currentCandidateId);
  const proj = state.projects.find(p => p.id === cand?.projectId);
  const statusTxt = document.getElementById("upload-status-text");
  if (statusTxt) statusTxt.textContent = "Uploading to Google Drive...";

  const apiUrl = getApiUrl();
  if (apiUrl) {
    fetch(apiUrl, { method:"POST", headers:{"Content-Type":"text/plain"}, body: JSON.stringify({ action:"uploadDocument", recruiterName:recruiter, candidateName:cand?.name, phone:cand?.phone, post:proj?.name||"Recruitment", fileName:name, fileType:type, fileBase64:base64 }) })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.documentLink) {
          if (cand) cand.documentLink = d.documentLink;
          document.getElementById("drawer-doc-link-container").classList.remove("hidden");
          document.getElementById("drawer-doc-link").href = d.documentLink;
          showToast("Uploaded", "Document saved to Google Drive.", "success");
        } else showToast("Error", d.error||"Upload failed.", "warning");
      })
      .catch(() => showToast("Error", "Upload failed. Check connection.", "warning"))
      .finally(() => document.getElementById("upload-status")?.classList.add("hidden"));
  } else {
    setTimeout(() => {
      const link = `https://drive.google.com/file/d/mock-${Date.now()}/view`;
      if (cand) {
        cand.documentLink = link;
        saveCandidatesToLocalStorage([cand]);
      }
      
      const newDoc = {
        date: new Date().toISOString(),
        recruiterName: recruiter,
        candidateName: cand ? cand.name : "N/A",
        phoneNumber: cand ? cand.phone : "N/A",
        post: proj ? proj.name : "Recruitment",
        documentLink: link
      };
      state.submittedDocs = state.submittedDocs || [];
      state.submittedDocs.unshift(newDoc);
      localStorage.setItem("recruitment_mis_submitted_docs", JSON.stringify(state.submittedDocs));
      
      document.getElementById("drawer-doc-link-container").classList.remove("hidden");
      document.getElementById("drawer-doc-link font-bold").href = link;
      document.getElementById("upload-status")?.classList.add("hidden");
      showToast("Simulated", "Upload simulated (local mode).", "info");
    }, 1500);
  }
}

// ══════════════════════════════════════════════════════════════
// ADD LEAD / CANDIDATE MODAL
// ══════════════════════════════════════════════════════════════
function openAddCandidateModal() {
  const m = document.getElementById("add-candidate-modal");
  m?.classList.remove("hidden");
  m?.classList.add("flex");
  const selectNode = document.getElementById("add-jobrole");
  if (selectNode) {
    selectNode.innerHTML = "";
    const activeP = state.projects.find(p => p.id === state.activeProjectId);
    const roles = activeP?.jobRoles || ["Sales Executive", "Support Rep", "Manager"];
    roles.forEach(r => selectNode.innerHTML += `<option value="${r}">${r}</option>`);
  }
}

function closeAddCandidateModal() {
  const m = document.getElementById("add-candidate-modal");
  m?.classList.add("hidden");
  m?.classList.remove("flex");
  document.getElementById("add-candidate-form")?.reset();
}

function handleAddCandidateSubmit(e) {
  e.preventDefault();
  const recruiter = sessionStorage.getItem("recruitment_mis_user") || "Recruiter";
  const newCand = {
    id: "cand-"+Date.now(),
    projectId: state.activeProjectId,
    jobRole:             document.getElementById("add-jobrole")?.value || "Sales Executive",
    name:                document.getElementById("add-name").value.trim(),
    phone:               document.getElementById("add-phone").value.trim(),
    email:               document.getElementById("add-email")?.value.trim() || "",
    age:                 document.getElementById("add-age")?.value.trim() || "",
    gender:              document.getElementById("add-gender")?.value || "",
    currentJob:          document.getElementById("add-currentjob")?.value.trim() || "",
    source:              "Manual",
    highestQualification: cleanMeta(document.getElementById("add-qualification").value.trim()),
    primarySkills:       document.getElementById("add-skills").value.trim(),
    yearsOfExperience:   cleanNA(document.getElementById("add-experience").value.trim()),
    status: "Fresh",
    callbackTime:"",
    documents: { merged:false },
    futureCategory:"", futureRemarks:"", customFieldData:{},
    recruiterRemarks:    document.getElementById("add-notes")?.value.trim() || "",
    recruiterName:       recruiter,
    dateAdded:           new Date().toISOString(),
    lastUpdated:         new Date().toISOString(),
    documentLink:"",
    history: [{ date:new Date().toISOString(), fromStatus:"", toStatus:"Fresh", notes:"Added manually.", recruiter }]
  };

  state.candidates.push(newCand);
  saveCandidatesToLocalStorage([newCand]);
  closeAddCandidateModal();
  renderKPIs();
  renderCandidatesTable();

  const apiUrl = getApiUrl();
  if (apiUrl) {
    showLoader("Adding lead to Google Sheets...");
    fetch(apiUrl, { method:"POST", headers:{"Content-Type":"text/plain"}, body: JSON.stringify({ action:"saveCandidate", employee:recruiter, candidate:newCand }) })
      .then(r=>r.json()).then(d=>{ if(d.success) showToast("Added",`${newCand.name} added.`,"success"); else showToast("Warn",d.error,"warning"); })
      .catch(()=>showToast("Offline",`${newCand.name} saved locally.`,"warning"))
      .finally(hideLoader);
  } else {
    showToast("Added", `${newCand.name} saved to local storage.`, "success");
  }
}

// ══════════════════════════════════════════════════════════════
// MANAGER PORTAL
// ══════════════════════════════════════════════════════════════
function switchManagerTab(tab) {
  state.activeManagerTab = tab;
  document.querySelectorAll(".mgr-nav-btn").forEach(btn => {
    btn.classList.toggle("active-tab-nav", btn.dataset.tab === tab);
    btn.classList.toggle("font-medium", btn.dataset.tab !== tab);
    btn.classList.toggle("text-slate-500", btn.dataset.tab !== tab);
  });
  document.querySelectorAll(".mgr-tab-panel").forEach(panel => {
    panel.classList.add("hidden");
  });
  const active = document.getElementById(`tab-${tab}`);
  if (active) { active.classList.remove("hidden"); active.classList.add("animate-fade-in"); }

  if (tab === "dashboard")  renderManagerDashboard();
  if (tab === "reports")    renderManagerReports();
  if (tab === "documents")  renderSubmittedDocumentsTab();
  if (tab === "projects")   renderProjectsList();
  if (tab === "employees")  renderEmployeesList();
  if (tab === "bench")      renderFutureBench();
  if (tab === "distribute") { renderDistributionLog(); renderBulkAssignTable(); }
}

function renderManagerDashboard() {
  renderDailyKPIs();
  let dashboardCandidates = state.managerCandidates;
  if (state.activeProjectId) {
    dashboardCandidates = dashboardCandidates.filter(c => c.projectId === state.activeProjectId);
  }
  renderRecruiterMetrics(dashboardCandidates, "mgr-recruiter-metrics-tbody-dashboard");

  const proj = state.projects.find(p => p.id === state.activeProjectId);
  const workspaceTitle = document.getElementById("manager-workspace-title");
  if (workspaceTitle) {
    workspaceTitle.textContent = proj ? `Manager Workspace: ${proj.name}` : `Manager Executive Workspace`;
  }
}

function loadManagerData() {
  const apiUrl = getApiUrl();
  state.employees = JSON.parse(localStorage.getItem("recruitment_mis_employees")) || getDefaultEmployees();

  const unpackProfileFields = (list) => {
    return list.map(c => {
      const mapped = { ...c };
      if (mapped.customFieldData) {
        if (!mapped.age) mapped.age = mapped.customFieldData.age || "";
        if (!mapped.gender) mapped.gender = mapped.customFieldData.gender || "";
        if (!mapped.currentJob) mapped.currentJob = mapped.customFieldData.currentJob || "";
      }
      mapped.yearsOfExperience = cleanNA(mapped.yearsOfExperience || mapped.experience || "");
      mapped.experience = cleanNA(mapped.experience || mapped.yearsOfExperience || "");
      mapped.highestQualification = cleanMeta(mapped.highestQualification || mapped.qualification || "");
      mapped.qualification = cleanMeta(mapped.qualification || mapped.highestQualification || "");
      return mapped;
    });
  };

  const updateUI = () => {
    populateManagerSelectors();
    renderProjectSelection();
    if (state.activeManagerTab === "dashboard") {
      renderManagerDashboard();
    } else if (state.activeManagerTab === "reports") {
      renderManagerReports();
    } else if (state.activeManagerTab === "documents") {
      renderSubmittedDocumentsTab();
    } else if (state.activeManagerTab === "projects") {
      renderProjectsList();
    } else if (state.activeManagerTab === "employees") {
      renderEmployeesList();
    } else if (state.activeManagerTab === "bench") {
      renderFutureBench();
    } else if (state.activeManagerTab === "distribute") {
      renderDistributionLog();
      renderBulkAssignTable();
    }
  };

  if (apiUrl) {
    showLoader("Loading manager data...");
    
    const pEmployees = fetch(`${apiUrl}?action=getEmployees`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          state.employees = d.data;
          localStorage.setItem("recruitment_mis_employees", JSON.stringify(state.employees));
        }
      }).catch(err => console.warn("Failed to load employees:", err));

    const pProjects = fetch(`${apiUrl}?action=getProjects`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data.length) {
          state.projects = d.data;
          localStorage.setItem("recruitment_mis_projects", JSON.stringify(state.projects));
        }
      }).catch(err => console.warn("Failed to load projects:", err));

    const pCandidates = fetch(`${apiUrl}?action=getManagerReport`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          state.managerCandidates = unpackProfileFields(d.data);
        } else {
          state.managerCandidates = unpackProfileFields(JSON.parse(localStorage.getItem("recruitment_mis_candidates")) || []);
        }
      }).catch(err => {
        console.warn("Failed to load manager candidates:", err);
        state.managerCandidates = unpackProfileFields(JSON.parse(localStorage.getItem("recruitment_mis_candidates")) || []);
      });

    const pBench = fetch(`${apiUrl}?action=getFutureBench`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          state.futureBench = d.data;
          localStorage.setItem("recruitment_mis_bench", JSON.stringify(state.futureBench));
        }
      }).catch(err => {
        console.warn("Failed to load future bench:", err);
        state.futureBench = JSON.parse(localStorage.getItem("recruitment_mis_bench")) || [];
      });

    const pDocs = fetch(`${apiUrl}?action=getSubmittedDocuments`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          state.submittedDocs = d.data;
          localStorage.setItem("recruitment_mis_submitted_docs", JSON.stringify(state.submittedDocs));
        }
      }).catch(err => {
        console.warn("Failed to load submitted documents:", err);
        state.submittedDocs = JSON.parse(localStorage.getItem("recruitment_mis_submitted_docs")) || [];
      });

    const pDistLog = fetch(`${apiUrl}?action=getDistributionLog`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          state.distributionLog = d.data;
        }
      }).catch(err => {
        console.warn("Failed to load distribution log:", err);
        state.distributionLog = JSON.parse(localStorage.getItem("recruitment_mis_distlog")) || [];
      });

    Promise.all([pEmployees, pProjects, pCandidates, pBench, pDocs, pDistLog])
      .finally(() => {
        hideLoader();
        updateUI();
        showToast("Loaded", "Manager dashboard synced.", "success");
      });
  } else {
    state.managerCandidates = unpackProfileFields(JSON.parse(localStorage.getItem("recruitment_mis_candidates")) || []);
    state.futureBench = JSON.parse(localStorage.getItem("recruitment_mis_bench")) || [];
    state.distributionLog = JSON.parse(localStorage.getItem("recruitment_mis_distlog")) || [];
    state.submittedDocs = JSON.parse(localStorage.getItem("recruitment_mis_submitted_docs")) || [];
    updateUI();
  }
}

function populateManagerSelectors() {
  const recruiters = state.employees.filter(e => !isManagerRole(e.designation));
  const allProjects = state.projects;

  const recFilter = document.getElementById("report-filter-recruiter");
  if (recFilter) {
    recFilter.innerHTML = `<option value="all">All Recruiters</option>`;
    recruiters.forEach(r => recFilter.innerHTML += `<option value="${r.name}">${r.name}</option>`);
  }
  const projFilter = document.getElementById("report-filter-project");
  if (projFilter) {
    projFilter.innerHTML = `<option value="all">All Projects</option>`;
    allProjects.filter(p => p.status !== "Deleted").forEach(p => projFilter.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    if (state.activeProjectId) {
      projFilter.value = state.activeProjectId;
      state.reportProject = state.activeProjectId;
    } else {
      projFilter.value = "all";
      state.reportProject = "all";
    }
  }
  const distRec = document.getElementById("distribute-recruiter");
  if (distRec) {
    distRec.innerHTML = "";
    recruiters.forEach(r => distRec.innerHTML += `<option value="${r.name}">${r.name}</option>`);
  }
  const distProj = document.getElementById("distribute-project");
  if (distProj) {
    distProj.innerHTML = `<option value="">-- Select Project --</option>`;
    allProjects.filter(p => p.status === "Active" || !p.status).forEach(p => distProj.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    if (state.activeProjectId) {
      distProj.value = state.activeProjectId;
    }
  }
  const assigneeBox = document.getElementById("assignee-checkboxes");
  if (assigneeBox) {
    assigneeBox.innerHTML = "";
    const manager = sessionStorage.getItem("recruitment_mis_user");
    state.employees.forEach(emp => {
      const isSelf = emp.name === manager;
      assigneeBox.innerHTML += `
        <label class="flex items-center space-x-2 font-medium text-slate-700 text-xs">
          <input type="checkbox" name="assignee" value="${emp.name}" class="h-3.5 w-3.5 rounded text-brand-500 border-slate-300">
          <span>${emp.name}${isSelf?' (You)':''}</span>
          <span class="text-[10px] text-slate-400">${emp.designation}</span>
        </label>`;
    });
  }
  const benchRec = document.getElementById("bench-filter-recruiter");
  if (benchRec) {
    benchRec.innerHTML = `<option value="all">All Recruiters</option>`;
    recruiters.forEach(r => benchRec.innerHTML += `<option value="${r.name}">${r.name}</option>`);
  }
  const docRecFilter = document.getElementById("doc-recruiter-filter");
  if (docRecFilter) {
    docRecFilter.innerHTML = `<option value="all">👥 All Recruiters</option>`;
    recruiters.forEach(r => docRecFilter.innerHTML += `<option value="${r.name}">${r.name}</option>`);
    docRecFilter.value = state.docRecruiterFilter || "all";
  }
  renderBulkAssignTable();
}

function renderDailyKPIs() {
  const today = todayStr();
  let all   = state.managerCandidates;
  if (state.activeProjectId) {
    all = all.filter(c => c.projectId === state.activeProjectId);
  }
  const todayCands = all.filter(c => {
    const d = (c.lastUpdated || c.dateAdded || "");
    return d.slice(0,10) === today;
  });

  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set("daily-calls",          todayCands.filter(c=>c.status!=="Fresh").length);
  set("daily-interested",     todayCands.filter(c=>c.status==="Interested").length);
  set("daily-docs-submitted", todayCands.filter(c=>c.status==="Document Submitted" || c.status==="CV Submitted").length);
  set("daily-passed",         todayCands.filter(c=>c.status==="Interview Passed" || c.status==="Exam Passed").length);
  set("daily-rejected",       todayCands.filter(c=>c.status==="Not Interested").length);
  set("daily-followup",       todayCands.filter(c=>c.status==="Follow up").length);
  set("daily-completed",      todayCands.filter(c=>c.status==="Travelled" || c.status==="Selected" || c.status==="In Processing").length);
}

function applyReportFilters() {
  state.reportDateRange  = document.querySelector(".active-date-filter")?.dataset.range || "today";
  state.reportDateFrom   = document.getElementById("filter-date-from")?.value || "";
  state.reportDateTo     = document.getElementById("filter-date-to")?.value || "";
  state.reportRecruiter  = document.getElementById("report-filter-recruiter")?.value || "all";
  state.reportProject    = document.getElementById("report-filter-project")?.value || "all";
  renderManagerReports();
}

function renderManagerReports() {
  const all = state.managerCandidates;
  let filtered = [...all];

  if (state.reportDateRange !== "all") {
    filtered = filtered.filter(c => {
      const d = c.lastUpdated || c.dateAdded || "";
      return inDateRange(d, state.reportDateRange);
    });
  }
  if (state.reportRecruiter !== "all") filtered = filtered.filter(c => c.recruiterName === state.reportRecruiter);
  if (state.reportProject   !== "all") filtered = filtered.filter(c => c.projectId     === state.reportProject);

  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set("rep-calls",     filtered.filter(c=>c.status!=="Fresh").length);
  set("rep-interested",filtered.filter(c=>c.status==="Interested").length);
  set("rep-rejected",  filtered.filter(c=>c.status==="Not Interested").length);
  set("rep-followup",  filtered.filter(c=>c.status==="Follow up").length);
  set("rep-bench",     filtered.filter(c=>c.status==="Not Suitable").length);
  set("rep-willing",   filtered.filter(c=>c.status==="Willing to Attend Interview").length);
  set("rep-passed",    filtered.filter(c=>c.status==="Interview Passed" || c.status==="Exam Passed").length);
  set("rep-completed", filtered.filter(c=>c.status==="In Processing").length);
  set("rep-travelled", filtered.filter(c=>c.status==="Travelled" || c.status==="Selected").length);
  set("rep-docs-submitted", filtered.filter(c=>c.status==="Document Submitted" || c.status==="CV Submitted").length);

  const badge = document.getElementById("report-count-badge");
  if (badge) badge.textContent = `${filtered.length} records`;

  const tbody = document.getElementById("mgr-candidates-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-slate-400 italic text-xs">No records match the selected filters.</td></tr>`;
  } else {
    filtered.forEach(c => {
      const proj = state.projects.find(p => p.id === c.projectId);
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50 border-b border-slate-100 last:border-0";
      tr.innerHTML = `
        <td class="px-4 py-3 font-semibold text-slate-800">${c.name || "No Name"}</td>
        <td class="px-4 py-3 text-slate-700 text-sm font-medium">${c.phone||'—'}</td>
        <td class="px-4 py-3 text-slate-500">${c.jobRole||'—'}</td>
        <td class="px-4 py-3"><span class="text-[10px] font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">${c.recruiterName||'—'}</span></td>
        <td class="px-4 py-3 text-slate-500">${proj?proj.name.split('-')[0].split('—')[0].trim():'—'}</td>
        <td class="px-4 py-3"><span class="${statusClass(c.status)}">${c.status}</span></td>
        <td class="px-4 py-3 text-slate-400 text-[10px]">${fmtDate(c.lastUpdated)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderRecruiterMetrics(filtered);
}

function addJobRoleField() {
  const container = document.getElementById("job-roles-container");
  if (!container) return;
  const div = document.createElement("div");
  div.className = "flex gap-1.5 animate-fade-in";
  div.innerHTML = `
    <input type="text" class="job-role-input flex-grow px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="Job role name">
    <button type="button" class="remove-role-btn px-2 text-slate-300 hover:text-rose-500 transition-colors text-sm">✕</button>
  `;
  div.querySelector(".remove-role-btn").addEventListener("click", () => div.remove());
  container.appendChild(div);
}

document.addEventListener("click", e => {
  if (e.target.classList.contains("remove-role-btn")) e.target.closest(".flex")?.remove();
  if (e.target.classList.contains("remove-cf-btn"))   e.target.closest(".custom-field-row")?.remove();
});

function addCustomFieldRow() {
  const container = document.getElementById("custom-fields-container");
  if (!container) return;
  const div = document.createElement("div");
  div.className = "custom-field-row";
  div.innerHTML = `
    <div class="flex gap-2 items-start">
      <div class="flex-grow">
        <label class="text-[10px] font-bold text-slate-500 block mb-1">Field Label *</label>
        <input type="text" class="cf-label w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="e.g. Notice Period">
      </div>
      <div>
        <label class="text-[10px] font-bold text-slate-500 block mb-1">Type *</label>
        <select class="cf-type text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
          <option value="text">Text Input</option>
          <option value="dropdown">Dropdown</option>
          <option value="checkbox">Checkbox</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
        </select>
      </div>
      <button type="button" class="remove-cf-btn mt-5 text-slate-300 hover:text-rose-500 text-sm transition-colors">✕</button>
    </div>
    <div class="cf-options-wrap hidden">
      <label class="text-[10px] font-bold text-slate-500 block mb-1">Dropdown Options (comma-separated) *</label>
      <input type="text" class="cf-options w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="Option A, Option B, Option C">
    </div>
    <label class="flex items-center space-x-2 text-xs">
      <input type="checkbox" class="cf-required h-3.5 w-3.5 rounded text-brand-500">
      <span class="text-slate-500">Required field</span>
    </label>
  `;
  div.querySelector(".cf-type").addEventListener("change", function() {
    div.querySelector(".cf-options-wrap").classList.toggle("hidden", this.value !== "dropdown");
  });
  container.appendChild(div);
}

function collectCustomProjectFields() {
  const rows = document.querySelectorAll(".custom-field-row");
  const fields = [];
  rows.forEach((row, i) => {
    const label = row.querySelector(".cf-label")?.value.trim();
    const type  = row.querySelector(".cf-type")?.value;
    const req   = row.querySelector(".cf-required")?.checked || false;
    const opts  = row.querySelector(".cf-options")?.value.split(",").map(o=>o.trim()).filter(Boolean) || [];
    if (!label) return;
    fields.push({ id: `field-${i}-${Date.now()}`, label, type, required: req, options: opts });
  });
  return fields;
}

function handleCreateProjectSubmit(e) {
  e.preventDefault();
  const name       = document.getElementById("proj-name").value.trim();
  const openings   = parseInt(document.getElementById("proj-vacancies").value) || 0;
  const location   = document.getElementById("proj-location")?.value.trim() || "India";
  const details    = document.getElementById("proj-details").value.trim();
  const jobRoles   = Array.from(document.querySelectorAll(".job-role-input")).map(i=>i.value.trim()).filter(Boolean);
  const assignees  = Array.from(document.querySelectorAll('input[name="assignee"]:checked')).map(cb=>cb.value);
  const customFields = collectCustomProjectFields();
  const manager    = sessionStorage.getItem("recruitment_mis_user") || "Manager";

  if (assignees.length === 0) { showToast("Required", "Assign at least one recruiter.", "warning"); return; }

  const proj = { id:"project-"+Date.now(), name, location, openings, details, jobRoles, customFields, assignedRecruiters:assignees, createdBy:manager, createdDate:new Date().toISOString(), status: "Active" };
  state.projects.push(proj);
  localStorage.setItem("recruitment_mis_projects", JSON.stringify(state.projects));
  document.getElementById("create-project-form").reset();
  document.getElementById("job-roles-container").innerHTML = `<div class="flex gap-1.5"><input type="text" class="job-role-input flex-grow px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="e.g. Sales Executive"><button type="button" class="remove-role-btn px-2 text-slate-300 hover:text-rose-500">✕</button></div>`;
  document.getElementById("custom-fields-container").innerHTML = "";
  populateManagerSelectors();
  renderProjectsList();

  const apiUrl = getApiUrl();
  if (apiUrl) {
    showLoader("Saving project to Sheets...");
    fetch(apiUrl, { method:"POST", headers:{"Content-Type":"text/plain"}, body: JSON.stringify({ action:"createProject", project:proj }) })
      .then(r=>r.json()).then(d=>{ if(d.success) showToast("Created",`${name} saved to Sheets.`,"success"); else showToast("Warn",d.error,"warning"); })
      .catch(()=>showToast("Offline",`${name} saved locally.`,"warning"))
      .finally(hideLoader);
  } else {
    showToast("Created", `${name} project created.`, "success");
  }
}

function renderProjectsList() {
  const tbody = document.getElementById("projects-list-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (state.projects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-6 text-center text-slate-400 italic text-xs">No projects yet. Create your first project using the form.</td></tr>`;
    return;
  }
  state.projects.forEach(p => {
    const status = p.status || "Active";

    let statusBadge = "";
    if (status === "Active") {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">● Active</span>`;
    } else if (status === "Completed") {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-bold border border-sky-100">✔ Completed</span>`;
    } else if (status === "Stopped") {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-100">⏸ Stopped</span>`;
    } else if (status === "Deleted") {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-100">✕ Deleted</span>`;
    }

    let actionButtons = "";
    if (status !== "Deleted") {
      actionButtons += `
        <button class="assign-btn inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-100 px-2 py-1 rounded-lg transition-all mr-1" title="Edit Project">
          ✏️ Edit
        </button>
      `;
    }
    
    if (status === "Active") {
      actionButtons += `
        <button class="complete-btn inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-100 px-2 py-1 rounded-lg transition-all mr-1" title="Mark as Completed">
          ✔ Complete
        </button>
        <button class="stop-btn inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-100 px-2 py-1 rounded-lg transition-all mr-1" title="Stop Project">
          ⏸ Stop
        </button>
        <button class="delete-status-btn inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-2 py-1 rounded-lg transition-all" title="Delete Project">
          🗑 Delete
        </button>
      `;
    } else if (status === "Completed") {
      actionButtons += `
        <button class="activate-btn inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2 py-1 rounded-lg transition-all mr-1" title="Reactivate Project">
          ● Activate
        </button>
        <button class="stop-btn inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-100 px-2 py-1 rounded-lg transition-all mr-1" title="Stop Project">
          ⏸ Stop
        </button>
        <button class="delete-status-btn inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-2 py-1 rounded-lg transition-all" title="Delete Project">
          🗑 Delete
        </button>
      `;
    } else if (status === "Stopped") {
      actionButtons += `
        <button class="activate-btn inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2 py-1 rounded-lg transition-all mr-1" title="Reactivate Project">
          ● Activate
        </button>
        <button class="complete-btn inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-100 px-2 py-1 rounded-lg transition-all mr-1" title="Mark as Completed">
          ✔ Complete
        </button>
        <button class="delete-status-btn inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-2 py-1 rounded-lg transition-all" title="Delete Project">
          🗑 Delete
        </button>
      `;
    } else if (status === "Deleted") {
      actionButtons += `
        <button class="activate-btn inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2.5 py-1 rounded-lg transition-all mr-1" title="Restore Project">
          Restore
        </button>
        <button class="perm-delete-btn inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-200 px-2.5 py-1 rounded-lg transition-all" title="Permanently Delete">
          Delete Permanently
        </button>
      `;
    }

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 border-b border-slate-100 last:border-0";
    tr.innerHTML = `
      <td class="px-4 py-3 font-semibold text-slate-800">${p.name}</td>
      <td class="px-4 py-3 text-slate-500">${p.location||'—'}</td>
      <td class="px-4 py-3 text-slate-800 font-bold">${p.openings||0}</td>
      <td class="px-4 py-3">
        <div class="flex flex-wrap gap-1">
          ${(p.jobRoles||[]).slice(0,3).map(r=>`<span class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">${r}</span>`).join('')}
          ${(p.jobRoles||[]).length>3?`<span class="text-[9px] text-slate-400">+${p.jobRoles.length-3}</span>`:''}
        </div>
      </td>
      <td class="px-4 py-3 text-slate-500">${(p.assignedRecruiters||[]).join(', ')||'All'}</td>
      <td class="px-4 py-3 text-center">${statusBadge}</td>
      <td class="px-4 py-3 text-right">${actionButtons}</td>
    `;

    const assignBtn = tr.querySelector(".assign-btn");
    if (assignBtn) assignBtn.addEventListener("click", (e) => { e.stopPropagation(); openEditProjectModal(p.id); });

    const actBtn = tr.querySelector(".activate-btn");
    if (actBtn) actBtn.addEventListener("click", (e) => { e.stopPropagation(); updateProjectStatus(p.id, "Active"); });

    const compBtn = tr.querySelector(".complete-btn");
    if (compBtn) compBtn.addEventListener("click", (e) => { e.stopPropagation(); updateProjectStatus(p.id, "Completed"); });

    const stopBtn = tr.querySelector(".stop-btn");
    if (stopBtn) stopBtn.addEventListener("click", (e) => { e.stopPropagation(); updateProjectStatus(p.id, "Stopped"); });

    const delStatBtn = tr.querySelector(".delete-status-btn");
    if (delStatBtn) delStatBtn.addEventListener("click", (e) => { e.stopPropagation(); updateProjectStatus(p.id, "Deleted"); });

    const permDelBtn = tr.querySelector(".perm-delete-btn");
    if (permDelBtn) permDelBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteProjectPermanently(p.id, p.name); });

    tbody.appendChild(tr);
  });
}

function openEditProjectModal(projectId) {
  const proj = state.projects.find(p => p.id === projectId);
  if (!proj) return;

  document.getElementById("edit-project-id").value = proj.id;

  const nameEl = document.getElementById("edit-project-name");
  if (nameEl) { nameEl.removeAttribute("disabled"); nameEl.value = proj.name || ""; }
  const locEl  = document.getElementById("edit-project-location");
  if (locEl)  locEl.value  = proj.location  || "";
  const vacEl  = document.getElementById("edit-project-vacancies");
  if (vacEl)  vacEl.value  = proj.openings  || 0;
  const detEl  = document.getElementById("edit-project-details");
  if (detEl)  detEl.value  = proj.details   || "";

  const statEl = document.getElementById("edit-project-status");
  if (statEl)  statEl.value = proj.status || "Active";

  const rolesContainer = document.getElementById("edit-job-roles-container");
  if (rolesContainer) {
    rolesContainer.innerHTML = "";
    const roles = (proj.jobRoles || []).length > 0 ? proj.jobRoles : [""];
    roles.forEach(role => {
      const div = document.createElement("div");
      div.className = "flex gap-1.5";
      div.innerHTML = `
        <input type="text" class="edit-job-role-input flex-grow px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" value="${role}" placeholder="Job role name">
        <button type="button" class="remove-edit-role-btn px-2 text-slate-300 hover:text-rose-500 transition-colors text-sm">✕</button>
      `;
      div.querySelector(".remove-edit-role-btn").addEventListener("click", () => div.remove());
      rolesContainer.appendChild(div);
    });
  }

  const addRoleBtn = document.getElementById("edit-add-role-btn");
  if (addRoleBtn) {
    addRoleBtn.onclick = () => {
      const div = document.createElement("div");
      div.className = "flex gap-1.5 animate-fade-in";
      div.innerHTML = `
        <input type="text" class="edit-job-role-input flex-grow px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="Job role name">
        <button type="button" class="remove-edit-role-btn px-2 text-slate-300 hover:text-rose-500 transition-colors text-sm">✕</button>
      `;
      div.querySelector(".remove-edit-role-btn").addEventListener("click", () => div.remove());
      rolesContainer.appendChild(div);
    };
  }

  const recruiters = state.employees.filter(e => e.designation !== "Manager");
  const cbContainer = document.getElementById("edit-project-assignee-checkboxes");
  if (cbContainer) {
    cbContainer.innerHTML = "";
    if (recruiters.length === 0) {
      cbContainer.innerHTML = `<p class="text-slate-400 text-xs italic">No recruiters found. Add employees first.</p>`;
    } else {
      recruiters.forEach(r => {
        const isChecked = (proj.assignedRecruiters || []).some(a => a.toLowerCase() === r.name.toLowerCase());
        const label = document.createElement("label");
        label.className = "flex items-center space-x-2.5 cursor-pointer hover:bg-white p-1.5 rounded-lg transition-colors";
        label.innerHTML = `
          <input type="checkbox" name="edit-assignee" value="${r.name}" ${isChecked ? "checked" : ""} class="h-3.5 w-3.5 rounded text-brand-500">
          <span class="text-slate-700 font-medium">${r.name}</span>
          <span class="text-slate-400 text-[10px]">${r.designation}</span>
        `;
        cbContainer.appendChild(label);
      });
    }
  }

  const modal = document.getElementById("edit-project-modal");
  if (modal) { modal.classList.remove("hidden"); modal.classList.add("flex"); }
}

function closeEditProjectModal() {
  const modal = document.getElementById("edit-project-modal");
  if (modal) { modal.classList.add("hidden"); modal.classList.remove("flex"); }
}

function handleEditProjectSubmit(e) {
  e.preventDefault();
  const projId    = document.getElementById("edit-project-id").value;
  const name      = (document.getElementById("edit-project-name")?.value || "").trim();
  const location  = (document.getElementById("edit-project-location")?.value || "").trim();
  const vacancies = parseInt(document.getElementById("edit-project-vacancies")?.value) || 0;
  const details   = (document.getElementById("edit-project-details")?.value || "").trim();
  const status    = document.getElementById("edit-project-status")?.value || "Active";
  const jobRoles  = Array.from(document.querySelectorAll(".edit-job-role-input")).map(i => i.value.trim()).filter(Boolean);
  const assignees = Array.from(document.querySelectorAll('input[name="edit-assignee"]:checked')).map(cb => cb.value);

  if (!name) { showToast("Required", "Project name is required.", "warning"); return; }
  if (assignees.length === 0) { showToast("Required", "Assign at least one recruiter.", "warning"); return; }

  const proj = state.projects.find(p => p.id === projId);
  if (!proj) return;

  proj.name               = name;
  proj.location           = location;
  proj.openings           = vacancies;
  proj.details            = details;
  proj.status             = status;
  proj.jobRoles           = jobRoles;
  proj.assignedRecruiters = assignees;
  proj.lastModified       = new Date().toISOString();

  localStorage.setItem("recruitment_mis_projects", JSON.stringify(state.projects));
  closeEditProjectModal();
  renderProjectsList();
  populateManagerSelectors();
  renderProjectSelection();
  showToast("Project Updated", `"${name}" saved successfully.`, "success");

  const apiUrl = getApiUrl();
  if (apiUrl) {
    showLoader("Updating project in Sheets...");
    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "updateProject",
        project: { id: projId, name, location, openings: vacancies, details, status, jobRoles, assignedRecruiters: assignees }
      })
    })
      .then(r => r.json())
      .then(d => { if (!d.success) { showToast("Warn", "Sheets update failed.", "warning"); pushPendingSync("updateProject", { project: { id: projId, name, location, openings: vacancies, details, status, jobRoles, assignedRecruiters: assignees } }); } })
      .catch(() => { showToast("Offline", "Saved locally.", "warning"); pushPendingSync("updateProject", { project: { id: projId, name, location, openings: vacancies, details, status, jobRoles, assignedRecruiters: assignees } }); })
      .finally(hideLoader);
  }
}

function pushPendingSync(action, payload) {
  const queue = JSON.parse(localStorage.getItem("recruitment_mis_pending_sync") || "[]");
  queue.push({ action, payload, timestamp: new Date().toISOString() });
  localStorage.setItem("recruitment_mis_pending_sync", JSON.stringify(queue));
}

function drainPendingSync() {
  const apiUrl = getApiUrl();
  if (!apiUrl) return;
  const queue = JSON.parse(localStorage.getItem("recruitment_mis_pending_sync") || "[]");
  if (queue.length === 0) return;

  const remaining = [];
  const promises = queue.map(item =>
    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: item.action, ...item.payload })
    })
      .then(r => r.json())
      .then(d => { if (!d.success) remaining.push(item); })
      .catch(() => remaining.push(item))
  );
  Promise.all(promises).then(() => {
    localStorage.setItem("recruitment_mis_pending_sync", JSON.stringify(remaining));
  });
}

function updateProjectStatus(projectId, newStatus) {
  const proj = state.projects.find(p => p.id === projectId);
  if (!proj) return;
  
  proj.status = newStatus;
  localStorage.setItem("recruitment_mis_projects", JSON.stringify(state.projects));
  
  renderProjectsList();
  populateManagerSelectors();
  renderManagerReports();
  showToast("Status Updated", `"${proj.name}" is now ${newStatus}.`, "success");
  
  const apiUrl = getApiUrl();
  if (apiUrl) {
    showLoader("Updating project status in Sheets...");
    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "updateProjectStatus", projectId, status: newStatus })
    })
      .then(r => r.json())
      .catch(() => {})
      .finally(hideLoader);
  }
}

function deleteProjectPermanently(projectId, projectName) {
  const confirmed = window.confirm(`Permanently Delete "${projectName}"?\n\nThis action CANNOT be undone.`);
  if (!confirmed) return;

  state.projects = state.projects.filter(p => p.id !== projectId);
  localStorage.setItem("recruitment_mis_projects", JSON.stringify(state.projects));

  renderProjectsList();
  populateManagerSelectors();
  renderManagerReports();
  showToast("Deleted", `"${projectName}" removed permanently.`, "success");

  const apiUrl = getApiUrl();
  if (apiUrl) {
    showLoader("Deleting project permanently from Sheets...");
    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "deleteProject", projectId })
    })
      .then(r => r.json())
      .catch(() => {})
      .finally(hideLoader);
  }
}

function handleAddEmployeeSubmit(e) {
  e.preventDefault();
  const name  = document.getElementById("emp-name").value.trim();
  const desig = document.getElementById("emp-designation").value;
  const uname = document.getElementById("emp-username").value.trim().toLowerCase();
  const pass  = document.getElementById("emp-password").value.trim();
  const errEl = document.getElementById("add-employee-error");

  if (!name||!desig||!uname||!pass) { errEl.textContent="All fields required."; errEl.classList.remove("hidden"); return; }
  if (state.employees.some(e=>e.username.toLowerCase()===uname)) { errEl.textContent="Username already exists."; errEl.classList.remove("hidden"); return; }
  errEl.classList.add("hidden");

  const emp = { name, designation:desig, username:uname, password:pass };
  state.employees.push(emp);
  localStorage.setItem("recruitment_mis_employees", JSON.stringify(state.employees));
  document.getElementById("add-employee-form").reset();
  populateManagerSelectors();
  renderEmployeesList();

  const apiUrl = getApiUrl();
  if (apiUrl) {
    showLoader("Adding employee to Sheets...");
    fetch(apiUrl, { method:"POST", headers:{"Content-Type":"text/plain"}, body: JSON.stringify({ action:"addEmployee", employee:emp }) })
      .then(r=>r.json()).then(d=>{ if(d.success) showToast("Added",`${name} added.`,"success"); })
      .catch(()=>showToast("Offline",`${name} saved locally.`,"warning"))
      .finally(hideLoader);
  } else {
    showToast("Added", `${name} added locally.`, "success");
  }
}

function renderEmployeesList() {
  const tbody = document.getElementById("employees-list-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  state.employees.forEach(emp => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 border-b border-slate-100 last:border-0";
    tr.innerHTML = `
      <td class="px-4 py-3 font-semibold text-slate-800">${emp.name}</td>
      <td class="px-4 py-3 text-slate-500">${emp.designation}</td>
      <td class="px-4 py-3 text-slate-500 font-mono">${emp.username}</td>
      <td class="px-4 py-3 text-right text-slate-400 font-mono">${emp.password}</td>
    `;
    tbody.appendChild(tr);
  });
}

function applyBenchFilters() {
  renderFutureBench();
}

function renderFutureBench() {
  const tbody = document.getElementById("bench-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const catFilter = document.getElementById("bench-filter-category")?.value || "all";
  const recFilter = document.getElementById("bench-filter-recruiter")?.value || "all";
  const searchQuery = document.getElementById("bench-search")?.value.trim().toLowerCase() || "";

  let filtered = [...state.futureBench];
  if (catFilter !== "all") filtered = filtered.filter(b=>b.category === catFilter);
  if (recFilter !== "all") filtered = filtered.filter(b=>b.recruiterName === recFilter);
  if (searchQuery) filtered = filtered.filter(b=>
    (b.name||"").toLowerCase().includes(searchQuery) ||
    (b.phone||"").includes(searchQuery) ||
    (b.category||"").toLowerCase().includes(searchQuery)
  );

  document.getElementById("bench-total").textContent = state.futureBench.length;
  document.getElementById("bench-count-badge").textContent = `${filtered.length} records`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-8 text-center text-slate-400 italic text-xs">No bench candidates match the filters.</td></tr>`;
    return;
  }

  filtered.forEach(b => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 border-b border-slate-100 last:border-0";
    tr.innerHTML = `
      <td class="px-4 py-3 font-semibold text-slate-800">${b.name || "No Name"}</td>
      <td class="px-4 py-3 text-slate-500">${b.phone}</td>
      <td class="px-4 py-3 text-slate-500 text-xs">${b.qualification||'—'}</td>
      <td class="px-4 py-3"><span class="text-[10px] font-semibold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">${b.category||'—'}</span></td>
      <td class="px-4 py-3 text-slate-500 max-w-[150px] truncate" title="${b.remarks||''}">${b.remarks||'—'}</td>
      <td class="px-4 py-3 text-slate-600 font-medium">${b.recruiterName||'—'}</td>
      <td class="px-4 py-3 text-slate-400 text-[10px]">${fmtDate(b.dateTagged)}</td>
      <td class="px-4 py-3 text-slate-500 text-xs">${b.sourceProjectName||'—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function onDistributeProjectChange() {
  const projId = document.getElementById("distribute-project")?.value;
  const proj   = state.projects.find(p=>p.id===projId);
  const wrap   = document.getElementById("dist-jobrole-wrap");
  const sel    = document.getElementById("distribute-jobrole");
  if (!proj || !proj.jobRoles || proj.jobRoles.length===0) {
    wrap?.classList.add("hidden");
  } else {
    wrap?.classList.remove("hidden");
    if (sel) {
      sel.innerHTML = `<option value="">— All Roles / General —</option>`;
      proj.jobRoles.forEach(r=>{ const o=document.createElement("option"); o.value=r; o.textContent=r; sel.appendChild(o); });
    }
  }
  renderBulkAssignTable();
}

function renderSubmittedDocumentsTab() {
  const totalEl = document.getElementById("docs-summary-total");
  const todayEl = document.getElementById("docs-summary-today");
  const rateEl  = document.getElementById("docs-summary-rate");
  const weekEl  = document.getElementById("docs-summary-week");
  const badgeEl = document.getElementById("docs-tab-count-badge");
  const tbodyEl = document.getElementById("mgr-docs-tbody");

  let docs = state.submittedDocs || [];
  let totalCandidates = state.managerCandidates || [];

  if (state.activeProjectId) {
    const activeProj = state.projects.find(p => p.id === state.activeProjectId);
    if (activeProj) {
      docs = docs.filter(d => d.post === activeProj.name || d.projectId === state.activeProjectId);
      totalCandidates = totalCandidates.filter(c => c.projectId === state.activeProjectId);
    }
  }

  if (state.docRecruiterFilter && state.docRecruiterFilter !== "all") {
    docs = docs.filter(d => d.recruiterName === state.docRecruiterFilter);
    totalCandidates = totalCandidates.filter(c => c.recruiterName === state.docRecruiterFilter);
  }

  const todayDocs = docs.filter(d => isToday(d.date)).length;
  const weekDocs = docs.filter(d => inDocDateRange(d.date, "week")).length;
  const periodDocs = docs.filter(d => inDocDateRange(d.date, state.docDateRange));
  const periodDocsCount = periodDocs.length;

  const totalLeads = totalCandidates.length;
  const rate = totalLeads > 0 ? Math.round((periodDocsCount / totalLeads) * 100) : 0;

  if (todayEl) todayEl.textContent = todayDocs;
  if (totalEl) totalEl.textContent = periodDocsCount;
  if (weekEl)  weekEl.textContent  = weekDocs;
  if (rateEl)  rateEl.textContent  = `${rate}%`;
  if (badgeEl) badgeEl.textContent = `${periodDocsCount} documents`;

  const recruiterCardsEl = document.getElementById("docs-recruiter-cards");
  if (recruiterCardsEl) {
    recruiterCardsEl.innerHTML = "";
    const recruiters = state.employees.filter(e => e.designation !== "Manager");
    recruiters.forEach(r => {
      let rPeriodDocsCount = docs.filter(d => d.recruiterName === r.name && inDocDateRange(d.date, state.docDateRange)).length;
      let rTodayDocsCount  = docs.filter(d => d.recruiterName === r.name && isToday(d.date)).length;
      
      const card = document.createElement("div");
      card.className = "bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between";
      card.innerHTML = `
        <div>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">${r.name}</p>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="text-xl font-extrabold text-slate-800">${rPeriodDocsCount}</span>
            <span class="text-[9px] text-slate-400">docs</span>
          </div>
        </div>
        <div class="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between text-[9px]">
          <span class="text-slate-400 font-semibold">Today:</span>
          <span class="font-extrabold ${rTodayDocsCount > 0 ? 'bg-brand-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600'} px-1.5 py-0.5 rounded-md">${rTodayDocsCount}</span>
        </div>
      `;
      recruiterCardsEl.appendChild(card);
    });
  }

  if (!tbodyEl) return;
  tbodyEl.innerHTML = "";

  if (periodDocsCount === 0) {
    tbodyEl.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400 italic text-xs">No matching document submissions.</td></tr>`;
    return;
  }

  periodDocs.forEach(doc => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 border-b border-slate-100 last:border-0";
    tr.innerHTML = `
      <td class="px-4 py-3 text-slate-400 text-[10px]">${fmtDate(doc.date)}</td>
      <td class="px-4 py-3 font-semibold text-slate-800">${doc.recruiterName}</td>
      <td class="px-4 py-3 font-semibold text-slate-800">${doc.candidateName}</td>
      <td class="px-4 py-3 text-slate-500">${doc.phoneNumber}</td>
      <td class="px-4 py-3 text-slate-500">${doc.post}</td>
      <td class="px-4 py-3 text-right">
        <a href="${doc.documentLink}" target="_blank" class="text-brand-500 font-bold hover:underline">Open Link ↗</a>
      </td>
    `;
    tbodyEl.appendChild(tr);
  });
}

function renderRecruiterMetrics(list, tbodyId = "mgr-recruiter-metrics-tbody") {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = "";

  const recruiters = state.employees.filter(e => !isManagerRole(e.designation));
  recruiters.forEach(rec => {
    const recList = list.filter(c => (c.recruiterName||"").toLowerCase() === rec.name.toLowerCase());
    const total = recList.length;
    const fresh = recList.filter(c => c.status === "Fresh").length;
    const interested = recList.filter(c => c.status === "Interested" || c.status.startsWith("Willing")).length;
    const rnr = recList.filter(c => c.status.startsWith("Call Not") || c.status === "RNR").length;
    const followup = recList.filter(c => c.status === "Follow up").length;
    const docsub = recList.filter(c => c.status === "Document Submitted" || c.status === "CV Submitted").length;
    const rejected = recList.filter(c => c.status === "Not Interested" || c.status === "Not Suitable").length;
    const completed = recList.filter(c => c.status === "Selected" || c.status === "Travelled" || c.status === "In Processing").length;

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 border-b border-slate-100 last:border-0 text-center";
    tr.innerHTML = `
      <td class="px-4 py-3 text-left font-bold text-slate-800">${rec.name}</td>
      <td class="px-4 py-3 font-extrabold text-slate-900">${total}</td>
      <td class="px-4 py-3 text-blue-600">${fresh}</td>
      <td class="px-4 py-3 text-teal-600">${interested}</td>
      <td class="px-4 py-3 text-rose-600">${rejected}</td>
      <td class="px-4 py-3 text-violet-600">${rnr}</td>
      <td class="px-4 py-3 text-amber-600">${followup}</td>
      <td class="px-4 py-3 text-indigo-600">${docsub}</td>
      <td class="px-4 py-3 text-emerald-600">${completed}</td>
    `;
    tbody.appendChild(tr);
  });
}

function handleCsvFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const ext = file.name.slice(-3).toLowerCase();
  
  showLoader("Parsing file...");
  const reader = new FileReader();
  
  reader.onload = (event) => {
    try {
      let leads = [];
      if (ext === "csv") {
        leads = parseCSV(event.target.result);
      } else {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rows.length > 0) {
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            leads.push({
              name: String(row[0] || "").trim(),
              phone: String(row[1] || "").trim(),
              qualification: String(row[2] || "").trim(),
              post: String(row[3] || "").trim(),
              notes: String(row[4] || "").trim()
            });
          }
        }
      }
      
      state.rawLeads = leads;
      
      document.getElementById("selected-file-name").textContent = file.name;
      document.getElementById("file-info-panel")?.classList.remove("hidden");
      document.getElementById("raw-leads-count").textContent = state.rawLeads.length;
      document.getElementById("loaded-leads-panel")?.classList.remove("hidden");
      
      const headRow = document.getElementById("leads-preview-head");
      const body    = document.getElementById("leads-preview-body");
      if (headRow) headRow.innerHTML = ["Name","Phone","Qualification"].map(h=>`<th class="px-3 py-2">${h}</th>`).join('');
      if (body) {
        body.innerHTML = "";
        state.rawLeads.slice(0,5).forEach(l=>{
          const tr=document.createElement("tr"); tr.className="border-t border-slate-100";
          tr.innerHTML=`<td class="px-3 py-2 text-slate-700">${l.name || '—'}</td><td class="px-3 py-2 text-slate-500">${l.phone || '—'}</td><td class="px-3 py-2 text-slate-500">${l.qualification || '—'}</td>`;
          body.appendChild(tr);
        });
      }
      renderBulkAssignTable();
      showToast("File Loaded", `Ready to distribute ${leads.length} leads.`, "success");
    } catch(err) {
      showToast("Error Parsing File", err.message, "warning");
    } finally {
      hideLoader();
    }
  };
  
  if (ext === "csv") {
    reader.readAsText(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
}

function parseCSV(text) {
  const lines = text.split(/\n/);
  const result = [];
  const start = 1;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",").map(c => c.replace(/^"|"$/g, "").trim());
    if (cols[0] || cols[1]) {
      result.push({
        name: cols[0] || "",
        phone: cols[1] || "",
        qualification: cols[2] || "",
        post: cols[3] || "",
        notes: cols[4] || ""
      });
    }
  }
  return result;
}

function renderBulkAssignTable() {
  const tbody = document.getElementById("bulk-assign-tbody");
  if (!tbody) return;
  const recruiters = state.employees.filter(e=>e.designation!=="Manager");
  const available  = state.rawLeads.length;

  const badge = document.getElementById("bulk-remaining-badge");
  if (badge) badge.textContent = `${available} leads available`;

  tbody.innerHTML = "";
  if (recruiters.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="px-3 py-4 text-center text-slate-400 italic text-xs">No recruiters found. Add recruiters in the Employees tab.</td></tr>`;
    return;
  }
  recruiters.forEach(rec => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 border-b border-slate-100 last:border-0";
    tr.innerHTML = `
      <td class="px-3 py-2.5 font-semibold text-slate-700">
        <span class="text-xs font-bold text-slate-800">${rec.name}</span>
      </td>
      <td class="px-3 py-2.5 text-center">
        <input type="number" class="bulk-count-input w-16 px-2 py-1 text-xs text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" data-recruiter="${rec.name}" min="0" value="0">
      </td>
      <td class="px-3 py-2.5 text-center">
        <button class="single-assign-btn text-[10px] font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg transition-all border border-brand-100" data-recruiter="${rec.name}">
          → Assign
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".single-assign-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const recruiter = btn.dataset.recruiter;
      const row = btn.closest("tr");
      const countInput = row.querySelector(".bulk-count-input");
      const count = parseInt(countInput?.value) || 0;
      if (count <= 0) { showToast("Required", `Enter a count for ${recruiter}.`, "warning"); return; }
      distributeToRecruiter(recruiter, count);
      if (countInput) countInput.value = 0;
    });
  });
}

function handleDistributeAll() {
  const rows = document.querySelectorAll(".bulk-count-input");
  const assignments = [];
  rows.forEach(input => {
    const count = parseInt(input.value) || 0;
    if (count > 0) assignments.push({ recruiter: input.dataset.recruiter, count });
  });
  if (assignments.length === 0) { showToast("Required", "Enter a count for at least one recruiter.", "warning"); return; }

  const totalNeeded = assignments.reduce((s,a)=>s+a.count, 0);
  if (totalNeeded > state.rawLeads.length) {
    showToast("Error", `Only ${state.rawLeads.length} leads available but ${totalNeeded} requested total.`, "warning"); return;
  }
  let offset = 0;
  assignments.forEach(a => {
    distributeToRecruiter(a.recruiter, a.count, offset, true);
    offset += a.count;
  });
  state.rawLeads = state.rawLeads.slice(offset);
  const badge = document.getElementById("bulk-remaining-badge");
  if (badge) badge.textContent = `${state.rawLeads.length} leads available`;
  const countEl = document.getElementById("raw-leads-count");
  if (countEl) countEl.textContent = state.rawLeads.length;
  if (state.rawLeads.length === 0) document.getElementById("loaded-leads-panel")?.classList.add("hidden");

  rows.forEach(i => i.value = 0);
  renderDistributionLog();
  renderDailyKPIs();
  showToast("All Distributed", `${offset} total leads assigned.`, "success");
}

function distributeToRecruiter(recruiter, count, offset=0, isBulk=false) {
  const projId  = document.getElementById("distribute-project")?.value;
  const jobRole = document.getElementById("distribute-jobrole")?.value || "";
  const manager = sessionStorage.getItem("recruitment_mis_user") || "Manager";
  const proj    = state.projects.find(p=>p.id===projId);

  if (!projId) { showToast("Required", "Select a project first.", "warning"); return; }
  if (state.rawLeads.length === 0 && offset === 0) { showToast("Error", "No leads loaded.", "warning"); return; }

  const slice = state.rawLeads.slice(offset, offset + count);
  if (slice.length === 0) { showToast("Warn", `No remaining leads for ${recruiter}.`, "warning"); return; }

  const ts = Date.now();
  const newCands = slice.map((lead, i) => ({
    id: `cand-dist-${ts}-${offset}-${i}`,
    projectId: projId, jobRole,
    name: lead.name || "No Name", phone: lead.phone,
    email: lead.email || "",
    source: "Bulk Sheet",
    highestQualification: cleanMeta(lead.qualification),
    primarySkills: lead.notes || "",
    yearsOfExperience: "",
    status: "Fresh", callbackTime: "",
    documents:{resume:false,idProof:false,educationalCertificates:false},
    futureCategory:"", futureQualification:"", customFieldData:{},
    recruiterRemarks: `Assigned by Manager`,
    recruiterName: recruiter,
    dateAdded: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    documentLink:"",
    history:[{date:new Date().toISOString(),fromStatus:"",toStatus:"Fresh",notes:`Assigned by Manager.`,recruiter:manager}]
  }));

  if (!isBulk && offset === 0) {
    state.rawLeads = state.rawLeads.slice(count);
    const badge = document.getElementById("bulk-remaining-badge");
    if (badge) badge.textContent = `${state.rawLeads.length} leads available`;
    const countEl = document.getElementById("raw-leads-count");
    if (countEl) countEl.textContent = state.rawLeads.length;
    if (state.rawLeads.length === 0) document.getElementById("loaded-leads-panel")?.classList.add("hidden");
    renderDistributionLog();
    renderDailyKPIs();
    showToast("Assigned", `${slice.length} leads assigned to ${recruiter}`, "success");
  }

  saveCandidatesToLocalStorage(newCands);
  state.managerCandidates = state.managerCandidates.concat(newCands);

  const logEntry = {
    id:"log-"+ts+"-"+offset, date:new Date().toISOString(),
    manager, projectId:projId, projectName:proj?.name||"",
    recruiter, count:slice.length, sheetUrl:""
  };
  state.distributionLog.unshift(logEntry);
  localStorage.setItem("recruitment_mis_distlog", JSON.stringify(state.distributionLog));

  const apiUrl = getApiUrl();
  if (apiUrl) {
    fetch(apiUrl, { method:"POST", headers:{"Content-Type":"text/plain"}, body: JSON.stringify({ action:"distributeLeads", employee:recruiter, candidates:newCands, projectId:projId, projectName:proj?.name||"", manager, sheetUrl:"" }) })
      .then(r=>r.json()).catch(()=>{});
  }
}

function renderDistributionLog() {
  const tbody = document.getElementById("distribution-log-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (state.distributionLog.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-slate-400 italic text-xs">No distributions yet.</td></tr>`;
    return;
  }
  state.distributionLog.forEach(log => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 border-b border-slate-100 last:border-0";
    tr.innerHTML = `
      <td class="px-4 py-3 text-slate-400 text-[10px]">${fmtDate(log.date)}</td>
      <td class="px-4 py-3 font-semibold text-slate-800">${log.manager||'—'}</td>
      <td class="px-4 py-3 text-slate-600">${log.projectName||log.projectId||'—'}</td>
      <td class="px-4 py-3"><span class="text-[10px] font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">${log.recruiter||'—'}</span></td>
      <td class="px-4 py-3 text-right font-bold text-slate-800">${log.count}</td>
    `;
    tbody.appendChild(tr);
  });
}

function saveApiUrl() {
  const url = document.getElementById("settings-api-url")?.value.trim();
  localStorage.setItem("recruitment_mis_api_url", url);
  updateConnectionStatus();
  const resultEl = document.getElementById("api-test-result");
  if (!url) { showToast("Cleared", "API URL removed. Running in local mode.", "info"); return; }

  showLoader("Testing connection...");
  fetch(`${url}?action=getEmployees`)
    .then(r=>r.json())
    .then(d=>{
      if (d.success) {
        showToast("Connected!", `Google Sheets connected. ${d.data.length} employees found.`, "success");
        if (resultEl) { resultEl.className="text-xs p-3 rounded-xl font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100"; resultEl.textContent="✅ Connected successfully!"; resultEl.classList.remove("hidden"); }
        loadManagerData();
      } else {
        if (resultEl) { resultEl.className="text-xs p-3 rounded-xl font-semibold bg-rose-50 text-rose-700 border border-rose-100"; resultEl.textContent=`❌ Error: ${d.error}`; resultEl.classList.remove("hidden"); }
      }
    })
    .catch(err => {
      if (resultEl) { resultEl.className="text-xs p-3 rounded-xl font-semibold bg-rose-50 text-rose-700 border border-rose-100"; resultEl.textContent="❌ Connection failed."; resultEl.classList.remove("hidden"); }
      showToast("Error", "Cannot connect to API.", "warning");
    })
    .finally(hideLoader);
}

// ══════════════════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════════════════
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}





