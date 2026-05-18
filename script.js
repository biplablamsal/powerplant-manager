// ============================================
// HYDROPLANT MANAGER - COMPLETE FIXED VERSION
// ============================================

// Global Database Objects
let GenDB = { allDays: [], filteredDays: [] };
let OpsDB = {
  shiftLogs: [],
  incidents: [],
  handovers: [],
  historicalData: null,
};
let FeedDB = { posts: [], currentPostId: null, actionsBound: false };
let MaintDB = { tasks: [], history: [], assets: [], charts: {} };
let EquipmentDB = { items: [], filteredItems: [] };
let FaultsDB = { items: [], filteredItems: [], equipmentList: [] };

let feedPhotos = [];
let quickPhotos = [];
let quickSelectedSeverity = "Medium";
let quickEditingId = null;

const chartInstances = {};

// ============================================
// CORE NAVIGATION - FIXED
// ============================================

function showPage(id, el) {
  console.log("showPage called with id:", id);

  // Hide all pages
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));

  // Remove active class from all nav items
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));

  // Show selected page
  const pg = document.getElementById("page-" + id);
  if (!pg) {
    console.error(`Page "page-${id}" not found`);
    return;
  }

  pg.classList.add("active");
  if (el) el.classList.add("active");

  // Close mobile sidebar
  if (typeof window.closeMobileSidebar === "function")
    window.closeMobileSidebar();

  // Update breadcrumb
  const names = {
    dashboard: "Dashboard",
    operations: "Operations",
    generation: "Generation Log",
    maintenance: "Maintenance",
    workorders: "Work Orders",
    equipment: "Equipment",
    faults: "Faults & Incidents",
    inventory: "Inventory",
    documents: "Documents",
    reports: "Reports",
    users: "User Management",
    feed: "Maintenance Feed",
  };
  const breadcrumb = document.getElementById("breadcrumb");
  if (breadcrumb) breadcrumb.textContent = names[id] || id;

  // Initialize page-specific features
  if (id === "dashboard") initDashboardCharts();
  if (id === "operations") initOperations();
  if (id === "generation") initGenerationPage();
  if (id === "maintenance") initMaintenance();
  if (id === "equipment") initEquipment();
  if (id === "faults") initFaults();
  if (id === "feed") {
    loadMaintenanceFeed();
    setupFeedPhotoHandlers();
  }

  return false;
}
window.showPage = showPage;

// ============================================
// SIDEBAR & THEME FUNCTIONS
// ============================================

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  if (window.innerWidth <= 768) {
    if (typeof window.toggleMobileSidebar === "function") {
      window.toggleMobileSidebar();
      return;
    }
  }
  sidebar.classList.toggle("collapsed");
}

function toggleTheme() {
  const h = document.documentElement;
  const t = h.getAttribute("data-theme") === "dark" ? "light" : "dark";
  h.setAttribute("data-theme", t);
  setTimeout(() => {
    Object.values(chartInstances).forEach((c) => {
      try {
        c.destroy();
      } catch (e) {}
    });
    Object.keys(chartInstances).forEach((k) => delete chartInstances[k]);
    initDashboardCharts();
  }, 50);
}

function toggleNotif() {
  const panel = document.getElementById("notifPanel");
  if (panel) panel.classList.toggle("open");
}

document.addEventListener("click", (e) => {
  const panel = document.getElementById("notifPanel");
  if (
    panel &&
    !e.target.closest("#notifPanel") &&
    !e.target.closest(".icon-btn")
  ) {
    panel.classList.remove("open");
  }
});

// ============================================
// LIVE CLOCK
// ============================================

function updateClock() {
  const liveTime = document.getElementById("live-time");
  if (liveTime) {
    const now = new Date();
    liveTime.textContent =
      now.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " · " +
      now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
  }
}
setInterval(updateClock, 1000);
updateClock();

// ============================================
// CHART HELPERS
// ============================================

function isDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}
function gridColor() {
  return isDark() ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)";
}
function textColor() {
  return isDark() ? "#8b96a8" : "#64748b";
}

function mkChart(id, config) {
  if (chartInstances[id]) chartInstances[id].destroy();
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  chartInstances[id] = new Chart(ctx, config);
  return chartInstances[id];
}

// ============================================
// DASHBOARD CHARTS
// ============================================

function initDashboardCharts() {
  // Generation Chart
  const hours = Array.from(
    { length: 24 },
    (_, i) => `${String(i).padStart(2, "0")}:00`,
  );
  const gen = [
    0, 0, 0, 0, 0, 0, 11.2, 12.8, 13.4, 13.1, 12.9, 13.2, 12.7, 13.0, 13.3,
    13.4, 12.8, 13.1, 12.6, 12.4, 11.8, 12.0, 11.5, 0,
  ];
  const water = [
    0, 0, 0, 0, 0, 0, 78, 82, 85, 83, 82, 85, 83, 84, 86, 85, 83, 85, 82, 82,
    80, 82, 79, 0,
  ];

  mkChart("genChart", {
    type: "line",
    data: {
      labels: hours,
      datasets: [
        {
          label: "Total Generation (MW)",
          data: gen,
          borderColor: "#4a9de8",
          backgroundColor: "rgba(74,157,232,.12)",
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          yAxisID: "y",
        },
        {
          label: "Water Discharge (m³/s)",
          data: water,
          borderColor: "#29c48f",
          backgroundColor: "transparent",
          fill: false,
          tension: 0.4,
          borderWidth: 1.5,
          pointRadius: 0,
          borderDash: [4, 3],
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: "rgba(15,20,35,.9)" },
      },
      scales: {
        x: {
          grid: { color: gridColor() },
          ticks: { color: textColor(), maxTicksLimit: 12, font: { size: 11 } },
        },
        y: {
          grid: { color: gridColor() },
          ticks: { color: textColor() },
          title: { display: true, text: "MW", color: textColor() },
        },
        y1: {
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: { color: textColor() },
          title: { display: true, text: "m³/s", color: textColor() },
        },
      },
    },
  });

  // Draw gauges
  drawGauge("g1", 84, 120, "#f5ae3a");
  drawGauge("g2", 91, 120, "#f5ae3a");
  drawGauge("g3", 50.1, 51, "#4a9de8");
}

