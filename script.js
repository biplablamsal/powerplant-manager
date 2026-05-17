// ============================================
// NAVIGATION & CORE FUNCTIONS
// ============================================

function showPage(id, el) {
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
  if (pg) pg.classList.add("active");
  if (el) el.classList.add("active");

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
  };

  const breadcrumb = document.getElementById("breadcrumb");
  if (breadcrumb) breadcrumb.textContent = names[id] || id;

  // Initialize charts lazily
  if (id === "operations") initWaterChart();
  if (id === "generation") {
    // Generation log charts will be initialized by the GenDB system
    console.log("Generation log page loaded");
  }
}

// ============================================
// SIDEBAR TOGGLE
// ============================================
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.toggle("collapsed");
}

// ============================================
// THEME TOGGLE
// ============================================
function toggleTheme() {
  const h = document.documentElement;
  const t = h.getAttribute("data-theme") === "dark" ? "light" : "dark";
  h.setAttribute("data-theme", t);
  setTimeout(() => {
    destroyAndReinit();
  }, 50);
}

// ============================================
// NOTIFICATIONS
// ============================================
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
// FLOATING ACTION BUTTON
// ============================================
let fabOpen = false;
function toggleFab() {
  fabOpen = !fabOpen;
  const menu = document.getElementById("fabMenu");
  const icon = document.getElementById("fabIcon");
  if (menu) menu.classList.toggle("open", fabOpen);
  if (icon) icon.className = fabOpen ? "fas fa-times" : "fas fa-plus";
}

// ============================================
// TABS FOR OPERATIONS & MAINTENANCE
// ============================================
function switchTab(el, target) {
  const parent = el.closest(".page-content");
  if (!parent) return;

  parent.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  el.classList.add("active");

  const allTabContent = parent.querySelectorAll('[id^="op-"],[id^="maint-"]');
  allTabContent.forEach((c) => (c.style.display = "none"));

  const t = document.getElementById(target);
  if (t) t.style.display = "";
}

function showOpForm() {
  alert("New operation entry form would open here");
}

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

const opDate = document.getElementById("op-date");
if (opDate) {
  opDate.textContent = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

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

const chartInstances = {};

function mkChart(id, config) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }
  const ctx = document.getElementById(id);
  if (!ctx) return;
  chartInstances[id] = new Chart(ctx, config);
  return chartInstances[id];
}

// ============================================
// DASHBOARD CHARTS
// ============================================
function initGenChart() {
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
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15,20,35,.9)",
          titleColor: "#e8edf5",
          bodyColor: "#8b96a8",
        },
      },
      scales: {
        x: {
          grid: { color: gridColor() },
          ticks: { color: textColor(), maxTicksLimit: 12, font: { size: 11 } },
        },
        y: {
          position: "left",
          grid: { color: gridColor() },
          ticks: { color: textColor(), font: { size: 11 } },
          title: { display: true, text: "MW", color: textColor() },
        },
        y1: {
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: { color: textColor(), font: { size: 11 } },
          title: { display: true, text: "m³/s", color: textColor() },
        },
      },
    },
  });
}

function initMonthlyChart() {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const data2024 = [
    4180, 3820, 4250, 3980, 4100, 3650, 2800, 2200, 3100, 3900, 4050, 4280,
  ];
  const data2023 = [
    4050, 3700, 4100, 3850, 4000, 3500, 2650, 2050, 2950, 3780, 3900, 4150,
  ];

  mkChart("monthlyChart", {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          label: "2024 (MWh)",
          data: data2024,
          backgroundColor: "rgba(74,157,232,.8)",
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: "2023 (MWh)",
          data: data2023,
          backgroundColor: "rgba(74,157,232,.2)",
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor(), font: { size: 11 } },
        },
        y: {
          grid: { color: gridColor() },
          ticks: { color: textColor(), font: { size: 11 } },
          title: { display: true, text: "MWh", color: textColor() },
        },
      },
    },
  });
}

function initFaultDonut() {
  mkChart("faultDonut", {
    type: "doughnut",
    data: {
      labels: ["Mechanical", "Electrical", "Instrumentation", "Civil"],
      datasets: [
        {
          data: [16, 11, 9, 6],
          backgroundColor: ["#4a9de8", "#29c48f", "#f5ae3a", "#9f7aea"],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: { legend: { display: false } },
      cutout: "68%",
    },
  });

  mkChart("faultTrend", {
    type: "bar",
    data: {
      labels: ["Sep", "Oct", "Nov", "Dec", "Jan"],
      datasets: [
        {
          label: "Faults",
          data: [8, 12, 7, 9, 6],
          backgroundColor: "rgba(226,75,74,.65)",
          borderRadius: 3,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: gridColor() } },
      },
    },
  });
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

function initGauges() {
  drawGauge("g1", 84, 120, "#f5ae3a");
  drawGauge("g2", 91, 120, "#f5ae3a");
  drawGauge("g3", 50.1, 51, "#4a9de8");
}

let waterInited = false;
function initWaterChart() {
  if (waterInited) return;
  waterInited = true;
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
          ticks: { color: textColor(), font: { size: 11 }, maxTicksLimit: 12 },
        },
        y: {
          grid: { color: gridColor() },
          ticks: { color: textColor(), font: { size: 11 } },
          title: { display: true, text: "m³/s", color: textColor() },
        },
        y1: {
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: { color: textColor(), font: { size: 11 } },
          title: { display: true, text: "m", color: textColor() },
        },
      },
    },
  });
}

let genLogInited = false;
function initGenLogChart() {
  if (genLogInited) return;
  genLogInited = true;
  const canvas = document.getElementById("genLog");
  if (!canvas) return;
  const labels = [
    "Jan 9",
    "Jan 10",
    "Jan 11",
    "Jan 12",
    "Jan 13",
    "Jan 14",
    "Jan 15",
  ];
  mkChart("genLog", {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Unit 1",
          data: [3200, 3250, 3180, 3220, 3240, 3190, 3210],
          borderColor: "#4a9de8",
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
        },
        {
          label: "Unit 2",
          data: [3100, 3080, 2900, 0, 0, 3050, 0],
          borderColor: "#e24b4a",
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          borderDash: [4, 3],
        },
        {
          label: "Unit 3",
          data: [3350, 3380, 3320, 3290, 3400, 3420, 3380],
          borderColor: "#29c48f",
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
        },
        {
          label: "Unit 4",
          data: [3280, 3300, 3260, 3300, 3310, 3290, 3320],
          borderColor: "#f5ae3a",
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: textColor(),
            usePointStyle: true,
            pointStyleWidth: 10,
            font: { size: 11 },
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor() },
          ticks: { color: textColor(), font: { size: 11 } },
        },
        y: {
          grid: { color: gridColor() },
          ticks: { color: textColor(), font: { size: 11 } },
          title: { display: true, text: "MWh/day", color: textColor() },
        },
      },
    },
  });
}

function destroyAndReinit() {
  Object.values(chartInstances).forEach((c) => {
    try {
      c.destroy();
    } catch (e) {}
  });
  Object.keys(chartInstances).forEach((k) => delete chartInstances[k]);
  waterInited = false;
  genLogInited = false;
  initAllCharts();
}

function initAllCharts() {
  initGenChart();
  initMonthlyChart();
  initFaultDonut();
  initGauges();
}

window.addEventListener("load", () => {
  initAllCharts();
});

// ============================================
// GENERATION LOG DASHBOARD
// ============================================

let GenDB = { allDays: [], filteredDays: [] };
let genCharts = {};

// DOM Elements
const uploadBtn = document.getElementById("uploadCsvBtn");
const csvInput = document.getElementById("csvFileInput");

if (uploadBtn && csvInput) {
  uploadBtn.onclick = () => csvInput.click();
  csvInput.onchange = handleGenFileSelect;
}

function showGenStatus(message, type) {
  let statusDiv = document.getElementById("genStatusMessage");
  if (!statusDiv) {
    statusDiv = document.createElement("div");
    statusDiv.id = "genStatusMessage";
    statusDiv.className = "gen-status-message";
    document.body.appendChild(statusDiv);
  }
  const colors = {
    success: "#2ecc71",
    error: "#e74c3c",
    info: "#3d8ef7",
    warning: "#f5a623",
  };
  statusDiv.style.backgroundColor = colors[type] || colors.info;
  statusDiv.style.color = "white";
  statusDiv.innerHTML = message;
  statusDiv.style.display = "block";
  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 3000);
}

function processGenFiles(files) {
  let pending = files.length;

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseGenCSV(e.target.result, file.name);
        if (result.days && result.days.length > 0) {
          const existing = new Set(GenDB.allDays.map((d) => d.bsDate));
          result.days.forEach((d) => {
            if (!existing.has(d.bsDate)) GenDB.allDays.push(d);
          });
          GenDB.allDays.sort((a, b) => a.bsDate.localeCompare(b.bsDate));
          showGenStatus(
            `✓ "${file.name}": ${result.days.length} days loaded`,
            "success",
          );
        } else {
          showGenStatus(`✗ "${file.name}": No valid data found`, "error");
        }
        pending--;
        if (pending === 0 && GenDB.allDays.length > 0) {
          onGenDataLoaded();
          showGenStatus(
            `✓ Total: ${GenDB.allDays.length} days loaded`,
            "success",
          );
        }
      } catch (err) {
        pending--;
        showGenStatus(`✗ Error: ${err.message}`, "error");
      }
    };
    reader.readAsText(file);
  });
}

function parseGenCSV(text, filename) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { days: [], error: "File is empty" };

  const days = [];
  let currentDay = null;
  let currentHours = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const dateMatch = line.match(/(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);

    if (dateMatch && !line.includes("Hour") && !line.includes("Time")) {
      if (currentDay && currentHours.length > 0) {
        const computed = computeGenDayEnergy(currentHours);
        days.push({ bsDate: currentDay, hours: currentHours, computed });
      }
      currentDay = dateMatch[1].replace(/-/g, "/");
      currentHours = [];
    }

    if (currentDay && line.includes(":")) {
      const hourMatch = line.match(/(\d{1,2}):/);
      const hour = hourMatch ? parseInt(hourMatch[1]) : 0;
      const numbers = line.match(/\d+(?:\.\d+)?/g) || [];
      const values = numbers.map((n) => parseFloat(n)).filter((n) => !isNaN(n));

      let u1mw = null,
        u2mw = null,
        u1pf = null,
        u2pf = null;
      for (let val of values) {
        if (val >= 0 && val <= 35) {
          if (u1mw === null) u1mw = val;
          else if (u2mw === null) u2mw = val;
        }
        if (val >= 0.8 && val <= 1.05) {
          if (u1pf === null) u1pf = val;
          else if (u2pf === null) u2pf = val;
        }
      }
      const isShutdown = line.toUpperCase().includes("SHUT");
      currentHours.push({
        hour,
        hourStr: `${hour}:00`,
        u1Shutdown: isShutdown,
        u2Shutdown: isShutdown,
        u1: { mw: u1mw, pf: u1pf, hz: 50.0 },
        u2: { mw: u2mw, pf: u2pf, hz: 50.0 },
        grid: { mw: null },
        remarks: "",
      });
    }
  }

  if (currentDay && currentHours.length > 0) {
    const computed = computeGenDayEnergy(currentHours);
    days.push({ bsDate: currentDay, hours: currentHours, computed });
  }

  if (days.length === 0 && lines.length > 5) {
    return createSampleGenData(lines, filename);
  }
  return { days };
}

function createSampleGenData(lines, filename) {
  let bsDate = "2081/07/01";
  const dateMatch = filename.match(/(\d{4})[\/\-]?(\d{2})/);
  if (dateMatch) bsDate = `${dateMatch[1]}/${dateMatch[2]}/01`;

  const allNumbers = [];
  for (const line of lines) {
    const nums = line.match(/\d+(?:\.\d+)?/g);
    if (nums)
      nums.forEach((n) => {
        const num = parseFloat(n);
        if (num > 0 && num < 100) allNumbers.push(num);
      });
  }

  const hours = [];
  const avgMW =
    allNumbers.length > 0
      ? allNumbers.reduce((a, b) => a + b, 0) / allNumbers.length
      : 12;

  for (let h = 0; h < 24; h++) {
    hours.push({
      hour: h,
      hourStr: `${h}:00`,
      u1Shutdown: h < 6 || h > 22,
      u2Shutdown: h < 6 || h > 22,
      u1: { mw: h >= 6 && h <= 22 ? avgMW : 0, pf: 0.95, hz: 50.0 },
      u2: { mw: h >= 6 && h <= 22 ? avgMW : 0, pf: 0.94, hz: 50.0 },
      grid: { mw: null },
      remarks: "",
    });
  }

  const computed = computeGenDayEnergy(hours);
  return { days: [{ bsDate, hours, computed }] };
}

function computeGenDayEnergy(hours) {
  let u1Total = 0,
    u2Total = 0,
    u1Hours = 0,
    u2Hours = 0;
  let u1MWSum = 0,
    u2MWSum = 0,
    pfSum = 0,
    pfCount = 0;
  let shutdownHrs = 0,
    maxMW = 0;

  for (const h of hours) {
    if (h.u1Shutdown && h.u2Shutdown) shutdownHrs++;
    if (!h.u1Shutdown && h.u1.mw !== null && h.u1.mw > 0) {
      u1Total += h.u1.mw;
      u1Hours++;
      u1MWSum += h.u1.mw;
      if (h.u1.mw > maxMW) maxMW = h.u1.mw;
    }
    if (!h.u2Shutdown && h.u2.mw !== null && h.u2.mw > 0) {
      u2Total += h.u2.mw;
      u2Hours++;
      u2MWSum += h.u2.mw;
      if (h.u2.mw > maxMW) maxMW = h.u2.mw;
    }
    if (h.u1.pf && h.u1.pf > 0.7) {
      pfSum += h.u1.pf;
      pfCount++;
    }
    if (h.u2.pf && h.u2.pf > 0.7) {
      pfSum += h.u2.pf;
      pfCount++;
    }
  }

  return {
    u1Energy: Math.round(u1Total * 10) / 10,
    u2Energy: Math.round(u2Total * 10) / 10,
    totalEnergy: Math.round((u1Total + u2Total) * 10) / 10,
    u1AvgMW: u1Hours > 0 ? Math.round((u1MWSum / u1Hours) * 100) / 100 : 0,
    u2AvgMW: u2Hours > 0 ? Math.round((u2MWSum / u2Hours) * 100) / 100 : 0,
    maxMW: Math.round(maxMW * 100) / 100,
    opHours: hours.filter((h) => !h.u1Shutdown || !h.u2Shutdown).length,
    shutdownHrs: shutdownHrs,
    avgPF: pfCount > 0 ? Math.round((pfSum / pfCount) * 1000) / 1000 : 0.95,
    avgHz: 50.0,
  };
}

function onGenDataLoaded() {
  const emptyState = document.getElementById("genEmptyState");
  const content = document.getElementById("genDashboardContent");
  const leftPanel = document.getElementById("genLeftPanel");
  const filesCard = document.getElementById("genFilesCard");

  if (emptyState) emptyState.style.display = "none";
  if (content) content.style.display = "block";
  if (leftPanel) leftPanel.style.display = "block";
  if (filesCard) filesCard.style.display = "block";

  renderGenFileList();
  renderGenDashboard(GenDB.allDays);
}

function renderGenFileList() {
  const container = document.getElementById("genFileList");
  if (!container) return;
  const totalHours = GenDB.allDays.reduce((sum, d) => sum + d.hours.length, 0);
  container.innerHTML = `<div class="gen-file-item"><div class="gen-file-info"><i class="fas fa-database"></i><span>Parsed Data Store</span><span class="gen-file-badge">${GenDB.allDays.length} days · ${totalHours} hours</span></div></div>`;
}

function renderGenDashboard(days) {
  if (!days.length) return;

  const totalU1 = days.reduce((s, d) => s + d.computed.u1Energy, 0);
  const totalU2 = days.reduce((s, d) => s + d.computed.u2Energy, 0);
  const totalEnergy = totalU1 + totalU2;
  const totalOpHours = days.reduce((s, d) => s + d.computed.opHours, 0);
  const totalShutdown = days.reduce((s, d) => s + d.computed.shutdownHrs, 0);
  const maxMW = Math.max(...days.map((d) => d.computed.maxMW));
  const avgPF = days.reduce((s, d) => s + d.computed.avgPF, 0) / days.length;

  document.getElementById("qsDays") &&
    (document.getElementById("qsDays").innerHTML = days.length);
  document.getElementById("qsHours") &&
    (document.getElementById("qsHours").innerHTML = totalOpHours);
  document.getElementById("qsShutdown") &&
    (document.getElementById("qsShutdown").innerHTML = totalShutdown);
  document.getElementById("qsPF") &&
    (document.getElementById("qsPF").innerHTML = avgPF.toFixed(3));
  document.getElementById("genDashTitle") &&
    (document.getElementById("genDashTitle").innerHTML =
      `Kartik 2081 – ${days.length} Days`);
  document.getElementById("genDashSubtitle") &&
    (document.getElementById("genDashSubtitle").innerHTML =
      `${days[0].bsDate} – ${days[days.length - 1].bsDate} · Set Nadi Hydroelectric Project`);

  const kpiRow = document.getElementById("genKpiRow");
  if (kpiRow) {
    kpiRow.innerHTML = `
      <div class="gen-kpi-card cyan"><div class="gen-kpi-label"><i class="fas fa-bolt"></i> TOTAL GENERATION</div><div class="gen-kpi-value">${totalEnergy.toFixed(1)}<span class="gen-kpi-unit">MWh</span></div><div class="gen-kpi-sub">U1: ${totalU1.toFixed(1)} + U2: ${totalU2.toFixed(1)} MWh</div></div>
      <div class="gen-kpi-card blue"><div class="gen-kpi-label"><i class="fas fa-charging-station"></i> GRID EXPORT</div><div class="gen-kpi-value">${(totalEnergy * 0.98).toFixed(1)}<span class="gen-kpi-unit">MWh</span></div><div class="gen-kpi-sub">Via 132kV Outgoing Line</div></div>
      <div class="gen-kpi-card green"><div class="gen-kpi-label"><i class="fas fa-clock"></i> OP HOURS</div><div class="gen-kpi-value">${totalOpHours}<span class="gen-kpi-unit">hrs</span></div><div class="gen-kpi-sub">Shutdown: ${totalShutdown} hrs · ${days.length} days</div></div>
      <div class="gen-kpi-card amber"><div class="gen-kpi-label"><i class="fas fa-chart-line"></i> PEAK MW</div><div class="gen-kpi-value">${maxMW.toFixed(2)}<span class="gen-kpi-unit">MW</span></div><div class="gen-kpi-sub">Avg PF: ${avgPF.toFixed(3)} · Hz: 49.98</div></div>
    `;
  }

  renderGenTrendChart(days, "mwh");
  renderUnitCompChart(days);
  renderPFHzChart(days);
  renderHourlyProfileChart(days);
  renderGenDailyTable(days);
  document.getElementById("genTableDaysCount") &&
    (document.getElementById("genTableDaysCount").innerHTML =
      `${days.length} days`);
}

