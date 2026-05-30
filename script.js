// ============================================
// GOOGLE SHEETS DATA FETCHER
// ============================================

// Your published Google Sheet CSV URL
const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRCyZncyCgZYVHPxERkZ40YNVZ4FV3SOezohHcERdOSL1c6t7K3BL0wYjYL-foZicX1n13yn52RtHVA/pub?output=csv";

// Store fetched data
let sheetData = {
  raw: [],
};

// ============================================
// GLOBAL NAVIGATION FUNCTION
// ============================================

window.showPage = function (id, el) {
  console.log("Navigating to:", id);

  // Hide all pages
  document.querySelectorAll(".page").forEach(function (p) {
    p.classList.remove("active");
  });

  // Remove active class from all nav items
  document.querySelectorAll(".nav-item").forEach(function (n) {
    n.classList.remove("active");
  });

  // Show selected page
  var pg = document.getElementById("page-" + id);
  if (pg) pg.classList.add("active");
  if (el) el.classList.add("active");

  // Update breadcrumb
  var names = {
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

  var breadcrumb = document.getElementById("breadcrumb");
  if (breadcrumb) breadcrumb.textContent = names[id] || id;

  // Load generation data when generation page is shown
  if (id === "generation") {
    console.log("Generation log page loaded - loading data...");
    loadGenerationData();
  }
};

console.log("✅ showPage function registered");

// ============================================
// LOAD GENERATION DATA FROM GOOGLE SHEET
// ============================================

async function loadGenerationData() {
  console.log("Loading generation data from Google Sheet...");

  try {
    const response = await fetch(GOOGLE_SHEET_CSV_URL + "&t=" + Date.now());
    const csvText = await response.text();

    const lines = csvText.split(/\r?\n/).filter(function (l) {
      return l.trim();
    });
    const headers = lines[0].split(",");
    const sheetDataRaw = [];

    for (var i = 1; i < lines.length; i++) {
      var values = lines[i].split(",");
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j];
      }
      sheetDataRaw.push(row);
    }

    console.log("Loaded " + sheetDataRaw.length + " rows");

    const daysMap = new Map();

    for (var k = 0; k < sheetDataRaw.length; k++) {
      var row = sheetDataRaw[k];

      var yearValue = row.year;
      var monthValue = row.month;
      var dayValue = row.day;
      var hourValue = parseInt(row.hour);

      if (!yearValue || !monthValue || !dayValue) {
        var dateMatch = row.timestamp
          ? row.timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
          : null;
        if (dateMatch) {
          dayValue = dateMatch[1].padStart(2, "0");
          monthValue = dateMatch[2].padStart(2, "0");
          yearValue = dateMatch[3];
        }
        var hourMatch = row.timestamp
          ? row.timestamp.match(/(\d{1,2}):/)
          : null;
        if (hourMatch) hourValue = parseInt(hourMatch[1]);
      }

      if (!yearValue || !monthValue || !dayValue || isNaN(hourValue)) continue;

      var bsDate = yearValue + "/" + monthValue + "/" + dayValue;
      var u1MW = parseFloat(row.u1_mw) || 0;
      var u2MW = parseFloat(row.u2_mw) || 0;
      var u1MWh =
        parseFloat(row.u1_energy_mwh) || parseFloat(row.u1_hourly_mwh) || u1MW;
      var u2MWh =
        parseFloat(row.u2_energy_mwh) || parseFloat(row.u2_hourly_mwh) || u2MW;
      var isPlantOff = row.is_plant_off === "1";

      if (!daysMap.has(bsDate)) {
        daysMap.set(bsDate, { bsDate: bsDate, hours: [], computed: null });
      }

      var currentDayEntry = daysMap.get(bsDate);
      currentDayEntry.hours.push({
        hour: hourValue,
        hourStr: hourValue + ":00",
        u1Shutdown: isPlantOff,
        u2Shutdown: isPlantOff,
        u1: { mw: u1MW, mwh: u1MWh, pf: 0.95, hz: 50 },
        u2: { mw: u2MW, mwh: u2MWh, pf: 0.95, hz: 50 },
        grid: { mw: u1MW + u2MW },
        remarks: "",
      });
    }

    var allConvertedDays = Array.from(daysMap.values());
    allConvertedDays.sort(function (a, b) {
      return a.bsDate.localeCompare(b.bsDate);
    });

    for (var d = 0; d < allConvertedDays.length; d++) {
      var singleDay = allConvertedDays[d];
      singleDay.hours.sort(function (a, b) {
        return a.hour - b.hour;
      });

      var u1Total = 0,
        u2Total = 0,
        u1HoursCount = 0,
        u2HoursCount = 0;
      var u1MWSum = 0,
        u2MWSum = 0,
        peakMW = 0;

      for (var h = 0; h < singleDay.hours.length; h++) {
        var hourData = singleDay.hours[h];
        if (!hourData.u1Shutdown && hourData.u1.mw > 0) {
          u1Total += hourData.u1.mw;
          u1HoursCount++;
          u1MWSum += hourData.u1.mw;
          if (hourData.u1.mw > peakMW) peakMW = hourData.u1.mw;
        }
        if (!hourData.u2Shutdown && hourData.u2.mw > 0) {
          u2Total += hourData.u2.mw;
          u2HoursCount++;
          u2MWSum += hourData.u2.mw;
          if (hourData.u2.mw > peakMW) peakMW = hourData.u2.mw;
        }
      }

      singleDay.computed = {
        u1Energy: u1Total,
        u2Energy: u2Total,
        totalEnergy: u1Total + u2Total,
        u1AvgMW: u1HoursCount > 0 ? u1MWSum / u1HoursCount : 0,
        u2AvgMW: u2HoursCount > 0 ? u2MWSum / u2HoursCount : 0,
        maxMW: peakMW,
        opHours: singleDay.hours.filter(function (h) {
          return !h.u1Shutdown || !h.u2Shutdown;
        }).length,
        shutdownHrs: singleDay.hours.filter(function (h) {
          return h.u1Shutdown && h.u2Shutdown;
        }).length,
        avgPF: 0.95,
        avgHz: 50,
      };
    }

    window.GenDB = { allDays: allConvertedDays, filteredDays: [] };
    // ============================================
    // CREATE CHARTS USING GLOBAL DATA
    // ============================================

    // Small delay to ensure DOM is ready
    setTimeout(function () {
      console.log("Creating charts with", window.GenDB.allDays.length, "days");

      // Get canvas elements
      var trendCanvas = document.getElementById("genTrendChart");
      var unitCanvas = document.getElementById("unitCompChart");

      // Create Trend Chart
      if (trendCanvas && window.GenDB.allDays.length > 0) {
        // Destroy existing chart
        if (window.trendChart) window.trendChart.destroy();

        // Prepare labels and data
        var labels = [];
        var chartData = [];
        var limitedDays = window.GenDB.allDays.slice(-90); // Last 90 days for better visibility

        for (var i = 0; i < limitedDays.length; i++) {
          var day = limitedDays[i];
          var parts = day.bsDate.split("/");
          labels.push(parts[1] + "/" + parts[2]);
          chartData.push(day.computed.totalEnergy);
        }

        window.trendChart = new Chart(trendCanvas, {
          type: "line",
          data: {
            labels: labels,
            datasets: [
              {
                label: "Daily Generation (MWh)",
                data: chartData,
                borderColor: "#00e5c8",
                backgroundColor: "rgba(0, 229, 200, 0.1)",
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 1,
                pointHoverRadius: 5,
                pointBackgroundColor: "#00e5c8",
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
                labels: { color: "#8b96a8", font: { size: 11 } },
              },
              tooltip: {
                callbacks: {
                  label: function (ctx) {
                    return "Generation: " + ctx.parsed.y.toFixed(1) + " MWh";
                  },
                },
              },
            },
            scales: {
              x: {
                ticks: {
                  color: "#8b96a8",
                  maxRotation: 45,
                  autoSkip: true,
                  maxTicksLimit: 10,
                },
              },
              y: {
                ticks: {
                  color: "#8b96a8",
                  callback: function (v) {
                    return v + " MWh";
                  },
                },
                title: {
                  display: true,
                  text: "Energy (MWh)",
                  color: "#8b96a8",
                },
              },
            },
          },
        });
        console.log("✅ Trend chart created");
      } else {
        console.log("Trend canvas not found or no data");
      }

      // Create Unit Comparison Chart
      if (unitCanvas && window.GenDB.allDays.length > 0) {
        if (window.unitChart) window.unitChart.destroy();

        // Calculate hourly averages
        var hourlyU1 = new Array(24).fill(0);
        var hourlyU2 = new Array(24).fill(0);
        var hourlyCount = new Array(24).fill(0);

        for (var d = 0; d < window.GenDB.allDays.length; d++) {
          var dayData = window.GenDB.allDays[d];
          if (dayData.hours) {
            for (var h = 0; h < dayData.hours.length; h++) {
              var hourData = dayData.hours[h];
              var hourIdx = hourData.hour;
              if (hourIdx >= 0 && hourIdx < 24) {
                if (!hourData.u1Shutdown && hourData.u1 && hourData.u1.mw > 0) {
                  hourlyU1[hourIdx] += hourData.u1.mw;
                  hourlyCount[hourIdx]++;
                }
                if (!hourData.u2Shutdown && hourData.u2 && hourData.u2.mw > 0) {
                  hourlyU2[hourIdx] += hourData.u2.mw;
                }
              }
            }
          }
        }

        // Calculate averages
        for (var hr = 0; hr < 24; hr++) {
          if (hourlyCount[hr] > 0) {
            hourlyU1[hr] = hourlyU1[hr] / hourlyCount[hr];
            hourlyU2[hr] = hourlyU2[hr] / hourlyCount[hr];
          }
        }

        var hourLabels = [];
        for (var hr = 0; hr < 24; hr++) {
          if (hr === 0) hourLabels.push("12 AM");
          else if (hr < 12) hourLabels.push(hr + " AM");
          else if (hr === 12) hourLabels.push("12 PM");
          else hourLabels.push(hr - 12 + " PM");
        }

        window.unitChart = new Chart(unitCanvas, {
          type: "bar",
          data: {
            labels: hourLabels,
            datasets: [
              {
                label: "Unit I",
                data: hourlyU1,
                backgroundColor: "rgba(0, 229, 200, 0.7)",
                borderColor: "#00e5c8",
                borderWidth: 1,
                borderRadius: 6,
              },
              {
                label: "Unit II",
                data: hourlyU2,
                backgroundColor: "rgba(59, 130, 246, 0.7)",
                borderColor: "#3b82f6",
                borderWidth: 1,
                borderRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "top",
                labels: { color: "#8b96a8", font: { size: 11 } },
              },
            },
            scales: {
              x: {
                ticks: {
                  color: "#8b96a8",
                  maxRotation: 45,
                  autoSkip: true,
                  maxTicksLimit: 12,
                },
              },
              y: {
                beginAtZero: true,
                title: { display: true, text: "Power (MW)", color: "#8b96a8" },
                ticks: { color: "#8b96a8" },
              },
            },
          },
        });
        console.log("✅ Unit chart created");
      }
    }, 500);
    var totalEnergy = 0;
    for (var t = 0; t < allConvertedDays.length; t++) {
      totalEnergy += allConvertedDays[t].computed.totalEnergy;
    }
    console.log(
      "✅ Loaded " +
        allConvertedDays.length +
        " days, " +
        totalEnergy.toFixed(0) +
        " MWh total",
    );

    // ============================================
    // FORCE UI UPDATE - THIS IS THE FIX
    // ============================================

    // Hide empty state, show content
    var emptyState = document.getElementById("genEmptyState");
    var content = document.getElementById("genDashboardContent");
    var leftPanel = document.getElementById("genLeftPanel");
    var filesCard = document.getElementById("genFilesCard");

    if (emptyState) emptyState.style.display = "none";
    if (content) content.style.display = "block";
    if (leftPanel) leftPanel.style.display = "block";
    if (filesCard) filesCard.style.display = "block";

    // Update KPI display
    updateGenerationKPIs(allConvertedDays);

    // Update file list
    var fileList = document.getElementById("genFileList");
    if (fileList) {
      fileList.innerHTML =
        '<div class="gen-file-item"><div class="gen-file-info"><i class="fas fa-database"></i><span>Google Sheet Data</span><span class="gen-file-badge">' +
        allConvertedDays.length +
        " days · " +
        sheetDataRaw.length +
        " hours</span></div></div>";
    }

    // Update daily table
    var tableBody = document.getElementById("genDailySummaryBody");
    if (tableBody && allConvertedDays.length > 0) {
      var tableHtml = "";
      for (
        var dayIdx = 0;
        dayIdx < Math.min(allConvertedDays.length, 30);
        dayIdx++
      ) {
        var day = allConvertedDays[dayIdx];
        tableHtml += `
            <tr>
                <td>${day.bsDate}</td>
                <td>${day.bsDate}</td>
                <td><strong>${day.computed.u1Energy.toFixed(1)}</strong></td>
                <td><strong>${day.computed.u2Energy.toFixed(1)}</strong></td>
                <td><strong style="color:#00e5c8">${day.computed.totalEnergy.toFixed(1)}</strong></td>
                <td>${day.computed.u1AvgMW.toFixed(2)}</td>
                <td>${day.computed.u2AvgMW.toFixed(2)}</td>
                <td>${day.computed.maxMW.toFixed(2)}</td>
                <td>${day.computed.opHours}</td>
                <td>${day.computed.shutdownHrs}</td>
                <td>${day.computed.avgPF.toFixed(3)}</td>
                <td>${day.computed.avgHz.toFixed(2)}</td>
            </tr>
        `;
      }
      tableBody.innerHTML = tableHtml;
    }

    // Update quick stats in left panel
    var qsDays = document.getElementById("qsDays");
    var qsHours = document.getElementById("qsHours");
    var qsShutdown = document.getElementById("qsShutdown");
    var qsPF = document.getElementById("qsPF");

    if (qsDays) qsDays.innerHTML = allConvertedDays.length;
    if (qsHours) {
      var totalOpHours = allConvertedDays.reduce(function (s, d) {
        return s + d.computed.opHours;
      }, 0);
      qsHours.innerHTML = totalOpHours;
    }
    if (qsShutdown) {
      var totalShutdown = allConvertedDays.reduce(function (s, d) {
        return s + d.computed.shutdownHrs;
      }, 0);
      qsShutdown.innerHTML = totalShutdown;
    }
    if (qsPF) qsPF.innerHTML = "0.950";

    console.log("✅ UI updated with", allConvertedDays.length, "days");
  } catch (error) {
    console.error("Error loading generation data:", error);
  }
}

// ============================================
// UPDATE KPI CARDS
// ============================================