function drawGauge(id, value, max, color) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cx = 40,
    cy = 40,
    r = 30;
  ctx.clearRect(0, 0, 80, 80);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
  ctx.strokeStyle = isDark() ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.08)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.stroke();
  const angle = 0.75 * Math.PI + (value / max) * 1.5 * Math.PI;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0.75 * Math.PI, angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.stroke();
}

function initWaterChart() {
  const hours = Array.from(
    { length: 24 },
    (_, i) => `${String(i).padStart(2, "0")}:00`,
  );
  mkChart("waterChart", {
    type: "line",
    data: {
      labels: hours,
      datasets: [
        {
          label: "Discharge (m³/s)",
          data: [
            0, 0, 0, 0, 0, 0, 78, 80, 83, 85, 84, 86, 85, 84, 86, 87, 85, 84,
            83, 82, 80, 79, 78, 0,
          ],
          borderColor: "#4a9de8",
          backgroundColor: "rgba(74,157,232,.1)",
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: "Reservoir Level (m)",
          data: [
            183, 183, 182, 182, 182, 182, 183, 183, 184, 184, 184, 183, 183,
            184, 184, 184, 183, 183, 183, 183, 183, 183, 183, 183,
          ],
          borderColor: "#29c48f",
          backgroundColor: "transparent",
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 0,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: gridColor() },
          ticks: { color: textColor(), maxTicksLimit: 12 },
        },
        y: {
          grid: { color: gridColor() },
          ticks: { color: textColor() },
          title: { display: true, text: "m³/s", color: textColor() },
        },
        y1: {
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: { color: textColor() },
          title: { display: true, text: "m", color: textColor() },
        },
      },
    },
  });
}

// ============================================
// OPERATIONS MODULE - FIXED
// ============================================

function initOperations() {
  console.log("Initializing Operations module...");
  loadShiftLogs();
  loadIncidents();
  loadHandovers();
  updateCurrentShiftDisplay();
}

function loadShiftLogs() {
  const saved = localStorage.getItem("ops_shift_logs");
  OpsDB.shiftLogs = saved ? JSON.parse(saved) : [];
  renderShiftLogs();
}

function loadIncidents() {
  const saved = localStorage.getItem("ops_incidents");
  OpsDB.incidents = saved ? JSON.parse(saved) : [];
  renderIncidents();
}

function loadHandovers() {
  const saved = localStorage.getItem("ops_handovers");
  OpsDB.handovers = saved ? JSON.parse(saved) : [];
  renderHandovers();
}

function renderShiftLogs() {
  const container = document.getElementById("shift-timeline");
  if (!container) return;
  if (OpsDB.shiftLogs.length === 0) {
    container.innerHTML =
      '<div class="shift-entry">No entries yet. Click "New Shift Log" to add.</div>';
    return;
  }
  container.innerHTML = OpsDB.shiftLogs
    .slice(0, 50)
    .map(
      (log) => `
    <div class="shift-entry">
      <div class="shift-time">${log.time || "N/A"}</div>
      <div class="shift-badge shift-${log.type || "info"}">${(log.type || "INFO").toUpperCase()}</div>
      <div class="shift-desc">${log.description || ""}</div>
      <div class="shift-operator">${log.operator || "Unknown"}</div>
    </div>
  `,
    )
    .join("");
}

function renderIncidents() {
  const container = document.getElementById("incidents-list");
  if (!container) return;
  if (!OpsDB.incidents || OpsDB.incidents.length === 0) {
    container.innerHTML =
      '<div class="shift-entry">No incidents reported.</div>';
    return;
  }
  container.innerHTML = OpsDB.incidents
    .slice(0, 20)
    .map(
      (inc) => `
    <div class="shift-entry">
      <div class="shift-time">${inc.time || (inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString() : "N/A")}</div>
      <div class="shift-badge shift-critical">INCIDENT</div>
      <div class="shift-desc">${inc.description || "No description"}</div>
      <div class="shift-operator">${inc.reportedBy || "Unknown"}</div>
    </div>
  `,
    )
    .join("");
}

function renderHandovers() {
  const container = document.getElementById("handovers-list");
  if (!container) return;
  if (!OpsDB.handovers || OpsDB.handovers.length === 0) {
    container.innerHTML = '<div class="shift-entry">No handover records.</div>';
    return;
  }
  container.innerHTML = OpsDB.handovers
    .slice(0, 10)
    .map(
      (h) => `
    <div class="shift-entry">
      <div class="shift-time">${h.fromShift || "?"} → ${h.toShift || "?"}</div>
      <div class="shift-badge shift-info">HANDOVER</div>
      <div class="shift-desc">${h.notes || "No notes"}</div>
      <div class="shift-operator">${h.handedBy || "Unknown"}</div>
    </div>
  `,
    )
    .join("");
}

function updateCurrentShiftDisplay() {
  const currentShiftSpan = document.getElementById("current-shift");
  if (currentShiftSpan) {
    const hour = new Date().getHours();
    let shift = "Morning (6:00 - 14:00)";
    if (hour >= 14 && hour < 22) shift = "Evening (14:00 - 22:00)";
    else if (hour >= 22 || hour < 6) shift = "Night (22:00 - 6:00)";
    currentShiftSpan.textContent = shift;
  }
}

function openShiftLogModal() {
  const modal = document.getElementById("shiftLogModal");
  if (modal) {
    modal.style.display = "flex";
    const timeInput = document.getElementById("log-time");
    if (timeInput)
      timeInput.value = new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
  }
}