function renderGenTrendChart(days, mode) {
  const canvas = document.getElementById("genTrendChart");
  if (!canvas) return;
  if (genCharts.genTrend) genCharts.genTrend.destroy();

  const labels = days.map((d) => d.bsDate.split("/").slice(1).join("/"));
  let data, color;
  if (mode === "mwh") {
    data = days.map((d) => d.computed.totalEnergy);
    color = "#00e5c8";
  } else if (mode === "mw") {
    data = days.map((d) => d.computed.u1AvgMW + d.computed.u2AvgMW);
    color = "#3d8ef7";
  } else {
    data = days.map((d) => d.computed.opHours);
    color = "#f5a623";
  }

  genCharts.genTrend = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: color + "33",
          borderColor: color,
          borderWidth: 1.5,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function switchGenChartMode(mode) {
  if (GenDB.allDays.length) renderGenTrendChart(GenDB.allDays, mode);
  const btns = document.querySelectorAll(".gen-tab-btn");
  btns.forEach((btn) => btn.classList.remove("active"));
  if (event && event.target) event.target.classList.add("active");
}

function renderUnitCompChart(days) {
  const canvas = document.getElementById("unitCompChart");
  if (!canvas) return;
  if (genCharts.unitComp) genCharts.unitComp.destroy();

  const u1ByHour = Array(24)
    .fill()
    .map(() => []);
  const u2ByHour = Array(24)
    .fill()
    .map(() => []);

  days.forEach((day) => {
    day.hours.forEach((h) => {
      if (!h.u1Shutdown && h.u1.mw > 0) u1ByHour[h.hour].push(h.u1.mw);
      if (!h.u2Shutdown && h.u2.mw > 0) u2ByHour[h.hour].push(h.u2.mw);
    });
  });

  const hours = Array.from({ length: 24 }, (_, i) =>
    i === 0 ? "0:00" : `${i}:00`,
  );
  const u1avg = u1ByHour.map((v) =>
    v.length ? v.reduce((a, b) => a + b) / v.length : 0,
  );
  const u2avg = u2ByHour.map((v) =>
    v.length ? v.reduce((a, b) => a + b) / v.length : 0,
  );

  genCharts.unitComp = new Chart(canvas, {
    type: "line",
    data: {
      labels: hours,
      datasets: [
        {
          label: "Unit I",
          data: u1avg,
          borderColor: "#3d8ef7",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
        {
          label: "Unit II",
          data: u2avg,
          borderColor: "#00e5c8",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          borderDash: [4, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { position: "top" } },
    },
  });
}

function renderPFHzChart(days) {
  const canvas = document.getElementById("pfHzChart");
  if (!canvas) return;
  if (genCharts.pfHz) genCharts.pfHz.destroy();

  const labels = days.map((d) => d.bsDate.split("/").slice(1).join("/"));
  const pfData = days.map((d) => d.computed.avgPF);
  const hzData = days.map(() => 49.98);

  genCharts.pfHz = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Power Factor",
          data: pfData,
          borderColor: "#f5a623",
          borderWidth: 2,
          yAxisID: "yPF",
        },
        {
          label: "Frequency (Hz)",
          data: hzData,
          borderColor: "#8b5cf6",
          borderWidth: 1.5,
          yAxisID: "yHz",
          borderDash: [4, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        yPF: {
          position: "left",
          min: 0.8,
          max: 1.05,
          title: { display: true, text: "Power Factor" },
        },
        yHz: {
          position: "right",
          min: 49,
          max: 51,
          title: { display: true, text: "Frequency (Hz)" },
          grid: { display: false },
        },
      },
    },
  });
}

function renderHourlyProfileChart(days) {
  const canvas = document.getElementById("hourlyProfileChart");
  if (!canvas) return;
  if (genCharts.hourly) genCharts.hourly.destroy();

  const u1ByHour = Array(24)
    .fill()
    .map(() => []);
  const u2ByHour = Array(24)
    .fill()
    .map(() => []);

  days.forEach((day) => {
    day.hours.forEach((h) => {
      if (!h.u1Shutdown && h.u1.mw > 0) u1ByHour[h.hour].push(h.u1.mw);
      if (!h.u2Shutdown && h.u2.mw > 0) u2ByHour[h.hour].push(h.u2.mw);
    });
  });

  const hours = Array.from({ length: 24 }, (_, i) =>
    i === 0 ? "0:00" : `${i}:00`,
  );
  const u1avg = u1ByHour.map((v) =>
    v.length ? v.reduce((a, b) => a + b) / v.length : 0,
  );
  const u2avg = u2ByHour.map((v) =>
    v.length ? v.reduce((a, b) => a + b) / v.length : 0,
  );

  genCharts.hourly = new Chart(canvas, {
    type: "bar",
    data: {
      labels: hours,
      datasets: [
        {
          label: "Unit I",
          data: u1avg,
          backgroundColor: "#3d8ef7",
          borderColor: "#3d8ef7",
          borderWidth: 1,
        },
        {
          label: "Unit II",
          data: u2avg,
          backgroundColor: "#00e5c8",
          borderColor: "#00e5c8",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: { y: { title: { display: true, text: "MW" } } },
      plugins: { legend: { position: "top" } },
    },
  });
}

function renderGenDailyTable(days) {
  const tbody = document.getElementById("genDailySummaryBody");
  if (!tbody) return;

  tbody.innerHTML = days
    .map((day) => {
      const c = day.computed;
      return `
      <tr>
        <td>${day.bsDate}</td>
        <td>${day.bsDate}</td>
        <td><strong>${c.u1Energy.toFixed(1)}</strong></td>
        <td><strong>${c.u2Energy.toFixed(1)}</strong></td>
        <td><strong style="color:#00e5c8">${c.totalEnergy.toFixed(1)}</strong></td>
        <td>${c.u1AvgMW.toFixed(2)}</td>
        <td>${c.u2AvgMW.toFixed(2)}</td>
        <td>${c.maxMW.toFixed(2)}</td>
        <td>${c.opHours}</td>
        <td>${c.shutdownHrs}</td>
        <td>${c.avgPF.toFixed(3)}</td>
        <td>${c.avgHz.toFixed(2)}</td>
      </tr>
    `;
    })
    .join("");
}

function applyGenFilters() {
  const from = document.getElementById("filterFrom").value;
  const to = document.getElementById("filterTo").value;
  const unitView = document.getElementById("filterUnit")
    ? document.getElementById("filterUnit").value
    : "both";

  let filtered = [...GenDB.allDays];

  if (from) {
    filtered = filtered.filter((d) => d.bsDate.replace(/\//g, "-") >= from);
  }
  if (to) {
    filtered = filtered.filter((d) => d.bsDate.replace(/\//g, "-") <= to);
  }

  renderGenDashboard(filtered);
  showGenStatus(`Filtered: ${filtered.length} days`, "info");
}

function exportGenerationCSV() {
  const days = GenDB.allDays;
  if (!days.length) {
    showGenStatus("No data to export", "warning");
    return;
  }

  const headers = [
    "BS_Date",
    "AD_Date",
    "U1_Energy_MWh",
    "U2_Energy_MWh",
    "Total_Energy_MWh",
    "U1_Avg_MW",
    "U2_Avg_MW",
    "Max_MW",
    "Op_Hours",
    "Shutdown_Hrs",
    "Avg_PF",
    "Avg_Hz",
  ];

  const rows = days.map((d) =>
    [
      d.bsDate,
      d.bsDate,
      d.computed.u1Energy,
      d.computed.u2Energy,
      d.computed.totalEnergy,
      d.computed.u1AvgMW,
      d.computed.u2AvgMW,
      d.computed.maxMW,
      d.computed.opHours,
      d.computed.shutdownHrs,
      d.computed.avgPF || "",
      d.computed.avgHz || "",
    ].join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Generation_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showGenStatus("Export complete!", "success");
}

function clearAllGenData() {
  if (confirm("Clear all loaded generation data?")) {
    GenDB.allDays = [];
    GenDB.filteredDays = [];

    const emptyState = document.getElementById("genEmptyState");
    const content = document.getElementById("genDashboardContent");
    const leftPanel = document.getElementById("genLeftPanel");
    const filesCard = document.getElementById("genFilesCard");

    if (emptyState) emptyState.style.display = "flex";
    if (content) content.style.display = "none";
    if (leftPanel) leftPanel.style.display = "none";
    if (filesCard) filesCard.style.display = "none";

    showGenStatus("All data cleared", "info");
  }
}

// Make functions available globally
window.applyGenFilters = applyGenFilters;
window.exportGenerationCSV = exportGenerationCSV;
window.clearAllGenData = clearAllGenData;
window.switchGenChartMode = switchGenChartMode;

// ============================================
// EXCEL PARSER FOR .XLSX FILES
// ============================================

async function handleGenFileSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length) {
    showGenStatus("Processing files...", "info");
    await processGenFiles(files);
  }
  e.target.value = "";
}

async function processGenFiles(files) {
  let pending = files.length;

  for (const file of files) {
    try {
      const fileExt = file.name.split(".").pop().toLowerCase();

      if (fileExt === "csv") {
        // Use existing CSV parser
        const text = await file.text();
        const result = parseGenCSV(text, file.name);
        if (result.days && result.days.length > 0) {
          mergeDays(result.days);
          showGenStatus(
            `✓ "${file.name}": ${result.days.length} days loaded`,
            "success",
          );
        } else {
          showGenStatus(`✗ "${file.name}": No valid data found`, "error");
        }
      } else if (fileExt === "xlsx" || fileExt === "xls") {
        // Parse Excel file
        const result = await parseExcelFile(file);
        if (result.days && result.days.length > 0) {
          mergeDays(result.days);
          showGenStatus(
            `✓ "${file.name}": ${result.days.length} days loaded from Excel`,
            "success",
          );
        } else {
          showGenStatus(`✗ "${file.name}": No valid data found`, "error");
        }
      }

      pending--;
      if (pending === 0 && GenDB.allDays.length > 0) {
        onGenDataLoaded();
        showGenStatus(
          `✓ Total: ${GenDB.allDays.length} days loaded`,
          "success",
        );
      }
    } catch (err) {
      pending--;
      showGenStatus(`✗ Error parsing "${file.name}": ${err.message}`, "error");
    }
  }
}

function mergeDays(newDays) {
  const existing = new Set(GenDB.allDays.map((d) => d.bsDate));
  newDays.forEach((d) => {
    if (!existing.has(d.bsDate)) {
      GenDB.allDays.push(d);
    }
  });
  GenDB.allDays.sort((a, b) => a.bsDate.localeCompare(b.bsDate));
}

async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const days = [];

        // Loop through each sheet
        for (const sheetName of workbook.SheetNames) {
          console.log(`Processing sheet: ${sheetName}`);

          const worksheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
          });

          if (!rawData || rawData.length < 5) {
            console.log(
              `Sheet ${sheetName} has insufficient rows: ${rawData?.length}`,
            );
            continue;
          }

          console.log(`Sheet ${sheetName} has ${rawData.length} rows`);

          // Extract date from sheet name or first rows
          let bsDate = extractDateFromSheet(sheetName, rawData);
          console.log(`Extracted date: ${bsDate}`);

          if (!bsDate) {
            // Try to get date from any cell
            for (let i = 0; i < Math.min(rawData.length, 20); i++) {
              const row = rawData[i];
              if (row) {
                for (const cell of row) {
                  if (cell && typeof cell === "string") {
                    const match = cell.match(
                      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
                    );
                    if (match) {
                      bsDate = match[1].replace(/-/g, "/");
                      console.log(`Found date in cell: ${bsDate}`);
                      break;
                    }
                  }
                }
              }
              if (bsDate) break;
            }
          }

          if (!bsDate) {
            console.log(`No date found for sheet ${sheetName}, skipping`);
            continue;
          }

          // Find rows containing numeric data (hourly data)
          // Look for rows where first column contains a number followed by colon (e.g., "1:00", "2:00")
          const hours = [];
          let dataStartRow = -1;

          for (let i = 0; i < Math.min(rawData.length, 100); i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            const firstCell = row[0] ? String(row[0]).trim() : "";

            // Check if this looks like an hour row (contains : and a number)
            if (
              firstCell.match(/^\d{1,2}:/) ||
              firstCell.match(/^\d{1,2}\.\d/)
            ) {
              dataStartRow = i;
              break;
            }
          }

          if (dataStartRow === -1) {
            console.log(`No hour rows found in sheet ${sheetName}`);
            continue;
          }

          console.log(`Data starts at row ${dataStartRow}`);

          // Parse hourly data
          for (let i = dataStartRow; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            const hourStr = row[0] ? String(row[0]).trim() : "";

            // Stop if we hit empty or non-hour data
            if (hourStr === "" || hourStr.toLowerCase().includes("date")) break;

            // Skip if doesn't look like hour
            if (!hourStr.match(/^\d{1,2}/)) continue;

            // Parse hour number
            const hourMatch = hourStr.match(/(\d{1,2})/);
            if (!hourMatch) continue;
            const hour = parseInt(hourMatch[1]);

            // Function to safely get numeric value from cell
            const getNumber = (cell) => {
              if (cell === undefined || cell === null || cell === "")
                return null;
              const num = parseFloat(String(cell).replace(/[^0-9.-]/g, ""));
              return isNaN(num) ? null : num;
            };

            // Get values from various possible column positions
            // Try multiple positions because Excel columns might shift
            let u1mw =
              getNumber(row[7]) || getNumber(row[6]) || getNumber(row[8]);
            let u1mwh =
              getNumber(row[11]) || getNumber(row[10]) || getNumber(row[12]);
            let u1pf =
              getNumber(row[9]) || getNumber(row[8]) || getNumber(row[10]);
            let u1hz =
              getNumber(row[10]) || getNumber(row[9]) || getNumber(row[11]);

            let u2mw =
              getNumber(row[18]) || getNumber(row[17]) || getNumber(row[19]);
            let u2mwh =
              getNumber(row[22]) || getNumber(row[21]) || getNumber(row[23]);
            let u2pf =
              getNumber(row[20]) || getNumber(row[19]) || getNumber(row[21]);
            let u2hz =
              getNumber(row[21]) || getNumber(row[20]) || getNumber(row[22]);

            let gridmw =
              getNumber(row[29]) || getNumber(row[28]) || getNumber(row[30]);

            let remarks = "";
            if (row[34]) remarks = String(row[34]).trim();
            else if (row[35]) remarks = String(row[35]).trim();

            // Check for shutdown
            const rowStr = row.join(" ").toUpperCase();
            const isShutdown =
              rowStr.includes("SHUTDOWN") || rowStr.includes("SHUT");

            if (u1mw !== null || u2mw !== null) {
              hours.push({
                hour: hour,
                hourStr: hourStr,
                u1Shutdown: isShutdown || (u1mw === 0 && u1mwh === 0),
                u2Shutdown: isShutdown || (u2mw === 0 && u2mwh === 0),
                u1: {
                  mw: u1mw,
                  mwh: u1mwh,
                  pf: u1pf,
                  hz: u1hz,
                },
                u2: {
                  mw: u2mw,
                  mwh: u2mwh,
                  pf: u2pf,
                  hz: u2hz,
                },
                grid: {
                  mw: gridmw,
                },
                remarks: remarks,
              });
            }
          }

          if (hours.length > 0) {
            console.log(`Parsed ${hours.length} hours for date ${bsDate}`);
            const computed = computeGenDayEnergy(hours);
            days.push({ bsDate, hours, computed });
          } else {
            console.log(`No valid hour data found for ${bsDate}`);
          }
        }

        console.log(`Total days parsed: ${days.length}`);
        resolve({ days });
      } catch (err) {
        console.error("Excel parsing error:", err);
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

function extractDateFromSheet(sheetName, rawData) {
  // Try to get date from sheet name first (BS date format)
  let dateMatch = sheetName.match(/(\d{4})[\/\-]?(\d{1,2})[\/\-]?(\d{1,2})/);
  if (dateMatch) {
    return `${dateMatch[1]}/${dateMatch[2].padStart(2, "0")}/${dateMatch[3].padStart(2, "0")}`;
  }

  // Try to find date in first 20 rows
  for (let i = 0; i < Math.min(rawData.length, 20); i++) {
    const row = rawData[i];
    if (!row) continue;

    for (const cell of row) {
      if (!cell) continue;
      const cellStr = String(cell);

      // Look for BS date pattern: 2081/07/15 or 2081-07-15
      const match = cellStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (match) {
        return `${match[1]}/${match[2].padStart(2, "0")}/${match[3].padStart(2, "0")}`;
      }
    }
  }

  // If no date found, use a default based on filename
  return null;
}

async function debugExcelFile(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    for (const sheetName of workbook.SheetNames) {
      console.log(`\n=== Sheet: ${sheetName} ===`);
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
      });

      console.log(`First 10 rows:`);
      for (let i = 0; i < Math.min(rawData.length, 10); i++) {
        console.log(`Row ${i}:`, rawData[i]);
      }
    }
  };
  reader.readAsArrayBuffer(file);
}
// ============================================
// ENHANCED MAINTENANCE DASHBOARD MODULE
// ============================================

let MaintDB = {
  tasks: [],
  history: [],
  assets: [],
  charts: {},
};

// Sample default data
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
    task: "Quarterly Service & Calibration",
    frequency: "3 months",
    lastDone: "2081/04/10",
    nextDue: "2081/07/10",
    assignedTo: "Prakash Thapa",
    status: "pending",
    priority: "warning",
  },
  {
    id: 3,
    asset: "Transformer T1",
    task: "Oil Filtration & DGA Test",
    frequency: "6 months",
    lastDone: "2081/01/15",
    nextDue: "2081/07/15",
    assignedTo: "E. Shrestha",
    status: "pending",
    priority: "warning",
  },
  {
    id: 4,
    asset: "Unit 1 Turbine",
    task: "Guide Vane Inspection",
    frequency: "4000 hrs",
    lastDone: "2081/02/20",
    nextDue: "2081/08/20",
    assignedTo: "Anil Adhikari",
    status: "pending",
    priority: "normal",
  },
  {
    id: 5,
    asset: "Penstock Valve",
    task: "Gate Valve Packing Replace",
    frequency: "Yearly",
    lastDone: "2080/09/10",
    nextDue: "2081/09/10",
    assignedTo: "Suresh Gurung",
    status: "pending",
    priority: "normal",
  },
];

const defaultHistory = [
  {
    date: "2081/06/10",
    asset: "Unit 1",
    wo: "WO-2024-0230",
    task: "Oil Change",
    duration: "4 hrs",
    downtime: "2 hrs",
    technician: "Prakash Thapa",
    status: "Completed",
  },
  {
    date: "2081/06/05",
    asset: "Transformer",
    wo: "WO-2024-0228",
    task: "Bushing Inspection",
    duration: "3 hrs",
    downtime: "1 hr",
    technician: "E. Shrestha",
    status: "Completed",
  },
  {
    date: "2081/05/28",
    asset: "Unit 2",
    wo: "WO-2024-0225",
    task: "Bearing Lubrication",
    duration: "2 hrs",
    downtime: "0",
    technician: "Anil Adhikari",
    status: "Completed",
  },
];

const defaultAssets = [
  {
    name: "Unit 1 Generator",
    health: 82,
    status: "good",
    lastMaint: "2081/06/10",
    nextMaint: "2081/09/10",
  },
  {
    name: "Unit 2 Generator",
    health: 60,
    status: "warning",
    lastMaint: "2080/12/10",
    nextMaint: "2081/08/15",
  },
  {
    name: "Unit 3 Turbine",
    health: 85,
    status: "good",
    lastMaint: "2081/04/10",
    nextMaint: "2081/07/10",
  },
  {
    name: "Transformer T1",
    health: 45,
    status: "critical",
    lastMaint: "2081/01/15",
    nextMaint: "2081/07/15",
  },
  {
    name: "Governor System",
    health: 78,
    status: "good",
    lastMaint: "2081/03/20",
    nextMaint: "2081/09/20",
  },
  {
    name: "Penstock Valve",
    health: 92,
    status: "good",
    lastMaint: "2080/09/10",
    nextMaint: "2081/09/10",
  },
];

// Initialize Maintenance Module
function initMaintenance() {
  // Load data
  MaintDB.tasks =
    JSON.parse(localStorage.getItem("maint_tasks")) || defaultTasks;
  MaintDB.history =
    JSON.parse(localStorage.getItem("maint_history")) || defaultHistory;
  MaintDB.assets =
    JSON.parse(localStorage.getItem("maint_assets")) || defaultAssets;

  renderMaintenanceDashboard();
  attachMaintEventListeners();
}

function attachMaintEventListeners() {
  // Tab switching
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
      document
        .getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`)
        .classList.add("active");

      // Refresh charts when switching to analytics tab
      if (tabId === "analytics") {
        renderAnalyticsCharts();
      }
      if (tabId === "health") {
        renderHealthTrendChart();
      }
    });
  });

  // Upload button
  const uploadBtn = document.getElementById("maintUploadBtn");
  const fileInput = document.getElementById("maintFileInput");
  if (uploadBtn && fileInput) {
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = handleMaintFileUpload;
  }

  // Export button
  const exportBtn = document.getElementById("maintExportBtn");
  if (exportBtn) {
    exportBtn.onclick = exportMaintenanceReport;
  }

  // Clear button
  const clearBtn = document.getElementById("clearMaintData");
  if (clearBtn) {
    clearBtn.onclick = clearMaintenanceData;
  }

  // Calendar navigation
  const prevWeek = document.getElementById("prevWeek");
  const nextWeek = document.getElementById("nextWeek");
  if (prevWeek && nextWeek) {
    let weekOffset = 0;
    prevWeek.onclick = () => {
      weekOffset--;
      renderCalendar(weekOffset);
    };
    nextWeek.onclick = () => {
      weekOffset++;
      renderCalendar(weekOffset);
    };
  }

  // History filter
  const filterSelect = document.getElementById("historyFilterAsset");
  if (filterSelect) {
    filterSelect.onchange = () => renderHistoryTable();
  }
}

function renderMaintenanceDashboard() {
  // Update stats
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const overdueTasks = MaintDB.tasks.filter(
    (t) => t.nextDue < today && t.status === "pending",
  );
  const dueThisWeek = MaintDB.tasks.filter((t) => {
    if (t.status !== "pending") return false;
    const dueDate = new Date(t.nextDue.split("/").reverse().join("-"));
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    return dueDate <= weekLater && t.nextDue >= today;
  });

  document.getElementById("statOverdue") &&
    (document.getElementById("statOverdue").innerText = overdueTasks.length);
  document.getElementById("statDueWeek") &&
    (document.getElementById("statDueWeek").innerText = dueThisWeek.length);

  // Calculate MTBF (simulated)
  const totalOps = 8760; // hours per year
  const failures =
    MaintDB.history.filter((h) => h.downtime !== "0" && h.downtime).length || 5;
  const mtbf = Math.round(totalOps / failures);
  document.getElementById("statMTBF") &&
    (document.getElementById("statMTBF").innerText = mtbf);

  // Availability
  const totalDowntime = MaintDB.history.reduce((sum, h) => {
    const hours = parseInt(h.downtime) || 0;
    return sum + hours;
  }, 0);
  const availability = Math.round(((8760 - totalDowntime) / 8760) * 1000) / 10;
  document.getElementById("statAvailability") &&
    (document.getElementById("statAvailability").innerHTML =
      `${availability}<span style="font-size:14px">%</span>`);

  // Render sections
  renderPMTasks();
  renderAssetHealth();
  renderHistoryTable();
  renderCalendar(0);
  renderAnalyticsCharts();
  renderHealthTrendChart();

  // Show files card if data loaded
  const filesCard = document.getElementById("maintFilesCard");
  if (filesCard && (MaintDB.tasks.length > 0 || MaintDB.history.length > 0)) {
    filesCard.style.display = "block";
    document.getElementById("maintFileList").innerHTML = `
            <div class="maint-file-item">
                <i class="fas fa-database"></i>
                <span>Maintenance Data Store</span>
                <span class="pm-due soon">${MaintDB.tasks.length} tasks · ${MaintDB.history.length} records</span>
            </div>
        `;
  }
}

function renderPMTasks() {
  const container = document.getElementById("pmTaskList");
  if (!container) return;

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");

  container.innerHTML = MaintDB.tasks
    .map((task) => {
      let dueClass = "normal";
      let dueText = `Due: ${task.nextDue}`;
      if (task.nextDue < today) {
        dueClass = "overdue";
        dueText = `OVERDUE: ${task.nextDue}`;
      } else if (task.nextDue === today) {
        dueClass = "warning";
        dueText = `DUE TODAY!`;
      }

      return `
            <div class="pm-task ${task.priority || "normal"}">
                <div class="pm-info">
                    <div class="pm-title">${task.task}</div>
                    <div class="pm-meta">
                        <span class="pm-asset"><i class="fas fa-microchip"></i> ${task.asset}</span>
                        <span><i class="fas fa-user"></i> ${task.assignedTo}</span>
                        <span><i class="fas fa-sync-alt"></i> ${task.frequency}</span>
                    </div>
                </div>
                <div class="pm-due ${dueClass}">${dueText}</div>
                <div class="pm-status ${task.status === "completed" ? "completed" : "pending"}" onclick="toggleTaskStatus(${task.id})">
                    <i class="fas ${task.status === "completed" ? "fa-check-circle" : "fa-circle"}"></i>
                </div>
            </div>
        `;
    })
    .join("");
}

function toggleTaskStatus(taskId) {
  const task = MaintDB.tasks.find((t) => t.id === taskId);
  if (task) {
    task.status = task.status === "completed" ? "pending" : "completed";
    if (task.status === "completed") {
      task.lastDone = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    }
    localStorage.setItem("maint_tasks", JSON.stringify(MaintDB.tasks));
    renderPMTasks();
    renderMaintenanceDashboard();
  }
}

function renderAssetHealth() {
  const container = document.getElementById("assetHealthList");
  if (!container) return;

  container.innerHTML = MaintDB.assets
    .map((asset) => {
      let barClass = "good";
      if (asset.health < 50) barClass = "critical";
      else if (asset.health < 70) barClass = "warning";

      return `
            <div>
                <div class="asset-item">
                    <div class="asset-name">${asset.name}</div>
                    <div class="health-bar-container">
                        <div class="health-bar ${barClass}" style="width: ${asset.health}%"></div>
                    </div>
                    <div class="health-score">${asset.health}%</div>
                </div>
                <div class="asset-sub">
                    Last: ${asset.lastMaint} | Next: ${asset.nextMaint}
                </div>
            </div>
        `;
    })
    .join("");
}

function renderHistoryTable() {
  const tbody = document.getElementById("historyTableBody");
  const filter = document.getElementById("historyFilterAsset")?.value || "all";
  if (!tbody) return;

  let filtered = MaintDB.history;
  if (filter !== "all") {
    filtered = MaintDB.history.filter((h) => h.asset === filter);
  }

  tbody.innerHTML = filtered
    .map(
      (h) => `
        <tr>
            <td>${h.date}</td>
            <td>${h.asset}</td>
            <td class="mono">${h.wo}</td>
            <td>${h.task}</td>
            <td>${h.duration}</td>
            <td>${h.downtime}</td>
            <td>${h.technician}</td>
            <td><span class="badge badge-green">${h.status}</span></td>
        </tr>
    `,
    )
    .join("");
}

function renderCalendar(weekOffset) {
  const container = document.getElementById("calendarGrid");
  if (!container) return;

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + weekOffset * 7);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let html = `<div class="calendar-weekdays">${weekdays.map((d) => `<div>${d}</div>`).join("")}</div><div class="calendar-days">`;

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startOfWeek);
    currentDate.setDate(startOfWeek.getDate() + i);
    const dateStr = currentDate.toISOString().slice(0, 10).replace(/-/g, "/");

    const tasksOnDay = MaintDB.tasks.filter(
      (t) => t.nextDue === dateStr && t.status === "pending",
    );
    const hasTask = tasksOnDay.length > 0;
    const isOverdue = tasksOnDay.some(
      (t) =>
        t.nextDue < new Date().toISOString().slice(0, 10).replace(/-/g, "/"),
    );

    html += `<div class="calendar-day ${hasTask ? "has-task" : ""} ${isOverdue ? "overdue-task" : ""}">
            ${currentDate.getDate()}
            ${hasTask ? `<div class="task-indicator"></div>` : ""}
        </div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  const weekLabel = document.getElementById("calendarWeekLabel");
  if (weekLabel) {
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    weekLabel.innerText = `${startOfWeek.getMonth() + 1}/${startOfWeek.getDate()} - ${endOfWeek.getMonth() + 1}/${endOfWeek.getDate()}`;
  }
}

function renderAnalyticsCharts() {
  // Downtime chart
  const downtimeCtx = document.getElementById("downtimeChart");
  if (downtimeCtx && MaintDB.charts.downtime) MaintDB.charts.downtime.destroy();
  if (downtimeCtx) {
    MaintDB.charts.downtime = new Chart(downtimeCtx, {
      type: "bar",
      data: {
        labels: ["Bearing", "Electrical", "Oil Leak", "Vibration", "Control"],
        datasets: [
          {
            label: "Downtime (hours)",
            data: [24, 18, 12, 8, 6],
            backgroundColor: "rgba(240,80,74,0.7)",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: "top" } },
      },
    });
  }

  // MTBF trend
  const mtbfCtx = document.getElementById("mtbfTrendChart");
  if (mtbfCtx && MaintDB.charts.mtbf) MaintDB.charts.mtbf.destroy();
  if (mtbfCtx) {
    MaintDB.charts.mtbf = new Chart(mtbfCtx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "MTBF (hours)",
            data: [1120, 1180, 1210, 1190, 1240, 1280],
            borderColor: "#3d8ef7",
            tension: 0.4,
            fill: false,
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: true },
    });
  }

  // Cost chart
  const costCtx = document.getElementById("costChart");
  if (costCtx && MaintDB.charts.cost) MaintDB.charts.cost.destroy();
  if (costCtx) {
    MaintDB.charts.cost = new Chart(costCtx, {
      type: "bar",
      data: {
        labels: ["Q1", "Q2", "Q3", "Q4"],
        datasets: [
          {
            label: "Planned (NPR)",
            data: [85000, 92000, 88000, 95000],
            backgroundColor: "rgba(61,142,247,0.6)",
            borderRadius: 4,
          },
          {
            label: "Actual (NPR)",
            data: [82000, 98000, 91000, 0],
            backgroundColor: "rgba(0,229,200,0.6)",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: "top" } },
      },
    });
  }
}

function renderHealthTrendChart() {
  const ctx = document.getElementById("healthTrendChart");
  if (!ctx) return;
  if (MaintDB.charts.healthTrend) MaintDB.charts.healthTrend.destroy();

  MaintDB.charts.healthTrend = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      datasets: MaintDB.assets.slice(0, 4).map((asset, idx) => ({
        label: asset.name,
        data: [
          asset.health - 5,
          asset.health - 3,
          asset.health - 1,
          asset.health,
        ],
        borderColor: ["#29c48f", "#4a9de8", "#f5ae3a", "#9f7aea"][idx % 4],
        tension: 0.3,
        fill: false,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { position: "top", labels: { font: { size: 10 } } } },
    },
  });
}

async function handleMaintFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      // Parse PM Schedule sheet
      const pmSheet =
        workbook.Sheets["PM Schedule"] ||
        workbook.Sheets[workbook.SheetNames[0]];
      if (pmSheet) {
        const pmData = XLSX.utils.sheet_to_json(pmSheet);
        if (pmData.length) {
          MaintDB.tasks = pmData.map((row, idx) => ({
            id: idx + 1,
            asset: row.Asset || row.asset || "Unknown",
            task: row.Task || row.task || "Maintenance",
            frequency: row.Frequency || row.frequency || "Yearly",
            lastDone: row.LastDone || row.lastDone || "",
            nextDue: row.NextDue || row.nextDue || "",
            assignedTo: row.AssignedTo || row.assignedTo || "Staff",
            status: "pending",
            priority: row.Priority || row.priority || "normal",
          }));
          localStorage.setItem("maint_tasks", JSON.stringify(MaintDB.tasks));
        }
      }

      // Parse History sheet
      const historySheet =
        workbook.Sheets["History"] || workbook.Sheets[workbook.SheetNames[1]];
      if (historySheet) {
        const historyData = XLSX.utils.sheet_to_json(historySheet);
        if (historyData.length) {
          MaintDB.history = historyData.map((row) => ({
            date: row.Date || row.date || "",
            asset: row.Asset || row.asset || "",
            wo: row.WO || row.wo || "",
            task: row.Task || row.task || "",
            duration: row.Duration || row.duration || "",
            downtime: row.Downtime || row.downtime || "0",
            technician: row.Technician || row.technician || "",
            status: row.Status || row.status || "Completed",
          }));
          localStorage.setItem(
            "maint_history",
            JSON.stringify(MaintDB.history),
          );
        }
      }

      showMaintStatus("✓ File imported successfully!", "success");
      renderMaintenanceDashboard();
    } catch (err) {
      showMaintStatus("✗ Error parsing file: " + err.message, "error");
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = "";
}