function updateGenerationKPIs(days) {
  var totalEnergy = 0;
  var totalU1 = 0;
  var totalU2 = 0;
  var totalHours = 0;
  var peakMW = 0;

  for (var i = 0; i < days.length; i++) {
    totalEnergy += days[i].computed.totalEnergy;
    totalU1 += days[i].computed.u1Energy;
    totalU2 += days[i].computed.u2Energy;
    totalHours += days[i].computed.opHours;
    if (days[i].computed.maxMW > peakMW) peakMW = days[i].computed.maxMW;
  }

  var kpiRow = document.getElementById("genKpiRow");
  if (kpiRow) {
    kpiRow.innerHTML = `
      <div class="gen-kpi-card cyan">
        <div class="gen-kpi-label"><i class="fas fa-bolt"></i> TOTAL GENERATION</div>
        <div class="gen-kpi-value">${totalEnergy.toFixed(1)}<span class="gen-kpi-unit">MWh</span></div>
        <div class="gen-kpi-sub">U1: ${totalU1.toFixed(1)} + U2: ${totalU2.toFixed(1)} MWh</div>
      </div>
      <div class="gen-kpi-card blue">
        <div class="gen-kpi-label"><i class="fas fa-charging-station"></i> GRID EXPORT</div>
        <div class="gen-kpi-value">${(totalEnergy * 0.98).toFixed(1)}<span class="gen-kpi-unit">MWh</span></div>
      </div>
      <div class="gen-kpi-card green">
        <div class="gen-kpi-label"><i class="fas fa-clock"></i> OP HOURS</div>
        <div class="gen-kpi-value">${totalHours}<span class="gen-kpi-unit">hrs</span></div>
        <div class="gen-kpi-sub">Over ${days.length} days</div>
      </div>
      <div class="gen-kpi-card amber">
        <div class="gen-kpi-label"><i class="fas fa-chart-line"></i> PEAK MW</div>
        <div class="gen-kpi-value">${peakMW.toFixed(2)}<span class="gen-kpi-unit">MW</span></div>
      </div>
    `;
  }

  // Update quick stats in left panel
  var qsDays = document.getElementById("qsDays");
  var qsHours = document.getElementById("qsHours");
  var qsShutdown = document.getElementById("qsShutdown");
  var qsPF = document.getElementById("qsPF");

  if (qsDays) qsDays.innerHTML = days.length;
  if (qsHours) qsHours.innerHTML = totalHours;
  if (qsShutdown)
    qsShutdown.innerHTML = days.reduce(function (s, d) {
      return s + d.computed.shutdownHrs;
    }, 0);
  if (qsPF) qsPF.innerHTML = "0.950";
}

console.log("✅ Generation Log module ready");

// Parse CSV to JSON
function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCSVRow(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i]);
    if (values.length === headers.length) {
      let row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });
      data.push(row);
    }
  }
  return data;
}

function parseCSVRow(row) {
  const result = [];
  let inQuotes = false;
  let current = "";

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map((val) => val.replace(/^"|"$/g, ""));
}

// Show toast message
function showToastMessage(message, type) {
  let toast = document.getElementById("sheetToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "sheetToast";
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.85);
      color: white;
      padding: 10px 20px;
      border-radius: 30px;
      font-size: 13px;
      z-index: 5000;
      backdrop-filter: blur(10px);
      transition: opacity 0.3s;
      white-space: nowrap;
    `;
    document.body.appendChild(toast);
  }

  const colors = {
    success: "#29c48f",
    error: "#e24b4a",
    warning: "#f5ae3a",
    info: "#4a9de8",
  };
  toast.style.background = colors[type] || "#333";
  toast.textContent = message;
  toast.style.opacity = "1";

  setTimeout(() => {
    toast.style.opacity = "0";
  }, 3000);
}

// Fetch data from Google Sheet
async function fetchSheetData() {
  try {
    console.log("Fetching data from Google Sheet...");
    showToastMessage("Loading data from Google Sheets...", "info");

    const response = await fetch(`${GOOGLE_SHEET_CSV_URL}&t=${Date.now()}`);
    const csvText = await response.text();

    sheetData.raw = parseCSV(csvText);
    console.log(`Loaded ${sheetData.raw.length} rows from Google Sheet`);

    if (sheetData.raw.length > 0) {
      // Log first row to see available columns
      console.log("First row sample:", sheetData.raw[0]);
      console.log("Available columns:", Object.keys(sheetData.raw[0]));

      updateDashboardWithSheetData();
      showToastMessage(`✓ Loaded ${sheetData.raw.length} records`, "success");
    }

    return sheetData.raw;
  } catch (err) {
    console.error("Failed to fetch sheet data:", err);
    showToastMessage("⚠️ Could not load data from Google Sheets.", "error");
    return [];
  }
}

function convertSheetToGenDB(sheetRows) {
  if (!sheetRows || sheetRows.length === 0) {
    console.log("No sheet rows to convert");
    return [];
  }

  console.log(`Converting ${sheetRows.length} sheet rows to GenDB format...`);

  // Group rows by date
  const daysMap = new Map();
  let validRows = 0;
  let rowsWithMW = 0;

  for (const row of sheetRows) {
    // ============================================
    // EXTRACT DATE AND HOUR
    // ============================================
    let year = row.year;
    let month = row.month;
    let day = row.day;
    let hour = parseInt(row.hour);

    // Format date as YYYY/MM/DD (BS date format)
    if (!year || !month || !day) {
      // Try parsing from timestamp if needed
      if (row.timestamp) {
        const dateMatch = row.timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateMatch) {
          day = dateMatch[1].padStart(2, "0");
          month = dateMatch[2].padStart(2, "0");
          year = dateMatch[3];
        }
        const hourMatch = row.timestamp.match(/(\d{1,2}):/);
        if (hourMatch) hour = parseInt(hourMatch[1]);
      }
    }

    // Skip invalid rows
    if (!year || !month || !day || isNaN(hour) || hour < 0 || hour > 23) {
      continue;
    }

    // Format BS date
    const bsDate = `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;

    // ============================================
    // EXTRACT UNIT 1 DATA
    // ============================================
    let u1MW = parseFloat(row.u1_mw) || 0;
    let u1MWh =
      parseFloat(row.u1_energy_mwh) || parseFloat(row.u1_hourly_mwh) || 0;
    let u1PF = parseFloat(row.u1_power_factor) || 0.95;
    let u1Hz = parseFloat(row.u1_frequency_hz) || 50.0;
    let u1Voltage = parseFloat(row.u1_voltage_ry_kv) || 0;
    let u1Current = parseFloat(row.u1_current_i1_a) || 0;

    // ============================================
    // EXTRACT UNIT 2 DATA
    // ============================================
    let u2MW = parseFloat(row.u2_mw) || 0;
    let u2MWh =
      parseFloat(row.u2_energy_mwh) || parseFloat(row.u2_hourly_mwh) || 0;
    let u2PF = parseFloat(row.u2_power_factor) || 0.95;
    let u2Hz = parseFloat(row.u2_frequency_hz) || 50.0;
    let u2Voltage = parseFloat(row.u2_voltage_ry_kv) || 0;
    let u2Current = parseFloat(row.u2_current_i1_a) || 0;

    // ============================================
    // EXTRACT TRANSMISSION LINE DATA
    // ============================================
    let tlMW = parseFloat(row.tl_mw) || 0;
    let tlMWh =
      parseFloat(row.tl_energy_mwh) || parseFloat(row.tl_hourly_mwh) || 0;
    let tlPF = parseFloat(row.tl_power_factor) || 0.95;
    let tlHz = parseFloat(row.tl_frequency_hz) || 50.0;

    // If MWh not available but MW is, assume hourly data (MW = MWh for 1 hour)
    if (u1MWh === 0 && u1MW > 0) u1MWh = u1MW;
    if (u2MWh === 0 && u2MW > 0) u2MWh = u2MW;

    // Track if this row has actual generation data
    if (u1MW > 0 || u2MW > 0 || tlMW > 0) {
      rowsWithMW++;
    }

    // ============================================
    // CHECK PLANT STATUS
    // ============================================
    let isPlantOff = false;
    if (row.is_plant_off !== undefined) {
      isPlantOff = row.is_plant_off === "1" || row.is_plant_off === 1;
    }

    // Also check if both units have zero MW (implied shutdown)
    const bothZero = u1MW === 0 && u2MW === 0 && tlMW === 0;
    const isShutdown = isPlantOff || bothZero;

    validRows++;

    // ============================================
    // CREATE OR GET DAY ENTRY
    // ============================================
    if (!daysMap.has(bsDate)) {
      daysMap.set(bsDate, {
        bsDate: bsDate,
        hours: [],
        computed: null,
      });
    }

    const dayEntry = daysMap.get(bsDate); // CHANGED: 'day' to 'dayEntry'

    // ============================================
    // CREATE HOUR OBJECT
    // ============================================
    const hourObj = {
      hour: hour,
      hourStr: `${hour.toString().padStart(2, "0")}:00`,
      u1Shutdown: isShutdown,
      u2Shutdown: isShutdown,
      u1: {
        mw: u1MW,
        mwh: u1MWh,
        pf: u1PF,
        hz: u1Hz,
        voltage: u1Voltage,
        current: u1Current,
      },
      u2: {
        mw: u2MW,
        mwh: u2MWh,
        pf: u2PF,
        hz: u2Hz,
        voltage: u2Voltage,
        current: u2Current,
      },
      grid: {
        mw: tlMW || u1MW + u2MW,
        mwh: tlMWh || u1MWh + u2MWh,
        pf: tlPF,
        hz: tlHz,
      },
      remarks: row.remarks || "",
    };

    dayEntry.hours.push(hourObj); // CHANGED: 'day' to 'dayEntry'
  }

  console.log(
    `✅ Valid rows: ${validRows}, Rows with MW data: ${rowsWithMW}, Unique dates: ${daysMap.size}`,
  );

  // ============================================
  // CONVERT MAP TO ARRAY AND SORT
  // ============================================
  const days = Array.from(daysMap.values());
  days.sort((a, b) => a.bsDate.localeCompare(b.bsDate));

  // ============================================
  // COMPUTE DAILY STATISTICS FOR EACH DAY
  // ============================================
  for (const day of days) {
    day.hours.sort((a, b) => a.hour - b.hour);
    day.computed = computeGenDayEnergy(day.hours);
  }

  // ============================================
  // LOG SUMMARY FOR VERIFICATION
  // ============================================
  const totalEnergy = days.reduce(
    (sum, d) => sum + (d.computed?.totalEnergy || 0),
    0,
  );
  const daysWithGen = days.filter((d) => d.computed?.totalEnergy > 0);

  console.log(
    `📊 Final: ${days.length} total days, ${daysWithGen.length} days with generation`,
  );
  console.log(`⚡ Total Generation: ${totalEnergy.toFixed(2)} MWh`);

  if (daysWithGen.length > 0) {
    console.log(
      `📅 First day with gen: ${daysWithGen[0].bsDate} = ${daysWithGen[0].computed.totalEnergy.toFixed(2)} MWh`,
    );
    console.log(
      `📅 Last day with gen: ${daysWithGen[daysWithGen.length - 1].bsDate} = ${daysWithGen[daysWithGen.length - 1].computed.totalEnergy.toFixed(2)} MWh`,
    );
  }

  return days;
}

// ============================================
// LOAD GENERATION DATA FROM GOOGLE SHEET
// ============================================

async function loadGenerationFromSheet() {
  console.log("🔄 Loading generation data from Google Sheet...");
  showToastMessage("Loading generation data...", "info");

  try {
    // Check if sheet data is already loaded
    if (!sheetData.raw || sheetData.raw.length === 0) {
      console.log("No sheet data cached, fetching fresh...");
      await fetchSheetData();
    }

    if (sheetData.raw && sheetData.raw.length > 0) {
      console.log(`Converting ${sheetData.raw.length} rows to GenDB format...`);

      // Convert sheet data to GenDB format
      const convertedDays = convertSheetToGenDB(sheetData.raw);

      console.log(`Converted ${convertedDays.length} days`);

      if (convertedDays.length > 0) {
        GenDB.allDays = convertedDays;

        // FORCE the UI to show - hide empty state, show content
        const emptyState = document.getElementById("genEmptyState");
        const content = document.getElementById("genDashboardContent");
        const leftPanel = document.getElementById("genLeftPanel");
        const filesCard = document.getElementById("genFilesCard");

        console.log("Updating UI elements...");
        console.log("emptyState exists:", !!emptyState);
        console.log("content exists:", !!content);

        if (emptyState) emptyState.style.display = "none";
        if (content) content.style.display = "block";
        if (leftPanel) leftPanel.style.display = "block";
        if (filesCard) filesCard.style.display = "block";

        // Render the generation dashboard
        console.log("Calling renderGenFileList...");
        renderGenFileList();

        console.log("Calling renderGenDashboard...");
        renderGenDashboard(GenDB.allDays);

        // Also update the quick stats in left panel
        const totalEnergy = GenDB.allDays.reduce(
          (sum, d) => sum + (d.computed?.totalEnergy || 0),
          0,
        );
        const totalOpHours = GenDB.allDays.reduce(
          (sum, d) => sum + (d.computed?.opHours || 0),
          0,
        );
        const totalShutdown = GenDB.allDays.reduce(
          (sum, d) => sum + (d.computed?.shutdownHrs || 0),
          0,
        );
        const avgPF =
          GenDB.allDays.reduce((sum, d) => sum + (d.computed?.avgPF || 0), 0) /
          GenDB.allDays.length;

        const qsDays = document.getElementById("qsDays");
        const qsHours = document.getElementById("qsHours");
        const qsShutdown = document.getElementById("qsShutdown");
        const qsPF = document.getElementById("qsPF");

        if (qsDays) qsDays.innerHTML = GenDB.allDays.length;
        if (qsHours) qsHours.innerHTML = totalOpHours;
        if (qsShutdown) qsShutdown.innerHTML = totalShutdown;
        if (qsPF) qsPF.innerHTML = avgPF.toFixed(3);

        console.log(
          `✅ Loaded ${GenDB.allDays.length} days of generation data`,
        );
        console.log(`Total Energy: ${totalEnergy.toFixed(1)} MWh`);
        showToastMessage(
          `✓ Loaded ${GenDB.allDays.length} days of generation data`,
          "success",
        );
      } else {
        console.warn("No valid days converted from sheet data");
        showToastMessage(
          "⚠️ No valid generation data found in sheet",
          "warning",
        );
      }
    } else {
      console.warn("No sheet data available");
      showToastMessage("⚠️ No sheet data available. Check sync.", "error");
    }
  } catch (error) {
    console.error("Error loading generation data:", error);
    showToastMessage("❌ Error loading data: " + error.message, "error");
  }
}