function closeShiftLogModal() {
  const modal = document.getElementById("shiftLogModal");
  if (modal) modal.style.display = "none";
}

function saveShiftLog() {
  const entry = {
    id: Date.now(),
    time: document.getElementById("log-time")?.value || "",
    type: document.getElementById("log-type")?.value || "info",
    description: document.getElementById("log-description")?.value || "",
    equipment: document.getElementById("log-equipment")?.value || "",
    operator: document.querySelector(".user-name")?.textContent || "Operator",
    timestamp: new Date().toISOString(),
  };
  if (!entry.description) {
    showOpsStatus("Please enter a description", "error");
    return;
  }
  OpsDB.shiftLogs.unshift(entry);
  localStorage.setItem("ops_shift_logs", JSON.stringify(OpsDB.shiftLogs));
  renderShiftLogs();
  closeShiftLogModal();
  document.getElementById("shiftLogForm")?.reset();
  showOpsStatus("Shift log entry saved!", "success");
}

function showOpsStatus(message, type) {
  let statusDiv = document.getElementById("opsStatusMsg");
  if (!statusDiv) {
    statusDiv = document.createElement("div");
    statusDiv.id = "opsStatusMsg";
    statusDiv.style.cssText =
      "position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:10px;z-index:2000";
    document.body.appendChild(statusDiv);
  }
  const colors = {
    success: "#2ecc71",
    error: "#e74c3c",
    info: "#3d8ef7",
    warning: "#f5a623",
  };
  statusDiv.style.backgroundColor = colors[type] || colors.info;
  statusDiv.innerHTML = message;
  statusDiv.style.display = "block";
  setTimeout(() => {
    if (statusDiv) statusDiv.style.display = "none";
  }, 3000);
}

function switchOpsTab(tabId) {
  document
    .querySelectorAll(".ops-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".ops-tab-content")
    .forEach((c) => c.classList.remove("active"));
  if (event && event.target) event.target.classList.add("active");
  const content = document.getElementById(`ops-${tabId}`);
  if (content) content.classList.add("active");
}

// ============================================
// GENERATION PAGE - FIXED
// ============================================

function initGenerationPage() {
  console.log("Initializing Generation page...");
  const saved = localStorage.getItem("gen_days");
  if (saved) {
    GenDB.allDays = JSON.parse(saved);
    GenDB.filteredDays = [...GenDB.allDays];
    if (GenDB.allDays.length > 0) {
      updateGenerationDashboard(GenDB.allDays);
    } else {
      createSampleGenData();
    }
  } else {
    createSampleGenData();
  }
}

function createSampleGenData() {
  const hours = [];
  for (let hour = 0; hour < 24; hour++) {
    const isOperating = hour >= 6 && hour <= 22;
    hours.push({
      hour: hour,
      hourStr: `${hour}:00`,
      u1Shutdown: !isOperating,
      u2Shutdown: !isOperating,
      u1: { mw: isOperating ? 12.5 : 0, pf: 0.96, hz: 50.0 },
      u2: { mw: isOperating ? 12.8 : 0, pf: 0.95, hz: 50.0 },
      grid: { mw: null },
      remarks: "",
    });
  }
  const today = new Date();
  const bsDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;
  const computed = {
    u1Energy: 210.5,
    u2Energy: 215.2,
    totalEnergy: 425.7,
    u1AvgMW: 12.5,
    u2AvgMW: 12.8,
    maxMW: 14.2,
    opHours: 17,
    shutdownHrs: 7,
    avgPF: 0.955,
    avgHz: 50.0,
  };
  GenDB.allDays = [{ bsDate, hours, computed }];
  GenDB.filteredDays = GenDB.allDays;
  localStorage.setItem("gen_days", JSON.stringify(GenDB.allDays));
  updateGenerationDashboard(GenDB.allDays);
  showGenStatus("Sample data loaded", "info");
}

function updateGenerationDashboard(days) {
  if (!days || days.length === 0) return;
  const day = days[0];
  const c = day.computed;

  // Update stats
  const qsDays = document.getElementById("qsDays");
  const qsHours = document.getElementById("qsHours");
  const qsShutdown = document.getElementById("qsShutdown");
  const qsPF = document.getElementById("qsPF");
  if (qsDays) qsDays.innerHTML = days.length;
  if (qsHours) qsHours.innerHTML = c.opHours;
  if (qsShutdown) qsShutdown.innerHTML = c.shutdownHrs;
  if (qsPF) qsPF.innerHTML = c.avgPF.toFixed(3);

  // Update KPIs
  const kpiRow = document.getElementById("genKpiRow");
  if (kpiRow) {
    kpiRow.innerHTML = `
      <div class="gen-kpi-card cyan"><div class="gen-kpi-label"><i class="fas fa-bolt"></i> TOTAL GENERATION</div><div class="gen-kpi-value">${c.totalEnergy.toFixed(1)}<span class="gen-kpi-unit">MWh</span></div><div class="gen-kpi-sub">U1: ${c.u1Energy.toFixed(1)} + U2: ${c.u2Energy.toFixed(1)} MWh</div></div>
      <div class="gen-kpi-card blue"><div class="gen-kpi-label"><i class="fas fa-charging-station"></i> AVG POWER</div><div class="gen-kpi-value">${c.u1AvgMW.toFixed(1)}<span class="gen-kpi-unit">MW</span></div><div class="gen-kpi-sub">Peak: ${c.maxMW.toFixed(1)} MW</div></div>
      <div class="gen-kpi-card green"><div class="gen-kpi-label"><i class="fas fa-clock"></i> OPERATION</div><div class="gen-kpi-value">${c.opHours}<span class="gen-kpi-unit">hrs</span></div><div class="gen-kpi-sub">Shutdown: ${c.shutdownHrs} hrs</div></div>
      <div class="gen-kpi-card amber"><div class="gen-kpi-label"><i class="fas fa-chart-line"></i> POWER FACTOR</div><div class="gen-kpi-value">${(c.avgPF * 100).toFixed(0)}<span class="gen-kpi-unit">%</span></div><div class="gen-kpi-sub">Frequency: ${c.avgHz.toFixed(2)} Hz</div></div>
    `;
  }

  // Hide empty state, show content
  const emptyState = document.getElementById("genEmptyState");
  const content = document.getElementById("genDashboardContent");
  if (emptyState) emptyState.style.display = "none";
  if (content) content.style.display = "block";
}

function showGenStatus(message, type) {
  let statusDiv = document.getElementById("genStatusMsg");
  if (!statusDiv) {
    statusDiv = document.createElement("div");
    statusDiv.id = "genStatusMsg";
    statusDiv.style.cssText =
      "position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:10px;z-index:1000";
    document.body.appendChild(statusDiv);
  }
  const colors = {
    success: "#2ecc71",
    error: "#e74c3c",
    info: "#3d8ef7",
    warning: "#f5a623",
  };
  statusDiv.style.backgroundColor = colors[type] || colors.info;
  statusDiv.innerHTML = message;
  statusDiv.style.display = "block";
  setTimeout(() => {
    if (statusDiv) statusDiv.style.display = "none";
  }, 3000);
}

function manualGenSync() {
  showGenStatus("Sync feature - loading sample data", "info");
  createSampleGenData();
}

// ============================================
// MAINTENANCE FEED - INSTAGRAM STYLE
// ============================================

function setupFeedPhotoHandlers() {
  const takeBtn = document.getElementById("feedTakePhotoBtn");
  const chooseBtn = document.getElementById("feedChoosePhotoBtn");
  const cameraInput = document.getElementById("feedCameraInput");
  const galleryInput = document.getElementById("feedGalleryInput");

  if (takeBtn && cameraInput) {
    takeBtn.onclick = () => cameraInput.click();
    cameraInput.onchange = (e) => {
      if (e.target.files) handleFeedPhotos(e.target.files);
      cameraInput.value = "";
    };
  }
  if (chooseBtn && galleryInput) {
    chooseBtn.onclick = () => galleryInput.click();
    galleryInput.onchange = (e) => {
      if (e.target.files) handleFeedPhotos(e.target.files);
      galleryInput.value = "";
    };
  }
}

function handleFeedPhotos(files) {
  const maxFiles = 5;
  const maxSize = 5 * 1024 * 1024;
  Array.from(files).forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > maxSize) return;
    if (feedPhotos.length >= maxFiles) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      feedPhotos.push({
        id: Date.now() + Math.random(),
        data: e.target.result,
        name: file.name,
      });
      renderFeedPhotoPreview();
    };
    reader.readAsDataURL(file);
  });
}