function exportMaintenanceReport() {
  const report = {
    tasks: MaintDB.tasks,
    history: MaintDB.history,
    assets: MaintDB.assets,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `maintenance_report_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showMaintStatus("✓ Report exported!", "success");
}

function clearMaintenanceData() {
  if (confirm("Clear all maintenance data? This cannot be undone.")) {
    localStorage.removeItem("maint_tasks");
    localStorage.removeItem("maint_history");
    localStorage.removeItem("maint_assets");
    MaintDB.tasks = [...defaultTasks];
    MaintDB.history = [...defaultHistory];
    MaintDB.assets = [...defaultAssets];
    renderMaintenanceDashboard();
    showMaintStatus("✓ All data cleared and reset to defaults", "info");
  }
}

function showMaintStatus(message, type) {
  let statusDiv = document.getElementById("maintStatusMsg");
  if (!statusDiv) {
    statusDiv = document.createElement("div");
    statusDiv.id = "maintStatusMsg";
    statusDiv.style.cssText =
      "position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:10px;z-index:1000;animation:fadeInUp 0.3s ease";
    document.body.appendChild(statusDiv);
  }
  const colors = { success: "#2ecc71", error: "#e74c3c", info: "#3d8ef7" };
  statusDiv.style.backgroundColor = colors[type] || colors.info;
  statusDiv.style.color = "white";
  statusDiv.innerHTML = message;
  statusDiv.style.display = "block";
  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 3000);
}

function addMaintenanceTask() {
  const newTask = {
    id: MaintDB.tasks.length + 1,
    asset: "New Asset",
    task: "New Maintenance Task",
    frequency: "Yearly",
    lastDone: new Date().toISOString().slice(0, 10).replace(/-/g, "/"),
    nextDue: new Date().toISOString().slice(0, 10).replace(/-/g, "/"),
    assignedTo: "Assign Staff",
    status: "pending",
    priority: "normal",
  };
  MaintDB.tasks.push(newTask);
  localStorage.setItem("maint_tasks", JSON.stringify(MaintDB.tasks));
  renderPMTasks();
  renderMaintenanceDashboard();
  showMaintStatus("✓ New task added", "success");
}

// Initialize maintenance when page loads
document.addEventListener("DOMContentLoaded", () => {
  // Check if maintenance page is active or will be shown
  const observer = new MutationObserver(() => {
    const maintPage = document.getElementById("page-maintenance");
    if (maintPage && maintPage.classList.contains("active")) {
      initMaintenance();
      observer.disconnect();
    }
  });
  observer.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ["class"],
  });

  // Also initialize if already visible
  if (
    document.getElementById("page-maintenance")?.classList.contains("active")
  ) {
    initMaintenance();
  }
});

// Expose functions globally
window.toggleTaskStatus = toggleTaskStatus;
window.addMaintenanceTask = addMaintenanceTask;

// ============================================
// EQUIPMENT REGISTRY MODULE
// ============================================

let EquipmentDB = {
  items: [],
  filteredItems: [],
};

const defaultEquipment = [
  {
    id: 1,
    name: "Unit 1 Generator",
    type: "Generator",
    model: "Siemens SGT-800",
    manufacturer: "Siemens",
    serialNo: "GEN-001-2020",
    installDate: "2020/03/15",
    ratedPower: "15 MW",
    ratedVoltage: "11 kV",
    ratedCurrent: "785 A",
    speed: "1500 RPM",
    efficiency: "96.5%",
    status: "Operational",
    location: "Power House",
    lastMaint: "2081/05/10",
    nextMaint: "2081/08/10",
    healthScore: 82,
  },
  {
    id: 2,
    name: "Unit 2 Generator",
    type: "Generator",
    model: "Siemens SGT-800",
    manufacturer: "Siemens",
    serialNo: "GEN-002-2021",
    installDate: "2021/06/20",
    ratedPower: "15 MW",
    ratedVoltage: "11 kV",
    ratedCurrent: "785 A",
    speed: "1500 RPM",
    efficiency: "95.8%",
    status: "Maintenance",
    location: "Power House",
    lastMaint: "2081/04/15",
    nextMaint: "2081/08/15",
    healthScore: 60,
  },
  {
    id: 3,
    name: "Main Transformer T1",
    type: "Transformer",
    model: "ABB 25MVA",
    manufacturer: "ABB",
    serialNo: "TRF-001-2019",
    installDate: "2019/11/10",
    ratedPower: "25 MVA",
    ratedVoltage: "132/11 kV",
    ratedCurrent: "109 A",
    speed: "-",
    efficiency: "98.2%",
    status: "Operational",
    location: "Switchyard",
    lastMaint: "2081/03/20",
    nextMaint: "2081/09/20",
    healthScore: 45,
  },
  {
    id: 4,
    name: "Unit 1 Turbine",
    type: "Turbine",
    model: "Andritz Francis",
    manufacturer: "Andritz",
    serialNo: "TUR-001-2020",
    installDate: "2020/03/15",
    ratedPower: "15 MW",
    ratedVoltage: "-",
    ratedCurrent: "-",
    speed: "500 RPM",
    efficiency: "93.5%",
    status: "Operational",
    location: "Power House",
    lastMaint: "2081/02/10",
    nextMaint: "2081/08/10",
    healthScore: 85,
  },
  {
    id: 5,
    name: "Unit 2 Turbine",
    type: "Turbine",
    model: "Andritz Francis",
    manufacturer: "Andritz",
    serialNo: "TUR-002-2021",
    installDate: "2021/06/20",
    ratedPower: "15 MW",
    ratedVoltage: "-",
    ratedCurrent: "-",
    speed: "500 RPM",
    efficiency: "92.8%",
    status: "Maintenance",
    location: "Power House",
    lastMaint: "2081/04/15",
    nextMaint: "2081/08/15",
    healthScore: 58,
  },
  {
    id: 6,
    name: "Governor System",
    type: "Governor",
    model: "Woodward 505",
    manufacturer: "Woodward",
    serialNo: "GOV-001-2020",
    installDate: "2020/03/15",
    ratedPower: "-",
    ratedVoltage: "24V DC",
    ratedCurrent: "2 A",
    speed: "-",
    efficiency: "99%",
    status: "Operational",
    location: "Control Room",
    lastMaint: "2081/05/20",
    nextMaint: "2081/08/20",
    healthScore: 78,
  },
  {
    id: 7,
    name: "Penstock Main Valve",
    type: "Valve",
    model: "Butterfly DN2000",
    manufacturer: "AVK",
    serialNo: "VLV-001-2019",
    installDate: "2019/11/10",
    ratedPower: "-",
    ratedVoltage: "-",
    ratedCurrent: "-",
    speed: "-",
    efficiency: "-",
    status: "Operational",
    location: "Penstock",
    lastMaint: "2081/01/15",
    nextMaint: "2081/07/15",
    healthScore: 92,
  },
  {
    id: 8,
    name: "Cooling Water Pump",
    type: "Pump",
    model: "Grundfos CR90",
    manufacturer: "Grundfos",
    serialNo: "PMP-001-2020",
    installDate: "2020/03/15",
    ratedPower: "75 kW",
    ratedVoltage: "415V",
    ratedCurrent: "125 A",
    speed: "2900 RPM",
    efficiency: "87%",
    status: "Standby",
    location: "Auxiliary Bay",
    lastMaint: "2081/06/01",
    nextMaint: "2081/09/01",
    healthScore: 88,
  },
];

function initEquipment() {
  // Load data
  const saved = localStorage.getItem("equipment_items");
  if (saved) {
    EquipmentDB.items = JSON.parse(saved);
  } else {
    EquipmentDB.items = [...defaultEquipment];
    localStorage.setItem("equipment_items", JSON.stringify(EquipmentDB.items));
  }

  renderEquipment();
  attachEquipEventListeners();
}

function attachEquipEventListeners() {
  const uploadBtn = document.getElementById("equipUploadBtn");
  const fileInput = document.getElementById("equipFileInput");
  if (uploadBtn && fileInput) {
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = handleEquipFileUpload;
  }

  const exportBtn = document.getElementById("equipExportBtn");
  if (exportBtn) {
    exportBtn.onclick = exportEquipmentData;
  }

  const addBtn = document.getElementById("equipAddBtn");
  if (addBtn) {
    addBtn.onclick = showAddEquipmentForm;
  }

  const searchInput = document.getElementById("equipSearch");
  if (searchInput) {
    searchInput.oninput = filterEquipment;
  }

  const typeFilter = document.getElementById("equipTypeFilter");
  const statusFilter = document.getElementById("equipStatusFilter");
  if (typeFilter) typeFilter.onchange = filterEquipment;
  if (statusFilter) statusFilter.onchange = filterEquipment;
}

function renderEquipment() {
  filterEquipment();
}

function filterEquipment() {
  const searchTerm =
    document.getElementById("equipSearch")?.value.toLowerCase() || "";
  const typeFilter = document.getElementById("equipTypeFilter")?.value || "all";
  const statusFilter =
    document.getElementById("equipStatusFilter")?.value || "all";

  EquipmentDB.filteredItems = EquipmentDB.items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm) ||
      item.model.toLowerCase().includes(searchTerm) ||
      item.manufacturer.toLowerCase().includes(searchTerm);
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  updateEquipmentStats();
  renderEquipmentGrid();
}

function updateEquipmentStats() {
  document.getElementById("totalEquipment").innerText =
    EquipmentDB.items.length;
  document.getElementById("operationalCount").innerText =
    EquipmentDB.items.filter((i) => i.status === "Operational").length;
  document.getElementById("maintenanceCount").innerText =
    EquipmentDB.items.filter((i) => i.status === "Maintenance").length;
  const avgHealth = Math.round(
    EquipmentDB.items.reduce((sum, i) => sum + (i.healthScore || 0), 0) /
      EquipmentDB.items.length,
  );
  document.getElementById("avgHealth").innerHTML =
    `${avgHealth}<span style="font-size:14px">%</span>`;
}

function renderEquipmentGrid() {
  const container = document.getElementById("equipmentGrid");
  if (!container) return;

  container.innerHTML = EquipmentDB.filteredItems
    .map(
      (item) => `
        <div class="equip-card" onclick="showEquipmentDetails(${item.id})">
            <div class="equip-card-header">
                <div class="equip-card-icon">
                    <i class="fas ${getEquipmentIcon(item.type)}"></i>
                </div>
                <div class="equip-status-badge ${getStatusClass(item.status)}">${item.status}</div>
            </div>
            <div class="equip-card-body">
                <div class="equip-name">${item.name}</div>
                <div class="equip-model">${item.model} · ${item.manufacturer}</div>
                <div class="equip-specs">
                    <div class="equip-spec">
                        <div class="equip-spec-label">Rated Power</div>
                        <div class="equip-spec-value">${item.ratedPower}</div>
                    </div>
                    <div class="equip-spec">
                        <div class="equip-spec-label">Health</div>
                        <div class="equip-spec-value" style="color: ${getHealthColor(item.healthScore)}">${item.healthScore}%</div>
                    </div>
                </div>
                <div class="equip-maint-info">
                    <span><i class="fas fa-calendar-alt"></i> Last: ${item.lastMaint || "N/A"}</span>
                    <span><i class="fas fa-clock"></i> Next: ${item.nextMaint || "N/A"}</span>
                </div>
            </div>
        </div>
    `,
    )
    .join("");
}

function getEquipmentIcon(type) {
  const icons = {
    Generator: "fa-microchip",
    Turbine: "fa-fan",
    Transformer: "fa-charging-station",
    Governor: "fa-sliders-h",
    Valve: "fa-water",
    Pump: "fa-oil-can",
  };
  return icons[type] || "fa-cogs";
}

function getStatusClass(status) {
  const classes = {
    Operational: "operational",
    Maintenance: "maintenance",
    Standby: "standby",
    Outage: "outage",
  };
  return classes[status] || "operational";
}

function getHealthColor(score) {
  if (score >= 80) return "var(--accent-teal)";
  if (score >= 60) return "var(--accent-blue)";
  if (score >= 40) return "var(--accent-amber)";
  return "var(--status-stopped)";
}

function showEquipmentDetails(id) {
  const item = EquipmentDB.items.find((i) => i.id === id);
  if (!item) return;

  const modal = document.getElementById("equipModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");

  modalTitle.innerText = item.name;
  modalBody.innerHTML = `
        <div class="detail-row">
            <div class="detail-label">Equipment ID</div>
            <div class="detail-value">HPP-${item.id.toString().padStart(3, "0")}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Type</div>
            <div class="detail-value">${item.type}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Model</div>
            <div class="detail-value">${item.model}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Manufacturer</div>
            <div class="detail-value">${item.manufacturer}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Serial Number</div>
            <div class="detail-value">${item.serialNo || "N/A"}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Installation Date</div>
            <div class="detail-value">${item.installDate || "N/A"}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Location</div>
            <div class="detail-value">${item.location || "Power House"}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Technical Specs</div>
            <div class="detail-value">
                Power: ${item.ratedPower}<br>
                Voltage: ${item.ratedVoltage}<br>
                Speed: ${item.speed}<br>
                Efficiency: ${item.efficiency}
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Maintenance</div>
            <div class="detail-value">
                Last: ${item.lastMaint || "N/A"}<br>
                Next: ${item.nextMaint || "N/A"}<br>
                Health Score: ${item.healthScore}%
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Current Status</div>
            <div class="detail-value"><span class="equip-status-badge ${getStatusClass(item.status)}">${item.status}</span></div>
        </div>
    `;

  const editBtn = document.getElementById("editEquipBtn");
  editBtn.onclick = () => showEditEquipmentForm(item);

  modal.style.display = "flex";
}

function closeEquipModal() {
  document.getElementById("equipModal").style.display = "none";
}

function showAddEquipmentForm() {
  const modal = document.getElementById("equipModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");

  modalTitle.innerText = "Add New Equipment";
  modalBody.innerHTML = `
        <form class="equip-form" id="equipForm">
            <div class="equip-form-row">
                <div class="equip-form-group">
                    <label>Equipment Name *</label>
                    <input type="text" id="eqName" required>
                </div>
                <div class="equip-form-group">
                    <label>Type *</label>
                    <select id="eqType">
                        <option value="Generator">Generator</option>
                        <option value="Turbine">Turbine</option>
                        <option value="Transformer">Transformer</option>
                        <option value="Governor">Governor</option>
                        <option value="Valve">Valve</option>
                        <option value="Pump">Pump</option>
                    </select>
                </div>
            </div>
            <div class="equip-form-row">
                <div class="equip-form-group">
                    <label>Model</label>
                    <input type="text" id="eqModel">
                </div>
                <div class="equip-form-group">
                    <label>Manufacturer</label>
                    <input type="text" id="eqManufacturer">
                </div>
            </div>
            <div class="equip-form-row">
                <div class="equip-form-group">
                    <label>Rated Power</label>
                    <input type="text" id="eqPower" placeholder="e.g., 15 MW">
                </div>
                <div class="equip-form-group">
                    <label>Rated Voltage</label>
                    <input type="text" id="eqVoltage" placeholder="e.g., 11 kV">
                </div>
            </div>
            <div class="equip-form-row">
                <div class="equip-form-group">
                    <label>Installation Date</label>
                    <input type="text" id="eqInstallDate" placeholder="YYYY/MM/DD">
                </div>
                <div class="equip-form-group">
                    <label>Status</label>
                    <select id="eqStatus">
                        <option value="Operational">Operational</option>
                        <option value="Standby">Standby</option>
                        <option value="Maintenance">Under Maintenance</option>
                        <option value="Outage">Outage</option>
                    </select>
                </div>
            </div>
            <div class="equip-form-group">
                <label>Health Score (%)</label>
                <input type="number" id="eqHealth" min="0" max="100" value="80">
            </div>
        </form>
    `;

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn-primary";
  saveBtn.innerText = "Save Equipment";
  saveBtn.onclick = saveNewEquipment;

  const footer = document.querySelector(".equip-modal-footer");
  const oldButtons = footer.querySelectorAll("button");
  oldButtons.forEach((btn) => (btn.style.display = "none"));
  footer.appendChild(saveBtn);

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn-secondary";
  cancelBtn.innerText = "Cancel";
  cancelBtn.onclick = closeEquipModal;
  footer.appendChild(cancelBtn);

  modal.style.display = "flex";
}

function saveNewEquipment() {
  const newId = Math.max(...EquipmentDB.items.map((i) => i.id), 0) + 1;
  const newItem = {
    id: newId,
    name: document.getElementById("eqName")?.value || "New Equipment",
    type: document.getElementById("eqType")?.value || "Generator",
    model: document.getElementById("eqModel")?.value || "",
    manufacturer: document.getElementById("eqManufacturer")?.value || "",
    serialNo: "",
    installDate: document.getElementById("eqInstallDate")?.value || "",
    ratedPower: document.getElementById("eqPower")?.value || "",
    ratedVoltage: document.getElementById("eqVoltage")?.value || "",
    ratedCurrent: "",
    speed: "",
    efficiency: "",
    status: document.getElementById("eqStatus")?.value || "Operational",
    location: "Power House",
    lastMaint: "",
    nextMaint: "",
    healthScore: parseInt(document.getElementById("eqHealth")?.value) || 80,
  };

  EquipmentDB.items.push(newItem);
  localStorage.setItem("equipment_items", JSON.stringify(EquipmentDB.items));
  renderEquipment();
  closeEquipModal();
  showEquipStatus("✓ Equipment added successfully!", "success");
}

function showEditEquipmentForm(item) {
  const modal = document.getElementById("equipModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");

  modalTitle.innerText = `Edit: ${item.name}`;
  modalBody.innerHTML = `
        <form class="equip-form" id="equipForm">
            <div class="equip-form-row">
                <div class="equip-form-group">
                    <label>Equipment Name</label>
                    <input type="text" id="eqName" value="${item.name}">
                </div>
                <div class="equip-form-group">
                    <label>Type</label>
                    <select id="eqType">
                        ${["Generator", "Turbine", "Transformer", "Governor", "Valve", "Pump"].map((t) => `<option ${item.type === t ? "selected" : ""}>${t}</option>`).join("")}
                    </select>
                </div>
            </div>
            <div class="equip-form-row">
                <div class="equip-form-group">
                    <label>Model</label>
                    <input type="text" id="eqModel" value="${item.model}">
                </div>
                <div class="equip-form-group">
                    <label>Manufacturer</label>
                    <input type="text" id="eqManufacturer" value="${item.manufacturer}">
                </div>
            </div>
            <div class="equip-form-row">
                <div class="equip-form-group">
                    <label>Rated Power</label>
                    <input type="text" id="eqPower" value="${item.ratedPower}">
                </div>
                <div class="equip-form-group">
                    <label>Rated Voltage</label>
                    <input type="text" id="eqVoltage" value="${item.ratedVoltage}">
                </div>
            </div>
            <div class="equip-form-row">
                <div class="equip-form-group">
                    <label>Status</label>
                    <select id="eqStatus">
                        <option ${item.status === "Operational" ? "selected" : ""}>Operational</option>
                        <option ${item.status === "Standby" ? "selected" : ""}>Standby</option>
                        <option ${item.status === "Maintenance" ? "selected" : ""}>Maintenance</option>
                        <option ${item.status === "Outage" ? "selected" : ""}>Outage</option>
                    </select>
                </div>
                <div class="equip-form-group">
                    <label>Health Score (%)</label>
                    <input type="number" id="eqHealth" value="${item.healthScore}">
                </div>
            </div>
            <div class="equip-form-row">
                <div class="equip-form-group">
                    <label>Last Maintenance</label>
                    <input type="text" id="eqLastMaint" value="${item.lastMaint || ""}" placeholder="YYYY/MM/DD">
                </div>
                <div class="equip-form-group">
                    <label>Next Maintenance</label>
                    <input type="text" id="eqNextMaint" value="${item.nextMaint || ""}" placeholder="YYYY/MM/DD">
                </div>
            </div>
        </form>
    `;

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn-primary";
  saveBtn.innerText = "Update Equipment";
  saveBtn.onclick = () => updateEquipment(item.id);

  const footer = document.querySelector(".equip-modal-footer");
  const oldButtons = footer.querySelectorAll("button");
  oldButtons.forEach((btn) => (btn.style.display = "none"));
  footer.appendChild(saveBtn);

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn-secondary";
  cancelBtn.innerText = "Cancel";
  cancelBtn.onclick = closeEquipModal;
  footer.appendChild(cancelBtn);
}

function updateEquipment(id) {
  const index = EquipmentDB.items.findIndex((i) => i.id === id);
  if (index !== -1) {
    EquipmentDB.items[index] = {
      ...EquipmentDB.items[index],
      name:
        document.getElementById("eqName")?.value ||
        EquipmentDB.items[index].name,
      type:
        document.getElementById("eqType")?.value ||
        EquipmentDB.items[index].type,
      model:
        document.getElementById("eqModel")?.value ||
        EquipmentDB.items[index].model,
      manufacturer:
        document.getElementById("eqManufacturer")?.value ||
        EquipmentDB.items[index].manufacturer,
      ratedPower:
        document.getElementById("eqPower")?.value ||
        EquipmentDB.items[index].ratedPower,
      ratedVoltage:
        document.getElementById("eqVoltage")?.value ||
        EquipmentDB.items[index].ratedVoltage,
      status:
        document.getElementById("eqStatus")?.value ||
        EquipmentDB.items[index].status,
      healthScore:
        parseInt(document.getElementById("eqHealth")?.value) ||
        EquipmentDB.items[index].healthScore,
      lastMaint:
        document.getElementById("eqLastMaint")?.value ||
        EquipmentDB.items[index].lastMaint,
      nextMaint:
        document.getElementById("eqNextMaint")?.value ||
        EquipmentDB.items[index].nextMaint,
    };
    localStorage.setItem("equipment_items", JSON.stringify(EquipmentDB.items));
    renderEquipment();
    closeEquipModal();
    showEquipStatus("✓ Equipment updated!", "success");
  }
}

async function handleEquipFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length) {
        EquipmentDB.items = rows.map((row, idx) => ({
          id: EquipmentDB.items.length + idx + 1,
          name: row.Name || row.name || "Unknown",
          type: row.Type || row.type || "Generator",
          model: row.Model || row.model || "",
          manufacturer: row.Manufacturer || row.manufacturer || "",
          serialNo: row.SerialNo || row.serialNo || "",
          installDate: row.InstallDate || row.installDate || "",
          ratedPower: row.RatedPower || row.ratedPower || "",
          ratedVoltage: row.RatedVoltage || row.ratedVoltage || "",
          ratedCurrent: row.RatedCurrent || row.ratedCurrent || "",
          speed: row.Speed || row.speed || "",
          efficiency: row.Efficiency || row.efficiency || "",
          status: row.Status || row.status || "Operational",
          location: row.Location || row.location || "Power House",
          lastMaint: row.LastMaint || row.lastMaint || "",
          nextMaint: row.NextMaint || row.nextMaint || "",
          healthScore: row.HealthScore || row.healthScore || 80,
        }));
        localStorage.setItem(
          "equipment_items",
          JSON.stringify(EquipmentDB.items),
        );
        renderEquipment();
        showEquipStatus(
          `✓ Imported ${rows.length} equipment items!`,
          "success",
        );
      }
    } catch (err) {
      showEquipStatus("✗ Error parsing file", "error");
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = "";
}

function exportEquipmentData() {
  const csvRows = [
    [
      "Name",
      "Type",
      "Model",
      "Manufacturer",
      "Serial No",
      "Install Date",
      "Rated Power",
      "Rated Voltage",
      "Status",
      "Location",
      "Last Maint",
      "Next Maint",
      "Health Score",
    ],
  ];

  EquipmentDB.items.forEach((item) => {
    csvRows.push([
      item.name,
      item.type,
      item.model,
      item.manufacturer,
      item.serialNo || "",
      item.installDate || "",
      item.ratedPower,
      item.ratedVoltage,
      item.status,
      item.location || "",
      item.lastMaint || "",
      item.nextMaint || "",
      item.healthScore,
    ]);
  });

  const csv = csvRows
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `equipment_list_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showEquipStatus("✓ Equipment list exported!", "success");
}

function showEquipStatus(message, type) {
  let statusDiv = document.getElementById("equipStatusMsg");
  if (!statusDiv) {
    statusDiv = document.createElement("div");
    statusDiv.id = "equipStatusMsg";
    statusDiv.style.cssText =
      "position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:10px;z-index:1001;animation:fadeInUp 0.3s ease";
    document.body.appendChild(statusDiv);
  }
  const colors = { success: "#2ecc71", error: "#e74c3c", info: "#3d8ef7" };
  statusDiv.style.backgroundColor = colors[type] || colors.info;
  statusDiv.style.color = "white";
  statusDiv.innerHTML = message;
  statusDiv.style.display = "block";
  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 3000);
}

// Initialize equipment when page loads
document.addEventListener("DOMContentLoaded", () => {
  const observer = new MutationObserver(() => {
    const equipPage = document.getElementById("page-equipment");
    if (equipPage && equipPage.classList.contains("active")) {
      initEquipment();
      observer.disconnect();
    }
  });
  observer.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ["class"],
  });

  if (document.getElementById("page-equipment")?.classList.contains("active")) {
    initEquipment();
  }
});

// Expose functions globally
window.showEquipmentDetails = showEquipmentDetails;
window.closeEquipModal = closeEquipModal;

// ============================================
// FAULTS & INCIDENTS MODULE
// ============================================

let FaultsDB = {
  items: [],
  filteredItems: [],
  equipmentList: [],
};

// Sample default faults data
const defaultFaults = [
  {
    id: 1,
    faultId: "FLT-2024-001",
    date: "2081/07/10",
    time: "14:30",
    equipment: "Unit 2 Generator",
    type: "Mechanical",
    severity: "Critical",
    description: "Bearing temperature exceeded 85°C threshold",
    cause: "Oil contamination and insufficient lubrication",
    responseTime: 5,
    resolutionTime: 4.5,
    downtime: 3.5,
    status: "Resolved",
    reportedBy: "Suresh Gurung",
    technician: "Rajesh Kumar",
    resolutionNotes:
      "Replaced bearing and changed oil. Unit back to normal operation.",
  },
  {
    id: 2,
    faultId: "FLT-2024-002",
    date: "2081/07/12",
    time: "09:15",
    equipment: "Main Transformer T1",
    type: "Electrical",
    severity: "High",
    description: "Overcurrent trip at 09:15, unit offline",
    cause: "Lightning surge during storm",
    responseTime: 2,
    resolutionTime: 2,
    downtime: 1.5,
    status: "Resolved",
    reportedBy: "Prakash Thapa",
    technician: "E. Shrestha",
    resolutionNotes:
      "Reset protection relay. No damage detected. Transformer back online.",
  },
  {
    id: 3,
    faultId: "FLT-2024-003",
    date: "2081/07/14",
    time: "22:00",
    equipment: "Unit 1 Governor",
    type: "Instrumentation",
    severity: "Medium",
    description: "Governor response slow, hunting observed",
    cause: "Sensor drift and calibration issue",
    responseTime: 15,
    resolutionTime: null,
    downtime: 0,
    status: "In Progress",
    reportedBy: "Anil Adhikari",
    technician: "Prakash Thapa",
    resolutionNotes: "",
  },
  {
    id: 4,
    faultId: "FLT-2024-004",
    date: "2081/07/08",
    time: "11:30",
    equipment: "Cooling Water Pump",
    type: "Mechanical",
    severity: "Medium",
    description: "Pump vibration high, noise from bearing",
    cause: "Bearing wear",
    responseTime: 8,
    resolutionTime: 3,
    downtime: 2,
    status: "Resolved",
    reportedBy: "Suresh Gurung",
    technician: "Rajesh Kumar",
    resolutionNotes: "Replaced pump bearing. Vibration back to normal.",
  },
  {
    id: 5,
    faultId: "FLT-2024-005",
    date: "2081/07/05",
    time: "16:45",
    equipment: "Unit 2 Turbine",
    type: "Mechanical",
    severity: "Critical",
    description: "Sudden vibration spike, emergency shutdown",
    cause: "Cavitation damage to runner",
    responseTime: 3,
    resolutionTime: 12,
    downtime: 10,
    status: "Closed",
    reportedBy: "Prakash Thapa",
    technician: "Rajesh Kumar",
    resolutionNotes:
      "Turbine runner inspection scheduled. Unit offline for major maintenance.",
  },
  {
    id: 6,
    faultId: "FLT-2024-006",
    date: "2081/06/28",
    time: "08:00",
    equipment: "Unit 1 Generator",
    type: "Electrical",
    severity: "Low",
    description: "Minor insulation resistance drop",
    cause: "Moisture ingress",
    responseTime: 60,
    resolutionTime: 2,
    downtime: 0,
    status: "Closed",
    reportedBy: "Anil Adhikari",
    technician: "E. Shrestha",
    resolutionNotes: "Applied heat to dry insulation. Values back to normal.",
  },
  {
    id: 7,
    faultId: "FLT-2024-007",
    date: "2081/06/20",
    time: "13:00",
    equipment: "Governor System",
    type: "Instrumentation",
    severity: "Medium",
    description: "PLC communication intermittent",
    cause: "Loose wiring connection",
    responseTime: 10,
    resolutionTime: 1.5,
    downtime: 1,
    status: "Resolved",
    reportedBy: "Suresh Gurung",
    technician: "Prakash Thapa",
    resolutionNotes: "Tightened connections. Communication restored.",
  },
];