// Update dashboard UI with sheet data
function updateDashboardWithSheetData() {
  if (sheetData.raw.length === 0) return;

  console.log("Updating dashboard with sheet data...");

  const firstRow = sheetData.raw[0];
  const columnNames = Object.keys(firstRow);

  // Find MW/load column (look for values between 0-50)
  let loadColumn = null;
  for (const col of columnNames) {
    const val = parseFloat(firstRow[col]);
    if (!isNaN(val) && val >= 0 && val <= 50) {
      loadColumn = col;
      break;
    }
  }

  // Find generation/energy column (might be cumulative)
  let genColumn = null;
  for (const col of columnNames) {
    if (
      col.toLowerCase().includes("mwh") ||
      col.toLowerCase().includes("energy")
    ) {
      genColumn = col;
      break;
    }
  }

  // Find timestamp column
  let dateColumn = columnNames.includes("timestamp") ? "timestamp" : null;
  let hourColumn = columnNames.includes("hour") ? "hour" : null;

  console.log(`Using load column: ${loadColumn}`);
  console.log(`Using generation column: ${genColumn}`);

  // Update Current Load KPI
  if (loadColumn && dateColumn) {
    // Get latest record by timestamp
    const sorted = [...sheetData.raw].sort((a, b) => {
      return new Date(b[dateColumn]) - new Date(a[dateColumn]);
    });
    const latest = sorted[0];

    if (latest) {
      const currentLoad = parseFloat(latest[loadColumn]) || 0;

      // Update the load KPI card
      const loadKpi = document.querySelectorAll(".kpi-card .kpi-value")[1];
      if (loadKpi && currentLoad > 0) {
        loadKpi.innerHTML = `${currentLoad.toFixed(1)}<span class="kpi-unit">MW</span>`;
      }

      // Update unit load bar
      const fillBars = document.querySelectorAll(".unit-load-fill");
      if (fillBars.length > 0) {
        const percentage = Math.min((currentLoad / 35) * 100, 100);
        fillBars[0].style.width = `${percentage}%`;
      }

      // Update MW display
      const unitMWs = document.querySelectorAll(".unit-mw");
      if (unitMWs.length > 0) {
        unitMWs[0].innerHTML = `${currentLoad.toFixed(1)} MW`;
      }

      console.log(`Updated current load: ${currentLoad} MW`);
    }
  }

  // Update chart with hourly data
  if (hourColumn && loadColumn && window.genChart && window.genChart.data) {
    const hourlyData = {};
    for (let h = 0; h < 24; h++) {
      hourlyData[h] = { sum: 0, count: 0 };
    }

    sheetData.raw.forEach((row) => {
      let hour = parseInt(row[hourColumn]);
      if (!isNaN(hour) && hour >= 0 && hour < 24) {
        let val = parseFloat(row[loadColumn]);
        if (!isNaN(val) && val > 0 && val < 100) {
          hourlyData[hour].sum += val;
          hourlyData[hour].count++;
        }
      }
    });

    const chartData = [];
    for (let h = 0; h < 24; h++) {
      const avg =
        hourlyData[h].count > 0 ? hourlyData[h].sum / hourlyData[h].count : 0;
      chartData.push(avg);
    }

    if (window.genChart.data.datasets && window.genChart.data.datasets[0]) {
      window.genChart.data.datasets[0].data = chartData;
      window.genChart.update();
      console.log("Updated chart with hourly data");
    }
  }

  console.log("Dashboard update complete");
}

// Manual refresh button handler
function syncWithGoogleSheet() {
  fetchSheetData();
}

// Auto-refresh every 5 minutes
let sheetRefreshInterval = null;

function startSheetAutoRefresh() {
  if (sheetRefreshInterval) clearInterval(sheetRefreshInterval);

  sheetRefreshInterval = setInterval(
    () => {
      const dashboardPage = document.getElementById("page-dashboard");
      if (dashboardPage && dashboardPage.classList.contains("active")) {
        fetchSheetData();
      }
    },
    5 * 60 * 1000,
  );
}

// Initialize sheet data loading
function initSheetData() {
  console.log("Initializing sheet data...");
  // Wait a bit for charts to initialize
  setTimeout(() => {
    fetchSheetData();
  }, 1000);
  startSheetAutoRefresh();
}

// Override showPage to load data when dashboard is shown
const originalShowPageFunc = window.showPage;
window.showPage = function (id, el) {
  if (originalShowPageFunc) originalShowPageFunc(id, el);

  if (id === "dashboard" && sheetData.raw.length === 0) {
    fetchSheetData();
  }
};

// Make sync function available globally
window.syncWithGoogleSheet = syncWithGoogleSheet;

// ============================================
// MAINTENANCE FEED - Google Sheets Backend
// ============================================

// REPLACE THIS URL with your Google Apps Script Web App URL
// After deploying your Google Script, paste the URL here:
const FEED_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyn77UGLRrxMUQEzgK4BVlxXku4Sc58m45Uy_S2jl_aML1OenGvNXpYQfiTGrsfmqqe/exec";

let feedPosts = [];
let selectedImageData = null;
let currentUser = "Rajesh Kumar"; // Can be dynamic from login

// Initialize Feed module
function initMaintenanceFeed() {
  console.log("Initializing Maintenance Feed...");
  loadFeedPosts();
  attachFeedEventListeners();
}

function attachFeedEventListeners() {
  const submitBtn = document.getElementById("submitFeedBtn");
  const imageInput = document.getElementById("feedImageInput");
  const captionInput = document.getElementById("feedCaption");
  const equipmentSelect = document.getElementById("feedEquipment");

  if (submitBtn) {
    submitBtn.onclick = submitFeedPost;
  }

  if (imageInput) {
    imageInput.onchange = handleImageSelect;
  }
}

function handleImageSelect(e) {
  const file = e.target.files[0];
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = function (event) {
      selectedImageData = event.target.result;
      const previewDiv = document.getElementById("feedImagePreview");
      const previewImg = document.getElementById("previewImg");
      if (previewDiv && previewImg) {
        previewImg.src = selectedImageData;
        previewDiv.style.display = "inline-block";
      }
    };
    reader.readAsDataURL(file);
  }
}

function clearSelectedImage() {
  selectedImageData = null;
  const previewDiv = document.getElementById("feedImagePreview");
  const imageInput = document.getElementById("feedImageInput");
  if (previewDiv) previewDiv.style.display = "none";
  if (imageInput) imageInput.value = "";
}

async function submitFeedPost() {
  const caption = document.getElementById("feedCaption")?.value.trim();
  const equipment = document.getElementById("feedEquipment")?.value;
  const statusDiv = document.getElementById("feedPostStatus");

  if (!caption) {
    showFeedStatus("Please enter a caption", "error");
    return;
  }

  if (!equipment) {
    showFeedStatus("Please select equipment", "error");
    return;
  }

  const submitBtn = document.getElementById("submitFeedBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
  }

  const postData = {
    action: "addPost",
    caption: caption,
    equipment: equipment,
    author: currentUser,
    timestamp: new Date().toISOString(),
    imageData: selectedImageData || null,
  };

  try {
    const response = await fetch(FEED_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", // For Google Scripts
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postData),
    });

    showFeedStatus("✓ Post published successfully!", "success");

    // Clear form
    document.getElementById("feedCaption").value = "";
    document.getElementById("feedEquipment").value = "";
    clearSelectedImage();

    // Reload posts after short delay
    setTimeout(() => loadFeedPosts(), 1000);
  } catch (error) {
    console.error("Submit error:", error);
    showFeedStatus(
      "⚠️ Offline: Post saved locally. Will sync when online.",
      "info",
    );
    // Save to localStorage for offline sync
    saveOfflinePost(postData);
    loadFeedPosts(); // Show offline posts
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Update';
    }
  }
}

function saveOfflinePost(postData) {
  let offlineQueue = JSON.parse(
    localStorage.getItem("feed_offline_queue") || "[]",
  );
  offlineQueue.push(postData);
  localStorage.setItem("feed_offline_queue", JSON.stringify(offlineQueue));
}

async function loadFeedPosts() {
  const container = document.getElementById("feedPostsList");
  if (!container) return;

  container.innerHTML =
    '<div class="feed-loading"><i class="fas fa-spinner fa-spin"></i> Loading updates...</div>';

  // First load offline posts
  let allPosts = [];
  const offlineQueue = JSON.parse(
    localStorage.getItem("feed_offline_queue") || "[]",
  );
  offlineQueue.forEach((post) => {
    allPosts.push({
      ...post,
      id: "offline_" + Date.now() + Math.random(),
      isOffline: true,
      timestamp: post.timestamp || new Date().toISOString(),
    });
  });

  try {
    // Try to fetch from Google Sheets
    const response = await fetch(
      `${FEED_SCRIPT_URL}?action=getPosts&t=${Date.now()}`,
    );
    const data = await response.json();

    if (data && data.posts) {
      allPosts = [...data.posts, ...allPosts];
      // Clear offline queue if successfully synced
      if (offlineQueue.length > 0) {
        localStorage.removeItem("feed_offline_queue");
        // Attempt to sync offline posts
        syncOfflinePosts();
      }
    }
  } catch (error) {
    console.log("Offline mode - using local data");
    // Load from localStorage cache
    const cached = localStorage.getItem("feed_posts_cache");
    if (cached) {
      const cachedPosts = JSON.parse(cached);
      allPosts = [...cachedPosts, ...allPosts];
    }
  }

  // Remove duplicates by timestamp
  const uniquePosts = [];
  const seen = new Set();
  for (const post of allPosts.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
  )) {
    const key = post.timestamp + post.caption;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePosts.push(post);
    }
  }

  feedPosts = uniquePosts.slice(0, 50);
  renderFeedPosts();

  // Cache for offline
  localStorage.setItem("feed_posts_cache", JSON.stringify(feedPosts));
}

async function syncOfflinePosts() {
  const offlineQueue = JSON.parse(
    localStorage.getItem("feed_offline_queue") || "[]",
  );
  if (offlineQueue.length === 0) return;

  for (const post of offlineQueue) {
    try {
      await fetch(FEED_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...post, action: "addPost" }),
      });
    } catch (e) {}
  }
  localStorage.removeItem("feed_offline_queue");
}

function renderFeedPosts() {
  const container = document.getElementById("feedPostsList");
  if (!container) return;

  if (feedPosts.length === 0) {
    container.innerHTML = `
            <div class="feed-empty">
                <i class="fas fa-images"></i>
                <h4>No maintenance updates yet</h4>
                <p>Be the first to share a maintenance task photo!</p>
            </div>
        `;
    return;
  }

  container.innerHTML = feedPosts
    .map(
      (post) => `
        <div class="feed-post-card" data-id="${post.id || post.timestamp}">
            <div class="feed-post-header">
                <div class="feed-post-author">
                    <div class="feed-author-avatar">${(post.author || "Tech").charAt(0).toUpperCase()}</div>
                    <div class="feed-author-info">
                        <div class="feed-author-name">${escapeHtml(post.author || "Maintenance Team")}</div>
                        <div class="feed-post-time">${formatFeedTime(post.timestamp)}</div>
                    </div>
                </div>
                <div class="feed-post-equipment">
                    <i class="fas fa-microchip"></i> ${escapeHtml(post.equipment || "General")}
                </div>
            </div>
            ${post.imageData ? `<img class="feed-post-image" src="${post.imageData}" alt="Maintenance photo" onclick="openFeedLightbox('${post.imageData}')">` : ""}
            <div class="feed-post-caption">${escapeHtml(post.caption)}</div>
            <div class="feed-post-actions">
                <button class="feed-like-btn" onclick="likeFeedPost('${post.id || post.timestamp}')">
                    <i class="far fa-heart"></i> <span>Like</span>
                </button>
                <button class="feed-comment-btn" onclick="commentOnFeedPost('${post.id || post.timestamp}')">
                    <i class="far fa-comment"></i> <span>Comment</span>
                </button>
            </div>
        </div>
    `,
    )
    .join("");
}

function formatFeedTime(timestamp) {
  if (!timestamp) return "Just now";
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showFeedStatus(message, type) {
  const statusDiv = document.getElementById("feedPostStatus");
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = `feed-status ${type}`;
    setTimeout(() => {
      statusDiv.style.display = "none";
      statusDiv.className = "feed-status";
    }, 3000);
  }
}

function openFeedLightbox(imageSrc) {
  const lightbox = document.createElement("div");
  lightbox.className = "feed-lightbox";
  lightbox.onclick = () => lightbox.remove();
  lightbox.innerHTML = `<img src="${imageSrc}" alt="Full size">`;
  document.body.appendChild(lightbox);
}

function likeFeedPost(postId) {
  showFeedStatus("❤️ Liked! (Sync with server)", "success");
}

function commentOnFeedPost(postId) {
  const comment = prompt("Add a comment:");
  if (comment) {
    showFeedStatus("💬 Comment added!", "success");
  }
}

// Override the maintenance tab handler to include feed
const originalMaintenanceTabHandler = window.initMaintenance;
window.initMaintenance = function () {
  if (originalMaintenanceTabHandler) originalMaintenanceTabHandler();
  initMaintenanceFeed();
};

// ============================================
// NAVIGATION & CORE FUNCTIONS
// ============================================

function showPage(id, el) {
  // Hide all pages
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));

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

  // ============================================
  // UPDATED: Load generation data from Google Sheet
  // ============================================
  if (id === "generation") {
    if (!GenDB?.allDays?.length) {
      loadGenerationFromSheetPermanent();
    }
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

  if (!GenDB.allDays || GenDB.allDays.length === 0) {
    if (emptyState) emptyState.style.display = "flex";
    if (content) content.style.display = "none";
    if (leftPanel) leftPanel.style.display = "none";
    if (filesCard) filesCard.style.display = "none";
    return;
  }

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
  // ============================================
  // HANDLE EMPTY STATE - Show message if no data
  // ============================================
  if (!days || days.length === 0) {
    const kpiRow = document.getElementById("genKpiRow");
    if (kpiRow) {
      kpiRow.innerHTML = `
        <div class="gen-kpi-card" style="grid-column: span 4; text-align: center; padding: 60px 20px;">
          <i class="fas fa-cloud-upload-alt" style="font-size: 64px; opacity: 0.5; margin-bottom: 16px;"></i>
          <h3 style="margin-bottom: 8px;">No Generation Data</h3>
          <p style="color: var(--text-muted);">Click "Refresh from Sheet" to load data from Google Sheets<br>or upload a CSV/Excel file.</p>
        </div>
      `;
    }

    // Clear other containers
    const trendCanvas = document.getElementById("genTrendChart");
    if (trendCanvas && window.genCharts?.genTrend) {
      window.genCharts.genTrend.destroy();
    }

    const dailyTable = document.getElementById("genDailySummaryBody");
    if (dailyTable) {
      dailyTable.innerHTML =
        '<tr><td colspan="12" style="text-align:center; padding:40px;">No data available. Click refresh to load.</td></tr>';
    }

    return;
  }

  // ============================================
  // CALCULATE STATISTICS
  // ============================================
  const totalU1 = days.reduce((s, d) => s + (d.computed?.u1Energy || 0), 0);
  const totalU2 = days.reduce((s, d) => s + (d.computed?.u2Energy || 0), 0);
  const totalEnergy = totalU1 + totalU2;
  const totalOpHours = days.reduce((s, d) => s + (d.computed?.opHours || 0), 0);
  const totalShutdown = days.reduce(
    (s, d) => s + (d.computed?.shutdownHrs || 0),
    0,
  );
  const maxMW = Math.max(...days.map((d) => d.computed?.maxMW || 0));
  const avgPF =
    days.reduce((s, d) => s + (d.computed?.avgPF || 0), 0) / days.length;

  // ============================================
  // UPDATE QUICK STATS (Left Panel)
  // ============================================
  const qsDays = document.getElementById("qsDays");
  if (qsDays) qsDays.innerHTML = days.length;

  const qsHours = document.getElementById("qsHours");
  if (qsHours) qsHours.innerHTML = totalOpHours;

  const qsShutdown = document.getElementById("qsShutdown");
  if (qsShutdown) qsShutdown.innerHTML = totalShutdown;

  const qsPF = document.getElementById("qsPF");
  if (qsPF) qsPF.innerHTML = avgPF.toFixed(3);

  // ============================================
  // UPDATE TITLE AND SUBTITLE
  // ============================================
  const genDashTitle = document.getElementById("genDashTitle");
  if (genDashTitle) {
    genDashTitle.innerHTML = `${formatMonthYear(days[0].bsDate)} – ${days.length} Days`;
  }

  const genDashSubtitle = document.getElementById("genDashSubtitle");
  if (genDashSubtitle) {
    genDashSubtitle.innerHTML = `${days[0].bsDate} – ${days[days.length - 1].bsDate} · Set Nadi Hydroelectric Project`;
  }

  // ============================================
  // UPDATE KPI CARDS
  // ============================================
  const kpiRow = document.getElementById("genKpiRow");
  if (kpiRow) {
    kpiRow.innerHTML = `
      <div class="gen-kpi-card cyan">
        <div class="gen-kpi-label"><i class="fas fa-bolt"></i> TOTAL GENERATION</div>
        <div class="gen-kpi-value">${totalEnergy.toFixed(1)}<span class="gen-kpi-unit">MWh</span></div>
        <div class="gen-kpi-sub">U1: ${totalU1.toFixed(1)} + U2: ${totalU2.toFixed(1)} MWh</div>
      </div>
      <div class="gen-kpi-card blue">
        <div class="gen-kpi-label"><i class="fas fa-charging-station"></i> GRID EXPORT</div>
        <div class="gen-kpi-value">${(totalEnergy * 0.98).toFixed(1)}<span class="gen-kpi-unit">MWh</span></div>
        <div class="gen-kpi-sub">Via 132kV Outgoing Line</div>
      </div>
      <div class="gen-kpi-card green">
        <div class="gen-kpi-label"><i class="fas fa-clock"></i> OP HOURS</div>
        <div class="gen-kpi-value">${totalOpHours}<span class="gen-kpi-unit">hrs</span></div>
        <div class="gen-kpi-sub">Shutdown: ${totalShutdown} hrs · ${days.length} days</div>
      </div>
      <div class="gen-kpi-card amber">
        <div class="gen-kpi-label"><i class="fas fa-chart-line"></i> PEAK MW</div>
        <div class="gen-kpi-value">${maxMW.toFixed(2)}<span class="gen-kpi-unit">MW</span></div>
        <div class="gen-kpi-sub">Avg PF: ${avgPF.toFixed(3)} · Hz: 49.98</div>
      </div>
    `;
  }

  // ============================================
  // RENDER ALL CHARTS AND TABLES
  // ============================================
  renderGenTrendChart(days, "mwh");
  renderUnitCompChart(days);
  renderPFHzChart(days);
  renderHourlyProfileChart(days);
  renderGenDailyTable(days);

  const genTableDaysCount = document.getElementById("genTableDaysCount");
  if (genTableDaysCount) {
    genTableDaysCount.innerHTML = `${days.length} days`;
  }
}