function renderFeedPhotoPreview() {
  const container = document.getElementById("feedPhotoPreview");
  if (!container) return;
  if (feedPhotos.length === 0) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = feedPhotos
    .map(
      (photo, idx) => `
    <div class="feed-photo-preview-item"><img src="${photo.data}" alt="Preview"><button class="feed-photo-remove" onclick="removeFeedPhoto(${idx})">✕</button></div>
  `,
    )
    .join("");
}

function removeFeedPhoto(idx) {
  feedPhotos.splice(idx, 1);
  renderFeedPhotoPreview();
}
function clearFeedPhotos() {
  feedPhotos = [];
  renderFeedPhotoPreview();
}

function toggleInlinePostForm() {
  const form = document.getElementById("inlinePostForm");
  if (form) {
    if (form.style.display === "none" || form.style.display === "") {
      form.style.display = "block";
      document.getElementById("inlinePostTitle").value = "";
      document.getElementById("inlinePostDesc").value = "";
      document.getElementById("inlinePostEquipment").value = "";
      document.getElementById("inlinePostWorkOrder").value = "";
      document.getElementById("inlinePostTags").value = "";
      clearFeedPhotos();
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      form.style.display = "none";
    }
  }
}

function submitInlinePost() {
  const title = document.getElementById("inlinePostTitle")?.value.trim() || "";
  const description =
    document.getElementById("inlinePostDesc")?.value.trim() || "";
  const equipment = document.getElementById("inlinePostEquipment")?.value || "";
  const workOrder =
    document.getElementById("inlinePostWorkOrder")?.value.trim() || "";
  const tags = document.getElementById("inlinePostTags")?.value.trim() || "";

  let postType = "update";
  document.querySelectorAll(".post-type-btn").forEach((btn) => {
    if (btn.classList.contains("active"))
      postType = btn.getAttribute("data-type");
  });

  const author =
    document.querySelector(".user-name")?.textContent || "Maintenance Staff";

  if (!title && !description) {
    showFeedToast("Please enter a title or description", "#f5ae3a");
    return;
  }

  const newPost = {
    post_id:
      "post_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
    timestamp: new Date().toISOString(),
    author: author,
    post_type: postType,
    title: title || description.substring(0, 50),
    description: description,
    equipment: equipment,
    work_order_id: workOrder,
    tags: tags,
    photos: feedPhotos.map((p) => p.data),
    like_count: 0,
    likes: [],
    comments: [],
  };

  let posts = JSON.parse(
    localStorage.getItem("maintenance_feed_posts") || "[]",
  );
  posts.unshift(newPost);
  localStorage.setItem(
    "maintenance_feed_posts",
    JSON.stringify(posts.slice(0, 200)),
  );
  clearFeedPhotos();
  toggleInlinePostForm();
  loadMaintenanceFeed();
  showFeedToast("✓ Post created!", "#29c48f");
}