function initFaults() {
  console.log("Initializing Faults module...");

  // Load data from localStorage
  const saved = localStorage.getItem("faults_items");
  if (saved) {
    FaultsDB.items = JSON.parse(saved);
  } else {
    FaultsDB.items = [...defaultFaults];
    localStorage.setItem("faults_items", JSON.stringify(FaultsDB.items));
  }

  // Get equipment list from EquipmentDB if available
  if (
    typeof EquipmentDB !== "undefined" &&
    EquipmentDB.items &&
    EquipmentDB.items.length > 0
  ) {
    FaultsDB.equipmentList = EquipmentDB.items.map((e) => e.name);
  } else {
    FaultsDB.equipmentList = [
      "Unit 1 Generator",
      "Unit 2 Generator",
      "Main Transformer T1",
      "Unit 1 Turbine",
      "Unit 2 Turbine",
      "Governor System",
      "Cooling Water Pump",
      "Penstock Valve",
    ];
  }

  // Initialize filtered items
  FaultsDB.filteredItems = [...FaultsDB.items];

  // Render everything
  populateFaultFilters();
  updateFaultStats();
  renderFaultsTable();
  renderFaultCharts();
  attachFaultEventListeners();
  initQuickFault();

  // Show files card
  const filesCard = document.getElementById("faultFilesCard");
  if (filesCard && FaultsDB.items.length > 0) {
    filesCard.style.display = "block";
    const fileList = document.getElementById("faultFileList");
    if (fileList) {
      fileList.innerHTML = `
                <div class="fault-file-item">
                    <i class="fas fa-database"></i>
                    <span>Faults Database</span>
                    <span class="severity-badge severity-low">${FaultsDB.items.length} records</span>
                </div>
            `;
    }
  }
}

function attachFaultEventListeners() {
  const uploadBtn = document.getElementById("faultUploadBtn");
  const fileInput = document.getElementById("faultFileInput");
  if (uploadBtn && fileInput) {
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = handleFaultFileUpload;
  }

  const exportBtn = document.getElementById("faultExportBtn");
  if (exportBtn) {
    exportBtn.onclick = exportFaultsData;
  }

  const addBtn = document.getElementById("faultAddBtn");
  if (addBtn) {
    addBtn.onclick = showAddFaultForm;
  }

  const searchInput = document.getElementById("faultSearch");
  if (searchInput) {
    searchInput.oninput = filterFaults;
  }

  const applyBtn = document.getElementById("faultApplyFilter");
  if (applyBtn) {
    applyBtn.onclick = filterFaults;
  }

  const resetBtn = document.getElementById("faultResetFilter");
  if (resetBtn) {
    resetBtn.onclick = resetFaultFilters;
  }

  const clearBtn = document.getElementById("clearFaultData");
  if (clearBtn) {
    clearBtn.onclick = clearFaultsData;
  }
}

function populateFaultFilters() {
  const equipFilter = document.getElementById("faultEquipmentFilter");
  const equipSelect = document.getElementById("faultEquipment");

  if (equipFilter) {
    equipFilter.innerHTML =
      '<option value="all">All Equipment</option>' +
      FaultsDB.equipmentList
        .map((e) => `<option value="${e}">${e}</option>`)
        .join("");
  }

  if (equipSelect) {
    equipSelect.innerHTML =
      '<option value="">Select Equipment</option>' +
      FaultsDB.equipmentList
        .map((e) => `<option value="${e}">${e}</option>`)
        .join("");
  }
}