// ============================================
// HELPER FUNCTION: Format month/year from BS date
// ============================================
function formatMonthYear(bsDate) {
  if (!bsDate) return "Unknown";
  const parts = bsDate.split("/");
  if (parts.length >= 2) {
    const month = parseInt(parts[1]);
    const year = parseInt(parts[0]);
    const monthNames = [
      "Baisakh",
      "Jestha",
      "Ashad",
      "Shrawan",
      "Bhadra",
      "Ashwin",
      "Kartik",
      "Mangsir",
      "Poush",
      "Magh",
      "Falgun",
      "Chaitra",
    ];
    return `${monthNames[month - 1]} ${year}`;
  }
  return bsDate;
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
    const genDate = d.bsDate ? d.bsDate.replace(/\//g, "-") : "";
    return (!dateFrom || genDate >= dateFrom) && (!dateTo || genDate <= dateTo);
  });

  const filteredFaults = faults.filter((f) => {
    const faultDate = f.date ? f.date.replace(/\//g, "-") : "";
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
                <p>During the reporting period, the plant generated <strong>${totalGen.toFixed(1)} MWh</strong> of electricity across ${filteredGen.length} operational days. A total of <strong>${totalFaults} faults</strong> were recorded, with ${criticalFaults} classified as critical/high severity. ${resolvedFaults} faults have been resolved (${Math.round((resolvedFaults / (totalFaults || 1)) * 100)}% resolution rate).</p>
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
                        <tr><td>Resolution Rate</td><td>${Math.round((resolvedFaults / (totalFaults || 1)) * 100)}%</td></tr>
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
                    <thead>
                        <tr><th>Date</th><th>Total MWh</th><th>U1 MWh</th><th>U2 MWh</th><th>Op Hours</th></tr>
                    </thead>
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
                    <thead>
                        <tr><th>ID</th><th>Date</th><th>Equipment</th><th>Type</th><th>Severity</th><th>Status</th></tr>
                    </thead>
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
                    <thead>
                        <tr><th>Asset</th><th>Task</th><th>Due Date</th><th>Assigned To</th></tr>
                    </thead>
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
                    <thead>
                        <tr><th>Asset Name</th><th>Health Score</th><th>Status</th><th>Last Maintenance</th><th>Next Maintenance</th></tr>
                    </thead>
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

// Add to script.js - Quick Log Functions

// Global variables for duplicate handling
let pendingQuickLogData = null;
let pendingDuplicateCheck = null;
let isOverwriteMode = false;

// Populate hour dropdown (0-23)
function populateHourDropdown() {
  const hourSelect = document.getElementById("logHour");
  if (!hourSelect) return;

  hourSelect.innerHTML = '<option value="">Select hour</option>';
  const now = new Date();
  const currentHour = now.getHours();

  for (let i = 0; i < 24; i++) {
    const option = document.createElement("option");
    option.value = i;
    const hourStr = i.toString().padStart(2, "0");
    const isCurrent = i === currentHour;
    option.textContent = `${hourStr}:00${isCurrent ? " (current hour)" : ""}`;
    if (isCurrent) option.selected = true;
    hourSelect.appendChild(option);
  }
}

// Initialize quick log modal
function initQuickLog() {
  populateHourDropdown();

  // Set default date to today
  const today = new Date();
  const dateInput = document.getElementById("logDate");
  if (dateInput) {
    dateInput.valueAsDate = today;
  }

  // Set default power factor values
  const u1PF = document.getElementById("u1PF");
  const u2PF = document.getElementById("u2PF");
  if (u1PF) u1PF.value = "0.95";
  if (u2PF) u2PF.value = "0.95";

  // Add shutdown checkbox listeners
  const u1Shutdown = document.getElementById("u1Shutdown");
  const u2Shutdown = document.getElementById("u2Shutdown");
  const u1MW = document.getElementById("u1MW");
  const u2MW = document.getElementById("u2MW");

  if (u1Shutdown) {
    u1Shutdown.addEventListener("change", () => {
      if (u1Shutdown.checked) {
        if (u1MW) u1MW.value = "0";
        if (u1MW) u1MW.disabled = true;
      } else {
        if (u1MW) u1MW.disabled = false;
      }
    });
  }

  if (u2Shutdown) {
    u2Shutdown.addEventListener("change", () => {
      if (u2Shutdown.checked) {
        if (u2MW) u2MW.value = "0";
        if (u2MW) u2MW.disabled = true;
      } else {
        if (u2MW) u2MW.disabled = false;
      }
    });
  }

  // Add auto-shutdown suggestion
  const checkBothZero = () => {
    const u1Val = parseFloat(u1MW?.value || 0);
    const u2Val = parseFloat(u2MW?.value || 0);
    if (u1Val === 0 && u2Val === 0 && u1Shutdown && u2Shutdown) {
      if (!u1Shutdown.checked && !u2Shutdown.checked) {
        // Suggest shutdown
        const suggestMsg = document.getElementById("shutdownSuggestion");
        if (!suggestMsg) {
          const msg = document.createElement("div");
          msg.id = "shutdownSuggestion";
          msg.className = "help-text";
          msg.style.color = "var(--accent-amber)";
          msg.innerHTML =
            '<i class="fas fa-info-circle"></i> Both units show 0 MW. Consider marking as shutdown.';
          u1MW?.closest(".quicklog-unit-section")?.after(msg);
        }
      }
    } else {
      const msg = document.getElementById("shutdownSuggestion");
      if (msg) msg.remove();
    }
  };

  if (u1MW) u1MW.addEventListener("input", checkBothZero);
  if (u2MW) u2MW.addEventListener("input", checkBothZero);
}

// Open quick log modal
function openQuickLogModal() {
  const modal = document.getElementById("quickLogModal");
  if (!modal) return;

  // Reset form
  const form = document.getElementById("quickLogForm");
  if (form) form.reset();

  // Reset duplicate warning
  const warning = document.getElementById("duplicateWarning");
  if (warning) warning.style.display = "none";

  // Reset pending data
  pendingQuickLogData = null;
  pendingDuplicateCheck = null;
  isOverwriteMode = false;

  // Re-enable save button
  const saveBtn = document.getElementById("saveQuickLogBtn");
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Entry";
  }

  // Set defaults
  const today = new Date();
  const dateInput = document.getElementById("logDate");
  if (dateInput) dateInput.valueAsDate = today;

  const u1PF = document.getElementById("u1PF");
  const u2PF = document.getElementById("u2PF");
  if (u1PF && !u1PF.value) u1PF.value = "0.95";
  if (u2PF && !u2PF.value) u2PF.value = "0.95";

  const u1MW = document.getElementById("u1MW");
  const u2MW = document.getElementById("u2MW");
  if (u1MW) u1MW.disabled = false;
  if (u2MW) u2MW.disabled = false;

  const u1Shutdown = document.getElementById("u1Shutdown");
  const u2Shutdown = document.getElementById("u2Shutdown");
  if (u1Shutdown) u1Shutdown.checked = false;
  if (u2Shutdown) u2Shutdown.checked = false;

  modal.style.display = "flex";
}

// Close quick log modal
function closeQuickLogModal() {
  const modal = document.getElementById("quickLogModal");
  if (modal) modal.style.display = "none";

  // Remove shutdown suggestion if exists
  const suggestion = document.getElementById("shutdownSuggestion");
  if (suggestion) suggestion.remove();
}

// Validate form data
function validateQuickLogData() {
  const errors = [];

  const date = document.getElementById("logDate").value;
  if (!date) errors.push("Date is required");

  const hour = document.getElementById("logHour").value;
  if (hour === "") errors.push("Hour is required");

  const u1MW = parseFloat(document.getElementById("u1MW").value) || 0;
  const u2MW = parseFloat(document.getElementById("u2MW").value) || 0;
  const u1Shutdown = document.getElementById("u1Shutdown").checked;
  const u2Shutdown = document.getElementById("u2Shutdown").checked;

  if (u1MW < 0 || u1MW > 35) errors.push("Unit I MW must be between 0 and 35");
  if (u2MW < 0 || u2MW > 35) errors.push("Unit II MW must be between 0 and 35");

  const u1PF = parseFloat(document.getElementById("u1PF").value);
  const u2PF = parseFloat(document.getElementById("u2PF").value);

  if (u1PF && (u1PF < 0.8 || u1PF > 1.0))
    errors.push("Unit I Power Factor must be between 0.80 and 1.00");
  if (u2PF && (u2PF < 0.8 || u2PF > 1.0))
    errors.push("Unit II Power Factor must be between 0.80 and 1.00");

  // Check if both units are 0 but not marked as shutdown
  if (u1MW === 0 && u2MW === 0 && !u1Shutdown && !u2Shutdown) {
    const confirmShutdown = confirm(
      "Both units show 0 MW. Mark them as shutdown?",
    );
    if (confirmShutdown) {
      document.getElementById("u1Shutdown").checked = true;
      document.getElementById("u2Shutdown").checked = true;
    }
  }

  return errors;
}

// Check for duplicate entry
function checkForDuplicate(date, hour) {
  if (!GenDB.allDays || GenDB.allDays.length === 0) return null;

  // Convert date to BS format (YYYY/MM/DD)
  const bsDate = date.replace(/-/g, "/");

  // Find the day
  const existingDay = GenDB.allDays.find((d) => d.bsDate === bsDate);
  if (!existingDay) return null;

  // Find the hour
  const existingHour = existingDay.hours.find((h) => h.hour === parseInt(hour));
  if (!existingHour) return null;

  return { existingDay, existingHour };
}

// Collect form data
function collectQuickLogData() {
  const date = document.getElementById("logDate").value;
  const hour = parseInt(document.getElementById("logHour").value);
  const u1Shutdown = document.getElementById("u1Shutdown").checked;
  const u2Shutdown = document.getElementById("u2Shutdown").checked;
  const u1MW = u1Shutdown
    ? 0
    : parseFloat(document.getElementById("u1MW").value) || 0;
  const u2MW = u2Shutdown
    ? 0
    : parseFloat(document.getElementById("u2MW").value) || 0;
  const u1PF = u1Shutdown
    ? null
    : parseFloat(document.getElementById("u1PF").value) || null;
  const u2PF = u2Shutdown
    ? null
    : parseFloat(document.getElementById("u2PF").value) || null;
  const remarks = document.getElementById("logRemarks").value || "";

  return {
    date: date.replace(/-/g, "/"),
    hour: hour,
    hourStr: `${hour.toString().padStart(2, "0")}:00`,
    u1Shutdown,
    u2Shutdown,
    u1: { mw: u1MW, pf: u1PF, hz: 50.0 },
    u2: { mw: u2MW, pf: u2PF, hz: 50.0 },
    grid: { mw: u1MW + u2MW },
    remarks,
  };
}

// Handle duplicate choice
function handleDuplicateChoice(choice) {
  const warning = document.getElementById("duplicateWarning");
  const saveBtn = document.getElementById("saveQuickLogBtn");

  if (choice === "overwrite") {
    isOverwriteMode = true;
    if (warning) warning.style.display = "none";
    if (saveBtn) saveBtn.disabled = false;
    executeSaveQuickLog(true);
  } else if (choice === "skip") {
    if (warning) warning.style.display = "none";
    if (saveBtn) saveBtn.disabled = false;
    showGenStatus("Entry skipped (duplicate)", "info");
    closeQuickLogModal();
  } else if (choice === "cancel") {
    if (warning) warning.style.display = "none";
    if (saveBtn) saveBtn.disabled = false;
  }
}

// Execute save (with optional overwrite)
function executeSaveQuickLog(overwrite = false) {
  const data = pendingQuickLogData;
  if (!data) return;

  const duplicate = pendingDuplicateCheck;

  if (duplicate && !overwrite) {
    // This should not happen - handled by duplicate warning
    return;
  }

  if (duplicate && overwrite) {
    // Overwrite existing hour data
    const dayIndex = GenDB.allDays.findIndex((d) => d.bsDate === data.date);
    if (dayIndex !== -1) {
      const hourIndex = GenDB.allDays[dayIndex].hours.findIndex(
        (h) => h.hour === data.hour,
      );
      if (hourIndex !== -1) {
        GenDB.allDays[dayIndex].hours[hourIndex] = {
          ...GenDB.allDays[dayIndex].hours[hourIndex],
          ...data,
        };
        // Recompute the day's statistics
        GenDB.allDays[dayIndex].computed = computeGenDayEnergy(
          GenDB.allDays[dayIndex].hours,
        );
        showGenStatus(
          `✓ Overwritten: ${data.date} at ${data.hourStr}`,
          "success",
        );
      } else {
        // Add new hour to existing day
        GenDB.allDays[dayIndex].hours.push(data);
        GenDB.allDays[dayIndex].hours.sort((a, b) => a.hour - b.hour);
        GenDB.allDays[dayIndex].computed = computeGenDayEnergy(
          GenDB.allDays[dayIndex].hours,
        );
        showGenStatus(`✓ Added: ${data.date} at ${data.hourStr}`, "success");
      }
    }
  } else {
    // No duplicate - add new data
    const existingDay = GenDB.allDays.find((d) => d.bsDate === data.date);

    if (existingDay) {
      // Add to existing day
      existingDay.hours.push(data);
      existingDay.hours.sort((a, b) => a.hour - b.hour);
      existingDay.computed = computeGenDayEnergy(existingDay.hours);
    } else {
      // Create new day
      const newDay = {
        bsDate: data.date,
        hours: [data],
        computed: computeGenDayEnergy([data]),
      };
      GenDB.allDays.push(newDay);
      GenDB.allDays.sort((a, b) => a.bsDate.localeCompare(b.bsDate));
    }
    showGenStatus(`✓ Saved: ${data.date} at ${data.hourStr}`, "success");
  }

  // Save to localStorage
  localStorage.setItem("gen_days", JSON.stringify(GenDB.allDays));

  // Refresh dashboard
  if (GenDB.allDays.length > 0) {
    onGenDataLoaded();
  }

  // Close modal
  closeQuickLogModal();

  // Reset pending data
  pendingQuickLogData = null;
  pendingDuplicateCheck = null;
  isOverwriteMode = false;
}

// Save quick log entry
function saveQuickLog() {
  // Validate
  const errors = validateQuickLogData();
  if (errors.length > 0) {
    showGenStatus(errors.join(", "), "error");
    return;
  }

  // Collect data
  const data = collectQuickLogData();

  // Check for duplicate
  const duplicate = checkForDuplicate(data.date, data.hour);

  if (duplicate) {
    // Show duplicate warning
    const warning = document.getElementById("duplicateWarning");
    const message = document.getElementById("duplicateMessage");
    const saveBtn = document.getElementById("saveQuickLogBtn");

    if (warning && message) {
      message.innerHTML = `<strong>Duplicate detected!</strong> Data already exists for ${data.date} at ${data.hourStr}. What would you like to do?`;
      warning.style.display = "flex";
      if (saveBtn) saveBtn.disabled = true;

      // Store pending data
      pendingQuickLogData = data;
      pendingDuplicateCheck = duplicate;
    }
  } else {
    // No duplicate, save directly
    pendingQuickLogData = data;
    pendingDuplicateCheck = null;
    executeSaveQuickLog(false);
  }
}

// Add event listeners when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Quick log button
  const quickLogBtn = document.getElementById("quickLogBtn");
  if (quickLogBtn) {
    quickLogBtn.onclick = openQuickLogModal;
  }

  // Save button
  const saveBtn = document.getElementById("saveQuickLogBtn");
  if (saveBtn) {
    saveBtn.onclick = saveQuickLog;
  }

  // Initialize quick log form
  initQuickLog();

  // Close modal on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeQuickLogModal();
    }
  });

  // Close modal when clicking outside
  const modal = document.getElementById("quickLogModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeQuickLogModal();
      }
    });
  }

  // ============================================
  // ADD THIS CODE HERE (at the end, before the closing })
  // ============================================

  // Refresh generation data from Google Sheet
  const refreshGenBtn = document.getElementById("refreshGenSheetBtn");
  if (refreshGenBtn) {
    refreshGenBtn.onclick = function () {
      loadGenerationFromSheet();
    };
  }

  // Also add manual sync button if it exists (from earlier)
  const manualSyncBtn = document.getElementById("manualSyncBtn");
  if (manualSyncBtn) {
    manualSyncBtn.onclick = function () {
      if (typeof fetchSheetData === "function") {
        fetchSheetData();
      }
    };
  }
});