function loadMaintenanceFeed() {
  const container = document.getElementById("feedPosts");
  if (!container) return;
  let posts = JSON.parse(
    localStorage.getItem("maintenance_feed_posts") || "[]",
  );
  FeedDB.posts = posts;
  if (posts.length === 0) {
    container.innerHTML = `<div class="feed-empty-state"><i class="fas fa-newspaper" style="font-size:48px; margin-bottom:16px; opacity:0.5;"></i><p>No posts yet.</p><p style="font-size:12px;">Click "Create New Post" to share maintenance updates.</p></div>`;
    return;
  }
  container.innerHTML = posts.map((post) => renderFeedCard(post)).join("");
  bindFeedActions();
}

function renderFeedCard(post) {
  const timeAgo = formatTimeAgo(post.timestamp);
  const typeIcon =
    { update: "🔧", issue: "⚠️", complete: "✅", inspection: "🔍" }[
      post.post_type
    ] || "📝";
  const typeLabel =
    {
      update: "Task Update",
      issue: "Issue Report",
      complete: "Completed",
      inspection: "Inspection",
    }[post.post_type] || "Update";
  const currentUser =
    document.querySelector(".user-name")?.textContent || "User";
  const isLiked = post.likes && post.likes.includes(currentUser);

  let photosHtml = "";
  if (post.photos && post.photos.length > 0) {
    if (post.photos.length === 1) {
      photosHtml = `<div class="feed-post-photo-single" onclick="openPhotoViewer('${post.photos[0]}')"><img src="${post.photos[0]}" alt="Maintenance photo"></div>`;
    } else if (post.photos.length === 2) {
      photosHtml = `<div class="feed-post-photo-grid two-columns">${post.photos.map((p) => `<div class="grid-item" onclick="openPhotoViewer('${p}')"><img src="${p}" alt="Photo"></div>`).join("")}</div>`;
    } else {
      photosHtml = `<div class="feed-post-photo-grid three-columns">${post.photos
        .slice(0, 9)
        .map(
          (p) =>
            `<div class="grid-item" onclick="openPhotoViewer('${p}')"><img src="${p}" alt="Photo"></div>`,
        )
        .join("")}</div>`;
    }
  }

  const commentCount = post.comments?.length || 0;

  return `
    <div class="feed-post-card" data-post-id="${post.post_id}">
      <div class="feed-post-header">
        <div class="feed-post-avatar">${(post.author || "U").charAt(0).toUpperCase()}</div>
        <div class="feed-post-author-info">
          <div class="feed-post-author">${escapeHtml(post.author || "Unknown")}</div>
          <div class="feed-post-time"><span>${timeAgo}</span><span class="feed-post-badge">${typeIcon} ${typeLabel}</span></div>
        </div>
      </div>
      ${photosHtml}
      <div class="feed-post-actions">
        <button class="feed-action-btn like-btn ${isLiked ? "liked" : ""}" data-action="like" data-post-id="${post.post_id}"><i class="fa-regular fa-heart"></i> ${post.like_count || 0}</button>
        <button class="feed-action-btn comment-btn" data-action="comment" data-post-id="${post.post_id}"><i class="fa-regular fa-comment"></i> ${commentCount}</button>
      </div>
      <div class="feed-post-caption">
        ${post.equipment ? `<div class="caption-equipment">📍 ${escapeHtml(post.equipment)}${post.work_order_id ? ` · WO: ${escapeHtml(post.work_order_id)}` : ""}</div>` : ""}
        ${post.title ? `<div class="caption-text"><strong>${escapeHtml(post.title)}</strong></div>` : ""}
        ${post.description ? `<div class="caption-text">${escapeHtml(post.description)}</div>` : ""}
        ${
          post.tags
            ? `<div class="caption-tags">${post.tags
                .split(",")
                .map((tag) => `<span class="caption-tag">#${tag.trim()}</span>`)
                .join("")}</div>`
            : ""
        }
      </div>
      <div class="feed-comments-section" id="comments-${post.post_id}">
        ${renderCommentsPreview(post.post_id, post.comments || [])}
      </div>
    </div>
  `;
}

function renderCommentsPreview(postId, comments) {
  if (!comments || comments.length === 0)
    return `<div class="feed-no-comments" style="font-size:12px; color:var(--text-muted); padding:8px 0;">No comments yet.</div>`;
  const visible = comments.slice(0, 2);
  const hidden = comments.length - 2;
  return `${visible.map((c) => `<div class="feed-comment"><span class="feed-comment-author">${escapeHtml(c.author)}:</span><span class="feed-comment-text">${escapeHtml(c.text)}</span><span class="feed-comment-time">${formatTimeAgo(c.timestamp)}</span></div>`).join("")}${hidden > 0 ? `<div class="view-more-comments" onclick="showAllComments('${postId}')">View all ${comments.length} comments</div>` : ""}`;
}

function bindFeedActions() {
  if (FeedDB.actionsBound) return;
  const feedPosts = document.getElementById("feedPosts");
  if (!feedPosts) return;
  feedPosts.addEventListener("click", (event) => {
    const actionBtn = event.target.closest(".feed-action-btn");
    if (!actionBtn) return;
    const postId = actionBtn.dataset.postId;
    const action = actionBtn.dataset.action;
    if (!postId || !action) return;
    if (action === "like") toggleFeedLike(postId);
    else if (action === "comment") showFeedCommentForm(postId);
  });
  FeedDB.actionsBound = true;
}

function toggleFeedLike(postId) {
  let posts = JSON.parse(
    localStorage.getItem("maintenance_feed_posts") || "[]",
  );
  const postIndex = posts.findIndex((p) => p.post_id === postId);
  const userName = document.querySelector(".user-name")?.textContent || "User";
  if (postIndex !== -1) {
    const post = posts[postIndex];
    if (!post.likes) post.likes = [];
    const likedIndex = post.likes.indexOf(userName);
    if (likedIndex === -1) {
      post.likes.push(userName);
      post.like_count = (post.like_count || 0) + 1;
    } else {
      post.likes.splice(likedIndex, 1);
      post.like_count = (post.like_count || 0) - 1;
    }
    localStorage.setItem("maintenance_feed_posts", JSON.stringify(posts));
    loadMaintenanceFeed();
  }
}