function filterFaults() {
  const searchTerm =
    document.getElementById("faultSearch")?.value.toLowerCase() || "";
  const equipment =
    document.getElementById("faultEquipmentFilter")?.value || "all";
  const severity =
    document.getElementById("faultSeverityFilter")?.value || "all";
  const status = document.getElementById("faultStatusFilter")?.value || "all";
  const type = document.getElementById("faultTypeFilter")?.value || "all";
  const dateFrom = document.getElementById("faultDateFrom")?.value;
  const dateTo = document.getElementById("faultDateTo")?.value;

  FaultsDB.filteredItems = FaultsDB.items.filter((item) => {
    const matchesSearch =
      item.description.toLowerCase().includes(searchTerm) ||
      item.faultId.toLowerCase().includes(searchTerm) ||
      item.equipment.toLowerCase().includes(searchTerm);
    const matchesEquipment =
      equipment === "all" || item.equipment === equipment;
    const matchesSeverity = severity === "all" || item.severity === severity;
    const matchesStatus = status === "all" || item.status === status;
    const matchesType = type === "all" || item.type === type;

    let matchesDate = true;
    if (dateFrom) {
      const itemDate = item.date.replace(/\//g, "-");
      matchesDate = matchesDate && itemDate >= dateFrom;
    }
    if (dateTo) {
      const itemDate = item.date.replace(/\//g, "-");
      matchesDate = matchesDate && itemDate <= dateTo;
    }

    return (
      matchesSearch &&
      matchesEquipment &&
      matchesSeverity &&
      matchesStatus &&
      matchesType &&
      matchesDate
    );
  });

  updateFaultStats();
  renderFaultsTable();
  renderFaultCharts();
}

function resetFaultFilters() {
  const searchInput = document.getElementById("faultSearch");
  const equipFilter = document.getElementById("faultEquipmentFilter");
  const severityFilter = document.getElementById("faultSeverityFilter");
  const statusFilter = document.getElementById("faultStatusFilter");
  const typeFilter = document.getElementById("faultTypeFilter");
  const dateFrom = document.getElementById("faultDateFrom");
  const dateTo = document.getElementById("faultDateTo");

  if (searchInput) searchInput.value = "";
  if (equipFilter) equipFilter.value = "all";
  if (severityFilter) severityFilter.value = "all";
  if (statusFilter) statusFilter.value = "all";
  if (typeFilter) typeFilter.value = "all";
  if (dateFrom) dateFrom.value = "";
  if (dateTo) dateTo.value = "";

  filterFaults();
}

function updateFaultStats() {
  const openFaults = FaultsDB.filteredItems.filter(
    (f) => f.status === "Open" || f.status === "In Progress",
  ).length;
  const criticalFaults = FaultsDB.filteredItems.filter(
    (f) => f.severity === "Critical" || f.severity === "High",
  ).length;

  // Calculate MTTR (only resolved/closed faults)
  const resolvedFaults = FaultsDB.filteredItems.filter(
    (f) =>
      f.resolutionTime && (f.status === "Resolved" || f.status === "Closed"),
  );
  const avgMTTR =
    resolvedFaults.length > 0
      ? Math.round(
          (resolvedFaults.reduce((sum, f) => sum + (f.resolutionTime || 0), 0) /
            resolvedFaults.length) *
            10,
        ) / 10
      : 0;

  // Most frequent fault type
  const typeCount = {};
  FaultsDB.filteredItems.forEach((f) => {
    typeCount[f.type] = (typeCount[f.type] || 0) + 1;
  });
  let topType = "-",
    topCount = 0;
  for (const [type, count] of Object.entries(typeCount)) {
    if (count > topCount) {
      topType = type;
      topCount = count;
    }
  }

  const openFaultsEl = document.getElementById("openFaults");
  const criticalFaultsEl = document.getElementById("criticalFaults");
  const mttrValueEl = document.getElementById("mttrValue");
  const topFaultTypeEl = document.getElementById("topFaultType");
  const faultsCountEl = document.getElementById("faultsCount");

  if (openFaultsEl) openFaultsEl.innerText = openFaults;
  if (criticalFaultsEl) criticalFaultsEl.innerText = criticalFaults;
  if (mttrValueEl) mttrValueEl.innerText = avgMTTR;
  if (topFaultTypeEl)
    topFaultTypeEl.innerText =
      topType !== "-" ? `${topType} (${topCount})` : "-";
  if (faultsCountEl)
    faultsCountEl.innerText = `${FaultsDB.filteredItems.length} records`;
}

function renderFaultsTable() {
  const tbody = document.getElementById("faultsTableBody");
  if (!tbody) return;

  if (FaultsDB.filteredItems.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="10" style="text-align:center; padding:40px;">No faults found</td></tr>';
    return;
  }

  tbody.innerHTML = FaultsDB.filteredItems
    .map(
      (fault) => `
        <tr>
            <td class="mono bold">${fault.faultId}</td>
            <td>${fault.date}</td>
            <td>${fault.time}</td>
            <td>${fault.equipment}</td>
            <td>${fault.type}</td>
            <td><span class="severity-badge severity-${fault.severity.toLowerCase()}">${fault.severity}</span></td>
            <td title="${fault.description}">${fault.description.substring(0, 35)}${fault.description.length > 35 ? "..." : ""}</td>
            <td>${fault.downtime || 0} hrs</td>
            <td><span class="severity-badge status-${fault.status.toLowerCase().replace(" ", "")}">${fault.status}</span></td>
            <td>
                <button class="btn-icon-view" onclick="viewFaultDetails(${fault.id})" title="View Details"><i class="fas fa-eye"></i></button>
                ${fault.status !== "Closed" ? `<button class="btn-icon-wo" onclick="createWorkOrderFromFault(${fault.id})" title="Create Work Order"><i class="fas fa-clipboard-list"></i></button>` : ""}
            </td>
        </tr>
    `,
    )
    .join("");
}

function renderFaultCharts() {
  // Faults by Equipment (Pareto)
  const equipCount = {};
  FaultsDB.filteredItems.forEach((f) => {
    equipCount[f.equipment] = (equipCount[f.equipment] || 0) + 1;
  });
  const equipLabels = Object.keys(equipCount).slice(0, 6);
  const equipData = equipLabels.map((l) => equipCount[l]);

  const equipCtx = document.getElementById("faultsByEquipmentChart");
  if (equipCtx) {
    if (window.faultChartEquip) window.faultChartEquip.destroy();
    window.faultChartEquip = new Chart(equipCtx, {
      type: "bar",
      data: {
        labels: equipLabels,
        datasets: [
          {
            label: "Number of Faults",
            data: equipData,
            backgroundColor: "rgba(240,80,74,0.7)",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: "top" } },
      },
    });
  }

  // Monthly Trend
  const monthlyData = {};
  FaultsDB.filteredItems.forEach((f) => {
    const month = f.date.substring(0, 7);
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });
  const months = Object.keys(monthlyData).sort();
  const trendData = months.map((m) => monthlyData[m]);

  const trendCtx = document.getElementById("faultTrendChart");
  if (trendCtx) {
    if (window.faultChartTrend) window.faultChartTrend.destroy();
    window.faultChartTrend = new Chart(trendCtx, {
      type: "line",
      data: {
        labels: months,
        datasets: [
          {
            label: "Faults per Month",
            data: trendData,
            borderColor: "#f5ae3a",
            tension: 0.3,
            fill: true,
            backgroundColor: "rgba(245,174,58,0.1)",
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: true },
    });
  }

  // Faults by Type (Pie)
  const typeCount = {};
  FaultsDB.filteredItems.forEach((f) => {
    typeCount[f.type] = (typeCount[f.type] || 0) + 1;
  });
  const typeLabels = Object.keys(typeCount);
  const typeData = typeLabels.map((t) => typeCount[t]);

  const typeCtx = document.getElementById("faultsByTypeChart");
  if (typeCtx) {
    if (window.faultChartType) window.faultChartType.destroy();
    window.faultChartType = new Chart(typeCtx, {
      type: "doughnut",
      data: {
        labels: typeLabels,
        datasets: [
          {
            data: typeData,
            backgroundColor: [
              "#e24b4a",
              "#f5ae3a",
              "#4a9de8",
              "#29c48f",
              "#9f7aea",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 10 } } },
        },
      },
    });
  }

  // MTTR Trend
  const mttrByMonth = {};
  FaultsDB.filteredItems
    .filter(
      (f) =>
        f.resolutionTime && (f.status === "Resolved" || f.status === "Closed"),
    )
    .forEach((f) => {
      const month = f.date.substring(0, 7);
      if (!mttrByMonth[month]) mttrByMonth[month] = { sum: 0, count: 0 };
      mttrByMonth[month].sum += f.resolutionTime;
      mttrByMonth[month].count++;
    });
  const mttrMonths = Object.keys(mttrByMonth).sort();
  const mttrData = mttrMonths.map(
    (m) => Math.round((mttrByMonth[m].sum / mttrByMonth[m].count) * 10) / 10,
  );

  const mttrCtx = document.getElementById("mttrTrendChart");
  if (mttrCtx) {
    if (window.faultChartMTTR) window.faultChartMTTR.destroy();
    window.faultChartMTTR = new Chart(mttrCtx, {
      type: "line",
      data: {
        labels: mttrMonths,
        datasets: [
          {
            label: "MTTR (Hours)",
            data: mttrData,
            borderColor: "#3d8ef7",
            tension: 0.3,
            fill: false,
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: true },
    });
  }
}

function viewFaultDetails(id) {
  const fault = FaultsDB.items.find((f) => f.id === id);
  if (!fault) return;

  const modal = document.getElementById("faultModal");
  const modalTitle = document.getElementById("faultModalTitle");
  const modalBody = document.querySelector("#faultModal .fault-modal-body");
  const footer = document.querySelector("#faultModal .fault-modal-footer");
  const woFooter = document.getElementById("faultWOFooter");

  if (!modal || !modalBody) return;

  modalTitle.innerText = `Fault Details: ${fault.faultId}`;
  modalBody.innerHTML = `
        <div class="detail-row">
            <div class="detail-label">Fault ID</div>
            <div class="detail-value mono">${fault.faultId}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Date & Time</div>
            <div class="detail-value">${fault.date} at ${fault.time}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Equipment</div>
            <div class="detail-value">${fault.equipment}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Type / Severity</div>
            <div class="detail-value">${fault.type} / <span class="severity-badge severity-${fault.severity.toLowerCase()}">${fault.severity}</span></div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Description</div>
            <div class="detail-value">${fault.description}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Root Cause</div>
            <div class="detail-value">${fault.cause || "Not yet determined"}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Response / Resolution</div>
            <div class="detail-value">Response: ${fault.responseTime || "N/A"} min | Resolution: ${fault.resolutionTime || "N/A"} hrs</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Downtime</div>
            <div class="detail-value">${fault.downtime || 0} hours</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Status</div>
            <div class="detail-value"><span class="severity-badge status-${fault.status.toLowerCase().replace(" ", "")}">${fault.status}</span></div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Reported By</div>
            <div class="detail-value">${fault.reportedBy || "Unknown"}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Technician</div>
            <div class="detail-value">${fault.technician || "Not assigned"}</div>
        </div>
        ${fault.resolutionNotes ? `<div class="detail-row"><div class="detail-label">Resolution Notes</div><div class="detail-value">${fault.resolutionNotes}</div></div>` : ""}
    `;

  if (footer) footer.style.display = "none";
  if (woFooter) woFooter.style.display = "flex";

  const updateBtn = document.getElementById("updateFaultBtn");
  const createWOBtn = document.getElementById("createWOBtn");

  if (updateBtn) updateBtn.onclick = () => showEditFaultForm(fault);
  if (createWOBtn)
    createWOBtn.onclick = () => createWorkOrderFromFault(fault.id);

  modal.style.display = "flex";
}

function showAddFaultForm() {
  const modal = document.getElementById("faultModal");
  const modalTitle = document.getElementById("faultModalTitle");
  const footer = document.querySelector("#faultModal .fault-modal-footer");
  const woFooter = document.getElementById("faultWOFooter");
  const form = document.getElementById("faultForm");

  if (!modal) return;

  modalTitle.innerText = "Log New Fault";
  if (form) form.reset();

  const dateInput = document.getElementById("faultDate");
  const timeInput = document.getElementById("faultTime");
  if (dateInput) dateInput.valueAsDate = new Date();
  if (timeInput)
    timeInput.value = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (footer) footer.style.display = "flex";
  if (woFooter) woFooter.style.display = "none";

  const saveBtn = document.getElementById("saveFaultBtn");
  if (saveBtn) saveBtn.onclick = saveNewFault;

  modal.style.display = "flex";
}

function saveNewFault() {
  const newId = Math.max(...FaultsDB.items.map((f) => f.id), 0) + 1;
  const faultId = `FLT-${new Date().getFullYear()}-${newId.toString().padStart(3, "0")}`;

  const dateInput = document.getElementById("faultDate");
  const timeInput = document.getElementById("faultTime");
  const equipmentSelect = document.getElementById("faultEquipment");
  const typeSelect = document.getElementById("faultType");
  const severitySelect = document.getElementById("faultSeverity");
  const descTextarea = document.getElementById("faultDescription");
  const causeTextarea = document.getElementById("faultCause");
  const responseTimeInput = document.getElementById("faultResponseTime");
  const resolutionTimeInput = document.getElementById("faultResolutionTime");
  const statusSelect = document.getElementById("faultStatus");
  const reportedByInput = document.getElementById("faultReportedBy");
  const technicianInput = document.getElementById("faultTechnician");
  const resolutionNotesTextarea = document.getElementById(
    "faultResolutionNotes",
  );

  if (!equipmentSelect || !equipmentSelect.value) {
    showFaultStatus("Please select equipment", "error");
    return;
  }
  if (!descTextarea || !descTextarea.value) {
    showFaultStatus("Please enter description", "error");
    return;
  }

  const newFault = {
    id: newId,
    faultId: faultId,
    date: dateInput
      ? dateInput.value.replace(/-/g, "/")
      : new Date().toISOString().slice(0, 10).replace(/-/g, "/"),
    time: timeInput ? timeInput.value : "00:00",
    equipment: equipmentSelect.value,
    type: typeSelect ? typeSelect.value : "Other",
    severity: severitySelect ? severitySelect.value : "Medium",
    description: descTextarea.value,
    cause: causeTextarea ? causeTextarea.value || "" : "",
    responseTime: responseTimeInput
      ? parseInt(responseTimeInput.value) || null
      : null,
    resolutionTime: resolutionTimeInput
      ? parseFloat(resolutionTimeInput.value) || null
      : null,
    downtime: 0,
    status: statusSelect ? statusSelect.value : "Open",
    reportedBy: reportedByInput
      ? reportedByInput.value || "Unknown"
      : "Unknown",
    technician: technicianInput ? technicianInput.value || "" : "",
    resolutionNotes: resolutionNotesTextarea
      ? resolutionNotesTextarea.value || ""
      : "",
  };

  FaultsDB.items.push(newFault);
  localStorage.setItem("faults_items", JSON.stringify(FaultsDB.items));
  filterFaults();
  closeFaultModal();
  showFaultStatus("✓ Fault logged successfully!", "success");
}

function showEditFaultForm(fault) {
  const modal = document.getElementById("faultModal");
  const modalTitle = document.getElementById("faultModalTitle");
  const footer = document.querySelector("#faultModal .fault-modal-footer");
  const woFooter = document.getElementById("faultWOFooter");

  if (!modal) return;

  modalTitle.innerText = `Edit Fault: ${fault.faultId}`;

  const equipmentSelect = document.getElementById("faultEquipment");
  const typeSelect = document.getElementById("faultType");
  const severitySelect = document.getElementById("faultSeverity");
  const statusSelect = document.getElementById("faultStatus");
  const dateInput = document.getElementById("faultDate");
  const timeInput = document.getElementById("faultTime");
  const descTextarea = document.getElementById("faultDescription");
  const causeTextarea = document.getElementById("faultCause");
  const responseTimeInput = document.getElementById("faultResponseTime");
  const resolutionTimeInput = document.getElementById("faultResolutionTime");
  const resolutionNotesTextarea = document.getElementById(
    "faultResolutionNotes",
  );
  const reportedByInput = document.getElementById("faultReportedBy");
  const technicianInput = document.getElementById("faultTechnician");

  if (equipmentSelect) equipmentSelect.value = fault.equipment;
  if (typeSelect) typeSelect.value = fault.type;
  if (severitySelect) severitySelect.value = fault.severity;
  if (statusSelect) statusSelect.value = fault.status;
  if (dateInput) dateInput.value = fault.date.replace(/\//g, "-");
  if (timeInput) timeInput.value = fault.time;
  if (descTextarea) descTextarea.value = fault.description;
  if (causeTextarea) causeTextarea.value = fault.cause || "";
  if (responseTimeInput) responseTimeInput.value = fault.responseTime || "";
  if (resolutionTimeInput)
    resolutionTimeInput.value = fault.resolutionTime || "";
  if (resolutionNotesTextarea)
    resolutionNotesTextarea.value = fault.resolutionNotes || "";
  if (reportedByInput) reportedByInput.value = fault.reportedBy || "";
  if (technicianInput) technicianInput.value = fault.technician || "";

  if (footer) footer.style.display = "flex";
  if (woFooter) woFooter.style.display = "none";

  const saveBtn = document.getElementById("saveFaultBtn");
  if (saveBtn) {
    saveBtn.onclick = () => updateFault(fault.id);
    saveBtn.innerText = "Update Fault";
  }

  modal.style.display = "flex";
}

function updateFault(id) {
  const index = FaultsDB.items.findIndex((f) => f.id === id);
  if (index !== -1) {
    const resolutionTimeInput = document.getElementById("faultResolutionTime");
    const resolutionTime = resolutionTimeInput
      ? parseFloat(resolutionTimeInput.value) || null
      : null;

    FaultsDB.items[index] = {
      ...FaultsDB.items[index],
      equipment:
        document.getElementById("faultEquipment")?.value ||
        FaultsDB.items[index].equipment,
      type:
        document.getElementById("faultType")?.value ||
        FaultsDB.items[index].type,
      severity:
        document.getElementById("faultSeverity")?.value ||
        FaultsDB.items[index].severity,
      status:
        document.getElementById("faultStatus")?.value ||
        FaultsDB.items[index].status,
      date:
        document.getElementById("faultDate")?.value.replace(/-/g, "/") ||
        FaultsDB.items[index].date,
      time:
        document.getElementById("faultTime")?.value ||
        FaultsDB.items[index].time,
      description:
        document.getElementById("faultDescription")?.value ||
        FaultsDB.items[index].description,
      cause: document.getElementById("faultCause")?.value || "",
      responseTime:
        parseInt(document.getElementById("faultResponseTime")?.value) || null,
      resolutionTime: resolutionTime,
      resolutionNotes:
        document.getElementById("faultResolutionNotes")?.value || "",
      reportedBy: document.getElementById("faultReportedBy")?.value || "",
      technician: document.getElementById("faultTechnician")?.value || "",
    };

    // Calculate downtime if resolved
    if (
      FaultsDB.items[index].status === "Resolved" &&
      FaultsDB.items[index].resolutionTime
    ) {
      FaultsDB.items[index].downtime = FaultsDB.items[index].resolutionTime;
    }

    localStorage.setItem("faults_items", JSON.stringify(FaultsDB.items));
    filterFaults();
    closeFaultModal();
    showFaultStatus("✓ Fault updated!", "success");
  }
}

function createWorkOrderFromFault(faultId) {
  const fault = FaultsDB.items.find((f) => f.id === faultId);
  if (!fault) return;

  const woTitle = prompt(
    "Work Order Title:",
    `${fault.equipment} - ${fault.type} Fault Repair`,
  );
  if (woTitle) {
    // Switch to Work Orders page
    const workordersLink = document.querySelector(
      '.nav-item[onclick*="workorders"]',
    );
    if (workordersLink) {
      showPage("workorders", workordersLink);
    }
    showFaultStatus(
      `Work Order "${woTitle}" created for fault ${fault.faultId}`,
      "success",
    );
  }
}

async function handleFaultFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length) {
        const newFaults = rows.map((row, idx) => ({
          id: FaultsDB.items.length + idx + 1,
          faultId: row.FaultID || row.faultId || `FLT-IMP-${idx + 1}`,
          date:
            row.Date ||
            row.date ||
            new Date().toISOString().slice(0, 10).replace(/-/g, "/"),
          time: row.Time || row.time || "00:00",
          equipment: row.Equipment || row.equipment || "Unknown",
          type: row.Type || row.type || "Other",
          severity: row.Severity || row.severity || "Medium",
          description: row.Description || row.description || "",
          cause: row.Cause || row.cause || "",
          responseTime: row.ResponseTime || row.responseTime || null,
          resolutionTime: row.ResolutionTime || row.resolutionTime || null,
          downtime: row.Downtime || row.downtime || 0,
          status: row.Status || row.status || "Open",
          reportedBy: row.ReportedBy || row.reportedBy || "",
          technician: row.Technician || row.technician || "",
          resolutionNotes: row.ResolutionNotes || row.resolutionNotes || "",
        }));

        FaultsDB.items.push(...newFaults);
        localStorage.setItem("faults_items", JSON.stringify(FaultsDB.items));
        filterFaults();
        showFaultStatus(`✓ Imported ${newFaults.length} faults!`, "success");
      }
    } catch (err) {
      showFaultStatus("✗ Error parsing file", "error");
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = "";

  // Show files card
  const filesCard = document.getElementById("faultFilesCard");
  if (filesCard) {
    filesCard.style.display = "block";
    const fileList = document.getElementById("faultFileList");
    if (fileList) {
      fileList.innerHTML = `
                <div class="fault-file-item">
                    <i class="fas fa-database"></i>
                    <span>Faults Database</span>
                    <span class="severity-badge severity-low">${FaultsDB.items.length} records</span>
                </div>
            `;
    }
  }
}

function exportFaultsData() {
  const csvRows = [
    [
      "Fault ID",
      "Date",
      "Time",
      "Equipment",
      "Type",
      "Severity",
      "Description",
      "Cause",
      "Response Time (min)",
      "Resolution Time (hrs)",
      "Downtime (hrs)",
      "Status",
      "Reported By",
      "Technician",
      "Resolution Notes",
    ],
  ];

  FaultsDB.items.forEach((f) => {
    csvRows.push([
      f.faultId,
      f.date,
      f.time,
      f.equipment,
      f.type,
      f.severity,
      f.description,
      f.cause || "",
      f.responseTime || "",
      f.resolutionTime || "",
      f.downtime || 0,
      f.status,
      f.reportedBy || "",
      f.technician || "",
      f.resolutionNotes || "",
    ]);
  });

  const csv = csvRows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `faults_report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showFaultStatus("✓ Faults exported!", "success");
}

function clearFaultsData() {
  if (confirm("Clear all fault data? This cannot be undone.")) {
    localStorage.removeItem("faults_items");
    FaultsDB.items = JSON.parse(JSON.stringify(defaultFaults));
    localStorage.setItem("faults_items", JSON.stringify(FaultsDB.items));
    filterFaults();
    showFaultStatus("✓ All data cleared and reset to defaults", "info");
  }
}

function closeFaultModal() {
  const modal = document.getElementById("faultModal");
  if (modal) modal.style.display = "none";

  const footer = document.querySelector("#faultModal .fault-modal-footer");
  const woFooter = document.getElementById("faultWOFooter");
  const saveBtn = document.getElementById("saveFaultBtn");

  if (footer) footer.style.display = "flex";
  if (woFooter) woFooter.style.display = "none";
  if (saveBtn) saveBtn.innerText = "Save Fault";
}

function showFaultStatus(message, type) {
  let statusDiv = document.getElementById("faultStatusMsg");
  if (!statusDiv) {
    statusDiv = document.createElement("div");
    statusDiv.id = "faultStatusMsg";
    statusDiv.style.cssText =
      "position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:10px;z-index:1001;animation:fadeInUp 0.3s ease";
    document.body.appendChild(statusDiv);
  }
  const colors = {
    success: "#2ecc71",
    error: "#e74c3c",
    info: "#3d8ef7",
    warning: "#f5a623",
  };
  statusDiv.style.backgroundColor = colors[type] || colors.info;
  statusDiv.style.color = "white";
  statusDiv.innerHTML = message;
  statusDiv.style.display = "block";
  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 3000);
}

// Initialize faults when page loads
document.addEventListener("DOMContentLoaded", () => {
  const observer = new MutationObserver(() => {
    const faultsPage = document.getElementById("page-faults");
    if (faultsPage && faultsPage.classList.contains("active")) {
      initFaults();
      observer.disconnect();
    }
  });
  observer.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ["class"],
  });

  if (document.getElementById("page-faults")?.classList.contains("active")) {
    initFaults();
  }
});

// Expose functions globally
window.viewFaultDetails = viewFaultDetails;
window.createWorkOrderFromFault = createWorkOrderFromFault;
window.closeFaultModal = closeFaultModal;
window.filterFaults = filterFaults;

// ============================================
// REPORTS & ANALYTICS MODULE
// ============================================

let ReportsDB = {
  history: [],
  currentData: {
    generation: [],
    maintenance: [],
    faults: [],
    equipment: [],
  },
};

// Load reports history from localStorage
function loadReportsHistory() {
  const saved = localStorage.getItem("reports_history");
  if (saved) {
    ReportsDB.history = JSON.parse(saved);
  } else {
    ReportsDB.history = [];
  }
  renderReportsHistory();
}

function saveReportsHistory() {
  localStorage.setItem(
    "reports_history",
    JSON.stringify(ReportsDB.history.slice(0, 20)),
  );
}

function renderReportsHistory() {
  const container = document.getElementById("reportsHistoryList");
  if (!container) return;

  if (ReportsDB.history.length === 0) {
    container.innerHTML =
      '<div style="text-align:center; padding:40px; color:var(--text-muted);">No reports generated yet. Generate your first report above.</div>';
    return;
  }

  container.innerHTML = ReportsDB.history
    .map(
      (report) => `
        <div class="history-item" onclick="viewReportHistory('${report.id}')">
            <div class="history-info">
                <div class="history-icon">${report.type === "overall" ? "📊" : report.type === "generation" ? "⚡" : report.type === "maintenance" ? "🔧" : report.type === "faults" ? "⚠️" : "📋"}</div>
                <div class="history-details">
                    <h4>${report.title}</h4>
                    <p>${report.period}</p>
                </div>
            </div>
            <div class="history-date">${report.date}</div>
        </div>
    `,
    )
    .join("");
}

function viewReportHistory(id) {
  const report = ReportsDB.history.find((r) => r.id === id);
  if (report && report.content) {
    showReportModal(report.title, report.content);
  }
}

// Collect data from all modules
function collectReportData() {
  // Get Generation data
  if (typeof GenDB !== "undefined" && GenDB.allDays) {
    ReportsDB.currentData.generation = GenDB.allDays;
  }

  // Get Maintenance data
  if (typeof MaintDB !== "undefined" && MaintDB.tasks) {
    ReportsDB.currentData.maintenance = MaintDB.tasks;
  }
  if (typeof MaintDB !== "undefined" && MaintDB.history) {
    ReportsDB.currentData.maintenanceHistory = MaintDB.history;
  }

  // Get Faults data
  if (typeof FaultsDB !== "undefined" && FaultsDB.items) {
    ReportsDB.currentData.faults = FaultsDB.items;
  }

  // Get Equipment data
  if (typeof EquipmentDB !== "undefined" && EquipmentDB.items) {
    ReportsDB.currentData.equipment = EquipmentDB.items;
  }

  updateReportMetrics();
  updateExecutiveSummary();
  updateInsights();
  updateTrendCharts();
}

function updateReportMetrics() {
  const container = document.getElementById("reportMetricsGrid");
  if (!container) return;

  const faults = ReportsDB.currentData.faults || [];
  const generation = ReportsDB.currentData.generation || [];
  const maintenance = ReportsDB.currentData.maintenance || [];

  const totalGeneration = generation.reduce(
    (sum, d) => sum + (d.computed?.totalEnergy || 0),
    0,
  );
  const totalFaults = faults.length;
  const openFaults = faults.filter(
    (f) => f.status === "Open" || f.status === "In Progress",
  ).length;
  const pendingTasks = maintenance.filter((t) => t.status === "pending").length;
  const avgHealth =
    ReportsDB.currentData.equipment?.reduce(
      (sum, e) => sum + (e.healthScore || 80),
      0,
    ) / (ReportsDB.currentData.equipment?.length || 1);

  container.innerHTML = `
        <div class="report-metric-card">
            <div class="metric-icon">⚡</div>
            <div class="metric-value">${totalGeneration.toFixed(0)}</div>
            <div class="metric-label">Total MWh</div>
        </div>
        <div class="report-metric-card">
            <div class="metric-icon">⚠️</div>
            <div class="metric-value">${totalFaults}</div>
            <div class="metric-label">Total Faults</div>
            <div class="metric-trend ${openFaults > 0 ? "trend-down" : "trend-up"}">${openFaults} open</div>
        </div>
        <div class="report-metric-card">
            <div class="metric-icon">🔧</div>
            <div class="metric-value">${pendingTasks}</div>
            <div class="metric-label">Pending PM</div>
        </div>
        <div class="report-metric-card">
            <div class="metric-icon">❤️</div>
            <div class="metric-value">${Math.round(avgHealth)}%</div>
            <div class="metric-label">Avg Health</div>
        </div>
        <div class="report-metric-card">
            <div class="metric-icon">📅</div>
            <div class="metric-value">${generation.length}</div>
            <div class="metric-label">Days Logged</div>
        </div>
    `;
}

function updateExecutiveSummary() {
  const container = document.getElementById("executiveSummary");
  const faults = ReportsDB.currentData.faults || [];
  const generation = ReportsDB.currentData.generation || [];
  const maintenance = ReportsDB.currentData.maintenance || [];

  const totalGeneration = generation.reduce(
    (sum, d) => sum + (d.computed?.totalEnergy || 0),
    0,
  );
  const criticalFaults = faults.filter(
    (f) => f.severity === "Critical" || f.severity === "High",
  ).length;
  const resolvedFaults = faults.filter(
    (f) => f.status === "Resolved" || f.status === "Closed",
  ).length;
  const overdueTasks = maintenance.filter((t) => {
    if (t.status !== "pending") return false;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    return t.nextDue && t.nextDue < today;
  }).length;

  // Calculate trend
  const last30DaysGen = generation
    .filter((d) => {
      const date = new Date(d.bsDate.split("/").reverse().join("-"));
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date >= thirtyDaysAgo;
    })
    .reduce((sum, d) => sum + (d.computed?.totalEnergy || 0), 0);

  container.innerHTML = `
        <div class="executive-text">
            <strong>Period Summary:</strong> Total generation of <strong>${totalGeneration.toFixed(1)} MWh</strong> across ${generation.length} operational days. 
            ${criticalFaults > 0 ? `${criticalFaults} critical faults were recorded` : "No critical faults recorded"} with ${resolvedFaults} resolved. 
            ${overdueTasks > 0 ? `${overdueTasks} maintenance tasks are overdue` : "All maintenance tasks are on schedule"}.
        </div>
        <div class="executive-stats">
            <div class="exec-stat">
                <div class="exec-stat-value">${Math.round(totalGeneration / (generation.length || 1))}</div>
                <div class="exec-stat-label">Avg Daily MWh</div>
            </div>
            <div class="exec-stat">
                <div class="exec-stat-value">${Math.round((resolvedFaults / (faults.length || 1)) * 100)}%</div>
                <div class="exec-stat-label">Resolution Rate</div>
            </div>
            <div class="exec-stat">
                <div class="exec-stat-value">${Math.round((1 - overdueTasks / (maintenance.length || 1)) * 100)}%</div>
                <div class="exec-stat-label">PM Compliance</div>
            </div>
            <div class="exec-stat">
                <div class="exec-stat-value">${(totalGeneration / 1000).toFixed(1)}</div>
                <div class="exec-stat-label">GWh Generated</div>
            </div>
        </div>
    `;
}

function updateInsights() {
  const container = document.getElementById("insightsContent");
  const faults = ReportsDB.currentData.faults || [];
  const generation = ReportsDB.currentData.generation || [];
  const maintenance = ReportsDB.currentData.maintenance || [];
  const equipment = ReportsDB.currentData.equipment || [];

  const insights = [];

  // Analysis: Most frequent fault type
  const faultTypes = {};
  faults.forEach((f) => {
    faultTypes[f.type] = (faultTypes[f.type] || 0) + 1;
  });
  let topFaultType = "",
    topFaultCount = 0;
  for (const [type, count] of Object.entries(faultTypes)) {
    if (count > topFaultCount) {
      topFaultType = type;
      topFaultCount = count;
    }
  }
  if (topFaultType) {
    insights.push({
      icon: "warning",
      type: "warning",
      title: `High ${topFaultType} Fault Rate`,
      description: `${topFaultCount} ${topFaultType} faults recorded. This represents ${Math.round((topFaultCount / faults.length) * 100)}% of all faults.`,
      action: `Schedule preventive inspection for ${topFaultType} systems.`,
    });
  }

  // Analysis: Low health equipment
  const lowHealthEquipment = equipment.filter((e) => e.healthScore < 60);
  if (lowHealthEquipment.length > 0) {
    insights.push({
      icon: "critical",
      type: "critical",
      title: `Critical Asset Health Alert`,
      description: `${lowHealthEquipment.length} equipment items have health score below 60%: ${lowHealthEquipment.map((e) => e.name).join(", ")}.`,
      action: `Immediate maintenance required for ${lowHealthEquipment[0]?.name}.`,
    });
  }

  // Analysis: Overdue maintenance
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const overdueTasks = maintenance.filter(
    (t) => t.status === "pending" && t.nextDue && t.nextDue < today,
  );
  if (overdueTasks.length > 0) {
    insights.push({
      icon: "warning",
      type: "warning",
      title: `Overdue Maintenance Tasks`,
      description: `${overdueTasks.length} preventive maintenance tasks are past due date.`,
      action: `Prioritize ${overdueTasks[0]?.task} on ${overdueTasks[0]?.asset}.`,
    });
  }

  // Analysis: Generation trend
  if (generation.length >= 7) {
    const lastWeek = generation.slice(-7);
    const prevWeek = generation.slice(-14, -7);
    const weeklyGen = lastWeek.reduce(
      (sum, d) => sum + (d.computed?.totalEnergy || 0),
      0,
    );
    const prevWeeklyGen = prevWeek.reduce(
      (sum, d) => sum + (d.computed?.totalEnergy || 0),
      0,
    );
    const trend = weeklyGen - prevWeeklyGen;
    if (trend > 0) {
      insights.push({
        icon: "success",
        type: "success",
        title: `Positive Generation Trend`,
        description: `Generation increased by ${trend.toFixed(1)} MWh compared to previous week (+${Math.round((trend / prevWeeklyGen) * 100)}%).`,
        action: `Maintain current operational parameters.`,
      });
    } else if (trend < -prevWeeklyGen * 0.1) {
      insights.push({
        icon: "warning",
        type: "warning",
        title: `Generation Decline Detected`,
        description: `Generation decreased by ${Math.abs(trend).toFixed(1)} MWh compared to previous week.`,
        action: `Check water flow and unit efficiency.`,
      });
    }
  }

  // Analysis: Resolution time
  const resolvedFaults = faults.filter((f) => f.resolutionTime);
  if (resolvedFaults.length > 0) {
    const avgRT =
      resolvedFaults.reduce((sum, f) => sum + (f.resolutionTime || 0), 0) /
      resolvedFaults.length;
    if (avgRT > 4) {
      insights.push({
        icon: "info",
        type: "info",
        title: `High Average Resolution Time`,
        description: `Average fault resolution time is ${avgRT.toFixed(1)} hours, above target of 4 hours.`,
        action: `Review response procedures for faster resolution.`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      icon: "success",
      type: "success",
      title: `System Operating Normally`,
      description: `All metrics are within acceptable ranges. Continue current maintenance schedule.`,
      action: `Schedule next preventive maintenance cycle.`,
    });
  }

  container.innerHTML = insights
    .map(
      (insight) => `
        <div class="insight-item">
            <div class="insight-icon ${insight.type}">
                <i class="fas ${insight.icon === "warning" ? "fa-exclamation-triangle" : insight.icon === "critical" ? "fa-skull-crosswalk" : insight.icon === "success" ? "fa-check-circle" : "fa-info-circle"}"></i>
            </div>
            <div class="insight-content">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-desc">${insight.description}</div>
                <div class="insight-action"><i class="fas fa-clipboard-list"></i> Recommendation: ${insight.action}</div>
            </div>
        </div>
    `,
    )
    .join("");
}

function updateTrendCharts() {
  const generation = ReportsDB.currentData.generation || [];
  const faults = ReportsDB.currentData.faults || [];

  // Prepare weekly data
  const weeks = [];
  const weeklyGen = [];
  const weeklyFaults = [];

  const sortedGen = [...generation].sort((a, b) =>
    a.bsDate.localeCompare(b.bsDate),
  );
  const sortedFaults = [...faults].sort((a, b) => a.date.localeCompare(b.date));

  // Group by week (last 8 weeks)
  for (let i = 0; i < 8; i++) {
    weeks.push(`Week ${i + 1}`);
    weeklyGen.push(Math.random() * 200 + 100); // Simulated - will be real in actual implementation
    weeklyFaults.push(Math.floor(Math.random() * 5) + 1);
  }

  const trendCtx = document.getElementById("kpiTrendChart");
  if (trendCtx) {
    if (window.reportTrendChart) window.reportTrendChart.destroy();
    window.reportTrendChart = new Chart(trendCtx, {
      type: "line",
      data: {
        labels: weeks,
        datasets: [
          {
            label: "Generation (MWh)",
            data: weeklyGen,
            borderColor: "#29c48f",
            tension: 0.3,
            fill: false,
            yAxisID: "y",
          },
          {
            label: "Faults Count",
            data: weeklyFaults,
            borderColor: "#e24b4a",
            tension: 0.3,
            fill: false,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: { title: { display: true, text: "MWh" } },
          y1: {
            position: "right",
            title: { display: true, text: "Faults" },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  }

  const distCtx = document.getElementById("distributionChart");
  if (distCtx) {
    const faultTypes = {};
    faults.forEach((f) => {
      faultTypes[f.type] = (faultTypes[f.type] || 0) + 1;
    });

    if (window.reportDistChart) window.reportDistChart.destroy();
    window.reportDistChart = new Chart(distCtx, {
      type: "doughnut",
      data: {
        labels: Object.keys(faultTypes).length
          ? Object.keys(faultTypes)
          : ["No Data"],
        datasets: [
          {
            data: Object.values(faultTypes).length
              ? Object.values(faultTypes)
              : [1],
            backgroundColor: [
              "#e24b4a",
              "#f5ae3a",
              "#4a9de8",
              "#29c48f",
              "#9f7aea",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: "bottom" } },
      },
    });
  }
}

// Generate Overall Plant Performance Report
function generateOverallReport(dateFrom, dateTo) {
  const generation = ReportsDB.currentData.generation || [];
  const faults = ReportsDB.currentData.faults || [];
  const maintenance = ReportsDB.currentData.maintenance || [];
  const equipment = ReportsDB.currentData.equipment || [];

  const filteredGen = generation.filter((d) => {
    const genDate = d.bsDate.replace(/\//g, "-");
    return (!dateFrom || genDate >= dateFrom) && (!dateTo || genDate <= dateTo);
  });

  const filteredFaults = faults.filter((f) => {
    const faultDate = f.date.replace(/\//g, "-");
    return (
      (!dateFrom || faultDate >= dateFrom) && (!dateTo || faultDate <= dateTo)
    );
  });

  const totalGen = filteredGen.reduce(
    (sum, d) => sum + (d.computed?.totalEnergy || 0),
    0,
  );
  const totalFaults = filteredFaults.length;
  const criticalFaults = filteredFaults.filter(
    (f) => f.severity === "Critical" || f.severity === "High",
  ).length;
  const resolvedFaults = filteredFaults.filter(
    (f) => f.status === "Resolved" || f.status === "Closed",
  ).length;
  const overdueTasks = maintenance.filter((t) => {
    if (t.status !== "pending") return false;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    return t.nextDue && t.nextDue < today;
  }).length;
  const avgHealth =
    equipment.reduce((sum, e) => sum + (e.healthScore || 80), 0) /
    (equipment.length || 1);

  // Fault type distribution
  const faultTypes = {};
  filteredFaults.forEach((f) => {
    faultTypes[f.type] = (faultTypes[f.type] || 0) + 1;
  });

  // Generate HTML content
  return `
        <div class="report-content">
            <div class="report-header">
                <h1 class="report-title">HydroPlant - Overall Plant Performance Report</h1>
                <p class="report-date">Period: ${dateFrom || "Start"} to ${dateTo || "Present"} | Generated: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="report-section">
                <h4>📊 Executive Summary</h4>
                <p>During the reporting period, the plant generated <strong>${totalGen.toFixed(1)} MWh</strong> of electricity across ${filteredGen.length} operational days. A total of <strong>${totalFaults} faults</strong> were recorded, with ${criticalFaults} classified as critical/high severity. ${resolvedFaults} faults have been resolved (${Math.round((resolvedFaults / totalFaults) * 100)}% resolution rate).</p>
                <p>The average asset health stands at <strong>${Math.round(avgHealth)}%</strong>, with ${overdueTasks} preventive maintenance tasks currently overdue.</p>
            </div>
            
            <div class="report-section">
                <h4>⚡ Generation Analysis</h4>
                <table class="report-table">
                    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
                    <tbody>
                        <tr><td>Total Generation</td><td><strong>${totalGen.toFixed(1)} MWh</strong></td></tr>
                        <tr><td>Average Daily Generation</td><td>${(totalGen / (filteredGen.length || 1)).toFixed(1)} MWh</td></tr>
                        <tr><td>Operating Days</td><td>${filteredGen.length} days</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div class="report-section">
                <h4>⚠️ Fault & Incident Analysis</h4>
                <table class="report-table">
                    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
                    <tbody>
                        <tr><td>Total Faults</td><td>${totalFaults}</td></tr>
                        <tr><td>Critical/High Severity</td><td>${criticalFaults}</td></tr>
                        <tr><td>Resolution Rate</td><td>${Math.round((resolvedFaults / totalFaults) * 100)}%</td></tr>
                        <tr><td>Most Common Fault Type</td><td>${Object.keys(faultTypes)[0] || "N/A"} (${Object.values(faultTypes)[0] || 0} occurrences)</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div class="report-section">
                <h4>🔧 Maintenance Status</h4>
                <table class="report-table">
                    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
                    <tbody>
                        <tr><td>Overdue Tasks</td><td>${overdueTasks}</td></tr>
                        <tr><td>Total PM Tasks</td><td>${maintenance.length}</td></tr>
                        <tr><td>Average Asset Health</td><td>${Math.round(avgHealth)}%</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div class="report-section">
                <h4>💡 Recommendations</h4>
                ${generateRecommendations(filteredFaults, maintenance, equipment)}
            </div>
            
            <div class="report-footer">
                <p style="text-align:center; font-size:10px; color:var(--text-muted); margin-top:30px;">HydroPlant Manager v2.4 - Generated Report</p>
            </div>
        </div>
    `;
}

function generateRecommendations(faults, maintenance, equipment) {
  const recommendations = [];

  // Fault-based recommendations
  const faultTypes = {};
  faults.forEach((f) => {
    faultTypes[f.type] = (faultTypes[f.type] || 0) + 1;
  });
  let topType = "",
    topCount = 0;
  for (const [type, count] of Object.entries(faultTypes)) {
    if (count > topCount) {
      topType = type;
      topCount = count;
    }
  }
  if (topType) {
    recommendations.push(
      `<div class="recommendation-box"><strong>🔴 High Priority:</strong> Address recurring ${topType} faults (${topCount} occurrences). Schedule comprehensive inspection of ${topType} systems.</div>`,
    );
  }

  // Health-based recommendations
  const lowHealth = equipment.filter((e) => e.healthScore < 60);
  if (lowHealth.length > 0) {
    recommendations.push(
      `<div class="recommendation-box"><strong>🟠 Medium Priority:</strong> Critical asset health alert for ${lowHealth.map((e) => e.name).join(", ")}. Immediate maintenance required.</div>`,
    );
  }

  // Maintenance-based recommendations
  const overdue = maintenance.filter((t) => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    return t.status === "pending" && t.nextDue < today;
  });
  if (overdue.length > 0) {
    recommendations.push(
      `<div class="recommendation-box"><strong>🟡 Action Required:</strong> ${overdue.length} maintenance tasks are overdue. Prioritize ${overdue[0]?.task} on ${overdue[0]?.asset}.</div>`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      `<div class="recommendation-box"><strong>✅ Good Standing:</strong> All metrics are within acceptable ranges. Continue regular preventive maintenance schedule.</div>`,
    );
  }

  return recommendations.join("");
}

function generateGenerationReport(dateFrom, dateTo) {
  const generation = ReportsDB.currentData.generation || [];
  const filtered = generation.filter((d) => {
    const genDate = d.bsDate.replace(/\//g, "-");
    return (!dateFrom || genDate >= dateFrom) && (!dateTo || genDate <= dateTo);
  });

  const totalGen = filtered.reduce(
    (sum, d) => sum + (d.computed?.totalEnergy || 0),
    0,
  );
  const avgDaily = totalGen / (filtered.length || 1);

  return `
        <div class="report-content">
            <div class="report-header">
                <h1 class="report-title">⚡ Generation Analysis Report</h1>
                <p class="report-date">Period: ${dateFrom || "Start"} to ${dateTo || "Present"}</p>
            </div>
            <div class="report-section">
                <h4>Summary Statistics</h4>
                <table class="report-table">
                    <tr><td>Total Generation</td><td><strong>${totalGen.toFixed(1)} MWh</strong></td></tr>
                    <tr><td>Average Daily Generation</td><td>${avgDaily.toFixed(1)} MWh</td></tr>
                    <tr><td>Number of Days</td><td>${filtered.length}</td></tr>
                </table>
            </div>
            <div class="report-section">
                <h4>Daily Generation Log</h4>
                <table class="report-table">
                    <thead><tr><th>Date</th><th>Total MWh</th><th>U1 MWh</th><th>U2 MWh</th><th>Op Hours</th></tr></thead>
                    <tbody>
                        ${filtered
                          .map(
                            (d) => `
                            <tr>
                                <td>${d.bsDate}</td>
                                <td>${d.computed?.totalEnergy?.toFixed(1) || 0}</td>
                                <td>${d.computed?.u1Energy?.toFixed(1) || 0}</td>
                                <td>${d.computed?.u2Energy?.toFixed(1) || 0}</td>
                                <td>${d.computed?.opHours || 0}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function generateFaultReport(dateFrom, dateTo) {
  const faults = ReportsDB.currentData.faults || [];
  const filtered = faults.filter((f) => {
    const faultDate = f.date.replace(/\//g, "-");
    return (
      (!dateFrom || faultDate >= dateFrom) && (!dateTo || faultDate <= dateTo)
    );
  });

  const bySeverity = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  filtered.forEach((f) => {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
  });

  return `
        <div class="report-content">
            <div class="report-header">
                <h1 class="report-title">⚠️ Fault & Incident Analysis Report</h1>
                <p class="report-date">Period: ${dateFrom || "Start"} to ${dateTo || "Present"}</p>
            </div>
            <div class="report-section">
                <h4>Summary Statistics</h4>
                <table class="report-table">
                    <tr><td>Total Faults</td><td><strong>${filtered.length}</strong></td></tr>
                    <tr><td>Critical Severity</td><td>${bySeverity.Critical || 0}</td></tr>
                    <tr><td>High Severity</td><td>${bySeverity.High || 0}</td></tr>
                    <tr><td>Medium Severity</td><td>${bySeverity.Medium || 0}</td></tr>
                    <tr><td>Low Severity</td><td>${bySeverity.Low || 0}</td></tr>
                </table>
            </div>
            <div class="report-section">
                <h4>Fault Log</h4>
                <table class="report-table">
                    <thead><tr><th>ID</th><th>Date</th><th>Equipment</th><th>Type</th><th>Severity</th><th>Status</th></tr></thead>
                    <tbody>
                        ${filtered
                          .map(
                            (f) => `
                            <tr>
                                <td>${f.faultId}</td>
                                <td>${f.date}</td>
                                <td>${f.equipment}</td>
                                <td>${f.type}</td>
                                <td>${f.severity}</td>
                                <td>${f.status}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function generateMaintenanceReport(dateFrom, dateTo) {
  const maintenance = ReportsDB.currentData.maintenance || [];
  const overdue = maintenance.filter((t) => {
    if (t.status !== "pending") return false;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    return t.nextDue && t.nextDue < today;
  });

  return `
        <div class="report-content">
            <div class="report-header">
                <h1 class="report-title">🔧 Maintenance Effectiveness Report</h1>
                <p class="report-date">Period: ${dateFrom || "Start"} to ${dateTo || "Present"}</p>
            </div>
            <div class="report-section">
                <h4>Summary Statistics</h4>
                <table class="report-table">
                    <tr><td>Total PM Tasks</td><td><strong>${maintenance.length}</strong></td></tr>
                    <tr><td>Overdue Tasks</td><td>${overdue.length}</td></tr>
                    <tr><td>Completed Tasks</td><td>${maintenance.filter((t) => t.status === "completed").length}</td></tr>
                    <tr><td>PM Compliance Rate</td><td>${Math.round((maintenance.filter((t) => t.status === "completed").length / maintenance.length) * 100)}%</td></tr>
                </table>
            </div>
            <div class="report-section">
                <h4>Pending Maintenance Tasks</h4>
                <table class="report-table">
                    <thead><tr><th>Asset</th><th>Task</th><th>Due Date</th><th>Assigned To</th></tr></thead>
                    <tbody>
                        ${maintenance
                          .filter((t) => t.status === "pending")
                          .map(
                            (t) => `
                            <tr>
                                <td>${t.asset}</td>
                                <td>${t.task}</td>
                                <td>${t.nextDue || "N/A"}</td>
                                <td>${t.assignedTo || "Unassigned"}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function generateAssetHealthReport() {
  const equipment = ReportsDB.currentData.equipment || [];

  return `
        <div class="report-content">
            <div class="report-header">
                <h1 class="report-title">🏭 Asset Health Report</h1>
                <p class="report-date">Generated: ${new Date().toLocaleDateString()}</p>
            </div>
            <div class="report-section">
                <h4>Asset Health Summary</h4>
                <table class="report-table">
                    <thead><tr><th>Asset Name</th><th>Health Score</th><th>Status</th><th>Last Maintenance</th><th>Next Maintenance</th></tr></thead>
                    <tbody>
                        ${equipment
                          .map(
                            (e) => `
                            <tr>
                                <td>${e.name}</td>
                                <td><strong>${e.healthScore}%</strong></td>
                                <td>${e.healthScore >= 70 ? "✅ Good" : e.healthScore >= 50 ? "⚠️ Warning" : "🔴 Critical"}</td>
                                <td>${e.lastMaint || "N/A"}</td>
                                <td>${e.nextMaint || "N/A"}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function generateExecutiveSummary(dateFrom, dateTo) {
  const generation = ReportsDB.currentData.generation || [];
  const faults = ReportsDB.currentData.faults || [];
  const maintenance = ReportsDB.currentData.maintenance || [];

  const totalGen = generation.reduce(
    (sum, d) => sum + (d.computed?.totalEnergy || 0),
    0,
  );
  const totalFaults = faults.length;
  const overdueTasks = maintenance.filter((t) => {
    if (t.status !== "pending") return false;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    return t.nextDue && t.nextDue < today;
  }).length;

  return `
        <div class="report-content">
            <div class="report-header">
                <h1 class="report-title">📋 Executive Summary</h1>
                <p class="report-date">Period: ${dateFrom || "Start"} to ${dateTo || "Present"}</p>
            </div>
            <div class="report-section">
                <h4>Key Performance Indicators</h4>
                <table class="report-table">
                    <tr><td>Total Generation</td><td><strong>${totalGen.toFixed(1)} MWh</strong></td><td>Target: ${(totalGen * 1.05).toFixed(1)} MWh</td></tr>
                    <tr><td>Total Faults</td><td><strong>${totalFaults}</strong></td><td>Trend: ${totalFaults > 10 ? "↑ Increasing" : "↓ Stable"}</td></tr>
                    <tr><td>PM Compliance</td><td><strong>${Math.round((1 - overdueTasks / (maintenance.length || 1)) * 100)}%</strong></td><td>Target: >85%</td></tr>
                    <tr><td>Plant Availability</td><td><strong>96.2%</strong></td><td>Target: 95%</td></tr>
                </table>
            </div>
            <div class="report-section">
                <h4>Conclusion</h4>
                <p>The plant is operating at ${totalGen > 1000 ? "above expected levels" : "normal levels"} with ${totalFaults} faults recorded. ${overdueTasks > 0 ? `Priority attention needed for ${overdueTasks} overdue maintenance tasks.` : "All maintenance tasks are on schedule."}</p>
                <p>Recommend continuing current operational procedures while addressing the identified critical asset health issues.</p>
            </div>
            ${generateRecommendations(faults, maintenance, ReportsDB.currentData.equipment || [])}
        </div>
    `;
}

// Main report generation function
function generateReport() {
  const reportType = document.getElementById("reportType").value;
  let dateFrom = document.getElementById("reportDateFrom").value;
  let dateTo = document.getElementById("reportDateTo").value;
  const format = document.querySelector('input[name="format"]:checked').value;

  let reportContent = "";
  let reportTitle = "";

  switch (reportType) {
    case "overall":
      reportContent = generateOverallReport(dateFrom, dateTo);
      reportTitle = "Overall_Plant_Performance_Report";
      break;
    case "generation":
      reportContent = generateGenerationReport(dateFrom, dateTo);
      reportTitle = "Generation_Analysis_Report";
      break;
    case "maintenance":
      reportContent = generateMaintenanceReport(dateFrom, dateTo);
      reportTitle = "Maintenance_Effectiveness_Report";
      break;
    case "faults":
      reportContent = generateFaultReport(dateFrom, dateTo);
      reportTitle = "Fault_Incident_Analysis_Report";
      break;
    case "asset":
      reportContent = generateAssetHealthReport();
      reportTitle = "Asset_Health_Report";
      break;
    case "executive":
      reportContent = generateExecutiveSummary(dateFrom, dateTo);
      reportTitle = "Executive_Summary";
      break;
    default:
      reportContent = generateOverallReport(dateFrom, dateTo);
      reportTitle = "Plant_Performance_Report";
  }

  // Save to history
  const historyItem = {
    id: Date.now().toString(),
    title: reportTitle.replace(/_/g, " "),
    type: reportType,
    period: `${dateFrom || "Start"} to ${dateTo || "Present"}`,
    date: new Date().toLocaleDateString(),
    content: reportContent,
  };
  ReportsDB.history.unshift(historyItem);
  saveReportsHistory();
  renderReportsHistory();

  if (format === "pdf") {
    showReportModal(reportTitle, reportContent);
  } else if (format === "excel") {
    exportToExcel(reportType);
  } else if (format === "csv") {
    exportToCSV(reportType);
  }
}

function showReportModal(title, content) {
  const modal = document.getElementById("reportModal");
  const modalTitle = modal.querySelector("h3");
  const modalBody = document.getElementById("reportModalBody");

  modalTitle.innerText = title.replace(/_/g, " ");
  modalBody.innerHTML = content;
  modal.style.display = "flex";

  const printBtn = document.getElementById("printReportBtn");
  printBtn.onclick = () => {
    window.print();
  };
}

function closeReportModal() {
  document.getElementById("reportModal").style.display = "none";
}

function showReportPreview() {
  const reportType = document.getElementById("reportType").value;
  let dateFrom = document.getElementById("reportDateFrom").value;
  let dateTo = document.getElementById("reportDateTo").value;

  let reportContent = "";
  let reportTitle = "";

  switch (reportType) {
    case "overall":
      reportContent = generateOverallReport(dateFrom, dateTo);
      reportTitle = "Overall Plant Performance Report";
      break;
    case "generation":
      reportContent = generateGenerationReport(dateFrom, dateTo);
      reportTitle = "Generation Analysis Report";
      break;
    case "maintenance":
      reportContent = generateMaintenanceReport(dateFrom, dateTo);
      reportTitle = "Maintenance Effectiveness Report";
      break;
    case "faults":
      reportContent = generateFaultReport(dateFrom, dateTo);
      reportTitle = "Fault & Incident Analysis Report";
      break;
    case "asset":
      reportContent = generateAssetHealthReport();
      reportTitle = "Asset Health Report";
      break;
    case "executive":
      reportContent = generateExecutiveSummary(dateFrom, dateTo);
      reportTitle = "Executive Summary";
      break;
    default:
      reportContent = generateOverallReport(dateFrom, dateTo);
      reportTitle = "Plant Performance Report";
  }

  const preview = document.getElementById("reportPreview");
  const previewContent = document.getElementById("reportPreviewContent");
  previewContent.innerHTML = reportContent;
  preview.style.display = "flex";

  const downloadBtn = document.getElementById("downloadPreviewBtn");
  downloadBtn.onclick = () => {
    showReportModal(reportTitle, reportContent);
    preview.style.display = "none";
  };
}

function closeReportPreview() {
  document.getElementById("reportPreview").style.display = "none";
}

function exportToExcel(reportType) {
  let data = [];
  let filename = "";

  switch (reportType) {
    case "generation":
      data = ReportsDB.currentData.generation || [];
      filename = "generation_data.xlsx";
      break;
    case "maintenance":
      data = ReportsDB.currentData.maintenance || [];
      filename = "maintenance_data.xlsx";
      break;
    case "faults":
      data = ReportsDB.currentData.faults || [];
      filename = "faults_data.xlsx";
      break;
    case "asset":
      data = ReportsDB.currentData.equipment || [];
      filename = "asset_data.xlsx";
      break;
    default:
      alert("Excel export for this report type will show raw data");
      return;
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename);
  showReportStatus("✓ Excel file downloaded!", "success");
}

function exportToCSV(reportType) {
  let data = [];
  let filename = "";

  switch (reportType) {
    case "generation":
      data = ReportsDB.currentData.generation || [];
      filename = "generation_data.csv";
      break;
    case "maintenance":
      data = ReportsDB.currentData.maintenance || [];
      filename = "maintenance_data.csv";
      break;
    case "faults":
      data = ReportsDB.currentData.faults || [];
      filename = "faults_data.csv";
      break;
    case "asset":
      data = ReportsDB.currentData.equipment || [];
      filename = "asset_data.csv";
      break;
    default:
      alert("CSV export for this report type will show raw data");
      return;
  }

  const headers = Object.keys(data[0] || {});
  const csvRows = [headers.join(",")];

  data.forEach((row) => {
    const values = headers.map((header) => {
      const val = row[header] || "";
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  });

  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showReportStatus("✓ CSV file downloaded!", "success");
}

function clearReportsHistory() {
  if (confirm("Clear all report history?")) {
    ReportsDB.history = [];
    saveReportsHistory();
    renderReportsHistory();
    showReportStatus("✓ Report history cleared", "info");
  }
}

function showReportStatus(message, type) {
  let statusDiv = document.getElementById("reportStatusMsg");
  if (!statusDiv) {
    statusDiv = document.createElement("div");
    statusDiv.id = "reportStatusMsg";
    statusDiv.style.cssText =
      "position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:10px;z-index:2001;animation:fadeInUp 0.3s ease";
    document.body.appendChild(statusDiv);
  }
  const colors = { success: "#2ecc71", error: "#e74c3c", info: "#3d8ef7" };
  statusDiv.style.backgroundColor = colors[type] || colors.info;
  statusDiv.style.color = "white";
  statusDiv.innerHTML = message;
  statusDiv.style.display = "block";
  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 3000);
}

// Quick date buttons
function setQuickDate(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  document.getElementById("reportDateFrom").value = from
    .toISOString()
    .slice(0, 10);
  document.getElementById("reportDateTo").value = to.toISOString().slice(0, 10);
}

// Initialize Reports module
function initReports() {
  console.log("Initializing Reports module...");
  loadReportsHistory();
  collectReportData();

  // Attach event listeners
  const generateBtn = document.getElementById("generateReportBtn");
  if (generateBtn) generateBtn.onclick = generateReport;

  const previewBtn = document.getElementById("previewReportBtn");
  if (previewBtn) previewBtn.onclick = showReportPreview;

  const refreshBtn = document.getElementById("refreshReportsBtn");
  if (refreshBtn)
    refreshBtn.onclick = () => {
      collectReportData();
      showReportStatus("Data refreshed!", "success");
    };

  const clearHistoryBtn = document.getElementById("clearReportsHistory");
  if (clearHistoryBtn) clearHistoryBtn.onclick = clearReportsHistory;

  // Quick date buttons
  document.querySelectorAll(".quick-btn").forEach((btn) => {
    btn.onclick = () => setQuickDate(parseInt(btn.dataset.days));
  });
}

// Initialize reports when page loads
document.addEventListener("DOMContentLoaded", () => {
  const observer = new MutationObserver(() => {
    const reportsPage = document.getElementById("page-reports");
    if (reportsPage && reportsPage.classList.contains("active")) {
      initReports();
      observer.disconnect();
    }
  });
  observer.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ["class"],
  });

  if (document.getElementById("page-reports")?.classList.contains("active")) {
    initReports();
  }
});

// Expose global functions
window.generateReport = generateReport;
window.showReportPreview = showReportPreview;
window.closeReportPreview = closeReportPreview;
window.closeReportModal = closeReportModal;
window.setQuickDate = setQuickDate;
window.viewReportHistory = viewReportHistory;
window.clearReportsHistory = clearReportsHistory;

// ============================================
// DOCUMENT MANAGEMENT SYSTEM MODULE
// ============================================

let DocumentsDB = {
  folders: [],
  documents: [],
  currentFolder: "root",
  viewMode: "grid",
  searchActive: false,
  searchTerm: "",
  totalDownloads: 0,
};

// Folder structure
const defaultFolders = [
  {
    id: "root",
    name: "Document Library",
    parent: null,
    icon: "fa-folder-open",
  },
  {
    id: "tech",
    name: "📁 Technical Documents",
    parent: "root",
    icon: "fa-folder",
  },
  { id: "tech_om", name: "📄 O&M Manuals", parent: "tech", icon: "fa-folder" },
  {
    id: "tech_drawings",
    name: "📐 Drawings",
    parent: "tech",
    icon: "fa-folder",
  },
  {
    id: "tech_specs",
    name: "📋 Specifications",
    parent: "tech",
    icon: "fa-folder",
  },
  { id: "safety", name: "⚠️ Safety & HSE", parent: "root", icon: "fa-folder" },
  { id: "safety_sops", name: "📖 SOPs", parent: "safety", icon: "fa-folder" },
  {
    id: "safety_checklists",
    name: "✅ Checklists",
    parent: "safety",
    icon: "fa-folder",
  },
  { id: "personnel", name: "👥 Personnel", parent: "root", icon: "fa-folder" },
  {
    id: "personnel_training",
    name: "🎓 Training",
    parent: "personnel",
    icon: "fa-folder",
  },
  { id: "reports", name: "📊 Reports", parent: "root", icon: "fa-folder" },
  {
    id: "reports_monthly",
    name: "Monthly",
    parent: "reports",
    icon: "fa-folder",
  },
  {
    id: "regulatory",
    name: "📜 Regulatory",
    parent: "root",
    icon: "fa-folder",
  },
];

// Sample documents
const defaultDocuments = [
  {
    id: "doc1",
    name: "Turbine_O&M_Manual_v2.1.pdf",
    type: "pdf",
    size: "2.4 MB",
    folderId: "tech_om",
    uploadedBy: "Rajesh Kumar",
    uploadDate: "2024-01-10",
    downloads: 15,
    description:
      "Complete operation and maintenance manual for Francis turbine",
    tags: "turbine,manual,om",
  },
  {
    id: "doc2",
    name: "Generator_Technical_Specs.xlsx",
    type: "xls",
    size: "856 KB",
    folderId: "tech_specs",
    uploadedBy: "Prakash Thapa",
    uploadDate: "2024-01-12",
    downloads: 8,
    description: "Generator technical specifications and parameters",
    tags: "generator,specs,technical",
  },
  {
    id: "doc3",
    name: "Single_Line_Diagram_RevC.pdf",
    type: "pdf",
    size: "1.2 MB",
    folderId: "tech_drawings",
    uploadedBy: "E. Shrestha",
    uploadDate: "2024-01-08",
    downloads: 23,
    description: "Electrical single line diagram - Revision C",
    tags: "electrical,sld,drawing",
  },
  {
    id: "doc4",
    name: "Emergency_Response_Plan.pdf",
    type: "pdf",
    size: "3.1 MB",
    folderId: "safety",
    uploadedBy: "Admin",
    uploadDate: "2024-01-05",
    downloads: 42,
    description: "Plant emergency response and evacuation plan",
    tags: "safety,emergency,hse",
  },
  {
    id: "doc5",
    name: "Unit_Startup_Procedure.pdf",
    type: "pdf",
    size: "567 KB",
    folderId: "safety_sops",
    uploadedBy: "Rajesh Kumar",
    uploadDate: "2024-01-15",
    downloads: 31,
    description: "Standard operating procedure for unit startup",
    tags: "sop,startup,procedure",
  },
  {
    id: "doc6",
    name: "Daily_Inspection_Checklist.xlsx",
    type: "xls",
    size: "234 KB",
    folderId: "safety_checklists",
    uploadedBy: "Suresh Gurung",
    uploadDate: "2024-01-18",
    downloads: 19,
    description: "Daily equipment inspection checklist",
    tags: "checklist,inspection,daily",
  },
  {
    id: "doc7",
    name: "Operator_Training_Manual.pdf",
    type: "pdf",
    size: "4.2 MB",
    folderId: "personnel_training",
    uploadedBy: "Admin",
    uploadDate: "2024-01-03",
    downloads: 28,
    description: "Comprehensive training manual for operators",
    tags: "training,manual,operator",
  },
  {
    id: "doc8",
    name: "Monthly_Report_December_2024.xlsx",
    type: "xls",
    size: "445 KB",
    folderId: "reports_monthly",
    uploadedBy: "Prakash Thapa",
    uploadDate: "2024-01-02",
    downloads: 12,
    description: "Monthly performance report - December 2024",
    tags: "report,monthly,performance",
  },
  {
    id: "doc9",
    name: "Grid_Compliance_Cert_2024.pdf",
    type: "pdf",
    size: "789 KB",
    folderId: "regulatory",
    uploadedBy: "Admin",
    uploadDate: "2023-12-28",
    downloads: 7,
    description: "Grid code compliance certificate 2024",
    tags: "compliance,certificate,grid",
  },
  {
    id: "doc10",
    name: "Bearing_Replacement_Guide.pdf",
    type: "pdf",
    size: "1.8 MB",
    folderId: "tech_om",
    uploadedBy: "Rajesh Kumar",
    uploadDate: "2024-01-20",
    downloads: 5,
    description: "Step-by-step guide for bearing replacement",
    tags: "bearing,maintenance,guide",
  },
];

function initDocuments() {
  console.log("Initializing Documents module...");

  // Load data from localStorage
  const savedFolders = localStorage.getItem("doc_folders");
  const savedDocs = localStorage.getItem("doc_documents");
  const savedDownloads = localStorage.getItem("doc_total_downloads");

  if (savedFolders) {
    DocumentsDB.folders = JSON.parse(savedFolders);
  } else {
    DocumentsDB.folders = [...defaultFolders];
  }

  if (savedDocs) {
    DocumentsDB.documents = JSON.parse(savedDocs);
  } else {
    DocumentsDB.documents = [...defaultDocuments];
  }

  DocumentsDB.totalDownloads = savedDownloads ? parseInt(savedDownloads) : 0;

  renderFolderTree();
  renderCurrentFolder();
  updateDocStats();
  renderRecentUploads();
  attachDocEventListeners();
}

function attachDocEventListeners() {
  const uploadBtn = document.getElementById("docUploadBtn");
  const fileInput = document.getElementById("docFileInput");
  if (uploadBtn && fileInput) {
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = handleFileSelect;
  }

  const searchBtn = document.getElementById("docSearchBtn");
  if (searchBtn) {
    searchBtn.onclick = toggleSearchBar;
  }

  // File drop zone
  const dropZone = document.getElementById("fileDropZone");
  if (dropZone) {
    dropZone.onclick = () => document.getElementById("uploadFiles").click();
    dropZone.ondragover = (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "var(--accent-blue)";
    };
    dropZone.ondragleave = () => (dropZone.style.borderColor = "var(--border)");
    dropZone.ondrop = (e) => {
      e.preventDefault();
      handleFileDrop(e.dataTransfer.files);
    };
  }

  const uploadFilesInput = document.getElementById("uploadFiles");
  if (uploadFilesInput) {
    uploadFilesInput.onchange = (e) => handleFileSelect(e);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files && files.length > 0) {
    prepareUpload(files);
  }
  e.target.value = "";
}

function handleFileDrop(files) {
  if (files && files.length > 0) {
    prepareUpload(files);
  }
}

function prepareUpload(files) {
  // Populate folder dropdown
  const folderSelect = document.getElementById("uploadFolder");
  if (folderSelect) {
    folderSelect.innerHTML = DocumentsDB.folders
      .map(
        (f) =>
          `<option value="${f.id}">${"  ".repeat(getFolderDepth(f.id))}${f.name}</option>`,
      )
      .join("");
  }

  // Show modal
  document.getElementById("uploadModal").style.display = "flex";

  // Store files for upload
  window.pendingUploads = files;
}

function uploadDocuments() {
  const files = window.pendingUploads;
  if (!files || files.length === 0) return;

  const folderId = document.getElementById("uploadFolder").value;
  const description = document.getElementById("uploadDescription").value;
  const tags = document.getElementById("uploadTags").value;
  const expiry = document.getElementById("uploadExpiry").value;

  const progressBar = document.getElementById("uploadProgress");
  const progressFill = progressBar?.querySelector(".progress-fill");

  if (progressBar) progressBar.style.display = "block";

  let completed = 0;

  Array.from(files).forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newDoc = {
        id: `doc_${Date.now()}_${index}`,
        name: file.name,
        type: getFileType(file.name),
        size: formatFileSize(file.size),
        folderId: folderId,
        uploadedBy: "Current User",
        uploadDate: new Date().toISOString().slice(0, 10),
        downloads: 0,
        description: description,
        tags: tags,
        content: e.target.result, // Store base64 for demo
        expiry: expiry || null,
      };

      DocumentsDB.documents.unshift(newDoc);
      completed++;

      if (progressFill)
        progressFill.style.width = `${(completed / files.length) * 100}%`;

      if (completed === files.length) {
        saveDocumentsToLocal();
        renderCurrentFolder();
        updateDocStats();
        renderRecentUploads();
        renderFolderTree();
        closeUploadModal();
        showDocStatus(`✓ Uploaded ${files.length} document(s)!`, "success");
      }
    };
    reader.readAsDataURL(file);
  });
}

function getFileType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const types = {
    pdf: "pdf",
    doc: "doc",
    docx: "doc",
    xls: "xls",
    xlsx: "xls",
    ppt: "ppt",
    pptx: "ppt",
    jpg: "img",
    jpeg: "img",
    png: "img",
    dwg: "dwg",
    txt: "txt",
  };
  return types[ext] || "other";
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFolderDepth(folderId) {
  let depth = 0;
  let current = DocumentsDB.folders.find((f) => f.id === folderId);
  while (current && current.parent) {
    depth++;
    current = DocumentsDB.folders.find((f) => f.id === current.parent);
  }
  return depth;
}

function renderFolderTree() {
  const container = document.getElementById("folderTree");
  if (!container) return;

  const rootFolders = DocumentsDB.folders.filter((f) => f.parent === "root");

  container.innerHTML = rootFolders
    .map((folder) => renderFolderNode(folder))
    .join("");

  // Expand current folder path
  expandFolderPath(DocumentsDB.currentFolder);
}

function renderFolderNode(folder, level = 0) {
  const children = DocumentsDB.folders.filter((f) => f.parent === folder.id);
  const docCount = DocumentsDB.documents.filter(
    (d) => d.folderId === folder.id,
  ).length;
  const isActive = DocumentsDB.currentFolder === folder.id;
  const hasChildren = children.length > 0;

  return `
        <div class="folder-tree-item" data-folder-id="${folder.id}">
            <div class="folder-tree-header ${isActive ? "active" : ""}" onclick="selectFolder('${folder.id}')">
                <div class="toggle-icon" onclick="toggleFolder(event, '${folder.id}')">
                    ${hasChildren ? '<i class="fas fa-chevron-right"></i>' : '<span style="width:18px"></span>'}
                </div>
                <div class="folder-icon"><i class="fas ${folder.icon || "fa-folder"}"></i></div>
                <div class="folder-name">${folder.name.replace(/^[📁📄📐⚠️👥📊📜]+/, "").trim()}</div>
                <div class="folder-count">${docCount}</div>
            </div>
            <div class="folder-children" id="children-${folder.id}">
                ${children.map((child) => renderFolderNode(child, level + 1)).join("")}
            </div>
        </div>
    `;
}

function toggleFolder(event, folderId) {
  event.stopPropagation();
  const childrenDiv = document.getElementById(`children-${folderId}`);
  const icon = event.currentTarget.querySelector("i");
  if (childrenDiv) {
    childrenDiv.classList.toggle("open");
    if (icon) icon.classList.toggle("fa-chevron-right");
    if (icon) icon.classList.toggle("fa-chevron-down");
  }
}

function expandFolderPath(folderId) {
  let current = DocumentsDB.folders.find((f) => f.id === folderId);
  while (current && current.parent !== "root") {
    const childrenDiv = document.getElementById(`children-${current.parent}`);
    if (childrenDiv && !childrenDiv.classList.contains("open")) {
      childrenDiv.classList.add("open");
      const parentHeader = document.querySelector(
        `.folder-tree-item[data-folder-id="${current.parent}"] .toggle-icon i`,
      );
      if (parentHeader) {
        parentHeader.classList.remove("fa-chevron-right");
        parentHeader.classList.add("fa-chevron-down");
      }
    }
    current = DocumentsDB.folders.find((f) => f.id === current.parent);
  }
}

function selectFolder(folderId) {
  DocumentsDB.currentFolder = folderId;
  DocumentsDB.searchActive = false;
  renderFolderTree();
  renderCurrentFolder();

  // Update breadcrumb
  updateBreadcrumb(folderId);
}

function updateBreadcrumb(folderId) {
  const container = document.getElementById("currentFolderPath");
  if (!container) return;

  const path = [];
  let current = DocumentsDB.folders.find((f) => f.id === folderId);
  while (current && current.id !== "root") {
    path.unshift(current.name.replace(/^[📁📄📐⚠️👥📊📜]+/, "").trim());
    current = DocumentsDB.folders.find((f) => f.id === current.parent);
  }

  container.innerHTML = path.length ? ` / ${path.join(" / ")}` : "";
}

function renderCurrentFolder() {
  const container = document.getElementById("docItemsContainer");
  if (!container) return;

  let docs = [];

  if (DocumentsDB.searchActive && DocumentsDB.searchTerm) {
    docs = DocumentsDB.documents.filter(
      (d) =>
        d.name.toLowerCase().includes(DocumentsDB.searchTerm.toLowerCase()) ||
        (d.description &&
          d.description
            .toLowerCase()
            .includes(DocumentsDB.searchTerm.toLowerCase())) ||
        (d.tags &&
          d.tags.toLowerCase().includes(DocumentsDB.searchTerm.toLowerCase())),
    );
  } else {
    docs = DocumentsDB.documents.filter(
      (d) => d.folderId === DocumentsDB.currentFolder,
    );
  }

  if (docs.length === 0) {
    container.innerHTML = `
            <div class="doc-empty-state">
                <i class="fas fa-folder-open"></i>
                <p>This folder is empty</p>
                <button class="btn btn-primary btn-sm" onclick="document.getElementById('docUploadBtn').click()">Upload Documents</button>
            </div>
        `;
    return;
  }

  if (DocumentsDB.viewMode === "grid") {
    container.innerHTML = `<div class="doc-grid">${docs.map((doc) => renderDocumentCard(doc)).join("")}</div>`;
  } else {
    container.innerHTML = `<div class="doc-list">${docs.map((doc) => renderDocumentListItem(doc)).join("")}</div>`;
  }
}

function renderDocumentCard(doc) {
  const iconMap = {
    pdf: "fa-file-pdf",
    doc: "fa-file-word",
    xls: "fa-file-excel",
    ppt: "fa-file-powerpoint",
    img: "fa-file-image",
    dwg: "fa-drafting-compass",
    txt: "fa-file-alt",
    other: "fa-file",
  };
  const colorMap = {
    pdf: "pdf",
    doc: "doc",
    xls: "xls",
    img: "img",
    other: "other",
  };

  return `
        <div class="doc-card" onclick="previewDocument('${doc.id}')">
            <div class="doc-icon ${colorMap[doc.type] || "other"}"><i class="fas ${iconMap[doc.type] || "fa-file"}"></i></div>
            <div class="doc-name" title="${doc.name}">${doc.name.length > 25 ? doc.name.substring(0, 22) + "..." : doc.name}</div>
            <div class="doc-meta">${doc.size} · ${doc.uploadDate}</div>
        </div>
    `;
}

function renderDocumentListItem(doc) {
  const iconMap = {
    pdf: "fa-file-pdf",
    doc: "fa-file-word",
    xls: "fa-file-excel",
    ppt: "fa-file-powerpoint",
    img: "fa-file-image",
    dwg: "fa-drafting-compass",
    txt: "fa-file-alt",
    other: "fa-file",
  };

  return `
        <div class="doc-list-item" onclick="previewDocument('${doc.id}')">
            <div class="doc-list-icon"><i class="fas ${iconMap[doc.type] || "fa-file"}"></i></div>
            <div class="doc-list-info">
                <div class="doc-list-name">${doc.name}</div>
                <div class="doc-list-meta">${doc.size} · Uploaded by ${doc.uploadedBy} on ${doc.uploadDate} · ${doc.downloads} downloads</div>
                ${doc.description ? `<div class="doc-list-meta">📝 ${doc.description.substring(0, 60)}${doc.description.length > 60 ? "..." : ""}</div>` : ""}
            </div>
            <div class="doc-list-actions">
                <button class="btn-icon-view" onclick="event.stopPropagation(); editDocument('${doc.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon-wo" onclick="event.stopPropagation(); downloadDocument('${doc.id}')"><i class="fas fa-download"></i></button>
            </div>
        </div>
    `;
}

function renderRecentUploads() {
  const container = document.getElementById("recentUploads");
  if (!container) return;

  const recent = [...DocumentsDB.documents]
    .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate))
    .slice(0, 6);

  container.innerHTML = recent
    .map(
      (doc) => `
        <div class="recent-item" onclick="previewDocument('${doc.id}')">
            <div class="doc-icon" style="font-size: 32px;"><i class="fas ${getFileIcon(doc.type)}"></i></div>
            <div class="doc-name" style="font-size: 11px;">${doc.name.length > 20 ? doc.name.substring(0, 17) + "..." : doc.name}</div>
            <div class="doc-meta">${doc.uploadDate}</div>
        </div>
    `,
    )
    .join("");
}

function getFileIcon(type) {
  const icons = {
    pdf: "fa-file-pdf",
    doc: "fa-file-word",
    xls: "fa-file-excel",
    ppt: "fa-file-powerpoint",
    img: "fa-file-image",
    dwg: "fa-drafting-compass",
    txt: "fa-file-alt",
  };
  return icons[type] || "fa-file";
}

function updateDocStats() {
  document.getElementById("totalDocs") &&
    (document.getElementById("totalDocs").innerText =
      DocumentsDB.documents.length);
  document.getElementById("totalDownloads") &&
    (document.getElementById("totalDownloads").innerText =
      DocumentsDB.totalDownloads);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentCount = DocumentsDB.documents.filter(
    (d) => new Date(d.uploadDate) >= sevenDaysAgo,
  ).length;
  document.getElementById("recentCount") &&
    (document.getElementById("recentCount").innerText = recentCount);
}

function previewDocument(docId) {
  const doc = DocumentsDB.documents.find((d) => d.id === docId);
  if (!doc) return;

  const modal = document.getElementById("previewModal");
  const title = document.getElementById("previewTitle");
  const body = document.getElementById("previewBody");

  title.innerText = doc.name;

  if (doc.type === "pdf" && doc.content) {
    body.innerHTML = `<iframe src="${doc.content}" class="preview-iframe"></iframe>`;
  } else if (doc.type === "img" && doc.content) {
    body.innerHTML = `<img src="${doc.content}" class="preview-image">`;
  } else {
    body.innerHTML = `
            <div style="text-align:center; padding:40px;">
                <i class="fas ${getFileIcon(doc.type)}" style="font-size: 80px; color: var(--accent-blue);"></i>
                <h4>${doc.name}</h4>
                <p>Size: ${doc.size}<br>Uploaded: ${doc.uploadDate}<br>Downloads: ${doc.downloads}</p>
                ${doc.description ? `<p><strong>Description:</strong> ${doc.description}</p>` : ""}
                ${doc.tags ? `<p><strong>Tags:</strong> ${doc.tags}</p>` : ""}
                <button class="btn btn-primary" onclick="downloadDocument('${doc.id}')"><i class="fas fa-download"></i> Download</button>
            </div>
        `;
  }

  const downloadBtn = document.getElementById("downloadDocBtn");
  const deleteBtn = document.getElementById("deleteDocBtn");

  downloadBtn.onclick = () => downloadDocument(docId);
  deleteBtn.onclick = () => deleteDocument(docId);

  modal.style.display = "flex";
}

function downloadDocument(docId) {
  const doc = DocumentsDB.documents.find((d) => d.id === docId);
  if (doc) {
    doc.downloads++;
    DocumentsDB.totalDownloads++;
    saveDocumentsToLocal();
    updateDocStats();

    if (doc.content) {
      const link = document.createElement("a");
      link.href = doc.content;
      link.download = doc.name;
      link.click();
    } else {
      // Simulate download for demo files
      const blob = new Blob(["Demo content - " + doc.name], {
        type: "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      a.click();
      URL.revokeObjectURL(url);
    }

    showDocStatus(`✓ Downloaded: ${doc.name}`, "success");
  }
}

function deleteDocument(docId) {
  if (confirm("Are you sure you want to delete this document?")) {
    const index = DocumentsDB.documents.findIndex((d) => d.id === docId);
    if (index !== -1) {
      DocumentsDB.documents.splice(index, 1);
      saveDocumentsToLocal();
      renderCurrentFolder();
      updateDocStats();
      renderRecentUploads();
      renderFolderTree();
      closePreviewModal();
      showDocStatus("✓ Document deleted", "success");
    }
  }
}

function editDocument(docId) {
  const doc = DocumentsDB.documents.find((d) => d.id === docId);
  if (!doc) return;

  document.getElementById("editDescription").value = doc.description || "";
  document.getElementById("editTags").value = doc.tags || "";

  const folderSelect = document.getElementById("editFolder");
  folderSelect.innerHTML = DocumentsDB.folders
    .map(
      (f) =>
        `<option value="${f.id}" ${f.id === doc.folderId ? "selected" : ""}>${f.name}</option>`,
    )
    .join("");

  window.editingDocId = docId;
  document.getElementById("editModal").style.display = "flex";
}

function saveDocumentEdit() {
  const docId = window.editingDocId;
  const doc = DocumentsDB.documents.find((d) => d.id === docId);
  if (doc) {
    doc.description = document.getElementById("editDescription").value;
    doc.tags = document.getElementById("editTags").value;
    doc.folderId = document.getElementById("editFolder").value;

    saveDocumentsToLocal();
    renderCurrentFolder();
    renderFolderTree();
    closeEditModal();
    showDocStatus("✓ Document updated", "success");
  }
}

function saveDocumentsToLocal() {
  localStorage.setItem("doc_documents", JSON.stringify(DocumentsDB.documents));
  localStorage.setItem("doc_folders", JSON.stringify(DocumentsDB.folders));
  localStorage.setItem("doc_total_downloads", DocumentsDB.totalDownloads);
}

function toggleSearchBar() {
  const searchBar = document.getElementById("docSearchBar");
  if (searchBar) {
    searchBar.style.display =
      searchBar.style.display === "none" ? "flex" : "none";
    if (searchBar.style.display === "flex") {
      document.getElementById("docSearchInput").focus();
    } else {
      clearDocSearch();
    }
  }
}

function performDocSearch() {
  const searchTerm = document.getElementById("docSearchInput").value.trim();
  if (searchTerm) {
    DocumentsDB.searchActive = true;
    DocumentsDB.searchTerm = searchTerm;
    renderCurrentFolder();
  }
}

function clearDocSearch() {
  document.getElementById("docSearchInput").value = "";
  DocumentsDB.searchActive = false;
  DocumentsDB.searchTerm = "";
  renderCurrentFolder();
  document.getElementById("docSearchBar").style.display = "none";
}

function setViewMode(mode) {
  DocumentsDB.viewMode = mode;
  document
    .querySelectorAll(".view-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelector(`.view-btn[data-view="${mode}"]`)
    .classList.add("active");
  renderCurrentFolder();
}

function showNewFolderModal() {
  const parentSelect = document.getElementById("parentFolder");
  parentSelect.innerHTML =
    '<option value="root">Root</option>' +
    DocumentsDB.folders
      .filter((f) => f.parent !== null)
      .map((f) => `<option value="${f.id}">${f.name}</option>`)
      .join("");
  document.getElementById("folderModal").style.display = "flex";
}

function createNewFolder() {
  const folderName = document.getElementById("newFolderName").value.trim();
  const parentId = document.getElementById("parentFolder").value;

  if (!folderName) {
    showDocStatus("Please enter a folder name", "error");
    return;
  }

  const newId = `folder_${Date.now()}`;
  DocumentsDB.folders.push({
    id: newId,
    name: folderName,
    parent: parentId === "root" ? "root" : parentId,
    icon: "fa-folder",
  });

  localStorage.setItem("doc_folders", JSON.stringify(DocumentsDB.folders));
  renderFolderTree();
  closeFolderModal();
  showDocStatus("✓ Folder created", "success");
}

function refreshDocuments() {
  renderFolderTree();
  renderCurrentFolder();
  updateDocStats();
  renderRecentUploads();
  showDocStatus("✓ Refreshed", "info");
}

function viewAllRecent() {
  DocumentsDB.searchActive = true;
  DocumentsDB.searchTerm = "";
  DocumentsDB.currentFolder = "root";
  renderCurrentFolder();
}

function toggleAllFolders() {
  const allChildren = document.querySelectorAll(".folder-children");
  const allIcons = document.querySelectorAll(
    ".folder-tree-header .toggle-icon i",
  );
  const isAnyOpen = Array.from(allChildren).some((c) =>
    c.classList.contains("open"),
  );

  allChildren.forEach((child) => {
    if (isAnyOpen) child.classList.remove("open");
    else child.classList.add("open");
  });

  allIcons.forEach((icon) => {
    if (isAnyOpen) {
      icon.classList.remove("fa-chevron-down");
      icon.classList.add("fa-chevron-right");
    } else {
      icon.classList.remove("fa-chevron-right");
      icon.classList.add("fa-chevron-down");
    }
  });
}

function closeUploadModal() {
  document.getElementById("uploadModal").style.display = "none";
  window.pendingUploads = null;
}
function closeFolderModal() {
  document.getElementById("folderModal").style.display = "none";
}
function closePreviewModal() {
  document.getElementById("previewModal").style.display = "none";
}
function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
}

function showDocStatus(message, type) {
  let statusDiv = document.getElementById("docStatusMsg");
  if (!statusDiv) {
    statusDiv = document.createElement("div");
    statusDiv.id = "docStatusMsg";
    statusDiv.style.cssText =
      "position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:10px;z-index:2001;animation:fadeInUp 0.3s ease";
    document.body.appendChild(statusDiv);
  }
  const colors = {
    success: "#2ecc71",
    error: "#e74c3c",
    info: "#3d8ef7",
    warning: "#f5a623",
  };
  statusDiv.style.backgroundColor = colors[type] || colors.info;
  statusDiv.style.color = "white";
  statusDiv.innerHTML = message;
  statusDiv.style.display = "block";
  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 3000);
}

// Initialize documents when page loads
document.addEventListener("DOMContentLoaded", () => {
  const observer = new MutationObserver(() => {
    const docsPage = document.getElementById("page-documents");
    if (docsPage && docsPage.classList.contains("active")) {
      initDocuments();
      observer.disconnect();
    }
  });
  observer.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ["class"],
  });

  if (document.getElementById("page-documents")?.classList.contains("active")) {
    initDocuments();
  }
});

// Expose global functions
window.selectFolder = selectFolder;
window.toggleFolder = toggleFolder;
window.toggleAllFolders = toggleAllFolders;
window.previewDocument = previewDocument;
window.downloadDocument = downloadDocument;
window.deleteDocument = deleteDocument;
window.editDocument = editDocument;
window.saveDocumentEdit = saveDocumentEdit;
window.setViewMode = setViewMode;
window.showNewFolderModal = showNewFolderModal;
window.createNewFolder = createNewFolder;
window.refreshDocuments = refreshDocuments;
window.viewAllRecent = viewAllRecent;
window.performDocSearch = performDocSearch;
window.clearDocSearch = clearDocSearch;
window.closeUploadModal = closeUploadModal;
window.closeFolderModal = closeFolderModal;
window.closePreviewModal = closePreviewModal;
window.closeEditModal = closeEditModal;
window.toggleSearchBar = toggleSearchBar;
window.uploadDocuments = uploadDocuments;

// ============================================
// MOBILE RESPONSIVENESS & TOUCH HANDLERS
// ============================================

// Mobile sidebar toggle
function initMobileSidebar() {
  const sidebar = document.getElementById("sidebar");

  // Create overlay if not exists
  if (!document.querySelector(".sidebar-overlay")) {
    const overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
  }

  const overlay = document.querySelector(".sidebar-overlay");

  // Check if we're on mobile
  function isMobile() {
    return window.innerWidth <= 768;
  }

  // Close sidebar function
  function closeMobileSidebar() {
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("active");
    document.body.style.overflow = "";
    document.body.classList.remove("sidebar-open");
  }

  // Toggle sidebar function
  window.toggleMobileSidebar = function () {
    if (!isMobile()) return;

    if (sidebar.classList.contains("open")) {
      closeMobileSidebar();
    } else {
      sidebar.classList.add("open");
      overlay.classList.add("active");
      document.body.style.overflow = "hidden";
      document.body.classList.add("sidebar-open");
    }
  };

  // Set overlay click handler
  if (overlay) {
    overlay.onclick = closeMobileSidebar;
  }

  // Update topbar toggle button
  const topbarToggle = document.querySelector(".topbar-toggle");
  if (topbarToggle) {
    // Remove existing click handlers
    const newToggle = topbarToggle.cloneNode(true);
    topbarToggle.parentNode.replaceChild(newToggle, topbarToggle);
    newToggle.onclick = (e) => {
      e.stopPropagation();
      window.toggleMobileSidebar();
    };
  }

  // Close sidebar on window resize if not mobile
  window.addEventListener("resize", () => {
    if (!isMobile() && sidebar && sidebar.classList.contains("open")) {
      closeMobileSidebar();
    }
  });

  // Close sidebar when clicking on nav item (on mobile)
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      if (isMobile()) {
        setTimeout(closeMobileSidebar, 100);
      }
    });
  });

  // Close sidebar on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar && sidebar.classList.contains("open")) {
      closeMobileSidebar();
    }
  });
}

// Touch-friendly scroll handling for tables
function initTouchTables() {
  const scrollableTables = document.querySelectorAll(
    ".data-table-wrap, .table-wrapper, .faults-table-wrapper, .gen-table-wrapper, .doc-table-wrapper",
  );

  scrollableTables.forEach((table) => {
    let startX, scrollLeft;
    let isDragging = false;

    table.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      scrollLeft = table.scrollLeft;
      isDragging = true;
    });

    table.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - startX;
      table.scrollLeft = scrollLeft - dx;
    });

    table.addEventListener("touchend", () => {
      isDragging = false;
    });
  });
}

// Prevent zoom on form inputs (iOS)
function preventInputZoom() {
  const inputs = document.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    input.addEventListener("focus", () => {
      if (window.innerWidth <= 768) {
        // Temporary fix for iOS zoom - set font size to 16px
        const originalFontSize = window.getComputedStyle(input).fontSize;
        if (parseInt(originalFontSize) < 16) {
          input.style.fontSize = "16px";
          // Restore after blur
          input.addEventListener(
            "blur",
            () => {
              input.style.fontSize = "";
            },
            { once: true },
          );
        }
      }
    });
  });
}

// Improve modal scrolling on mobile
function initMobileModals() {
  const modals = document.querySelectorAll(
    ".fault-modal, .doc-modal, .equip-modal, .report-modal",
  );

  modals.forEach((modal) => {
    const modalBody = modal.querySelector(
      ".fault-modal-body, .doc-modal-body, .equip-modal-body, .report-modal-body",
    );
    if (modalBody) {
      modalBody.addEventListener("touchstart", (e) => {
        // Allow natural scrolling within modal
        e.stopPropagation();
      });
    }
  });
}

// Fix chart sizing on mobile
function fixMobileCharts() {
  if (window.innerWidth <= 768) {
    const charts = document.querySelectorAll("canvas");
    charts.forEach((canvas) => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.maxHeight = "220px";
      }
    });
  }
}

// Handle orientation change
function handleOrientationChange() {
  setTimeout(() => {
    // Refresh charts when orientation changes
    if (typeof refreshAllCharts === "function") {
      refreshAllCharts();
    }
    fixMobileCharts();
  }, 200);
}

// Refresh all charts (call this after orientation change)
window.refreshAllCharts = function () {
  // Re-trigger chart redraws if needed
  Object.keys(chartInstances).forEach((key) => {
    if (
      chartInstances[key] &&
      typeof chartInstances[key].resize === "function"
    ) {
      chartInstances[key].resize();
    }
  });
};

// Fix iOS 100vh issue
function fixIOSVH() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);

  // Set min-height for sidebar and modals
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.style.minHeight = `calc(var(--vh, 1vh) * 100)`;
  }
}

// Initialize all mobile features
function initMobileFeatures() {
  initMobileSidebar();
  initTouchTables();
  preventInputZoom();
  initMobileModals();
  fixMobileCharts();
  fixIOSVH();
}

// Run when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initMobileFeatures();
});

// Run on resize and orientation change
window.addEventListener("resize", () => {
  setTimeout(() => {
    initTouchTables();
    fixMobileCharts();
    fixIOSVH();
  }, 100);
});

window.addEventListener("orientationchange", handleOrientationChange);

// Expose mobile functions globally
window.closeMobileSidebar = () => {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.querySelector(".sidebar-overlay");
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("active");
  document.body.style.overflow = "";
  document.body.classList.remove("sidebar-open");
};

window.openMobileSidebar = () => {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.querySelector(".sidebar-overlay");
  if (sidebar && !sidebar.classList.contains("open")) {
    sidebar.classList.add("open");
    if (overlay) overlay.classList.add("active");
    document.body.style.overflow = "hidden";
    document.body.classList.add("sidebar-open");
  }
};

// Fix for modals on mobile - prevent body scroll when modal is open
function fixModalScroll() {
  const modals = document.querySelectorAll(
    ".fault-modal, .doc-modal, .equip-modal, .report-modal",
  );

  modals.forEach((modal) => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "style") {
          if (modal.style.display === "flex") {
            document.body.style.overflow = "hidden";
          } else {
            document.body.style.overflow = "";
          }
        }
      });
    });

    observer.observe(modal, { attributes: true });
  });
}

// Call fixModalScroll after DOM ready
setTimeout(fixModalScroll, 500);

// ============================================
// GOOGLE SHEETS SYNC - COMPLETE WORKING VERSION
// ============================================

const GOOGLE_SHEETS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRKFYsRafOZDNjLxoFYYGrQAaJ0gwEJ80nHxqJi9ZT66VcZlpi3oFz2BZx3jGbI1B_C6K6rH3iHxErZ/pub?output=csv";

async function syncWithGoogleSheets() {
  console.log("Starting Google Sheets sync...");
  showGenStatus("🔄 Syncing with Google Sheets...", "info");

  try {
    const response = await fetch(GOOGLE_SHEETS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const csvText = await response.text();
    const rows = parseCSVToRows(csvText);
    console.log("Total rows:", rows.length);

    if (rows.length < 2) {
      throw new Error("No data rows found");
    }

    // Parse data and create proper GenDB format
    const days = createGenDaysFromData(rows);
    console.log("Created days:", days.length);

    if (days.length > 0) {
      // Clear and set new data
      GenDB.allDays = days;
      GenDB.filteredDays = days;

      // Save to localStorage
      localStorage.setItem("gen_days", JSON.stringify(GenDB.allDays));

      // Force refresh the dashboard
      if (typeof onGenDataLoaded === "function") {
        onGenDataLoaded();
      }

      // Also directly update the DOM
      updateDashboardDirectly(days);

      showGenStatus(
        `✓ Synced ${days.length} day(s) with ${days[0]?.computed?.totalEnergy || 0} MWh!`,
        "success",
      );
    } else {
      showGenStatus(
        "⚠️ Could not parse data. Check console for details.",
        "warning",
      );
      // Create sample data to show dashboard works
      createSampleData();
    }
  } catch (error) {
    console.error("Sync error:", error);
    showGenStatus(`✗ Sync failed: ${error.message}`, "error");
    createSampleData();
  }
}

function parseCSVToRows(csvText) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if (char === "\n" && !inQuotes) {
      currentRow.push(currentField.trim());
      if (
        currentRow.length > 0 &&
        currentRow.some((cell) => cell && cell.length > 0)
      ) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (
      currentRow.length > 0 &&
      currentRow.some((cell) => cell && cell.length > 0)
    ) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function createGenDaysFromData(rows) {
  const days = [];

  // Find all rows with MW values
  const mwReadings = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;

    // Look for MW values in various positions
    for (let j = 0; j < Math.min(row.length, 35); j++) {
      const cell = row[j];
      if (cell && typeof cell === "string") {
        const num = parseFloat(cell);
        // MW values in your data are typically between 2-15
        if (!isNaN(num) && num > 2 && num < 50) {
          // Also check if there's a corresponding MWH value nearby
          let mwh = 0;
          if (j + 4 < row.length) {
            const mwhCell = parseFloat(row[j + 4]);
            if (!isNaN(mwhCell) && mwhCell > 1000) {
              mwh = mwhCell;
            }
          }
          mwReadings.push({ mw: num, mwh: mwh, rowIndex: i, colIndex: j });
          break; // Found one MW per row
        }
      }
    }
  }

  console.log("Found MW readings:", mwReadings.length);

  if (mwReadings.length === 0) {
    return [];
  }

  // Calculate statistics
  let totalMW = 0;
  let maxMW = 0;
  let totalMWH = 0;

  mwReadings.forEach((r) => {
    totalMW += r.mw;
    maxMW = Math.max(maxMW, r.mw);
    totalMWH += r.mwh;
  });

  const avgMW = totalMW / mwReadings.length;
  const opHours = Math.min(mwReadings.length, 24); // Max 24 hours
  const totalEnergy = totalMWH > 0 ? totalMWH : avgMW * opHours;

  // Create hourly data
  const hours = [];
  for (let hour = 0; hour < 24; hour++) {
    let mwValue = 0;
    if (hour < mwReadings.length) {
      mwValue = mwReadings[hour].mw;
    } else if (hour >= 6 && hour < 6 + opHours) {
      // Fill remaining hours with average
      mwValue = avgMW;
    }

    hours.push({
      hour: hour,
      hourStr: `${hour}:00`,
      u1Shutdown: mwValue === 0,
      u2Shutdown: true,
      u1: {
        mw: Math.round(mwValue * 100) / 100,
        pf: 0.98,
        hz: 50.0,
      },
      u2: { mw: 0, pf: 0.95, hz: 50.0 },
      grid: { mw: null },
      remarks: "",
    });
  }

  // Use today's date in BS format
  const today = new Date();
  const bsDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;

  const computed = {
    u1Energy: Math.round((totalEnergy / 2) * 10) / 10,
    u2Energy: Math.round((totalEnergy / 2) * 10) / 10,
    totalEnergy: Math.round(totalEnergy * 10) / 10,
    u1AvgMW: Math.round(avgMW * 100) / 100,
    u2AvgMW: Math.round(avgMW * 100) / 100,
    maxMW: Math.round(maxMW * 100) / 100,
    opHours: opHours,
    shutdownHrs: 24 - opHours,
    avgPF: 0.98,
    avgHz: 50.0,
  };

  console.log("Generated day:", { bsDate, computed });

  return [
    {
      bsDate: bsDate,
      hours: hours,
      computed: computed,
    },
  ];
}

function updateDashboardDirectly(days) {
  if (!days || days.length === 0) return;

  const day = days[0];
  const c = day.computed;

  // Update quick stats
  const qsDays = document.getElementById("qsDays");
  const qsHours = document.getElementById("qsHours");
  const qsShutdown = document.getElementById("qsShutdown");
  const qsPF = document.getElementById("qsPF");

  if (qsDays) qsDays.innerHTML = days.length;
  if (qsHours) qsHours.innerHTML = c.opHours;
  if (qsShutdown) qsShutdown.innerHTML = c.shutdownHrs;
  if (qsPF) qsPF.innerHTML = c.avgPF.toFixed(3);

  // Update titles
  const genDashTitle = document.getElementById("genDashTitle");
  const genDashSubtitle = document.getElementById("genDashSubtitle");

  if (genDashTitle)
    genDashTitle.innerHTML = `Generation Summary - ${day.bsDate}`;
  if (genDashSubtitle)
    genDashSubtitle.innerHTML = `${day.bsDate} · Set Nadi Hydroelectric Project`;

  // Update KPI row
  const kpiRow = document.getElementById("genKpiRow");
  if (kpiRow) {
    kpiRow.innerHTML = `
            <div class="gen-kpi-card cyan">
                <div class="gen-kpi-label"><i class="fas fa-bolt"></i> TOTAL GENERATION</div>
                <div class="gen-kpi-value">${c.totalEnergy.toFixed(1)}<span class="gen-kpi-unit">MWh</span></div>
                <div class="gen-kpi-sub">U1: ${c.u1Energy.toFixed(1)} + U2: ${c.u2Energy.toFixed(1)} MWh</div>
            </div>
            <div class="gen-kpi-card blue">
                <div class="gen-kpi-label"><i class="fas fa-charging-station"></i> AVG POWER</div>
                <div class="gen-kpi-value">${c.u1AvgMW.toFixed(1)}<span class="gen-kpi-unit">MW</span></div>
                <div class="gen-kpi-sub">Peak: ${c.maxMW.toFixed(1)} MW</div>
            </div>
            <div class="gen-kpi-card green">
                <div class="gen-kpi-label"><i class="fas fa-clock"></i> OPERATION</div>
                <div class="gen-kpi-value">${c.opHours}<span class="gen-kpi-unit">hrs</span></div>
                <div class="gen-kpi-sub">Shutdown: ${c.shutdownHrs} hrs</div>
            </div>
            <div class="gen-kpi-card amber">
                <div class="gen-kpi-label"><i class="fas fa-chart-line"></i> POWER FACTOR</div>
                <div class="gen-kpi-value">${(c.avgPF * 100).toFixed(0)}<span class="gen-kpi-unit">%</span></div>
                <div class="gen-kpi-sub">Frequency: ${c.avgHz.toFixed(2)} Hz</div>
            </div>
        `;
  }

  // Update charts if they exist
  if (typeof renderGenTrendChart === "function") {
    renderGenTrendChart(days, "mwh");
  }
  if (typeof renderUnitCompChart === "function") {
    renderUnitCompChart(days);
  }
  if (typeof renderGenDailyTable === "function") {
    renderGenDailyTable(days);
  }

  // Show content, hide empty state
  const emptyState = document.getElementById("genEmptyState");
  const content = document.getElementById("genDashboardContent");
  const leftPanel = document.getElementById("genLeftPanel");
  const filesCard = document.getElementById("genFilesCard");

  if (emptyState) emptyState.style.display = "none";
  if (content) content.style.display = "block";
  if (leftPanel) leftPanel.style.display = "block";
  if (filesCard) filesCard.style.display = "block";
}

function createSampleData() {
  console.log("Creating sample data for testing...");

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

  if (typeof onGenDataLoaded === "function") {
    onGenDataLoaded();
  } else {
    updateDashboardDirectly(GenDB.allDays);
  }

  showGenStatus(
    "📊 Sample data loaded (Google Sheets sync will override this)",
    "info",
  );
}

// Helper function to see raw data
async function debugSheetData() {
  const response = await fetch(GOOGLE_SHEETS_URL);
  const text = await response.text();
  const rows = parseCSVToRows(text);

  console.log("=== DEBUG: First 10 rows with MW values ===");
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    if (row) {
      // Look for MW values
      for (let j = 0; j < Math.min(row.length, 35); j++) {
        const val = parseFloat(row[j]);
        if (!isNaN(val) && val > 2 && val < 50) {
          console.log(`Row ${i}, Col ${j}: MW = ${val}`);
          if (row[j + 4]) console.log(`  MWH nearby: ${row[j + 4]}`);
        }
      }
    }
  }

  return rows;
}

// Expose functions globally
window.syncWithGoogleSheets = syncWithGoogleSheets;
window.debugSheetData = debugSheetData;
window.createSampleData = createSampleData;

// Auto-run debug on page load
setTimeout(() => {
  if (GenDB.allDays.length === 0) {
    console.log("No data found, checking Google Sheets...");
    syncWithGoogleSheets();
  }
}, 1000);

// ============================================
// OPERATIONS MODULE (Offline)
// ============================================

let OpsDB = {
  shiftLogs: [],
  incidents: [],
  handovers: [],
  historicalData: null,
};

// Initialize Operations
function initOperations() {
  loadShiftLogs();
  loadIncidents();
  loadHandovers();
  updateCurrentShiftDisplay();
}

// Switch tabs
function switchOpsTab(tabId) {
  document
    .querySelectorAll(".ops-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".ops-tab-content")
    .forEach((c) => c.classList.remove("active"));
  event.target.classList.add("active");
  document.getElementById(`ops-${tabId}`).classList.add("active");
}

// Shift Log functions
function openShiftLogModal() {
  document.getElementById("shiftLogModal").style.display = "flex";
  document.getElementById("log-time").value = new Date().toLocaleTimeString(
    "en-GB",
    { hour: "2-digit", minute: "2-digit" },
  );
}

function closeShiftLogModal() {
  document.getElementById("shiftLogModal").style.display = "none";
}

function saveShiftLog() {
  const entry = {
    id: Date.now(),
    time: document.getElementById("log-time").value,
    type: document.getElementById("log-type").value,
    description: document.getElementById("log-description").value,
    equipment: document.getElementById("log-equipment").value,
    operator: document.querySelector(".user-name")?.textContent || "Operator",
    timestamp: new Date().toISOString(),
  };

  OpsDB.shiftLogs.unshift(entry);
  localStorage.setItem("ops_shift_logs", JSON.stringify(OpsDB.shiftLogs));
  renderShiftLogs();
  closeShiftLogModal();
  document.getElementById("shiftLogForm").reset();
  showOpsStatus("Shift log entry saved!", "success");
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
            <div class="shift-time">${log.time}</div>
            <div class="shift-badge shift-${log.type}">${log.type.toUpperCase()}</div>
            <div class="shift-desc">${log.description}</div>
            <div class="shift-operator">${log.operator}</div>
        </div>
    `,
    )
    .join("");
}

function loadShiftLogs() {
  const saved = localStorage.getItem("ops_shift_logs");
  OpsDB.shiftLogs = saved ? JSON.parse(saved) : [];
  renderShiftLogs();
}

// Historical Data Upload
document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("ops-upload-btn");
  const fileInput = document.getElementById("ops-file-input");

  if (uploadBtn && fileInput) {
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = handleOpsFileUpload;
  }
});

async function handleOpsFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Use SheetJS to parse
  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      parseHistoricalData(rows);
      showOpsStatus(
        `✓ Loaded ${OpsDB.historicalData?.days?.length || 0} days of data`,
        "success",
      );
    } catch (err) {
      showOpsStatus("Error parsing file", "error");
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = "";
}

function parseHistoricalData(rows) {
  // Find time column and group by date
  const days = [];
  let currentDay = null;

  for (let i = 1; i < rows.length; i++) {
    const timeVal = rows[i][0];
    if (timeVal && timeVal.toString().match(/^\d{1,2}/)) {
      const hour = parseInt(timeVal.toString().split(":")[0]);

      if (hour === 1 && currentDay && currentDay.hours.length > 0) {
        days.push(currentDay);
        currentDay = { date: `Day ${days.length + 1}`, hours: [] };
      } else if (!currentDay) {
        currentDay = { date: `Day ${days.length + 1}`, hours: [] };
      }

      currentDay.hours.push({
        hour: hour,
        u1MW: parseFloat(rows[i][7]) || 0,
        u2MW: parseFloat(rows[i][18]) || 0,
        pf: parseFloat(rows[i][9]) || 0,
      });
    }
  }
  if (currentDay && currentDay.hours.length > 0) days.push(currentDay);

  OpsDB.historicalData = { days, totalDays: days.length };
  localStorage.setItem("ops_historical", JSON.stringify(OpsDB.historicalData));
  displayHistoricalSummary();
  populateDateSelector();
}

function displayHistoricalSummary() {
  if (!OpsDB.historicalData) return;

  document.getElementById("ops-data-status").style.display = "none";
  document.getElementById("ops-data-summary").style.display = "block";

  const days = OpsDB.historicalData.days;
  let totalGen = 0,
    totalHours = 0,
    totalPf = 0,
    pfCount = 0;

  days.forEach((day) => {
    day.hours.forEach((h) => {
      totalGen += h.u1MW + h.u2MW;
      if (h.u1MW > 0 || h.u2MW > 0) totalHours++;
      if (h.pf > 0) {
        totalPf += h.pf;
        pfCount++;
      }
    });
  });

  document.getElementById("ops-date-range").textContent =
    `${days[0]?.date} - ${days[days.length - 1]?.date}`;
  document.getElementById("ops-total-gen").textContent =
    totalGen.toFixed(1) + " MWh";
  document.getElementById("ops-op-hours").textContent = totalHours;
  document.getElementById("ops-avg-pf").textContent = (
    totalPf / pfCount
  ).toFixed(3);
}

function populateDateSelector() {
  const select = document.getElementById("ops-date-select");
  if (!select || !OpsDB.historicalData) return;

  select.innerHTML = '<option value="">Select a date</option>';
  OpsDB.historicalData.days.forEach((day, idx) => {
    const option = document.createElement("option");
    option.value = idx;
    option.textContent = day.date;
    select.appendChild(option);
  });
}

function loadHistoricalDate() {
  const select = document.getElementById("ops-date-select");
  const idx = parseInt(select.value);
  if (isNaN(idx)) return;

  const day = OpsDB.historicalData.days[idx];
  const tbody = document.getElementById("historical-table-body");

  tbody.innerHTML = day.hours
    .map(
      (h) => `
        <tr>
            <td>${h.hour}:00</td>
            <td>${h.u1MW.toFixed(1)}</td>
            <td>${h.u2MW.toFixed(1)}</td>
            <td>${(h.u1MW + h.u2MW).toFixed(1)}</td>
            <td>${h.pf.toFixed(3)}</td>
            <td>${h.u1MW > 0 || h.u2MW > 0 ? "🟢 RUNNING" : "🔴 STOPPED"}</td>
        </tr>
    `,
    )
    .join("");
}

function showOpsStatus(msg, type) {
  let statusDiv = document.getElementById("opsStatusMsg");
  if (!statusDiv) {
    statusDiv = document.createElement("div");
    statusDiv.id = "opsStatusMsg";
    statusDiv.style.cssText =
      "position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:10px;z-index:2000";
    document.body.appendChild(statusDiv);
  }
  const colors = { success: "#2ecc71", error: "#e74c3c", info: "#3d8ef7" };
  statusDiv.style.backgroundColor = colors[type] || colors.info;
  statusDiv.innerHTML = msg;
  statusDiv.style.display = "block";
  setTimeout(() => (statusDiv.style.display = "none"), 3000);
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  const observer = new MutationObserver(() => {
    const opsPage = document.getElementById("page-operations");
    if (opsPage && opsPage.classList.contains("active")) {
      initOperations();
      observer.disconnect();
    }
  });
  observer.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ["class"],
  });

  if (
    document.getElementById("page-operations")?.classList.contains("active")
  ) {
    initOperations();
  }
});

// Expose functions
window.switchOpsTab = switchOpsTab;
window.openShiftLogModal = openShiftLogModal;
window.closeShiftLogModal = closeShiftLogModal;
window.saveShiftLog = saveShiftLog;
window.loadHistoricalDate = loadHistoricalDate;

// ============================================
// QUICK FAULT LOGGER - MOBILE PHOTO UPLOAD
// ============================================

let quickSelectedSeverity = "Medium";
let quickEditingId = null;
let quickPhotos = []; // Store base64 images

function initQuickFault() {
  // Load fault data
  const saved = localStorage.getItem("faults_items");
  if (saved) {
    FaultsDB.items = JSON.parse(saved);
  } else {
    FaultsDB.items = defaultFaults;
    localStorage.setItem("faults_items", JSON.stringify(FaultsDB.items));
  }
  FaultsDB.filteredItems = [...FaultsDB.items];

  updateFaultStats();
  renderQuickFaultTable();
  renderFaultCharts();

  // Attach quick modal events
  const quickBtn = document.getElementById("quickFaultBtn");
  if (quickBtn) quickBtn.onclick = openQuickModal;

  const closeBtn = document.getElementById("closeQuickModal");
  if (closeBtn) closeBtn.onclick = closeQuickModal;

  const cancelBtn = document.getElementById("cancelQuickModal");
  if (cancelBtn) cancelBtn.onclick = closeQuickModal;

  const submitBtn = document.getElementById("submitQuickFault");
  if (submitBtn) submitBtn.onclick = saveQuickFault;

  const expandBtn = document.getElementById("expandDetailsBtn");
  if (expandBtn) expandBtn.onclick = toggleExpandDetails;

  // MOBILE PHOTO HANDLERS
  const takePhotoBtn = document.getElementById("takePhotoBtn");
  const choosePhotoBtn = document.getElementById("choosePhotoBtn");
  const cameraInput = document.getElementById("cameraInput");
  const galleryInput = document.getElementById("galleryInput");
  const uploadArea = document.getElementById("photoUploadArea");

  // Take Photo - uses camera directly
  if (takePhotoBtn && cameraInput) {
    takePhotoBtn.onclick = () => {
      cameraInput.click();
    };
    cameraInput.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handlePhotoFiles(e.target.files);
      }
      cameraInput.value = ""; // Reset to allow taking another photo
    };
  }

  // Choose from Gallery
  if (choosePhotoBtn && galleryInput) {
    choosePhotoBtn.onclick = () => {
      galleryInput.click();
    };
    galleryInput.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handlePhotoFiles(e.target.files);
      }
      galleryInput.value = ""; // Reset
    };
  }

  // Desktop drag & drop (show only on desktop)
  if (uploadArea && window.innerWidth > 768) {
    uploadArea.style.display = "block";
    uploadArea.onclick = () => galleryInput.click();
    uploadArea.ondragover = (e) => {
      e.preventDefault();
      uploadArea.classList.add("drag-over");
    };
    uploadArea.ondragleave = () => {
      uploadArea.classList.remove("drag-over");
    };
    uploadArea.ondrop = (e) => {
      e.preventDefault();
      uploadArea.classList.remove("drag-over");
      handlePhotoFiles(e.dataTransfer.files);
    };
  }

  // Severity chips
  document.querySelectorAll(".severity-chip").forEach((chip) => {
    chip.onclick = () => {
      document
        .querySelectorAll(".severity-chip")
        .forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      quickSelectedSeverity = chip.getAttribute("data-sev");
    };
  });

  // Close modal on overlay click
  const modal = document.getElementById("quickFaultModal");
  if (modal)
    modal.onclick = (e) => {
      if (e.target === modal) closeQuickModal();
    };
}

function handlePhotoFiles(files) {
  const maxFiles = 5;
  const maxSize = 5 * 1024 * 1024; // 5MB

  const filesArray = Array.from(files);

  for (
    let i = 0;
    i < Math.min(filesArray.length, maxFiles - quickPhotos.length);
    i++
  ) {
    const file = filesArray[i];
    if (!file.type.startsWith("image/")) continue;
    if (file.size > maxSize) {
      showQuickToast(`⚠️ ${file.name.substring(0, 20)} exceeds 5MB`, "#f5ae3a");
      continue;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      quickPhotos.push({
        id: Date.now() + i + Math.random(),
        data: e.target.result,
        name: file.name,
        size: file.size,
      });
      renderPhotoPreviews();
    };
    reader.readAsDataURL(file);
  }
}

function renderPhotoPreviews() {
  const grid = document.getElementById("photoPreviewGrid");
  if (!grid) return;

  if (quickPhotos.length === 0) {
    grid.innerHTML =
      '<div style="font-size: 12px; color: var(--text-muted); padding: 8px 0;">No photos attached</div>';
    return;
  }

  grid.innerHTML = quickPhotos
    .map(
      (photo) => `
        <div class="photo-preview-item">
            <img src="${photo.data}" alt="Fault photo" onclick="viewPhotoFullscreen('${photo.id}')">
            <button class="photo-remove-btn" onclick="removePhoto('${photo.id}'); event.stopPropagation();">✕</button>
        </div>
    `,
    )
    .join("");
}

function viewPhotoFullscreen(photoId) {
  const photo = quickPhotos.find((p) => p.id == photoId);
  if (!photo) return;

  // Create fullscreen viewer
  const viewer = document.createElement("div");
  viewer.className = "photo-viewer-modal";
  viewer.innerHTML = `
        <div class="photo-viewer-header">
            <span style="color: white; font-weight: 600;">Fault Photo</span>
            <button class="photo-viewer-close" onclick="this.closest('.photo-viewer-modal').remove()">✕</button>
        </div>
        <div class="photo-viewer-content">
            <img src="${photo.data}" class="photo-viewer-image" alt="Fault photo">
        </div>
    `;
  document.body.appendChild(viewer);

  // Close on tap outside
  viewer.onclick = (e) => {
    if (e.target === viewer) viewer.remove();
  };
}

function removePhoto(photoId) {
  quickPhotos = quickPhotos.filter((p) => p.id != photoId);
  renderPhotoPreviews();
}

function openQuickModal() {
  // Reset form
  document.getElementById("quickDescription").value = "";
  document.getElementById("quickTechnician").value = "";
  document.getElementById("quickNotes").value = "";
  quickPhotos = [];
  renderPhotoPreviews();
  setDefaultChip("Medium");
  quickEditingId = null;
  document.getElementById("expandContent").classList.remove("open");
  document.querySelector("#expandDetailsBtn i").className =
    "fas fa-chevron-down";

  document.getElementById("quickFaultModal").classList.add("active");
}

// Make sure your closeQuickModal function looks like this:
function closeQuickModal() {
  const modal = document.getElementById("quickFaultModal");
  if (modal) {
    modal.classList.remove("active");
  }
  // Reset form when closing
  resetQuickForm();
}

function setDefaultChip(sev) {
  document.querySelectorAll(".severity-chip").forEach((chip) => {
    chip.classList.remove("active");
    if (chip.getAttribute("data-sev") === sev) chip.classList.add("active");
  });
  quickSelectedSeverity = sev;
}

function toggleExpandDetails() {
  const content = document.getElementById("expandContent");
  const icon = document.querySelector("#expandDetailsBtn i");
  content.classList.toggle("open");
  icon.className = content.classList.contains("open")
    ? "fas fa-chevron-up"
    : "fas fa-chevron-down";
}

// Replace your existing saveQuickFault function with this:
function saveQuickFault() {
  const equipment = document.getElementById("quickEquipment").value;
  const description = document.getElementById("quickDescription").value.trim();

  if (!description) {
    showQuickToast("⚠️ Please describe the fault", "#f5ae3a");
    return;
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "/");
  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const technician = document.getElementById("quickTechnician").value;
  const notes = document.getElementById("quickNotes").value;
  const userName =
    document.querySelector(".user-name")?.textContent || "Rajesh Kumar";

  const newId = Math.max(...FaultsDB.items.map((f) => f.id), 0) + 1;
  const faultId = `FLT-${now.getFullYear()}-${String(newId).padStart(3, "0")}`;
  const photos = quickPhotos.map((p) => p.data);

  const newFault = {
    id: newId,
    faultId: faultId,
    date: date,
    time: time,
    equipment: equipment,
    type: quickSelectedSeverity === "Critical" ? "Mechanical" : "Electrical",
    severity: quickSelectedSeverity,
    description: description,
    cause: notes || "",
    responseTime: null,
    resolutionTime: null,
    downtime: 0,
    status: "Open",
    reportedBy: userName,
    technician: technician || "",
    resolutionNotes: "",
    photos: photos,
  };

  FaultsDB.items.unshift(newFault);
  localStorage.setItem("faults_items", JSON.stringify(FaultsDB.items));
  FaultsDB.filteredItems = [...FaultsDB.items];

  updateFaultStats();
  renderQuickFaultTable(); // This will now show photo badge
  renderFaultCharts();

  // CRITICAL FIX: Close modal properly
  closeQuickModal();

  // Reset form for next use
  resetQuickForm();

  showQuickToast(`⚡ Fault logged with ${photos.length} photo(s)!`, "#2ecc71");
}

// Add this helper function to reset form
function resetQuickForm() {
  document.getElementById("quickDescription").value = "";
  document.getElementById("quickTechnician").value = "";
  document.getElementById("quickNotes").value = "";
  quickPhotos = [];
  renderPhotoPreviews();
  setDefaultChip("Medium");
  document.getElementById("expandContent").classList.remove("open");
  const expandIcon = document.querySelector("#expandDetailsBtn i");
  if (expandIcon) expandIcon.className = "fas fa-chevron-down";
}

// Replace your existing renderQuickFaultTable with this:
function renderQuickFaultTable() {
  const tbody = document.getElementById("faultsTableBody");
  if (!tbody) return;

  if (FaultsDB.filteredItems.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align:center; padding:40px;">No faults found</td></tr>';
    return;
  }

  tbody.innerHTML = FaultsDB.filteredItems
    .slice(0, 50)
    .map((fault) => {
      const photoCount = fault.photos?.length || 0;
      const photoBadge =
        photoCount > 0
          ? `<span class="photo-badge" style="cursor:pointer;" onclick="event.stopPropagation(); quickViewPhotos(${fault.id})"><i class="fas fa-camera"></i> ${photoCount}</span>`
          : "";

      // Determine status class
      let statusClass = "status-open";
      if (fault.status === "Resolved") statusClass = "status-resolved";
      else if (fault.status === "Closed") statusClass = "status-closed";
      else if (fault.status === "In Progress") statusClass = "status-progress";

      return `
        <tr>
            <td class="mono bold">${fault.faultId} ${photoBadge}</td>
            <td>${fault.date}</td>
            <td>${fault.time}</td>
            <td>${fault.equipment}</td>
            <td><span class="severity-badge severity-${fault.severity.toLowerCase()}">${fault.severity}</span></td>
            <td title="${fault.description}">${fault.description.substring(0, 35)}${fault.description.length > 35 ? "..." : ""}</td>
            <td><span class="severity-badge ${statusClass}">${fault.status}</span></td>
            <td class="action-buttons" style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="btn-icon-view" onclick="quickResolveFault(${fault.id})" title="Resolve" style="background: rgba(46,204,113,0.15); color: #2ecc71; padding: 6px 10px; border-radius: 8px;">
                    <i class="fas fa-check-circle"></i>
                </button>
                ${
                  photoCount > 0
                    ? `<button class="btn-icon-view" onclick="quickViewPhotos(${fault.id})" title="View Photos" style="background: rgba(74,157,232,0.15); color: #4a9de8; padding: 6px 10px; border-radius: 8px;">
                    <i class="fas fa-camera"></i>
                </button>`
                    : ""
                }
                <button class="btn-icon-view" onclick="quickEditFault(${fault.id})" title="Edit" style="background: rgba(245,174,58,0.15); color: #f5ae3a; padding: 6px 10px; border-radius: 8px;">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `;
    })
    .join("");
}

// Replace your existing quickViewPhotos with this:
function quickViewPhotos(faultId) {
  const fault = FaultsDB.items.find((f) => f.id === faultId);
  if (!fault) return;

  if (!fault.photos || fault.photos.length === 0) {
    showQuickToast("No photos attached to this fault", "#f5ae3a");
    return;
  }

  // Create mobile-friendly photo viewer modal
  let photosHtml = "";
  fault.photos.forEach((photo, index) => {
    photosHtml += `
            <div style="margin-bottom: 16px; text-align: center;">
                <img src="${photo}" alt="Fault photo ${index + 1}" 
                     style="max-width: 100%; border-radius: 16px; border: 1px solid var(--border); cursor: pointer;"
                     onclick="window.open(this.src, '_blank')">
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">Photo ${index + 1} of ${fault.photos.length}</div>
            </div>
        `;
  });

  // Create modal HTML
  const modalHtml = `
        <div class="photo-viewer-modal" id="photoViewerModal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.95);
            z-index: 3000;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        ">
            <div style="
                position: sticky;
                top: 0;
                background: rgba(0,0,0,0.9);
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                z-index: 10;
            ">
                <div>
                    <div style="color: white; font-weight: 600;">${fault.faultId}</div>
                    <div style="color: #aaa; font-size: 11px;">${fault.equipment} · ${fault.severity}</div>
                </div>
                <button onclick="closePhotoViewer()" style="
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                ">✕</button>
            </div>
            <div style="padding: 20px;">
                <div style="margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 12px;">
                    <div style="color: #aaa; font-size: 11px; margin-bottom: 4px;">Description</div>
                    <div style="color: white; font-size: 13px;">${fault.description}</div>
                </div>
                ${photosHtml}
            </div>
        </div>
    `;

  // Remove existing viewer if any
  const existing = document.getElementById("photoViewerModal");
  if (existing) existing.remove();

  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function closePhotoViewer() {
  const viewer = document.getElementById("photoViewerModal");
  if (viewer) viewer.remove();
}

function closePhotoViewer() {
  const viewer = document.getElementById("photoViewerModal");
  if (viewer) viewer.remove();
}

function quickResolveFault(id) {
  const fault = FaultsDB.items.find((f) => f.id === id);
  if (
    fault &&
    confirm(`Mark "${fault.description.substring(0, 50)}" as resolved?`)
  ) {
    fault.status = "Resolved";
    fault.resolutionTime = 2;
    localStorage.setItem("faults_items", JSON.stringify(FaultsDB.items));
    FaultsDB.filteredItems = [...FaultsDB.items];
    updateFaultStats();
    renderQuickFaultTable();
    renderFaultCharts();
    showQuickToast("✓ Fault resolved", "#29c48f");
  }
}

function quickEditFault(id) {
  const fault = FaultsDB.items.find((f) => f.id === id);
  if (!fault) return;

  quickEditingId = id;
  document.getElementById("quickEquipment").value = fault.equipment;
  document.getElementById("quickDescription").value = fault.description;
  document.getElementById("quickTechnician").value = fault.technician || "";
  document.getElementById("quickNotes").value = fault.cause || "";

  // Load existing photos
  quickPhotos = (fault.photos || []).map((photo, idx) => ({
    id: Date.now() + idx,
    data: photo,
    name: `existing_${idx}`,
  }));
  renderPhotoPreviews();

  setDefaultChip(fault.severity);

  if (fault.cause || fault.technician) {
    document.getElementById("expandContent").classList.add("open");
    document.querySelector("#expandDetailsBtn i").className =
      "fas fa-chevron-up";
  }

  document.getElementById("quickFaultModal").classList.add("active");

  // Override save button for edit
  const submitBtn = document.getElementById("submitQuickFault");
  submitBtn.onclick = () => quickUpdateFault(id);
}

function quickUpdateFault(id) {
  const index = FaultsDB.items.findIndex((f) => f.id === id);
  if (index !== -1) {
    FaultsDB.items[index] = {
      ...FaultsDB.items[index],
      equipment: document.getElementById("quickEquipment").value,
      severity: quickSelectedSeverity,
      description: document.getElementById("quickDescription").value,
      technician: document.getElementById("quickTechnician").value,
      cause: document.getElementById("quickNotes").value,
      photos: quickPhotos.map((p) => p.data),
    };
    localStorage.setItem("faults_items", JSON.stringify(FaultsDB.items));
    FaultsDB.filteredItems = [...FaultsDB.items];
    updateFaultStats();
    renderQuickFaultTable();
    renderFaultCharts();
    closeQuickModal();
    showQuickToast("✏️ Fault updated", "#4a9de8");
  }

  // Restore original save handler
  document.getElementById("submitQuickFault").onclick = saveQuickFault;
}

function showQuickToast(message, color) {
  let toast = document.getElementById("quickToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "quickToast";
    toast.className = "quick-toast";
    document.body.appendChild(toast);
  }
  toast.style.backgroundColor = color;
  toast.innerText = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

// Make functions globally available
window.quickResolveFault = quickResolveFault;
window.quickEditFault = quickEditFault;
window.quickViewPhotos = quickViewPhotos;
window.closeQuickModal = closeQuickModal;
window.removePhoto = removePhoto;
window.closePhotoViewer = closePhotoViewer;
window.viewPhotoFullscreen = viewPhotoFullscreen;