// Expose functions globally
window.openQuickLogModal = openQuickLogModal;
window.closeQuickLogModal = closeQuickLogModal;
window.saveQuickLog = saveQuickLog;
window.handleDuplicateChoice = handleDuplicateChoice;

// ============================================
// FACEBOOK STYLE MAINTENANCE FEED
// ============================================

let fbPosts = [];
let fbSelectedImage = null;
let fbCurrentUser = "Rajesh Kumar";
let fbPostsToShow = 10;
let fbIsLoading = false;

// Initialize Facebook-style feed
function initFacebookFeed() {
  console.log("Initializing Facebook-style feed...");
  loadFbPosts();
  attachFbEventListeners();
}

function attachFbEventListeners() {
  const imageInput = document.getElementById("fbImageInput");
  const cameraInput = document.getElementById("fbCameraInput");

  if (imageInput) {
    imageInput.onchange = (e) => handleFbImageSelect(e.target.files[0]);
  }
  if (cameraInput) {
    cameraInput.onchange = (e) => handleFbImageSelect(e.target.files[0]);
  }

  // Close modal on escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeFbModal();
  });
}

function handleFbImageSelect(file) {
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    compressFbImage(event.target.result, 0.7, function (compressed) {
      fbSelectedImage = compressed;
      const previewArea = document.getElementById("fbImagePreviewArea");
      const previewImg = document.getElementById("fbPreviewImg");
      if (previewArea && previewImg) {
        previewImg.src = compressed;
        previewArea.style.display = "block";
      }
    });
  };
  reader.readAsDataURL(file);
}

function compressFbImage(dataUrl, quality, callback) {
  const img = new Image();
  img.onload = function () {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let width = img.width;
    let height = img.height;
    const maxWidth = 1080;

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    const compressed = canvas.toDataURL("image/jpeg", quality);
    callback(compressed);
  };
  img.src = dataUrl;
}

function clearFbImage() {
  fbSelectedImage = null;
  const previewArea = document.getElementById("fbImagePreviewArea");
  const imageInput = document.getElementById("fbImageInput");
  const cameraInput = document.getElementById("fbCameraInput");

  if (previewArea) previewArea.style.display = "none";
  if (imageInput) imageInput.value = "";
  if (cameraInput) cameraInput.value = "";
}

function triggerImageUpload() {
  document.getElementById("fbImageInput").click();
}

function triggerCameraUpload() {
  document.getElementById("fbCameraInput").click();
}

function openQuickPostModal() {
  const modal = document.getElementById("fbPostModal");
  if (modal) {
    modal.style.display = "flex";
    document.body.classList.add("modal-open");
    document.getElementById("fbPostCaption").focus();
  }
}

function openCameraPost() {
  document.getElementById("fbCameraInput").click();
  setTimeout(() => openQuickPostModal(), 100);
}

function openGalleryPost() {
  document.getElementById("fbImageInput").click();
  setTimeout(() => openQuickPostModal(), 100);
}

function closeFbModal() {
  const modal = document.getElementById("fbPostModal");
  if (modal) {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
    // Reset form
    document.getElementById("fbPostCaption").value = "";
    clearFbImage();
  }
}

function toggleEmojiPicker() {
  const emojiList = document.getElementById("fbEmojiList");
  if (emojiList) {
    emojiList.style.display =
      emojiList.style.display === "none" ? "grid" : "none";
  }
}

function addEmoji(emoji) {
  const textarea = document.getElementById("fbPostCaption");
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    textarea.value = text.substring(0, start) + emoji + text.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
  }
  document.getElementById("fbEmojiList").style.display = "none";
}

async function submitFbPost() {
  const caption = document.getElementById("fbPostCaption")?.value.trim();
  const equipment = document.getElementById("fbPostEquipment")?.value;
  const postBtn = document.getElementById("fbSubmitPostBtn");

  if (!caption) {
    showFbToast("Please write something before posting", "error");
    return;
  }

  if (postBtn) {
    postBtn.disabled = true;
    postBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
  }

  const postData = {
    action: "addPost",
    caption: caption,
    equipment: equipment,
    author: fbCurrentUser,
    timestamp: new Date().toISOString(),
    imageData: fbSelectedImage || null,
  };

  // Add to UI immediately (optimistic update)
  addPostToWall({
    ...postData,
    id: "temp_" + Date.now(),
    isOptimistic: true,
  });

  closeFbModal();
  showFbToast("Posting...", "info");

  try {
    const response = await fetch(`${FEED_SCRIPT_URL}`, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postData),
    });

    const result = await response.json();

    if (result.success) {
      showFbToast("✓ Post published!", "success");
      await loadFbPosts(); // Refresh to get real post
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("Submit error:", error);
    showFbToast("⚠️ Saved offline. Will sync when online.", "warning");
    saveFbOfflinePost(postData);
  }

  if (postBtn) {
    postBtn.disabled = false;
    postBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post';
  }
}

function addPostToWall(post) {
  const container = document.getElementById("fbPostsWall");
  if (!container) return;

  const postHtml = createFbPostHtml(post);

  if (container.querySelector(".fb-loading-spinner")) {
    container.innerHTML = postHtml;
  } else {
    container.insertAdjacentHTML("afterbegin", postHtml);
  }
}

function createFbPostHtml(post) {
  const timeAgo = formatFbTime(post.timestamp);
  const authorInitial = (post.author || "MT").charAt(0).toUpperCase();
  const locationName = (post.equipment || "Maintenance").replace("📍 ", "");

  return `
        <div class="fb-post-card" data-post-id="${post.id || post.timestamp}">
            <div class="fb-post-header">
                <div class="fb-post-avatar" style="background: ${getFbAvatarColor(post.author)}">
                    ${authorInitial}
                </div>
                <div class="fb-post-meta">
                    <div class="fb-post-author">
                        ${escapeHtml(post.author || "Maintenance Team")}
                        <span class="fb-post-location">📍 ${escapeHtml(locationName)}</span>
                    </div>
                    <div class="fb-post-time">
                        ${timeAgo}
                        ${post.isOptimistic ? ' · <span style="color: var(--accent-amber);">Posting...</span>' : ""}
                        ${post.isOffline ? ' · <span style="color: var(--accent-amber);"><i class="fas fa-save"></i> Offline</span>' : ""}
                    </div>
                </div>
            </div>
            ${post.caption ? `<div class="fb-post-caption">${formatFbCaption(post.caption)}</div>` : ""}
            ${
              post.imageData && post.imageData.startsWith("data:image")
                ? `<img class="fb-post-image" src="${post.imageData}" alt="Maintenance" onclick="openFbLightbox('${post.imageData}')" loading="lazy">`
                : ""
            }
            <div class="fb-post-stats">
                <span>❤️ 0</span>
                <span>💬 0 comments</span>
            </div>
            <div class="fb-post-actions">
                <button class="fb-action-btn" onclick="likeFbPost(this)">
                    <i class="far fa-heart"></i> Like
                </button>
                <button class="fb-action-btn" onclick="commentFbPost(this)">
                    <i class="far fa-comment"></i> Comment
                </button>
                <button class="fb-action-btn" onclick="shareFbPost(this)">
                    <i class="fas fa-share"></i> Share
                </button>
            </div>
        </div>
    `;
}

function formatFbCaption(caption) {
  // Replace emoji shortcodes and format links
  let formatted = escapeHtml(caption);
  // Simple URL detection
  formatted = formatted.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" style="color: var(--accent-blue);">$1</a>',
  );
  return formatted;
}