function showFeedCommentForm(postId) {
  FeedDB.currentPostId = postId;
  const existingForm = document.getElementById(`comment-form-${postId}`);
  if (existingForm) {
    existingForm.remove();
    return;
  }
  const commentsSection = document.getElementById(`comments-${postId}`);
  if (!commentsSection) return;
  const formHtml = `<div class="feed-comment-form" id="comment-form-${postId}"><div class="feed-comment-input-group"><input type="text" id="comment-input-${postId}" placeholder="Write a comment..." class="comment-input"><button type="button" class="btn-primary btn-sm" onclick="submitFeedComment('${postId}')">Post</button><button type="button" class="btn-secondary btn-sm" onclick="cancelFeedComment('${postId}')">Cancel</button></div></div>`;
  commentsSection.insertAdjacentHTML("beforeend", formHtml);
  const input = document.getElementById(`comment-input-${postId}`);
  if (input) {
    input.focus();
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitFeedComment(postId);
    });
  }
}

function cancelFeedComment(postId) {
  document.getElementById(`comment-form-${postId}`)?.remove();
  FeedDB.currentPostId = null;
}

function submitFeedComment(postId) {
  const commentInput = document.getElementById(`comment-input-${postId}`);
  const commentText = commentInput?.value.trim();
  if (!commentText) {
    showFeedToast("Please enter a comment", "#f5ae3a");
    return;
  }
  let posts = JSON.parse(
    localStorage.getItem("maintenance_feed_posts") || "[]",
  );
  const postIndex = posts.findIndex((p) => p.post_id === postId);
  const userName = document.querySelector(".user-name")?.textContent || "User";
  if (postIndex !== -1) {
    if (!posts[postIndex].comments) posts[postIndex].comments = [];
    posts[postIndex].comments.push({
      id: Date.now(),
      author: userName,
      text: commentText,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("maintenance_feed_posts", JSON.stringify(posts));
    loadMaintenanceFeed();
    showFeedToast("✓ Comment posted!", "#29c48f");
  }
}

function showAllComments(postId) {
  let posts = JSON.parse(
    localStorage.getItem("maintenance_feed_posts") || "[]",
  );
  const post = posts.find((p) => p.post_id === postId);
  if (post && post.comments && post.comments.length > 0) {
    let html =
      '<div style="padding: 12px; background: var(--bg-raised); border-radius: 12px;"><h4 style="margin-bottom: 12px;">All Comments</h4>';
    post.comments.forEach((c) => {
      html += `<div class="feed-comment" style="margin-bottom: 8px;"><span class="feed-comment-author">${escapeHtml(c.author)}:</span><span class="feed-comment-text">${escapeHtml(c.text)}</span></div>`;
    });
    html +=
      '<button class="btn-secondary btn-sm" onclick="loadMaintenanceFeed()">Close</button></div>';
    const section = document.getElementById(`comments-${postId}`);
    if (section) section.innerHTML = html;
  }
}

function openPhotoViewer(photoUrl) {
  const viewer = document.createElement("div");
  viewer.className = "photo-viewer-overlay";
  viewer.innerHTML = `<div class="photo-viewer-content"><img src="${photoUrl}" alt="Full size photo"><button class="photo-viewer-close" onclick="this.closest('.photo-viewer-overlay').remove()">✕</button></div>`;
  document.body.appendChild(viewer);
  viewer.onclick = (e) => {
    if (e.target === viewer) viewer.remove();
  };
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return "recently";
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showFeedToast(message, color) {
  let toast = document.getElementById("feedToastMsg");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "feedToastMsg";
    toast.style.cssText =
      "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:10px 20px;border-radius:40px;z-index:3000;font-size:13px;transition:all 0.3s;opacity:0;pointer-events:none;white-space:nowrap;";
    document.body.appendChild(toast);
  }
  toast.style.backgroundColor = color;
  toast.textContent = message;
  toast.style.opacity = "1";
  setTimeout(() => {
    toast.style.opacity = "0";
  }, 2500);
}

function generateFeedReport() {
  showFeedToast("Report feature - will export data", "#4a9de8");
}

function addSampleFeedPosts() {
  const existing = localStorage.getItem("maintenance_feed_posts");
  if (!existing || JSON.parse(existing).length === 0) {
    const sample = [
      {
        post_id: "sample_1",
        timestamp: new Date().toISOString(),
        author: "Rajesh Kumar",
        post_type: "update",
        title: "Unit 2 Bearing Replacement Started",
        description: "Removed old bearing. Housing cleaned.",
        equipment: "Unit 2 Generator",
        work_order_id: "WO-2024-0234",
        tags: "bearing, replacement",
        photos: [],
        like_count: 2,
        likes: [],
        comments: [],
      },
    ];
    localStorage.setItem("maintenance_feed_posts", JSON.stringify(sample));
  }
}

// ============================================
// MAINTENANCE DASHBOARD - SIMPLIFIED
// ============================================

function initMaintenance() {
  console.log("Initializing Maintenance module...");
  const defaultTasks = [
    {
      id: 1,
      asset: "Unit 2 Generator",
      task: "Replace Upper Guide Bearing",
      frequency: "8000 hrs",
      lastDone: "2080/12/10",
      nextDue: "2081/08/15",
      assignedTo: "Rajesh Kumar",
      status: "pending",
      priority: "critical",
    },
    {
      id: 2,
      asset: "Unit 3 Governor",
      task: "Quarterly Service",
      frequency: "3 months",
      lastDone: "2081/04/10",
      nextDue: "2081/07/10",
      assignedTo: "Prakash Thapa",
      status: "pending",
      priority: "warning",
    },
  ];
  MaintDB.tasks =
    JSON.parse(localStorage.getItem("maint_tasks")) || defaultTasks;
  MaintDB.history = JSON.parse(localStorage.getItem("maint_history")) || [];
  MaintDB.assets = JSON.parse(localStorage.getItem("maint_assets")) || [];
  renderPMTasks();
}

function renderPMTasks() {
  const container = document.getElementById("pmTaskList");
  if (!container) return;
  if (MaintDB.tasks.length === 0) {
    container.innerHTML = "<div>No tasks</div>";
    return;
  }
  container.innerHTML = MaintDB.tasks
    .map(
      (task) =>
        `<div class="pm-task ${task.priority}"><div class="pm-info"><div class="pm-title">${task.task}</div><div class="pm-meta"><span>${task.asset}</span><span>${task.assignedTo}</span></div></div><div class="pm-due">Due: ${task.nextDue}</div></div>`,
    )
    .join("");
}

function addMaintenanceTask() {
  showMaintStatus("Add task feature", "info");
}
function exportMaintenanceReport() {
  showMaintStatus("Export feature", "info");
}
function clearMaintenanceData() {
  if (confirm("Clear all data?")) {
    localStorage.removeItem("maint_tasks");
    initMaintenance();
    showMaintStatus("Data cleared", "success");
  }
}

function showMaintStatus(message, type) {
  let div = document.getElementById("maintStatusMsg");
  if (!div) {
    div = document.createElement("div");
    div.id = "maintStatusMsg";
    div.style.cssText =
      "position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:10px;z-index:1000";
    document.body.appendChild(div);
  }
  const colors = { success: "#2ecc71", error: "#e74c3c", info: "#3d8ef7" };
  div.style.backgroundColor = colors[type] || colors.info;
  div.innerHTML = message;
  div.style.display = "block";
  setTimeout(() => {
    if (div) div.style.display = "none";
  }, 3000);
}

// ============================================
// EQUIPMENT MODULE - SIMPLIFIED
// ============================================

function initEquipment() {
  console.log("Initializing Equipment module...");
  const defaultEquipment = [
    {
      id: 1,
      name: "Unit 1 Generator",
      type: "Generator",
      model: "Siemens SGT-800",
      manufacturer: "Siemens",
      status: "Operational",
      healthScore: 82,
      ratedPower: "15 MW",
      lastMaint: "2081/05/10",
      nextMaint: "2081/08/10",
    },
    {
      id: 2,
      name: "Unit 2 Generator",
      type: "Generator",
      model: "Siemens SGT-800",
      manufacturer: "Siemens",
      status: "Maintenance",
      healthScore: 60,
      ratedPower: "15 MW",
      lastMaint: "2081/04/15",
      nextMaint: "2081/08/15",
    },
  ];
  EquipmentDB.items =
    JSON.parse(localStorage.getItem("equipment_items")) || defaultEquipment;
  renderEquipmentGrid();
  updateEquipmentStats();
}

function renderEquipmentGrid() {
  const container = document.getElementById("equipmentGrid");
  if (!container) return;
  container.innerHTML = EquipmentDB.items
    .map(
      (item) => `
    <div class="equip-card" onclick="showEquipmentDetails(${item.id})">
      <div class="equip-card-header"><div class="equip-card-icon"><i class="fas fa-microchip"></i></div><div class="equip-status-badge ${item.status === "Operational" ? "operational" : "maintenance"}">${item.status}</div></div>
      <div class="equip-card-body"><div class="equip-name">${item.name}</div><div class="equip-model">${item.model}</div>
      <div class="equip-specs"><div class="equip-spec"><div class="equip-spec-label">Power</div><div class="equip-spec-value">${item.ratedPower}</div></div><div class="equip-spec"><div class="equip-spec-label">Health</div><div class="equip-spec-value">${item.healthScore}%</div></div></div></div>
    </div>`,
    )
    .join("");
}

function updateEquipmentStats() {
  const total = document.getElementById("totalEquipment");
  const operational = document.getElementById("operationalCount");
  const maint = document.getElementById("maintenanceCount");
  if (total) total.innerText = EquipmentDB.items.length;
  if (operational)
    operational.innerText = EquipmentDB.items.filter(
      (i) => i.status === "Operational",
    ).length;
  if (maint)
    maint.innerText = EquipmentDB.items.filter(
      (i) => i.status === "Maintenance",
    ).length;
}

function showEquipmentDetails(id) {
  alert("Equipment details for ID: " + id);
}
function closeEquipModal() {
  document.getElementById("equipModal")?.remove();
}
function exportEquipmentData() {
  showMaintStatus("Export equipment data", "info");
}

// ============================================
// FAULTS MODULE - SIMPLIFIED
// ============================================

function initFaults() {
  console.log("Initializing Faults module...");
  const defaultFaults = [
    {
      id: 1,
      faultId: "FLT-2024-001",
      date: "2081/07/10",
      time: "14:30",
      equipment: "Unit 2 Generator",
      type: "Mechanical",
      severity: "Critical",
      description: "Bearing temperature exceeded 85°C",
      status: "Resolved",
      downtime: 3.5,
    },
    {
      id: 2,
      faultId: "FLT-2024-002",
      date: "2081/07/12",
      time: "09:15",
      equipment: "Main Transformer T1",
      type: "Electrical",
      severity: "High",
      description: "Overcurrent trip",
      status: "Resolved",
      downtime: 1.5,
    },
  ];
  FaultsDB.items =
    JSON.parse(localStorage.getItem("faults_items")) || defaultFaults;
  FaultsDB.filteredItems = [...FaultsDB.items];
  renderFaultsTable();
  updateFaultStats();
}

function renderFaultsTable() {
  const tbody = document.getElementById("faultsTableBody");
  if (!tbody) return;
  tbody.innerHTML = FaultsDB.filteredItems
    .map(
      (fault) => `
    <tr><td class="mono bold">${fault.faultId}</td><td>${fault.date}</td><td>${fault.time}</td><td>${fault.equipment}</td><td>${fault.type}</td><td><span class="severity-badge severity-${fault.severity.toLowerCase()}">${fault.severity}</span></td><td>${fault.description.substring(0, 35)}...</td><td>${fault.downtime || 0} hrs</td><td><span class="severity-badge">${fault.status}</span></td><td><button class="btn-icon-view" onclick="viewFaultDetails(${fault.id})"><i class="fas fa-eye"></i></button></td></tr>
  `,
    )
    .join("");
}

function updateFaultStats() {
  const open = document.getElementById("openFaults");
  const critical = document.getElementById("criticalFaults");
  if (open)
    open.innerText = FaultsDB.filteredItems.filter(
      (f) => f.status !== "Resolved",
    ).length;
  if (critical)
    critical.innerText = FaultsDB.filteredItems.filter(
      (f) => f.severity === "Critical",
    ).length;
}

function viewFaultDetails(id) {
  alert("Fault details for ID: " + id);
}
function filterFaults() {
  renderFaultsTable();
  updateFaultStats();
}
function resetFaultFilters() {
  FaultsDB.filteredItems = [...FaultsDB.items];
  renderFaultsTable();
  updateFaultStats();
}
function exportFaultsData() {
  showMaintStatus("Export faults data", "info");
}
function clearFaultsData() {
  if (confirm("Clear all faults?")) {
    localStorage.removeItem("faults_items");
    initFaults();
    showMaintStatus("Faults cleared", "success");
  }
}
function closeFaultModal() {
  document.getElementById("faultModal")?.remove();
}
function showAddFaultForm() {
  alert("Add fault form");
}

// ============================================
// MOBILE RESPONSIVENESS
// ============================================

function initMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!document.querySelector(".sidebar-overlay")) {
    const overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
  }
  const overlay = document.querySelector(".sidebar-overlay");

  window.toggleMobileSidebar = function () {
    if (window.innerWidth > 768) return;
    if (sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    } else {
      sidebar.classList.add("open");
      overlay.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  };
  window.closeMobileSidebar = function () {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  };
  if (overlay) overlay.onclick = window.closeMobileSidebar;

  const toggle = document.querySelector(".topbar-toggle");
  if (toggle) {
    toggle.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.toggleMobileSidebar();
      return false;
    };
  }

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && sidebar.classList.contains("open"))
      window.closeMobileSidebar();
  });
  document.querySelectorAll(".nav-item").forEach((item) =>
    item.addEventListener("click", () => {
      if (window.innerWidth <= 768) setTimeout(window.closeMobileSidebar, 100);
    }),
  );
}

// ============================================
// DOM CONTENT LOADED - MAIN INIT
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded - Initializing...");

  // Initialize sidebar
  initMobileSidebar();

  // Load sample data
  addSampleFeedPosts();

  // Initialize dashboard charts
  initDashboardCharts();

  // Set up nav item click handlers
  document.querySelectorAll(".nav-item").forEach((item) => {
    const onclickAttr = item.getAttribute("onclick");
    if (onclickAttr) {
      const match = onclickAttr.match(/showPage\('([^']+)'/);
      if (match) {
        const pageId = match[1];
        item.addEventListener("click", (e) => {
          e.preventDefault();
          showPage(pageId, item);
        });
      }
    }
  });

  // Check which page is active on load
  const activePage = document.querySelector(".page.active");
  if (activePage) {
    const id = activePage.id.replace("page-", "");
    if (id === "dashboard") initDashboardCharts();
    if (id === "feed") {
      loadMaintenanceFeed();
      setupFeedPhotoHandlers();
    }
  }

  // Set up maintenance tabs
  document.querySelectorAll(".maint-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.dataset.tab;
      document
        .querySelectorAll(".maint-tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".maint-tab-content")
        .forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      const content = document.getElementById(
        `tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`,
      );
      if (content) content.classList.add("active");
    });
  });

  // Generation page upload button
  const uploadBtn = document.getElementById("uploadCsvBtn");
  if (uploadBtn) uploadBtn.onclick = () => manualGenSync();

  console.log("All modules initialized successfully!");
});