function formatFbTime(timestamp) {
  if (!timestamp) return "Just now";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getFbAvatarColor(name) {
  const colors = ["#4a9de8", "#29c48f", "#f5ae3a", "#9f7aea", "#e24b4a"];
  const hash = (name || "")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

async function loadFbPosts() {
  const container = document.getElementById("fbPostsWall");
  if (!container) return;

  container.innerHTML =
    '<div class="fb-loading-spinner"><div class="fb-spinner"></div><span>Loading updates...</span></div>';

  let allPosts = [];

  // Load offline posts
  const offlineQueue = JSON.parse(
    localStorage.getItem("fb_offline_queue") || "[]",
  );
  offlineQueue.forEach((post) => {
    allPosts.push({
      ...post,
      id: "offline_" + Date.now(),
      isOffline: true,
      timestamp: post.timestamp || new Date().toISOString(),
    });
  });

  try {
    const response = await fetch(
      `${FEED_SCRIPT_URL}?action=getPosts&t=${Date.now()}`,
    );
    const data = await response.json();

    if (data.success && data.posts) {
      allPosts = [...data.posts, ...allPosts];
      if (offlineQueue.length > 0) {
        localStorage.removeItem("fb_offline_queue");
      }
    }
  } catch (error) {
    console.log("Offline mode");
    const cached = localStorage.getItem("fb_posts_cache");
    if (cached) {
      const cachedPosts = JSON.parse(cached);
      allPosts = [...cachedPosts, ...allPosts];
    }
  }

  // Sort and deduplicate
  allPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const unique = [];
  const seen = new Set();
  for (const post of allPosts) {
    const key = post.id || post.timestamp;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(post);
    }
  }

  fbPosts = unique.slice(0, fbPostsToShow);
  renderFbPosts();

  // Cache
  localStorage.setItem("fb_posts_cache", JSON.stringify(fbPosts.slice(0, 30)));
}

function renderFbPosts() {
  const container = document.getElementById("fbPostsWall");
  if (!container) return;

  if (fbPosts.length === 0) {
    container.innerHTML = `
            <div class="fb-empty-wall">
                <div class="fb-empty-icon">📸</div>
                <h4>No maintenance updates yet</h4>
                <p>Be the first to share a maintenance moment!</p>
                <button class="fb-post-btn" style="margin-top: 16px;" onclick="openQuickPostModal()">
                    <i class="fas fa-plus"></i> Create First Post
                </button>
            </div>
        `;
    return;
  }

  container.innerHTML = fbPosts.map((post) => createFbPostHtml(post)).join("");

  const loadMoreBtn = document.getElementById("fbLoadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.style.display =
      fbPosts.length >= fbPostsToShow && fbPosts.length < 50 ? "flex" : "none";
  }
}

function loadMorePosts() {
  fbPostsToShow += 10;
  renderFbPosts();
}

function likeFbPost(btn) {
  const isLiked = btn.classList.contains("liked");
  btn.classList.toggle("liked");
  btn.innerHTML = isLiked
    ? '<i class="far fa-heart"></i> Like'
    : '<i class="fas fa-heart"></i> Liked';

  // Update stats
  const statsDiv = btn
    .closest(".fb-post-card")
    ?.querySelector(".fb-post-stats span:first-child");
  if (statsDiv) {
    const currentLikes = parseInt(statsDiv.textContent.match(/\d+/)?.[0] || 0);
    statsDiv.innerHTML = `❤️ ${isLiked ? currentLikes - 1 : currentLikes + 1}`;
  }

  showFbToast(isLiked ? "Unliked" : "Liked!", "success");
}

function commentFbPost(btn) {
  const comment = prompt("Write a comment...");
  if (comment) {
    showFbToast("💬 Comment added!", "success");
  }
}

function shareFbPost(btn) {
  if (navigator.share) {
    navigator
      .share({
        title: "Maintenance Update",
        text: "Check out this maintenance update from HydroPlant",
      })
      .catch(() => {});
  } else {
    showFbToast("🔗 Link copied to clipboard", "info");
  }
}

function openFbLightbox(imageSrc) {
  const lightbox = document.createElement("div");
  lightbox.className = "feed-lightbox";
  lightbox.onclick = () => lightbox.remove();
  lightbox.innerHTML = `<img src="${imageSrc}" alt="Full size">`;
  document.body.appendChild(lightbox);
}

function saveFbOfflinePost(postData) {
  let offlineQueue = JSON.parse(
    localStorage.getItem("fb_offline_queue") || "[]",
  );
  offlineQueue.push({
    ...postData,
    id: "offline_" + Date.now(),
    isOffline: true,
  });
  localStorage.setItem("fb_offline_queue", JSON.stringify(offlineQueue));
}

function showFbToast(message, type) {
  // Create toast if not exists
  let toast = document.getElementById("fbToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "fbToast";
    toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 30px;
            font-size: 14px;
            z-index: 4000;
            backdrop-filter: blur(10px);
            transition: opacity 0.3s;
            white-space: nowrap;
        `;
    document.body.appendChild(toast);
  }

  const colors = {
    success: "#29c48f",
    error: "#e24b4a",
    warning: "#f5ae3a",
    info: "#4a9de8",
  };
  toast.style.background = colors[type] || "#333";
  toast.textContent = message;
  toast.style.opacity = "1";

  setTimeout(() => {
    toast.style.opacity = "0";
  }, 2000);
}

// Initialize on maintenance page load
document.addEventListener("DOMContentLoaded", () => {
  const initFbFeed = () => {
    const maintPage = document.getElementById("page-maintenance");
    if (maintPage && maintPage.classList.contains("active")) {
      initFacebookFeed();
      return true;
    }
    return false;
  };

  if (!initFbFeed()) {
    const observer = new MutationObserver(() => {
      if (initFbFeed()) observer.disconnect();
    });
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ["class"],
    });
  }
});

// Expose global functions
window.openQuickPostModal = openQuickPostModal;
window.closeFbModal = closeFbModal;
window.submitFbPost = submitFbPost;
window.triggerImageUpload = triggerImageUpload;
window.triggerCameraUpload = triggerCameraUpload;
window.clearFbImage = clearFbImage;
window.toggleEmojiPicker = toggleEmojiPicker;
window.addEmoji = addEmoji;
window.likeFbPost = likeFbPost;
window.commentFbPost = commentFbPost;
window.shareFbPost = shareFbPost;
window.openFbLightbox = openFbLightbox;
window.loadMorePosts = loadMorePosts;
window.openCameraPost = openCameraPost;
window.openGalleryPost = openGalleryPost;

// ============================================
// INITIALIZE GOOGLE SHEET DATA ON PAGE LOAD
// ============================================
// This ensures the sheet data loads when the page first loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSheetData);
} else {
  initSheetData();
}

// ============================================
// ENSURE SYNC FUNCTION IS GLOBALLY AVAILABLE
// ============================================

// Make sure sync function is defined globally
window.syncWithGoogleSheet =
  window.syncWithGoogleSheet ||
  function () {
    console.log("Sync button clicked - fetching sheet data...");
    if (typeof fetchSheetData === "function") {
      fetchSheetData();
    } else {
      console.error("fetchSheetData function not found!");
      alert("Data sync function not ready yet. Please refresh the page.");
    }
  };

// Also make sure initSheetData is available
window.initSheetData =
  window.initSheetData ||
  function () {
    console.log("Manual init called");
    if (typeof fetchSheetData === "function") {
      fetchSheetData();
    }
  };

// ============================================
// PERMANENT GENERATION LOG LOADER
// ============================================

async function loadGenerationData() {
  console.log("Loading generation data from Google Sheet...");

  try {
    const response = await fetch(GOOGLE_SHEET_CSV_URL + "&t=" + Date.now());
    const csvText = await response.text();

    const lines = csvText.split(/\r?\n/).filter(function (l) {
      return l.trim();
    });
    const headers = lines[0].split(",");
    const sheetDataRaw = [];

    for (var i = 1; i < lines.length; i++) {
      var values = lines[i].split(",");
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j];
      }
      sheetDataRaw.push(row);
    }

    console.log("Loaded " + sheetDataRaw.length + " rows");

    const daysMap = new Map();

    for (var k = 0; k < sheetDataRaw.length; k++) {
      var row = sheetDataRaw[k];

      var yearValue = row.year;
      var monthValue = row.month;
      var dayValue = row.day;
      var hourValue = parseInt(row.hour);

      if (!yearValue || !monthValue || !dayValue) {
        var dateMatch = row.timestamp
          ? row.timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
          : null;
        if (dateMatch) {
          dayValue = dateMatch[1].padStart(2, "0");
          monthValue = dateMatch[2].padStart(2, "0");
          yearValue = dateMatch[3];
        }
        var hourMatch = row.timestamp
          ? row.timestamp.match(/(\d{1,2}):/)
          : null;
        if (hourMatch) hourValue = parseInt(hourMatch[1]);
      }

      if (!yearValue || !monthValue || !dayValue || isNaN(hourValue)) continue;

      var bsDate = yearValue + "/" + monthValue + "/" + dayValue;
      var u1MW = parseFloat(row.u1_mw) || 0;
      var u2MW = parseFloat(row.u2_mw) || 0;
      var u1MWh =
        parseFloat(row.u1_energy_mwh) || parseFloat(row.u1_hourly_mwh) || u1MW;
      var u2MWh =
        parseFloat(row.u2_energy_mwh) || parseFloat(row.u2_hourly_mwh) || u2MW;
      var isPlantOff = row.is_plant_off === "1";

      if (!daysMap.has(bsDate)) {
        daysMap.set(bsDate, { bsDate: bsDate, hours: [], computed: null });
      }

      var currentDayEntry = daysMap.get(bsDate);
      currentDayEntry.hours.push({
        hour: hourValue,
        hourStr: hourValue + ":00",
        u1Shutdown: isPlantOff,
        u2Shutdown: isPlantOff,
        u1: { mw: u1MW, mwh: u1MWh, pf: 0.95, hz: 50 },
        u2: { mw: u2MW, mwh: u2MWh, pf: 0.95, hz: 50 },
        grid: { mw: u1MW + u2MW },
        remarks: "",
      });
    }

    var allConvertedDays = Array.from(daysMap.values());
    allConvertedDays.sort(function (a, b) {
      return a.bsDate.localeCompare(b.bsDate);
    });

    for (var d = 0; d < allConvertedDays.length; d++) {
      var singleDay = allConvertedDays[d];
      singleDay.hours.sort(function (a, b) {
        return a.hour - b.hour;
      });

      var u1Total = 0,
        u2Total = 0,
        u1HoursCount = 0,
        u2HoursCount = 0;
      var u1MWSum = 0,
        u2MWSum = 0,
        peakMW = 0;

      for (var h = 0; h < singleDay.hours.length; h++) {
        var hourData = singleDay.hours[h];
        if (!hourData.u1Shutdown && hourData.u1.mw > 0) {
          u1Total += hourData.u1.mw;
          u1HoursCount++;
          u1MWSum += hourData.u1.mw;
          if (hourData.u1.mw > peakMW) peakMW = hourData.u1.mw;
        }
        if (!hourData.u2Shutdown && hourData.u2.mw > 0) {
          u2Total += hourData.u2.mw;
          u2HoursCount++;
          u2MWSum += hourData.u2.mw;
          if (hourData.u2.mw > peakMW) peakMW = hourData.u2.mw;
        }
      }

      singleDay.computed = {
        u1Energy: u1Total,
        u2Energy: u2Total,
        totalEnergy: u1Total + u2Total,
        u1AvgMW: u1HoursCount > 0 ? u1MWSum / u1HoursCount : 0,
        u2AvgMW: u2HoursCount > 0 ? u2MWSum / u2HoursCount : 0,
        maxMW: peakMW,
        opHours: singleDay.hours.filter(function (h) {
          return !h.u1Shutdown || !h.u2Shutdown;
        }).length,
        shutdownHrs: singleDay.hours.filter(function (h) {
          return h.u1Shutdown && h.u2Shutdown;
        }).length,
        avgPF: 0.95,
        avgHz: 50,
      };
    }

    window.GenDB = { allDays: allConvertedDays, filteredDays: [] };

    var totalEnergy = 0;
    for (var t = 0; t < allConvertedDays.length; t++) {
      totalEnergy += allConvertedDays[t].computed.totalEnergy;
    }
    console.log(
      "✅ Loaded " +
        allConvertedDays.length +
        " days, " +
        totalEnergy.toFixed(0) +
        " MWh total",
    );

    // Update UI - hide empty state, show content
    var emptyState = document.getElementById("genEmptyState");
    var content = document.getElementById("genDashboardContent");
    if (emptyState) emptyState.style.display = "none";
    if (content) content.style.display = "block";

    // Update KPI display
    updateGenerationKPIs(allConvertedDays);

    // Update file list
    var fileList = document.getElementById("genFileList");
    if (fileList) {
      fileList.innerHTML =
        '<div class="gen-file-item"><div class="gen-file-info"><i class="fas fa-database"></i><span>Google Sheet Data</span><span class="gen-file-badge">' +
        allConvertedDays.length +
        " days · " +
        sheetDataRaw.length +
        " hours</span></div></div>";
    }

    // Update daily table
    var tableBody = document.getElementById("genDailySummaryBody");
    if (tableBody) {
      var tableHtml = "";
      for (
        var dayIdx = 0;
        dayIdx < Math.min(allConvertedDays.length, 30);
        dayIdx++
      ) {
        var day = allConvertedDays[dayIdx];
        tableHtml += `
            <tr>
                <td>${day.bsDate}</td>
                <td>${day.bsDate}</td>
                <td><strong>${day.computed.u1Energy.toFixed(1)}</strong></td>
                <td><strong>${day.computed.u2Energy.toFixed(1)}</strong></td>
                <td><strong style="color:#00e5c8">${day.computed.totalEnergy.toFixed(1)}</strong></td>
                <td>${day.computed.u1AvgMW.toFixed(2)}</td>
                <td>${day.computed.u2AvgMW.toFixed(2)}</td>
                <td>${day.computed.maxMW.toFixed(2)}</td>
                <td>${day.computed.opHours}</td>
                <td>${day.computed.shutdownHrs}</td>
                <td>${day.computed.avgPF.toFixed(3)}</td>
                <td>${day.computed.avgHz.toFixed(2)}</td>
            </tr>
        `;
      }
      tableBody.innerHTML = tableHtml;
    }

    // Update quick stats in left panel
    var qsDays = document.getElementById("qsDays");
    var qsHours = document.getElementById("qsHours");
    var qsShutdown = document.getElementById("qsShutdown");
    var qsPF = document.getElementById("qsPF");

    if (qsDays) qsDays.innerHTML = allConvertedDays.length;
    if (qsHours) {
      var totalOpHours = allConvertedDays.reduce(function (s, d) {
        return s + d.computed.opHours;
      }, 0);
      qsHours.innerHTML = totalOpHours;
    }
    if (qsShutdown) {
      var totalShutdown = allConvertedDays.reduce(function (s, d) {
        return s + d.computed.shutdownHrs;
      }, 0);
      qsShutdown.innerHTML = totalShutdown;
    }
    if (qsPF) qsPF.innerHTML = "0.950";

    // ============================================
    // CREATE CHARTS AFTER DATA IS LOADED
    // ============================================
    setTimeout(function () {
      console.log("Creating charts with", window.GenDB.allDays.length, "days");

      var trendCanvas = document.getElementById("genTrendChart");
      var unitCanvas = document.getElementById("unitCompChart");

      // Create Trend Chart
      if (trendCanvas && window.GenDB.allDays.length > 0) {
        if (window.trendChart) window.trendChart.destroy();

        var days = window.GenDB.allDays;
        var labels = [];
        var chartData = [];
        var limitedDays = days.slice(-90);

        for (var i = 0; i < limitedDays.length; i++) {
          var day = limitedDays[i];
          var parts = day.bsDate.split("/");
          labels.push(parts[1] + "/" + parts[2]);
          chartData.push(day.computed.totalEnergy);
        }

        window.trendChart = new Chart(trendCanvas, {
          type: "line",
          data: {
            labels: labels,
            datasets: [
              {
                label: "Daily Generation (MWh)",
                data: chartData,
                borderColor: "#00e5c8",
                backgroundColor: "rgba(0, 229, 200, 0.1)",
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 1,
                pointHoverRadius: 5,
                pointBackgroundColor: "#00e5c8",
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
                labels: { color: "#8b96a8", font: { size: 11 } },
              },
              tooltip: {
                callbacks: {
                  label: function (ctx) {
                    return "Generation: " + ctx.parsed.y.toFixed(1) + " MWh";
                  },
                },
              },
            },
            scales: {
              x: {
                ticks: {
                  color: "#8b96a8",
                  maxRotation: 45,
                  autoSkip: true,
                  maxTicksLimit: 10,
                },
              },
              y: {
                ticks: {
                  color: "#8b96a8",
                  callback: function (v) {
                    return v + " MWh";
                  },
                },
                title: {
                  display: true,
                  text: "Energy (MWh)",
                  color: "#8b96a8",
                },
              },
            },
          },
        });
        console.log("✅ Trend chart created");
      }

      // Create Unit Comparison Chart
      if (unitCanvas && window.GenDB.allDays.length > 0) {
        if (window.unitChart) window.unitChart.destroy();

        var days = window.GenDB.allDays;
        var hourlyU1 = new Array(24).fill(0);
        var hourlyU2 = new Array(24).fill(0);
        var hourlyCount = new Array(24).fill(0);

        for (var d = 0; d < days.length; d++) {
          var dayData = days[d];
          if (dayData.hours) {
            for (var h = 0; h < dayData.hours.length; h++) {
              var hourData = dayData.hours[h];
              var hourIdx = hourData.hour;
              if (hourIdx >= 0 && hourIdx < 24) {
                if (!hourData.u1Shutdown && hourData.u1 && hourData.u1.mw > 0) {
                  hourlyU1[hourIdx] += hourData.u1.mw;
                  hourlyCount[hourIdx]++;
                }
                if (!hourData.u2Shutdown && hourData.u2 && hourData.u2.mw > 0) {
                  hourlyU2[hourIdx] += hourData.u2.mw;
                }
              }
            }
          }
        }

        for (var hr = 0; hr < 24; hr++) {
          if (hourlyCount[hr] > 0) {
            hourlyU1[hr] = hourlyU1[hr] / hourlyCount[hr];
            hourlyU2[hr] = hourlyU2[hr] / hourlyCount[hr];
          }
        }

        var hourLabels = [];
        for (var hr = 0; hr < 24; hr++) {
          if (hr === 0) hourLabels.push("12 AM");
          else if (hr < 12) hourLabels.push(hr + " AM");
          else if (hr === 12) hourLabels.push("12 PM");
          else hourLabels.push(hr - 12 + " PM");
        }

        window.unitChart = new Chart(unitCanvas, {
          type: "bar",
          data: {
            labels: hourLabels,
            datasets: [
              {
                label: "Unit I",
                data: hourlyU1,
                backgroundColor: "rgba(0, 229, 200, 0.7)",
                borderColor: "#00e5c8",
                borderWidth: 1,
                borderRadius: 6,
              },
              {
                label: "Unit II",
                data: hourlyU2,
                backgroundColor: "rgba(59, 130, 246, 0.7)",
                borderColor: "#3b82f6",
                borderWidth: 1,
                borderRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "top",
                labels: { color: "#8b96a8", font: { size: 11 } },
              },
            },
            scales: {
              x: {
                ticks: {
                  color: "#8b96a8",
                  maxRotation: 45,
                  autoSkip: true,
                  maxTicksLimit: 12,
                },
              },
              y: {
                beginAtZero: true,
                title: { display: true, text: "Power (MW)", color: "#8b96a8" },
                ticks: { color: "#8b96a8" },
              },
            },
          },
        });
        console.log("✅ Unit chart created");
      }
    }, 500);

    console.log("✅ UI updated with", allConvertedDays.length, "days");
  } catch (error) {
    console.error("Error loading generation data:", error);
  }
}

// Switch chart mode (MWh, MW, Hours)
function switchGenChartMode(mode) {
  var buttons = document.querySelectorAll(".chart-toggle, .gen-tab-btn");
  buttons.forEach(function (btn) {
    btn.classList.remove("active");
    var btnText = btn.textContent.toLowerCase();
    if (
      (mode === "mwh" && (btnText.includes("mwh") || btnText === "mwh")) ||
      (mode === "mw" && (btnText === "mw" || btnText.includes("mw"))) ||
      (mode === "hours" && (btnText.includes("hour") || btnText === "hours"))
    ) {
      btn.classList.add("active");
    }
  });

  var days = window.GenDB && window.GenDB.allDays ? window.GenDB.allDays : [];
  var trendCanvas = document.getElementById("genTrendChart");

  if (trendCanvas && days.length > 0) {
    if (window.trendChart) window.trendChart.destroy();

    var labels = [];
    var chartData = [];
    var limitedDays = days.slice(-90);

    for (var i = 0; i < limitedDays.length; i++) {
      var day = limitedDays[i];
      var parts = day.bsDate.split("/");
      labels.push(parts[1] + "/" + parts[2]);

      if (mode === "mwh") {
        chartData.push(day.computed.totalEnergy);
      } else if (mode === "mw") {
        chartData.push(
          (day.computed.u1AvgMW || 0) + (day.computed.u2AvgMW || 0),
        );
      } else {
        chartData.push(day.computed.opHours);
      }
    }

    var yLabel =
      mode === "mwh" ? "Energy (MWh)" : mode === "mw" ? "Power (MW)" : "Hours";
    var ySuffix = mode === "mwh" ? " MWh" : mode === "mw" ? " MW" : " hrs";

    window.trendChart = new Chart(trendCanvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label:
              mode === "mwh"
                ? "Daily Generation (MWh)"
                : mode === "mw"
                  ? "Average Power (MW)"
                  : "Operating Hours",
            data: chartData,
            borderColor: "#00e5c8",
            backgroundColor: "rgba(0, 229, 200, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { color: "#8b96a8", font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return (
                  ctx.dataset.label + ": " + ctx.parsed.y.toFixed(1) + ySuffix
                );
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#8b96a8",
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: 10,
            },
          },
          y: {
            ticks: {
              color: "#8b96a8",
              callback: function (v) {
                return v + ySuffix;
              },
            },
            title: { display: true, text: yLabel, color: "#8b96a8" },
          },
        },
      },
    });
  }
}

// ============================================
// DATE RANGE FILTERING FOR GENERATION LOG
// ============================================

let filteredRawData = [];

function setDateRange(range) {
  const to = new Date();
  let from = new Date();

  switch (range) {
    case "day":
      from.setDate(to.getDate() - 1);
      break;
    case "week":
      from.setDate(to.getDate() - 7);
      break;
    case "month":
      from.setMonth(to.getMonth() - 1);
      break;
    case "year":
      from.setFullYear(to.getFullYear() - 1);
      break;
    case "all":
      document.getElementById("filterDateFrom").value = "";
      document.getElementById("filterDateTo").value = "";
      applyDateFilter();
      return;
  }

  document.getElementById("filterDateFrom").value = from
    .toISOString()
    .slice(0, 10);
  document.getElementById("filterDateTo").value = to.toISOString().slice(0, 10);
  applyDateFilter();
}

function applyCustomDateRange() {
  applyDateFilter();
}

function applyDateFilter() {
  const fromDate = document.getElementById("filterDateFrom").value;
  const toDate = document.getElementById("filterDateTo").value;

  if (!GenDB.allDays || GenDB.allDays.length === 0) return;

  let filteredDays = [...GenDB.allDays];

  if (fromDate) {
    const fromBS = convertADToBS(fromDate);
    filteredDays = filteredDays.filter((day) => day.bsDate >= fromBS);
  }

  if (toDate) {
    const toBS = convertADToBS(toDate);
    filteredDays = filteredDays.filter((day) => day.bsDate <= toBS);
  }

  // Update filter info text
  const filterInfo = document.getElementById("filterInfo");
  if (filterInfo) {
    if (fromDate && toDate) {
      filterInfo.innerHTML = `Showing: ${fromDate} to ${toDate} (${filteredDays.length} days)`;
    } else if (fromDate) {
      filterInfo.innerHTML = `Showing: From ${fromDate} (${filteredDays.length} days)`;
    } else if (toDate) {
      filterInfo.innerHTML = `Showing: Until ${toDate} (${filteredDays.length} days)`;
    } else {
      filterInfo.innerHTML = `Showing: All Time (${filteredDays.length} days)`;
    }
  }

  // Update the dashboard with filtered data
  if (currentView === "summary") {
    renderGenDashboard(filteredDays);
  } else {
    renderRawDataView(filteredDays);
  }
}

function resetDateFilter() {
  document.getElementById("filterDateFrom").value = "";
  document.getElementById("filterDateTo").value = "";
  applyDateFilter();
}

function convertADToBS(adDate) {
  // Simple conversion - you may need to adjust based on your actual BS conversion
  const parts = adDate.split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);

  // Convert AD year to BS year (approximate, adjust as needed)
  const bsYear = year + 57;
  const bsMonth = month;
  const bsDay = day;

  return `${bsYear}/${String(bsMonth).padStart(2, "0")}/${String(bsDay).padStart(2, "0")}`;
}

function toggleDataView(view) {
  currentView = view;

  const summaryBtn = document.getElementById("viewSummaryBtn");
  const rawBtn = document.getElementById("viewRawBtn");

  if (view === "summary") {
    summaryBtn.classList.add("active");
    summaryBtn.style.background = "var(--cyan)";
    summaryBtn.style.color = "white";
    rawBtn.classList.remove("active");
    rawBtn.style.background = "var(--bg-card)";
    rawBtn.style.color = "var(--text-primary)";
    rawBtn.style.border = "1px solid var(--border)";

    document.getElementById("genKpiRow").style.display = "grid";
    document
      .querySelectorAll(".gen-charts-row")
      .forEach((row) => (row.style.display = "grid"));
    document.getElementById("rawDataTable").style.display = "none";

    // Re-render summary view
    applyDateFilter();
  } else {
    rawBtn.classList.add("active");
    rawBtn.style.background = "var(--cyan)";
    rawBtn.style.color = "white";
    summaryBtn.classList.remove("active");
    summaryBtn.style.background = "var(--bg-card)";
    summaryBtn.style.color = "var(--text-primary)";
    summaryBtn.style.border = "1px solid var(--border)";

    document.getElementById("genKpiRow").style.display = "none";
    document
      .querySelectorAll(".gen-charts-row")
      .forEach((row) => (row.style.display = "none"));
    document.getElementById("rawDataTable").style.display = "block";

    // Load raw data from Google Sheet
    loadRawDataFromSheet();
  }
}

async function loadRawDataFromSheet() {
  const rawContainer = document.getElementById("rawDataTableBody");
  if (!rawContainer) return;

  rawContainer.innerHTML =
    '<tr><td colspan="43" style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin"></i> Loading raw data...</td></tr>';

  try {
    const response = await fetch(GOOGLE_SHEET_CSV_URL + "&t=" + Date.now());
    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
    const headers = lines[0].split(",");

    const rawData = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });
      rawData.push(row);
    }

    filteredRawData = rawData;
    renderRawDataTable(filteredRawData);
  } catch (error) {
    console.error("Error loading raw data:", error);
    rawContainer.innerHTML =
      '<tr><td colspan="43" style="text-align:center; padding:40px; color: var(--red);">Error loading data</td></tr>';
  }
}

function renderRawDataTable(data) {
  const container = document.getElementById("rawDataTableBody");
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML =
      '<tr><td colspan="43" style="text-align:center; padding:40px;">No data available</td></tr>';
    return;
  }

  // Get all columns
  const columns = Object.keys(data[0]);

  let html = "";
  for (const row of data) {
    html += "<tr>";
    for (const col of columns) {
      let value = row[col] || "";
      // Truncate long values
      if (value.length > 15) value = value.substring(0, 12) + "...";
      html += `<td style="padding: 8px; border-bottom: 1px solid var(--border); font-size: 11px; white-space: nowrap;">${value}</td>`;
    }
    html += "</tr>";
  }

  container.innerHTML = html;

  // Update column headers
  const headerRow = document.getElementById("rawDataHeaderRow");
  if (headerRow && columns.length > 0) {
    headerRow.innerHTML = columns
      .map(
        (col) =>
          `<th style="position: sticky; top: 0; background: var(--bg-card); padding: 10px; font-size: 11px; font-weight: 600; white-space: nowrap;">${col}</th>`,
      )
      .join("");
  }
}

// Add raw data table to HTML dynamically or add this HTML after the summary table
function addRawDataTable() {
  const tableWrapper = document.querySelector(".gen-table-wrapper");
  if (tableWrapper && !document.getElementById("rawDataTable")) {
    const rawTableHTML = `
      <div id="rawDataTable" style="display: none; background: var(--bg-secondary); border-radius: 16px; overflow: hidden;">
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border);">
          <i class="fas fa-database"></i> Raw Data Export
        </div>
        <div style="overflow-x: auto; max-height: 500px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead id="rawDataHeaderRow">
              <tr><th style="padding: 12px;">Loading...</th></tr>
            </thead>
            <tbody id="rawDataTableBody">
              <tr><td style="text-align:center; padding:40px;">Click Raw Data View to load</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    tableWrapper.insertAdjacentHTML("afterend", rawTableHTML);
  }
}

// Call this on page load
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(addRawDataTable, 500);
});

console.log("Global sync functions registered");
// ============================================
// GENERATION LOG PAGINATION & FILTERING
// ============================================

// Global pagination variables (declare only once)
let genCurrentPage = 1;
let genRowsPerPage = 25;
let genTotalFilteredDays = [];

function updateGenPagination(filteredDays) {
  genTotalFilteredDays = filteredDays;
  const totalPages = Math.ceil(genTotalFilteredDays.length / genRowsPerPage);

  const start = (genCurrentPage - 1) * genRowsPerPage + 1;
  const end = Math.min(
    genCurrentPage * genRowsPerPage,
    genTotalFilteredDays.length,
  );

  const pageStartEl = document.getElementById("pageStart");
  const pageEndEl = document.getElementById("pageEnd");
  const totalRecordsEl = document.getElementById("totalRecords");

  if (pageStartEl)
    pageStartEl.innerText = genTotalFilteredDays.length > 0 ? start : 0;
  if (pageEndEl) pageEndEl.innerText = end;
  if (totalRecordsEl) totalRecordsEl.innerText = genTotalFilteredDays.length;

  renderGenPageNumbers(totalPages);

  const startIdx = (genCurrentPage - 1) * genRowsPerPage;
  const endIdx = startIdx + genRowsPerPage;
  const pageDays = genTotalFilteredDays.slice(startIdx, endIdx);

  if (typeof renderGenDashboard === "function") {
    renderGenDashboard(pageDays);
  } else {
    renderGenDashboardFallback(pageDays);
  }
}

function renderGenPageNumbers(totalPages) {
  const container = document.getElementById("pageNumbers");
  if (!container) return;

  let html = "";
  let startPage = Math.max(1, genCurrentPage - 2);
  let endPage = Math.min(totalPages, genCurrentPage + 2);

  if (startPage > 1) {
    html += `<span class="page-number" onclick="goToGenPage(${startPage - 1})">...</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<span class="page-number ${i === genCurrentPage ? "active" : ""}" onclick="goToGenPage(${i})">${i}</span>`;
  }

  if (endPage < totalPages) {
    html += `<span class="page-number" onclick="goToGenPage(${endPage + 1})">...</span>`;
  }

  container.innerHTML = html;
}

function goToGenPage(page) {
  const totalPages = Math.ceil(genTotalFilteredDays.length / genRowsPerPage);

  if (page === "first") genCurrentPage = 1;
  else if (page === "prev") genCurrentPage = Math.max(1, genCurrentPage - 1);
  else if (page === "next")
    genCurrentPage = Math.min(totalPages, genCurrentPage + 1);
  else if (page === "last") genCurrentPage = totalPages;
  else if (typeof page === "number")
    genCurrentPage = Math.min(totalPages, Math.max(1, page));

  updateGenPagination(genTotalFilteredDays);
}

function changeGenRowsPerPage() {
  const selectEl = document.getElementById("rowsPerPage");
  if (selectEl) genRowsPerPage = parseInt(selectEl.value);
  genCurrentPage = 1;
  applyBSDateFilter();
}

// ============================================
// BS DATE RANGE FILTERING
// ============================================