// Expose global functions
window.toggleSidebar = toggleSidebar;
window.toggleTheme = toggleTheme;
window.toggleNotif = toggleNotif;
window.showPage = showPage;
window.initWaterChart = initWaterChart;
window.openShiftLogModal = openShiftLogModal;
window.closeShiftLogModal = closeShiftLogModal;
window.saveShiftLog = saveShiftLog;
window.switchOpsTab = switchOpsTab;
window.toggleInlinePostForm = toggleInlinePostForm;
window.submitInlinePost = submitInlinePost;
window.generateFeedReport = generateFeedReport;
window.openPhotoViewer = openPhotoViewer;
window.removeFeedPhoto = removeFeedPhoto;
window.submitFeedComment = submitFeedComment;
window.cancelFeedComment = cancelFeedComment;
window.showAllComments = showAllComments;
window.addMaintenanceTask = addMaintenanceTask;
window.exportMaintenanceReport = exportMaintenanceReport;
window.clearMaintenanceData = clearMaintenanceData;
window.showEquipmentDetails = showEquipmentDetails;
window.closeEquipModal = closeEquipModal;
window.exportEquipmentData = exportEquipmentData;
window.viewFaultDetails = viewFaultDetails;
window.filterFaults = filterFaults;
window.resetFaultFilters = resetFaultFilters;
window.exportFaultsData = exportFaultsData;
window.clearFaultsData = clearFaultsData;
window.closeFaultModal = closeFaultModal;
window.showAddFaultForm = showAddFaultForm;
window.manualGenSync = manualGenSync;
window.closeMobileSidebar = window.closeMobileSidebar;

console.log("HydroPlant Manager - All modules loaded successfully!");