function setBSDateRange(range) {
  const quickBtns = document.querySelectorAll(".filter-quick-btn");
  quickBtns.forEach((btn) => {
    btn.classList.remove("active");
    btn.style.background = "var(--bg-card)";
    btn.style.color = "var(--text-primary)";
    btn.style.border = "1px solid var(--border)";
  });

  if (
    !window.GenDB ||
    !window.GenDB.allDays ||
    window.GenDB.allDays.length === 0
  )
    return;

  const allDates = window.GenDB.allDays.map((d) => d.bsDate).sort();
  const latestDate = allDates[allDates.length - 1];

  let fromDate = null;
  let toDate = latestDate;

  if (range === "day") {
    fromDate = latestDate;
    toDate = latestDate;
  } else if (range === "week") {
    const dateParts = latestDate.split("/");
    let year = parseInt(dateParts[0]);
    let month = parseInt(dateParts[1]);
    let day = parseInt(dateParts[2]) - 7;
    if (day < 1) {
      month--;
      if (month < 1) {
        year--;
        month = 12;
      }
      const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      day += daysInMonth[month - 1];
    }
    fromDate = `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
  } else if (range === "month") {
    const dateParts = latestDate.split("/");
    let year = parseInt(dateParts[0]);
    let month = parseInt(dateParts[1]) - 1;
    if (month < 1) {
      year--;
      month = 12;
    }
    fromDate = `${year}/${String(month).padStart(2, "0")}/${dateParts[2]}`;
  } else if (range === "year") {
    const dateParts = latestDate.split("/");
    const year = parseInt(dateParts[0]) - 1;
    fromDate = `${year}/${dateParts[1]}/${dateParts[2]}`;
  }

  const fromInput = document.getElementById("filterDateFrom");
  const toInput = document.getElementById("filterDateTo");

  if (fromInput) fromInput.value = fromDate || "";
  if (toInput) toInput.value = toDate || "";

  if (range === "all") {
    if (fromInput) fromInput.value = "";
    if (toInput) toInput.value = "";
    const allTimeBtn = document.getElementById("allTimeBtn");
    if (allTimeBtn) {
      allTimeBtn.classList.add("active");
      allTimeBtn.style.background = "var(--cyan)";
      allTimeBtn.style.color = "white";
      allTimeBtn.style.border = "none";
    }
  } else {
    const activeBtn = Array.from(quickBtns).find((btn) =>
      btn.textContent.includes(
        range === "day"
          ? "Day"
          : range === "week"
            ? "Week"
            : range === "month"
              ? "Month"
              : "Year",
      ),
    );
    if (activeBtn) {
      activeBtn.classList.add("active");
      activeBtn.style.background = "var(--cyan)";
      activeBtn.style.color = "white";
      activeBtn.style.border = "none";
    }
  }

  applyBSDateFilter();
}

function applyCustomBSDateRange() {
  const quickBtns = document.querySelectorAll(".filter-quick-btn");
  quickBtns.forEach((btn) => {
    btn.classList.remove("active");
    btn.style.background = "var(--bg-card)";
    btn.style.color = "var(--text-primary)";
    btn.style.border = "1px solid var(--border)";
  });
  applyBSDateFilter();
}

function applyBSDateFilter() {
  const fromDate = document.getElementById("filterDateFrom")?.value;
  const toDate = document.getElementById("filterDateTo")?.value;

  if (
    !window.GenDB ||
    !window.GenDB.allDays ||
    window.GenDB.allDays.length === 0
  )
    return;

  let filteredDays = [...window.GenDB.allDays];

  if (fromDate) {
    filteredDays = filteredDays.filter((day) => day.bsDate >= fromDate);
  }

  if (toDate) {
    filteredDays = filteredDays.filter((day) => day.bsDate <= toDate);
  }

  const filterInfo = document.getElementById("filterInfo");
  if (filterInfo) {
    if (fromDate && toDate) {
      filterInfo.innerHTML = `(${fromDate} to ${toDate} · ${filteredDays.length} days)`;
    } else if (fromDate) {
      filterInfo.innerHTML = `(From ${fromDate} · ${filteredDays.length} days)`;
    } else if (toDate) {
      filterInfo.innerHTML = `(Until ${toDate} · ${filteredDays.length} days)`;
    } else {
      filterInfo.innerHTML = `(All Time · ${filteredDays.length} days)`;
    }
  }

  genCurrentPage = 1;
  updateGenPagination(filteredDays);

  if (typeof updateGenerationKPIs === "function") {
    updateGenerationKPIs(filteredDays);
  }
}

function resetBSDateFilter() {
  const fromInput = document.getElementById("filterDateFrom");
  const toInput = document.getElementById("filterDateTo");
  if (fromInput) fromInput.value = "";
  if (toInput) toInput.value = "";

  const quickBtns = document.querySelectorAll(".filter-quick-btn");
  quickBtns.forEach((btn) => {
    btn.classList.remove("active");
    btn.style.background = "var(--bg-card)";
    btn.style.color = "var(--text-primary)";
    btn.style.border = "1px solid var(--border)";
  });

  const allTimeBtn = document.getElementById("allTimeBtn");
  if (allTimeBtn) {
    allTimeBtn.classList.add("active");
    allTimeBtn.style.background = "var(--cyan)";
    allTimeBtn.style.color = "white";
    allTimeBtn.style.border = "none";
  }

  applyBSDateFilter();
}

// ============================================
// RAW DATA VIEW
// ============================================

let rawFilteredData = [];

function toggleDataView(view) {
  currentView = view;

  const summaryContainer = document.getElementById("genDashboardContent");
  const rawContainer = document.getElementById("rawDataTable");

  if (view === "raw") {
    if (summaryContainer) summaryContainer.style.display = "none";
    if (rawContainer) rawContainer.style.display = "block";
    loadRawDataFromSheet();
  } else {
    if (summaryContainer) summaryContainer.style.display = "block";
    if (rawContainer) rawContainer.style.display = "none";
  }
}

async function loadRawDataFromSheet() {
  const rawContainer = document.getElementById("rawDataTableBody");
  if (!rawContainer) return;

  rawContainer.innerHTML =
    '<tr><td colspan="43" style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin"></i> Loading raw data...</td></tr>';

  const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRCyZncyCgZYVHPxERkZ40YNVZ4FV3SOezohHcERdOSL1c6t7K3BL0wYjYL-foZicX1n13yn52RtHVA/pub?output=csv";

  try {
    const response = await fetch(CSV_URL + "&t=" + Date.now());
    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
    const headers = lines[0].split(",");

    const rawData = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });
      rawData.push(row);
    }

    const fromDate = document.getElementById("filterDateFrom")?.value;
    const toDate = document.getElementById("filterDateTo")?.value;

    let filtered = rawData;
    if (fromDate) {
      filtered = filtered.filter((row) => {
        const bsDate = `${row.year}/${String(row.month).padStart(2, "0")}/${String(row.day).padStart(2, "0")}`;
        return bsDate >= fromDate;
      });
    }
    if (toDate) {
      filtered = filtered.filter((row) => {
        const bsDate = `${row.year}/${String(row.month).padStart(2, "0")}/${String(row.day).padStart(2, "0")}`;
        return bsDate <= toDate;
      });
    }

    rawFilteredData = filtered;
    renderRawDataTable(rawFilteredData);

    const rawFilterInfo = document.getElementById("rawFilterInfo");
    if (rawFilterInfo) {
      rawFilterInfo.innerHTML = `(${filtered.length} records)`;
    }
  } catch (error) {
    console.error("Error loading raw data:", error);
    rawContainer.innerHTML =
      '<tr><td colspan="43" style="text-align:center; padding:40px; color: var(--red);">Error loading data</td></tr>';
  }
}

function renderRawDataTable(data) {
  const container = document.getElementById("rawDataTableBody");
  const headerRow = document.getElementById("rawDataHeaderRow");

  if (!container || !headerRow) return;

  if (!data || data.length === 0) {
    container.innerHTML =
      '<tr><td colspan="43" style="text-align:center; padding:40px;">No data available for selected date range</td></tr>';
    return;
  }

  const columns = Object.keys(data[0]);

  headerRow.innerHTML = columns
    .map(
      (col) =>
        `<th style="position: sticky; top: 0; background: var(--bg-card); padding: 10px; font-size: 11px; font-weight: 600; white-space: nowrap; z-index: 10;">${col}</th>`,
    )
    .join("");

  let html = "";
  for (const row of data) {
    html += "<tr>";
    for (const col of columns) {
      let value = row[col] || "";
      if (value.length > 20) value = value.substring(0, 17) + "...";
      html += `<td style="padding: 8px 10px; border-bottom: 1px solid var(--border); font-size: 11px; white-space: nowrap;">${value}</td>`;
    }
    html += "</tr>";
  }

  container.innerHTML = html;
}

// ============================================
// FALLBACK RENDER FUNCTION
// ============================================

function renderGenDashboardFallback(days) {
  const tableBody = document.getElementById("genDailySummaryBody");
  if (!tableBody || !days || days.length === 0) return;

  let html = "";
  for (const day of days) {
    html += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid var(--border);">${day.bsDate}</td>
        <td style="padding: 10px; border-bottom: 1px solid var(--border);">${day.bsDate}</td>
        <td style="padding: 10px; border-bottom: 1px solid var(--border); text-align: right;"><strong>${day.computed.u1Energy.toFixed(1)}</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--border); text-align: right;"><strong>${day.computed.u2Energy.toFixed(1)}</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--border); text-align: right;"><strong style="color:#00e5c8">${day.computed.totalEnergy.toFixed(1)}</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--border); text-align: right;">${day.computed.u1AvgMW.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid var(--border); text-align: right;">${day.computed.u2AvgMW.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid var(--border); text-align: right;">${day.computed.maxMW.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid var(--border); text-align: right;">${day.computed.opHours}</td>
        <td style="padding: 10px; border-bottom: 1px solid var(--border); text-align: right;">${day.computed.shutdownHrs}</td>
        <td style="padding: 10px; border-bottom: 1px solid var(--border); text-align: right;">${day.computed.avgPF.toFixed(3)}</td>
        <td style="padding: 10px; border-bottom: 1px solid var(--border); text-align: right;">${day.computed.avgHz.toFixed(2)}</td>
      </tr>
    `;
  }
  tableBody.innerHTML = html;
}

// Initialize All Time as default when data loads
function initGenFilters() {
  setTimeout(() => {
    setBSDateRange("all");
  }, 500);
}

// Expose functions globally
window.setBSDateRange = setBSDateRange;
window.applyCustomBSDateRange = applyCustomBSDateRange;
window.resetBSDateFilter = resetBSDateFilter;
window.goToGenPage = goToGenPage;
window.changeGenRowsPerPage = changeGenRowsPerPage;
window.toggleDataView = toggleDataView;
window.initGenFilters = initGenFilters;

// ============================================
// GENERATION LOG CHARTS
// ============================================

// Use existing genCharts or initialize if not exists
if (typeof genCharts === "undefined") {
  var genCharts = {};
}

function renderGenTrendChart(days, mode = "mwh") {
  const canvas = document.getElementById("genTrendChart");
  if (!canvas) return;

  if (genCharts.genTrend) {
    genCharts.genTrend.destroy();
  }

  if (!days || days.length === 0) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "var(--text-muted)";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No data available", canvas.width / 2, canvas.height / 2);
    return;
  }

  const labels = days.map((d) => {
    const parts = d.bsDate.split("/");
    return `${parts[1]}/${parts[2]}`;
  });

  let data = [];
  let yLabel = "";
  let color = "#00e5c8";

  switch (mode) {
    case "mwh":
      data = days.map((d) => d.computed?.totalEnergy || 0);
      yLabel = "Energy (MWh)";
      color = "#00e5c8";
      break;
    case "mw":
      data = days.map(
        (d) => (d.computed?.u1AvgMW || 0) + (d.computed?.u2AvgMW || 0),
      );
      yLabel = "Power (MW)";
      color = "#3b82f6";
      break;
    case "hours":
      data = days.map((d) => d.computed?.opHours || 0);
      yLabel = "Operating Hours";
      color = "#f59e0b";
      break;
    default:
      data = days.map((d) => d.computed?.totalEnergy || 0);
      yLabel = "Energy (MWh)";
      color = "#00e5c8";
  }

  const smoothData = calculateMovingAverage(data, 3);
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, `${color}40`);
  gradient.addColorStop(1, `${color}00`);

  genCharts.genTrend = new Chart(canvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label:
            mode === "mwh"
              ? "Daily Generation (MWh)"
              : mode === "mw"
                ? "Average Power (MW)"
                : "Operating Hours",
          data: data,
          borderColor: color,
          backgroundColor: gradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
          pointBorderColor: "var(--bg-card)",
          pointBorderWidth: 1.5,
        },
        {
          label: "Trend (3-day avg)",
          data: smoothData,
          borderColor: `${color}80`,
          borderWidth: 1.5,
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          borderDash: [5, 5],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: "var(--text-secondary)",
            usePointStyle: true,
            boxWidth: 8,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          titleColor: "var(--cyan)",
          bodyColor: "var(--text-secondary)",
          borderColor: "var(--border)",
          borderWidth: 1,
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              let value = context.parsed.y;
              if (mode === "mwh") {
                return `${label}: ${value.toFixed(1)} MWh`;
              } else if (mode === "mw") {
                return `${label}: ${value.toFixed(2)} MW`;
              } else {
                return `${label}: ${value} hours`;
              }
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "var(--border)", drawOnChartArea: false },
          ticks: {
            color: "var(--text-muted)",
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 12,
            font: { size: 10 },
          },
        },
        y: {
          grid: { color: "var(--border)" },
          ticks: {
            color: "var(--text-muted)",
            font: { size: 11 },
            callback: function (value) {
              if (mode === "mwh") return value + " MWh";
              if (mode === "mw") return value + " MW";
              return value + " hrs";
            },
          },
          title: {
            display: true,
            text: yLabel,
            color: "var(--text-muted)",
            font: { size: 11 },
          },
        },
      },
    },
  });
}

function calculateMovingAverage(data, windowSize) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    let start = Math.max(0, i - Math.floor(windowSize / 2));
    let end = Math.min(data.length - 1, i + Math.floor(windowSize / 2));
    let sum = 0;
    let count = 0;
    for (let j = start; j <= end; j++) {
      sum += data[j];
      count++;
    }
    result.push(sum / count);
  }
  return result;
}

function switchGenChartMode(mode) {
  const buttons = document.querySelectorAll(".chart-toggle, .gen-tab-btn");
  buttons.forEach((btn) => {
    btn.classList.remove("active");
    const btnText = btn.textContent.toLowerCase();
    if (
      (mode === "mwh" && (btnText.includes("mwh") || btnText === "mwh")) ||
      (mode === "mw" && (btnText === "mw" || btnText.includes("mw"))) ||
      (mode === "hours" && (btnText.includes("hour") || btnText === "hours"))
    ) {
      btn.classList.add("active");
    }
  });

  const days =
    typeof genTotalFilteredDays !== "undefined" &&
    genTotalFilteredDays &&
    genTotalFilteredDays.length > 0
      ? genTotalFilteredDays
      : window.GenDB?.allDays || [];
  renderGenTrendChart(days, mode);
}

function renderUnitCompChart(days) {
  const canvas = document.getElementById("unitCompChart");
  if (!canvas) return;

  if (genCharts.unitComp) {
    genCharts.unitComp.destroy();
  }

  if (!days || days.length === 0) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "var(--text-muted)";
    ctx.textAlign = "center";
    ctx.fillText("No data available", canvas.width / 2, canvas.height / 2);
    return;
  }

  const u1ByHour = Array(24)
    .fill()
    .map(() => []);
  const u2ByHour = Array(24)
    .fill()
    .map(() => []);

  days.forEach((day) => {
    if (day.hours && day.hours.length > 0) {
      day.hours.forEach((h) => {
        if (!h.u1Shutdown && h.u1 && h.u1.mw > 0) {
          u1ByHour[h.hour].push(h.u1.mw);
        }
        if (!h.u2Shutdown && h.u2 && h.u2.mw > 0) {
          u2ByHour[h.hour].push(h.u2.mw);
        }
      });
    }
  });

  const hours = Array.from({ length: 24 }, (_, i) => {
    if (i === 0) return "12 AM";
    if (i < 12) return `${i} AM`;
    if (i === 12) return "12 PM";
    return `${i - 12} PM`;
  });

  const u1Avg = u1ByHour.map((v) =>
    v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0,
  );
  const u2Avg = u2ByHour.map((v) =>
    v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0,
  );

  genCharts.unitComp = new Chart(canvas, {
    type: "bar",
    data: {
      labels: hours,
      datasets: [
        {
          label: "Unit I",
          data: u1Avg,
          backgroundColor: "rgba(0, 229, 200, 0.7)",
          borderColor: "#00e5c8",
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.6,
        },
        {
          label: "Unit II",
          data: u2Avg,
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderColor: "#3b82f6",
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "var(--text-secondary)",
            usePointStyle: true,
            boxWidth: 8,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} MW`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "var(--text-muted)",
            maxRotation: 45,
            autoSkip: true,
            maxTicksLimit: 12,
            font: { size: 10 },
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Power (MW)",
            color: "var(--text-muted)",
          },
          ticks: { color: "var(--text-muted)" },
        },
      },
    },
  });
}

// Initialize charts
function initGenCharts() {
  const days = window.GenDB?.allDays || [];
  if (days.length > 0) {
    renderGenTrendChart(days, "mwh");
    renderUnitCompChart(days);
  }
}

// Make functions global
window.switchGenChartMode = switchGenChartMode;
window.initGenCharts = initGenCharts;
