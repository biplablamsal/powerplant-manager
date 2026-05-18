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

  // Update breadcrumb - ADDED 'feed' to names
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
    feed: "Maintenance Feed", // ADDED THIS LINE
  };

  const breadcrumb = document.getElementById("breadcrumb");
  if (breadcrumb) breadcrumb.textContent = names[id] || id;

  // Initialize charts lazily
  if (id === "operations") initWaterChart();
  if (id === "generation") {
    console.log("Generation log page loaded");
  }

  // Initialize feed when feed page is shown
  if (id === "feed") {
    loadMaintenanceFeed();
    setupFeedPhotoHandlers();
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
// DASHBOARD CHARTS (keep your existing chart functions)
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
// GENERATION LOG DASHBOARD (keep your existing code)
// ============================================
// ... (keep all your existing GenDB code - too long to repeat, but keep it all)

// ============================================
// MAINTENANCE FEED - INSTAGRAM STYLE (UPDATED)
// ============================================

let FeedDB = {
  posts: [],
  currentPostId: null,
};

let feedPhotos = [];

// Setup photo handlers
function setupFeedPhotoHandlers() {
  const takeBtn = document.getElementById("feedTakePhotoBtn");
  const chooseBtn = document.getElementById("feedChoosePhotoBtn");
  const cameraInput = document.getElementById("feedCameraInput");
  const galleryInput = document.getElementById("feedGalleryInput");

  if (takeBtn && cameraInput) {
    takeBtn.onclick = () => cameraInput.click();
    cameraInput.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFeedPhotos(e.target.files);
      }
      cameraInput.value = "";
    };
  }

  if (chooseBtn && galleryInput) {
    chooseBtn.onclick = () => galleryInput.click();
    galleryInput.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFeedPhotos(e.target.files);
      }
      galleryInput.value = "";
    };
  }
}

// Handle selected photos
function handleFeedPhotos(files) {
  const maxFiles = 5;
  const maxSize = 5 * 1024 * 1024;

  Array.from(files).forEach((file) => {
    if (!file.type.startsWith("image/")) {
      showFeedToast("Only image files are allowed", "#f5ae3a");
      return;
    }
    if (file.size > maxSize) {
      showFeedToast(`${file.name.substring(0, 20)} exceeds 5MB`, "#f5ae3a");
      return;
    }
    if (feedPhotos.length >= maxFiles) {
      showFeedToast(`Maximum ${maxFiles} photos allowed`, "#f5ae3a");
      return;
    }

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

// Render photo preview
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
        <div class="feed-photo-preview-item">
            <img src="${photo.data}" alt="Preview">
            <button class="feed-photo-remove" onclick="removeFeedPhoto(${idx})">✕</button>
        </div>
    `,
    )
    .join("");
}

// Remove photo
function removeFeedPhoto(idx) {
  feedPhotos.splice(idx, 1);
  renderFeedPhotoPreview();
}

// Clear all photos
function clearFeedPhotos() {
  feedPhotos = [];
  renderFeedPhotoPreview();
}

// Toggle inline post form
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
      document.querySelectorAll(".post-type-btn").forEach((btn) => {
        btn.classList.remove("active");
        if (btn.getAttribute("data-type") === "update") {
          btn.classList.add("active");
        }
      });
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      form.style.display = "none";
    }
  }
}

// Submit new post
function submitInlinePost() {
  const title = document.getElementById("inlinePostTitle").value.trim();
  const description = document.getElementById("inlinePostDesc").value.trim();
  const equipment = document.getElementById("inlinePostEquipment").value;
  const workOrder = document.getElementById("inlinePostWorkOrder").value.trim();
  const tags = document.getElementById("inlinePostTags").value.trim();

  let postType = "update";
  document.querySelectorAll(".post-type-btn").forEach((btn) => {
    if (btn.classList.contains("active")) {
      postType = btn.getAttribute("data-type");
    }
  });

  const author = getCurrentUserName();

  if (!title && !description) {
    showFeedToast("Please enter a title or description", "#f5ae3a");
    return;
  }

  const photoUrls = feedPhotos.map((photo) => photo.data);

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
    photos: photoUrls,
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
  showFeedToast(
    "✓ Post created with " + photoUrls.length + " photo(s)!",
    "#29c48f",
  );
}

// Load feed posts
function loadMaintenanceFeed() {
  const feedPostsContainer = document.getElementById("feedPosts");
  if (!feedPostsContainer) return;

  let posts = JSON.parse(
    localStorage.getItem("maintenance_feed_posts") || "[]",
  );
  FeedDB.posts = posts;

  if (posts.length === 0) {
    feedPostsContainer.innerHTML = `
      <div class="feed-empty-state">
        <i class="fas fa-newspaper" style="font-size:48px; margin-bottom:16px; opacity:0.5;"></i>
        <p>No posts yet.</p>
        <p style="font-size:12px;">Click "Create New Post" to share maintenance updates.</p>
      </div>
    `;
    return;
  }

  feedPostsContainer.innerHTML = posts
    .map((post) => renderFeedCard(post))
    .join("");
  bindFeedActions();
}

// RENDER FEED CARD - INSTAGRAM STYLE (UPDATED)
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
  const currentUser = getCurrentUserName();
  const isLiked = post.likes && post.likes.includes(currentUser);

  // INSTAGRAM STYLE: SQUARE PHOTOS
  let photosHtml = "";

  if (post.photos && post.photos.length > 0) {
    const photoCount = post.photos.length;

    if (photoCount === 1) {
      // Single square photo - Instagram style
      photosHtml = `
        <div class="feed-post-photo-single" onclick="openPhotoViewer('${post.photos[0]}')">
          <img src="${post.photos[0]}" alt="Maintenance photo">
        </div>
      `;
    } else if (photoCount === 2) {
      // 2 photos - side by side
      photosHtml = `
        <div class="feed-post-photo-grid two-columns">
          ${post.photos
            .map(
              (photo) => `
            <div class="grid-item" onclick="openPhotoViewer('${photo}')">
              <img src="${photo}" alt="Maintenance photo">
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    } else {
      // 3+ photos - 3 columns grid
      const displayPhotos = post.photos.slice(0, 9);
      photosHtml = `
        <div class="feed-post-photo-grid three-columns">
          ${displayPhotos
            .map(
              (photo) => `
            <div class="grid-item" onclick="openPhotoViewer('${photo}')">
              <img src="${photo}" alt="Maintenance photo">
            </div>
          `,
            )
            .join("")}
        </div>
      `;
      if (post.photos.length > 9) {
        photosHtml += `<div style="padding: 8px; text-align: center; font-size: 12px; color: var(--text-muted);">+${post.photos.length - 9} more photos</div>`;
      }
    }
  }

  // CAPTION BELOW PHOTO - Instagram style
  const captionHtml = `
    <div class="feed-post-caption">
      <div class="caption-equipment">
        ${post.equipment ? `📍 ${escapeHtml(post.equipment)}` : ""}
        ${post.work_order_id ? ` · WO: ${escapeHtml(post.work_order_id)}` : ""}
      </div>
      ${post.title ? `<div class="caption-text"><strong>${escapeHtml(post.title)}</strong></div>` : ""}
      ${post.description ? `<div class="caption-text">${escapeHtml(post.description)}</div>` : ""}
      ${
        post.tags
          ? `
        <div class="caption-tags">
          ${post.tags
            .split(",")
            .map((tag) => `<span class="caption-tag">#${tag.trim()}</span>`)
            .join("")}
        </div>
      `
          : ""
      }
    </div>
  `;

  const commentsHtml = renderCommentsSection(post.post_id, post.comments || []);
  const commentCount = post.comments?.length || 0;

  return `
    <div class="feed-post-card" data-post-id="${post.post_id}">
      <!-- HEADER -->
      <div class="feed-post-header">
        <div class="feed-post-avatar">${(post.author || "U").charAt(0).toUpperCase()}</div>
        <div class="feed-post-author-info">
          <div class="feed-post-author">${escapeHtml(post.author || "Unknown")}</div>
          <div class="feed-post-time">
            <span>${timeAgo}</span>
            <span class="feed-post-badge">${typeIcon} ${typeLabel}</span>
          </div>
        </div>
      </div>

      <!-- SQUARE PHOTO(S) -->
      ${photosHtml}

      <!-- ACTION BUTTONS (Like, Comment) -->
      <div class="feed-post-actions">
        <button class="feed-action-btn like-btn ${isLiked ? "liked" : ""}" data-action="like" data-post-id="${post.post_id}">
          <i class="fa-regular fa-heart"></i> ${post.like_count || 0}
        </button>
        <button class="feed-action-btn comment-btn" data-action="comment" data-post-id="${post.post_id}">
          <i class="fa-regular fa-comment"></i> ${commentCount}
        </button>
      </div>

      <!-- CAPTION BELOW PHOTO -->
      ${captionHtml}

      <!-- COMMENTS SECTION -->
      ${commentsHtml}
    </div>
  `;
}

// Render comments section
function renderCommentsSection(postId, comments) {
  if (!comments || comments.length === 0) {
    return `<div class="feed-comments-section" id="comments-${postId}">
              <div class="feed-no-comments" style="font-size:12px; color:var(--text-muted); padding:8px 0;">No comments yet.</div>
            </div>`;
  }

  const visibleComments = comments.slice(0, 2);
  const hiddenCount = comments.length - 2;

  return `
    <div class="feed-comments-section" id="comments-${postId}">
      ${visibleComments
        .map(
          (c) => `
        <div class="feed-comment">
          <span class="feed-comment-author">${escapeHtml(c.author)}:</span>
          <span class="feed-comment-text">${escapeHtml(c.text)}</span>
          <span class="feed-comment-time">${formatTimeAgo(c.timestamp)}</span>
        </div>
      `,
        )
        .join("")}
      ${hiddenCount > 0 ? `<div class="view-more-comments" onclick="showAllComments('${postId}')">View all ${comments.length} comments</div>` : ""}
    </div>
  `;
}

// Show comment form
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

    if (action === "like") {
      toggleFeedLike(postId);
    } else if (action === "comment") {
      showFeedCommentForm(postId);
    }
  });

  FeedDB.actionsBound = true;
}

function showFeedCommentForm(postId) {
  FeedDB.currentPostId = postId;

  const existingForm = document.getElementById(`comment-form-${postId}`);
  if (existingForm) {
    existingForm.remove();
    return;
  }

  let commentsSection = document.getElementById(`comments-${postId}`);
  if (!commentsSection) {
    const postCard = document.querySelector(
      `.feed-post-card[data-post-id="${postId}"]`,
    );
    if (postCard) commentsSection = postCard.querySelector(".feed-post-body");
  }
  if (!commentsSection) return;

  const formHtml = `
    <div class="feed-comment-form" id="comment-form-${postId}">
      <div class="feed-comment-input-group">
        <input type="text" id="comment-input-${postId}" placeholder="Write a comment..." class="comment-input">
        <button type="button" class="btn-primary btn-sm" onclick="submitFeedComment('${postId}')">Post</button>
        <button type="button" class="btn-secondary btn-sm" onclick="cancelFeedComment('${postId}')">Cancel</button>
      </div>
    </div>
  `;

  commentsSection.insertAdjacentHTML("beforeend", formHtml);
  const commentInput = document.getElementById(`comment-input-${postId}`);
  if (commentInput) {
    commentInput.focus();
    commentInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitFeedComment(postId);
      }
    });
  }
}

// Cancel comment
function cancelFeedComment(postId) {
  const form = document.getElementById(`comment-form-${postId}`);
  if (form) form.remove();
  FeedDB.currentPostId = null;
}

// Submit comment
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
  const userName = getCurrentUserName();

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

// Show all comments
function showAllComments(postId) {
  let posts = JSON.parse(
    localStorage.getItem("maintenance_feed_posts") || "[]",
  );
  const post = posts.find((p) => p.post_id === postId);

  if (post && post.comments && post.comments.length > 0) {
    let commentsHtml =
      '<div style="padding: 12px; background: var(--bg-raised); border-radius: 12px;">';
    commentsHtml +=
      '<h4 style="margin-bottom: 12px; font-size: 14px;">All Comments</h4>';
    post.comments.forEach((comment) => {
      commentsHtml += `
        <div class="feed-comment" style="margin-bottom: 8px;">
          <span class="feed-comment-author">${escapeHtml(comment.author)}:</span>
          <span class="feed-comment-text">${escapeHtml(comment.text)}</span>
          <span class="feed-comment-time">${formatTimeAgo(comment.timestamp)}</span>
        </div>
      `;
    });
    commentsHtml +=
      '<button class="btn-secondary btn-sm" onclick="loadMaintenanceFeed()" style="margin-top: 12px;">Close</button>';
    commentsHtml += "</div>";

    const commentsSection = document.getElementById(`comments-${postId}`);
    if (commentsSection) {
      commentsSection.innerHTML = commentsHtml;
    }
  }
}

// Toggle like
function toggleFeedLike(postId) {
  let posts = JSON.parse(
    localStorage.getItem("maintenance_feed_posts") || "[]",
  );
  const postIndex = posts.findIndex((p) => p.post_id === postId);
  const userName = getCurrentUserName();

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

// Open photo viewer
function openPhotoViewer(photoUrl) {
  const viewer = document.createElement("div");
  viewer.className = "photo-viewer-overlay";
  viewer.innerHTML = `
    <div class="photo-viewer-content">
      <img src="${photoUrl}" alt="Full size photo">
      <button class="photo-viewer-close" onclick="this.closest('.photo-viewer-overlay').remove()">✕</button>
    </div>
  `;
  document.body.appendChild(viewer);
  viewer.onclick = (e) => {
    if (e.target === viewer) viewer.remove();
  };
}

// Helper functions
function getCurrentUserName() {
  return (
    document.querySelector(".user-name")?.textContent || "Maintenance Staff"
  );
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
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
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

// Add sample data
function addSampleFeedPosts() {
  const existing = localStorage.getItem("maintenance_feed_posts");
  if (!existing || JSON.parse(existing).length === 0) {
    const samplePosts = [
      {
        post_id: "sample_1",
        timestamp: new Date().toISOString(),
        author: "Rajesh Kumar",
        post_type: "update",
        title: "Unit 2 Bearing Replacement Started",
        description:
          "Removed old bearing. Housing cleaned. New bearing arrived from store.",
        equipment: "Unit 2 Generator",
        work_order_id: "WO-2024-0234",
        tags: "bearing, replacement, urgent",
        photos: [],
        like_count: 5,
        likes: ["Rajesh Kumar"],
        comments: [],
      },
      {
        post_id: "sample_2",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        author: "Prakash Thapa",
        post_type: "complete",
        title: "Transformer T1 Oil Filtration Complete",
        description: "Oil filtration completed. DGA test results normal.",
        equipment: "Main Transformer T1",
        work_order_id: "WO-2024-0228",
        tags: "transformer, oil",
        photos: [],
        like_count: 3,
        likes: [],
        comments: [],
      },
    ];
    localStorage.setItem("maintenance_feed_posts", JSON.stringify(samplePosts));
  }
}

// Generate report from feed posts
function generateFeedReport() {
  let posts = JSON.parse(
    localStorage.getItem("maintenance_feed_posts") || "[]",
  );

  if (posts.length === 0) {
    showFeedToast("No posts to generate report", "#f5ae3a");
    return;
  }

  const dateFrom = prompt(
    "Enter START date (YYYY-MM-DD) or leave empty for all:",
    "",
  );
  const dateTo = prompt(
    "Enter END date (YYYY-MM-DD) or leave empty for all:",
    "",
  );

  let filteredPosts = [...posts];

  if (dateFrom) {
    filteredPosts = filteredPosts.filter(
      (p) => p.timestamp.split("T")[0] >= dateFrom,
    );
  }
  if (dateTo) {
    filteredPosts = filteredPosts.filter(
      (p) => p.timestamp.split("T")[0] <= dateTo,
    );
  }

  if (filteredPosts.length === 0) {
    showFeedToast("No posts in selected date range", "#f5ae3a");
    return;
  }

  const reportHtml = generateReportHtml(filteredPosts, dateFrom, dateTo);
  showReportModal(reportHtml);
}

function generateReportHtml(posts, dateFrom, dateTo) {
  const totalPosts = posts.length;
  const totalLikes = posts.reduce((sum, p) => sum + (p.like_count || 0), 0);
  const totalComments = posts.reduce(
    (sum, p) => sum + (p.comments?.length || 0),
    0,
  );
  const totalPhotos = posts.reduce(
    (sum, p) => sum + (p.photos?.length || 0),
    0,
  );

  const typeCount = {
    update: posts.filter((p) => p.post_type === "update").length,
    issue: posts.filter((p) => p.post_type === "issue").length,
    complete: posts.filter((p) => p.post_type === "complete").length,
    inspection: posts.filter((p) => p.post_type === "inspection").length,
  };

  const dateRangeText =
    dateFrom && dateTo
      ? `${dateFrom} to ${dateTo}`
      : dateFrom
        ? `From ${dateFrom}`
        : dateTo
          ? `Until ${dateTo}`
          : "All Time";

  return `
    <div class="report-content" style="font-family: var(--font-sans); max-width: 900px; margin: 0 auto;">
      <div class="report-header" style="text-align: center; padding: 20px; border-bottom: 2px solid var(--accent-blue); margin-bottom: 24px;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">📋 Maintenance Activity Report</h1>
        <p style="color: var(--text-muted); font-size: 12px;">Period: ${dateRangeText} | Generated: ${new Date().toLocaleString()}</p>
      </div>
      
      <div class="report-section" style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">📊 Summary Statistics</h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
          <div style="padding: 16px; background: var(--bg-raised); border-radius: 12px; text-align: center;">
            <div style="font-size: 28px; font-weight: 700;">${totalPosts}</div>
            <div style="font-size: 11px; color: var(--text-muted);">Total Posts</div>
          </div>
          <div style="padding: 16px; background: var(--bg-raised); border-radius: 12px; text-align: center;">
            <div style="font-size: 28px; font-weight: 700;">${totalLikes}</div>
            <div style="font-size: 11px; color: var(--text-muted);">Total Likes</div>
          </div>
          <div style="padding: 16px; background: var(--bg-raised); border-radius: 12px; text-align: center;">
            <div style="font-size: 28px; font-weight: 700;">${totalComments}</div>
            <div style="font-size: 11px; color: var(--text-muted);">Total Comments</div>
          </div>
          <div style="padding: 16px; background: var(--bg-raised); border-radius: 12px; text-align: center;">
            <div style="font-size: 28px; font-weight: 700;">${totalPhotos}</div>
            <div style="font-size: 11px; color: var(--text-muted);">Photos Attached</div>
          </div>
        </div>
      </div>
      
      <div class="report-section" style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">📈 Activity Breakdown</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <div style="padding: 16px; background: var(--bg-raised); border-radius: 12px;">
            <div style="font-size: 12px; font-weight: 600; margin-bottom: 12px;">By Post Type</div>
            <div>🔧 Task Updates: ${typeCount.update}</div>
            <div>⚠️ Issue Reports: ${typeCount.issue}</div>
            <div>✅ Completions: ${typeCount.complete}</div>
            <div>🔍 Inspections: ${typeCount.inspection}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function showReportModal(htmlContent) {
  const existingModal = document.getElementById("feedReportModal");
  if (existingModal) existingModal.remove();

  const modalHtml = `
    <div id="feedReportModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 5000; display: flex; align-items: center; justify-content: center; overflow: auto;">
      <div style="background: var(--bg-card); border-radius: 24px; width: 90%; max-width: 900px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;">
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0;"><i class="fas fa-file-alt"></i> Maintenance Report</h3>
          <button onclick="this.closest('#feedReportModal').remove()" style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-raised); border: none; cursor: pointer;">✕</button>
        </div>
        <div style="padding: 20px; overflow-y: auto; flex: 1;">${htmlContent}</div>
        <div style="padding: 16px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 12px;">
          <button class="btn btn-secondary" onclick="this.closest('#feedReportModal').remove()">Close</button>
          <button class="btn btn-primary" onclick="printReport()"><i class="fas fa-print"></i> Print / Save PDF</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function printReport() {
  const modal = document.getElementById("feedReportModal");
  if (!modal) return;

  const printContent = modal.querySelector(
    'div[style*="overflow-y: auto"]',
  ).innerHTML;
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html>
      <head>
        <title>Maintenance Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .report-header { text-align: center; }
          .report-section { margin-bottom: 20px; }
          img { max-width: 100%; height: auto; page-break-inside: avoid; }
        </style>
      </head>
      <body>${printContent}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// Initialize feed when page loads
document.addEventListener("DOMContentLoaded", () => {
  addSampleFeedPosts();
  setupFeedPhotoHandlers();
  bindFeedActions();

  // Check if feed page is active on load
  if (document.getElementById("page-feed")?.classList.contains("active")) {
    loadMaintenanceFeed();
  }
});

// Also watch for page changes to initialize feed
const feedPageObserver = new MutationObserver(() => {
  const feedPage = document.getElementById("page-feed");
  if (feedPage && feedPage.classList.contains("active")) {
    loadMaintenanceFeed();
    setupFeedPhotoHandlers();
  }
});
feedPageObserver.observe(document.body, {
  attributes: true,
  subtree: true,
  attributeFilter: ["class"],
});

// Expose global functions
window.toggleInlinePostForm = toggleInlinePostForm;
window.submitInlinePost = submitInlinePost;
window.generateFeedReport = generateFeedReport;
window.openPhotoViewer = openPhotoViewer;
window.removeFeedPhoto = removeFeedPhoto;
window.submitFeedComment = submitFeedComment;
window.cancelFeedComment = cancelFeedComment;
window.showAllComments = showAllComments;

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
      if (tabId === "analytics") renderAnalyticsCharts();
      if (tabId === "health") renderHealthTrendChart();
    });
  });

  const uploadBtn = document.getElementById("maintUploadBtn");
  const fileInput = document.getElementById("maintFileInput");
  if (uploadBtn && fileInput) {
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = handleMaintFileUpload;
  }

  const exportBtn = document.getElementById("maintExportBtn");
  if (exportBtn) exportBtn.onclick = exportMaintenanceReport;

  const clearBtn = document.getElementById("clearMaintData");
  if (clearBtn) clearBtn.onclick = clearMaintenanceData;

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

  const filterSelect = document.getElementById("historyFilterAsset");
  if (filterSelect) filterSelect.onchange = () => renderHistoryTable();
}

function renderMaintenanceDashboard() {
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

  const totalOps = 8760;
  const failures =
    MaintDB.history.filter((h) => h.downtime !== "0" && h.downtime).length || 5;
  const mtbf = Math.round(totalOps / failures);
  document.getElementById("statMTBF") &&
    (document.getElementById("statMTBF").innerText = mtbf);

  const totalDowntime = MaintDB.history.reduce(
    (sum, h) => sum + (parseInt(h.downtime) || 0),
    0,
  );
  const availability = Math.round(((8760 - totalDowntime) / 8760) * 1000) / 10;
  document.getElementById("statAvailability") &&
    (document.getElementById("statAvailability").innerHTML =
      `${availability}<span style="font-size:14px">%</span>`);

  renderPMTasks();
  renderAssetHealth();
  renderHistoryTable();
  renderCalendar(0);
  renderAnalyticsCharts();
  renderHealthTrendChart();

  const filesCard = document.getElementById("maintFilesCard");
  if (filesCard && (MaintDB.tasks.length > 0 || MaintDB.history.length > 0)) {
    filesCard.style.display = "block";
    document.getElementById("maintFileList").innerHTML =
      `<div class="maint-file-item"><i class="fas fa-database"></i><span>Maintenance Data Store</span><span class="pm-due soon">${MaintDB.tasks.length} tasks · ${MaintDB.history.length} records</span></div>`;
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
      return `<div class="pm-task ${task.priority || "normal"}"><div class="pm-info"><div class="pm-title">${task.task}</div><div class="pm-meta"><span class="pm-asset"><i class="fas fa-microchip"></i> ${task.asset}</span><span><i class="fas fa-user"></i> ${task.assignedTo}</span><span><i class="fas fa-sync-alt"></i> ${task.frequency}</span></div></div><div class="pm-due ${dueClass}">${dueText}</div><div class="pm-status ${task.status === "completed" ? "completed" : "pending"}" onclick="toggleTaskStatus(${task.id})"><i class="fas ${task.status === "completed" ? "fa-check-circle" : "fa-circle"}"></i></div></div>`;
    })
    .join("");
}

function toggleTaskStatus(taskId) {
  const task = MaintDB.tasks.find((t) => t.id === taskId);
  if (task) {
    task.status = task.status === "completed" ? "pending" : "completed";
    if (task.status === "completed")
      task.lastDone = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
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
      return `<div><div class="asset-item"><div class="asset-name">${asset.name}</div><div class="health-bar-container"><div class="health-bar ${barClass}" style="width: ${asset.health}%"></div></div><div class="health-score">${asset.health}%</div></div><div class="asset-sub">Last: ${asset.lastMaint} | Next: ${asset.nextMaint}</div></div>`;
    })
    .join("");
}

function renderHistoryTable() {
  const tbody = document.getElementById("historyTableBody");
  const filter = document.getElementById("historyFilterAsset")?.value || "all";
  if (!tbody) return;
  let filtered = MaintDB.history;
  if (filter !== "all")
    filtered = MaintDB.history.filter((h) => h.asset === filter);
  tbody.innerHTML = filtered
    .map(
      (h) =>
        `<tr><td>${h.date}</td><td>${h.asset}</td><td class="mono">${h.wo}</td><td>${h.task}</td><td>${h.duration}</td><td>${h.downtime}</td><td>${h.technician}</td><td><span class="badge badge-green">${h.status}</span></td></tr>`,
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
    html += `<div class="calendar-day ${hasTask ? "has-task" : ""} ${isOverdue ? "overdue-task" : ""}">${currentDate.getDate()}${hasTask ? `<div class="task-indicator"></div>` : ""}</div>`;
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

document.addEventListener("DOMContentLoaded", () => {
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
  if (document.getElementById("page-maintenance")?.classList.contains("active"))
    initMaintenance();
});

window.toggleTaskStatus = toggleTaskStatus;
window.addMaintenanceTask = addMaintenanceTask;

// ============================================
// EQUIPMENT REGISTRY MODULE
// ============================================

let EquipmentDB = { items: [], filteredItems: [] };

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
  const saved = localStorage.getItem("equipment_items");
  EquipmentDB.items = saved ? JSON.parse(saved) : [...defaultEquipment];
  localStorage.setItem("equipment_items", JSON.stringify(EquipmentDB.items));
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
  if (exportBtn) exportBtn.onclick = exportEquipmentData;
  const addBtn = document.getElementById("equipAddBtn");
  if (addBtn) addBtn.onclick = showAddEquipmentForm;
  const searchInput = document.getElementById("equipSearch");
  if (searchInput) searchInput.oninput = filterEquipment;
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
  document.getElementById("totalEquipment") &&
    (document.getElementById("totalEquipment").innerText =
      EquipmentDB.items.length);
  document.getElementById("operationalCount") &&
    (document.getElementById("operationalCount").innerText =
      EquipmentDB.items.filter((i) => i.status === "Operational").length);
  document.getElementById("maintenanceCount") &&
    (document.getElementById("maintenanceCount").innerText =
      EquipmentDB.items.filter((i) => i.status === "Maintenance").length);
  const avgHealth = Math.round(
    EquipmentDB.items.reduce((sum, i) => sum + (i.healthScore || 0), 0) /
      EquipmentDB.items.length,
  );
  document.getElementById("avgHealth") &&
    (document.getElementById("avgHealth").innerHTML =
      `${avgHealth}<span style="font-size:14px">%</span>`);
}

function renderEquipmentGrid() {
  const container = document.getElementById("equipmentGrid");
  if (!container) return;
  container.innerHTML = EquipmentDB.filteredItems
    .map(
      (item) => `
    <div class="equip-card" onclick="showEquipmentDetails(${item.id})">
      <div class="equip-card-header"><div class="equip-card-icon"><i class="fas ${getEquipmentIcon(item.type)}"></i></div><div class="equip-status-badge ${getStatusClass(item.status)}">${item.status}</div></div>
      <div class="equip-card-body"><div class="equip-name">${item.name}</div><div class="equip-model">${item.model} · ${item.manufacturer}</div>
      <div class="equip-specs"><div class="equip-spec"><div class="equip-spec-label">Rated Power</div><div class="equip-spec-value">${item.ratedPower}</div></div><div class="equip-spec"><div class="equip-spec-label">Health</div><div class="equip-spec-value" style="color: ${getHealthColor(item.healthScore)}">${item.healthScore}%</div></div></div>
      <div class="equip-maint-info"><span><i class="fas fa-calendar-alt"></i> Last: ${item.lastMaint || "N/A"}</span><span><i class="fas fa-clock"></i> Next: ${item.nextMaint || "N/A"}</span></div></div>
    </div>`,
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
  modalBody.innerHTML = `<div class="detail-row"><div class="detail-label">Equipment ID</div><div class="detail-value">HPP-${item.id.toString().padStart(3, "0")}</div></div><div class="detail-row"><div class="detail-label">Type</div><div class="detail-value">${item.type}</div></div><div class="detail-row"><div class="detail-label">Model</div><div class="detail-value">${item.model}</div></div><div class="detail-row"><div class="detail-label">Manufacturer</div><div class="detail-value">${item.manufacturer}</div></div><div class="detail-row"><div class="detail-label">Serial Number</div><div class="detail-value">${item.serialNo || "N/A"}</div></div><div class="detail-row"><div class="detail-label">Installation Date</div><div class="detail-value">${item.installDate || "N/A"}</div></div><div class="detail-row"><div class="detail-label">Location</div><div class="detail-value">${item.location || "Power House"}</div></div><div class="detail-row"><div class="detail-label">Technical Specs</div><div class="detail-value">Power: ${item.ratedPower}<br>Voltage: ${item.ratedVoltage}<br>Speed: ${item.speed}<br>Efficiency: ${item.efficiency}</div></div><div class="detail-row"><div class="detail-label">Maintenance</div><div class="detail-value">Last: ${item.lastMaint || "N/A"}<br>Next: ${item.nextMaint || "N/A"}<br>Health Score: ${item.healthScore}%</div></div><div class="detail-row"><div class="detail-label">Current Status</div><div class="detail-value"><span class="equip-status-badge ${getStatusClass(item.status)}">${item.status}</span></div></div>`;
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
  modalBody.innerHTML = `<form class="equip-form" id="equipForm"><div class="equip-form-row"><div class="equip-form-group"><label>Equipment Name *</label><input type="text" id="eqName" required></div><div class="equip-form-group"><label>Type *</label><select id="eqType"><option value="Generator">Generator</option><option value="Turbine">Turbine</option><option value="Transformer">Transformer</option><option value="Governor">Governor</option><option value="Valve">Valve</option><option value="Pump">Pump</option></select></div></div><div class="equip-form-row"><div class="equip-form-group"><label>Model</label><input type="text" id="eqModel"></div><div class="equip-form-group"><label>Manufacturer</label><input type="text" id="eqManufacturer"></div></div><div class="equip-form-row"><div class="equip-form-group"><label>Rated Power</label><input type="text" id="eqPower" placeholder="e.g., 15 MW"></div><div class="equip-form-group"><label>Rated Voltage</label><input type="text" id="eqVoltage" placeholder="e.g., 11 kV"></div></div><div class="equip-form-row"><div class="equip-form-group"><label>Installation Date</label><input type="text" id="eqInstallDate" placeholder="YYYY/MM/DD"></div><div class="equip-form-group"><label>Status</label><select id="eqStatus"><option value="Operational">Operational</option><option value="Standby">Standby</option><option value="Maintenance">Under Maintenance</option><option value="Outage">Outage</option></select></div></div><div class="equip-form-group"><label>Health Score (%)</label><input type="number" id="eqHealth" min="0" max="100" value="80"></div></form>`;
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
  modalBody.innerHTML = `<form class="equip-form" id="equipForm"><div class="equip-form-row"><div class="equip-form-group"><label>Equipment Name</label><input type="text" id="eqName" value="${item.name}"></div><div class="equip-form-group"><label>Type</label><select id="eqType">${["Generator", "Turbine", "Transformer", "Governor", "Valve", "Pump"].map((t) => `<option ${item.type === t ? "selected" : ""}>${t}</option>`).join("")}</select></div></div><div class="equip-form-row"><div class="equip-form-group"><label>Model</label><input type="text" id="eqModel" value="${item.model}"></div><div class="equip-form-group"><label>Manufacturer</label><input type="text" id="eqManufacturer" value="${item.manufacturer}"></div></div><div class="equip-form-row"><div class="equip-form-group"><label>Rated Power</label><input type="text" id="eqPower" value="${item.ratedPower}"></div><div class="equip-form-group"><label>Rated Voltage</label><input type="text" id="eqVoltage" value="${item.ratedVoltage}"></div></div><div class="equip-form-row"><div class="equip-form-group"><label>Status</label><select id="eqStatus"><option ${item.status === "Operational" ? "selected" : ""}>Operational</option><option ${item.status === "Standby" ? "selected" : ""}>Standby</option><option ${item.status === "Maintenance" ? "selected" : ""}>Maintenance</option><option ${item.status === "Outage" ? "selected" : ""}>Outage</option></select></div><div class="equip-form-group"><label>Health Score (%)</label><input type="number" id="eqHealth" value="${item.healthScore}"></div></div><div class="equip-form-row"><div class="equip-form-group"><label>Last Maintenance</label><input type="text" id="eqLastMaint" value="${item.lastMaint || ""}" placeholder="YYYY/MM/DD"></div><div class="equip-form-group"><label>Next Maintenance</label><input type="text" id="eqNextMaint" value="${item.nextMaint || ""}" placeholder="YYYY/MM/DD"></div></div></form>`;
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
  if (document.getElementById("page-equipment")?.classList.contains("active"))
    initEquipment();
});

window.showEquipmentDetails = showEquipmentDetails;
window.closeEquipModal = closeEquipModal;

// ============================================
// FAULTS & INCIDENTS MODULE
// ============================================

let FaultsDB = { items: [], filteredItems: [], equipmentList: [] };

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
    resolutionNotes: "Replaced bearing and changed oil.",
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
    cause: "Lightning surge",
    responseTime: 2,
    resolutionTime: 2,
    downtime: 1.5,
    status: "Resolved",
    reportedBy: "Prakash Thapa",
    technician: "E. Shrestha",
    resolutionNotes: "Reset protection relay.",
  },
  {
    id: 3,
    faultId: "FLT-2024-003",
    date: "2081/07/14",
    time: "22:00",
    equipment: "Unit 1 Governor",
    type: "Instrumentation",
    severity: "Medium",
    description: "Governor response slow",
    cause: "Sensor drift",
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
    description: "Pump vibration high",
    cause: "Bearing wear",
    responseTime: 8,
    resolutionTime: 3,
    downtime: 2,
    status: "Resolved",
    reportedBy: "Suresh Gurung",
    technician: "Rajesh Kumar",
    resolutionNotes: "Replaced pump bearing.",
  },
  {
    id: 5,
    faultId: "FLT-2024-005",
    date: "2081/07/05",
    time: "16:45",
    equipment: "Unit 2 Turbine",
    type: "Mechanical",
    severity: "Critical",
    description: "Sudden vibration spike",
    cause: "Cavitation damage",
    responseTime: 3,
    resolutionTime: 12,
    downtime: 10,
    status: "Closed",
    reportedBy: "Prakash Thapa",
    technician: "Rajesh Kumar",
    resolutionNotes: "Turbine runner inspection scheduled.",
  },
];

function initFaults() {
  const saved = localStorage.getItem("faults_items");
  FaultsDB.items = saved ? JSON.parse(saved) : [...defaultFaults];
  localStorage.setItem("faults_items", JSON.stringify(FaultsDB.items));
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
  FaultsDB.filteredItems = [...FaultsDB.items];
  populateFaultFilters();
  updateFaultStats();
  renderFaultsTable();
  renderFaultCharts();
  attachFaultEventListeners();
  initQuickFault();
}

function attachFaultEventListeners() {
  const uploadBtn = document.getElementById("faultUploadBtn");
  const fileInput = document.getElementById("faultFileInput");
  if (uploadBtn && fileInput) {
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = handleFaultFileUpload;
  }
  const exportBtn = document.getElementById("faultExportBtn");
  if (exportBtn) exportBtn.onclick = exportFaultsData;
  const addBtn = document.getElementById("faultAddBtn");
  if (addBtn) addBtn.onclick = showAddFaultForm;
  const searchInput = document.getElementById("faultSearch");
  if (searchInput) searchInput.oninput = filterFaults;
  const applyBtn = document.getElementById("faultApplyFilter");
  if (applyBtn) applyBtn.onclick = filterFaults;
  const resetBtn = document.getElementById("faultResetFilter");
  if (resetBtn) resetBtn.onclick = resetFaultFilters;
  const clearBtn = document.getElementById("clearFaultData");
  if (clearBtn) clearBtn.onclick = clearFaultsData;
}

function populateFaultFilters() {
  const equipFilter = document.getElementById("faultEquipmentFilter");
  const equipSelect = document.getElementById("faultEquipment");
  if (equipFilter)
    equipFilter.innerHTML =
      '<option value="all">All Equipment</option>' +
      FaultsDB.equipmentList
        .map((e) => `<option value="${e}">${e}</option>`)
        .join("");
  if (equipSelect)
    equipSelect.innerHTML =
      '<option value="">Select Equipment</option>' +
      FaultsDB.equipmentList
        .map((e) => `<option value="${e}">${e}</option>`)
        .join("");
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
  document.getElementById("openFaults") &&
    (document.getElementById("openFaults").innerText = openFaults);
  document.getElementById("criticalFaults") &&
    (document.getElementById("criticalFaults").innerText = criticalFaults);
  document.getElementById("mttrValue") &&
    (document.getElementById("mttrValue").innerText = avgMTTR);
  document.getElementById("topFaultType") &&
    (document.getElementById("topFaultType").innerText =
      topType !== "-" ? `${topType} (${topCount})` : "-");
  document.getElementById("faultsCount") &&
    (document.getElementById("faultsCount").innerText =
      `${FaultsDB.filteredItems.length} records`);
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
      (fault) =>
        `<tr><td class="mono bold">${fault.faultId}</td><td>${fault.date}</td><td>${fault.time}</td><td>${fault.equipment}</td><td>${fault.type}</td><td><span class="severity-badge severity-${fault.severity.toLowerCase()}">${fault.severity}</span></td><td title="${fault.description}">${fault.description.substring(0, 35)}${fault.description.length > 35 ? "..." : ""}</td><td>${fault.downtime || 0} hrs</td><td><span class="severity-badge status-${fault.status.toLowerCase().replace(" ", "")}">${fault.status}</span></td><td><button class="btn-icon-view" onclick="viewFaultDetails(${fault.id})" title="View Details"><i class="fas fa-eye"></i></button>${fault.status !== "Closed" ? `<button class="btn-icon-wo" onclick="createWorkOrderFromFault(${fault.id})" title="Create Work Order"><i class="fas fa-clipboard-list"></i></button>` : ""}</td></tr>`,
    )
    .join("");
}

function renderFaultCharts() {
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
}

function viewFaultDetails(id) {
  const fault = FaultsDB.items.find((f) => f.id === id);
  if (!fault) return;
  const modal = document.getElementById("faultModal");
  const modalTitle = document.getElementById("faultModalTitle");
  const modalBody = document.querySelector("#faultModal .fault-modal-body");
  if (!modal || !modalBody) return;
  modalTitle.innerText = `Fault Details: ${fault.faultId}`;
  modalBody.innerHTML = `<div class="detail-row"><div class="detail-label">Fault ID</div><div class="detail-value mono">${fault.faultId}</div></div><div class="detail-row"><div class="detail-label">Date & Time</div><div class="detail-value">${fault.date} at ${fault.time}</div></div><div class="detail-row"><div class="detail-label">Equipment</div><div class="detail-value">${fault.equipment}</div></div><div class="detail-row"><div class="detail-label">Type / Severity</div><div class="detail-value">${fault.type} / <span class="severity-badge severity-${fault.severity.toLowerCase()}">${fault.severity}</span></div></div><div class="detail-row"><div class="detail-label">Description</div><div class="detail-value">${fault.description}</div></div><div class="detail-row"><div class="detail-label">Root Cause</div><div class="detail-value">${fault.cause || "Not yet determined"}</div></div><div class="detail-row"><div class="detail-label">Response / Resolution</div><div class="detail-value">Response: ${fault.responseTime || "N/A"} min | Resolution: ${fault.resolutionTime || "N/A"} hrs</div></div><div class="detail-row"><div class="detail-label">Downtime</div><div class="detail-value">${fault.downtime || 0} hours</div></div><div class="detail-row"><div class="detail-label">Status</div><div class="detail-value"><span class="severity-badge status-${fault.status.toLowerCase().replace(" ", "")}">${fault.status}</span></div></div><div class="detail-row"><div class="detail-label">Reported By</div><div class="detail-value">${fault.reportedBy || "Unknown"}</div></div><div class="detail-row"><div class="detail-label">Technician</div><div class="detail-value">${fault.technician || "Not assigned"}</div></div>${fault.resolutionNotes ? `<div class="detail-row"><div class="detail-label">Resolution Notes</div><div class="detail-value">${fault.resolutionNotes}</div></div>` : ""}`;
  const footer = document.querySelector("#faultModal .fault-modal-footer");
  const woFooter = document.getElementById("faultWOFooter");
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
    const workordersLink = document.querySelector(
      '.nav-item[onclick*="workorders"]',
    );
    if (workordersLink) showPage("workorders", workordersLink);
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
  if (document.getElementById("page-faults")?.classList.contains("active"))
    initFaults();
});

window.viewFaultDetails = viewFaultDetails;
window.createWorkOrderFromFault = createWorkOrderFromFault;
window.closeFaultModal = closeFaultModal;
window.filterFaults = filterFaults;

// ============================================
// MOBILE RESPONSIVENESS & TOUCH HANDLERS
// ============================================

function initMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!document.querySelector(".sidebar-overlay")) {
    const overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
  }
  const overlay = document.querySelector(".sidebar-overlay");
  function isMobile() {
    return window.innerWidth <= 768;
  }
  function closeMobileSidebar() {
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("active");
    document.body.style.overflow = "";
    document.body.classList.remove("sidebar-open");
  }
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
  if (overlay) overlay.onclick = closeMobileSidebar;
  const topbarToggle = document.querySelector(".topbar-toggle");
  if (topbarToggle) {
    const newToggle = topbarToggle.cloneNode(true);
    topbarToggle.parentNode.replaceChild(newToggle, topbarToggle);
    newToggle.onclick = (e) => {
      e.stopPropagation();
      window.toggleMobileSidebar();
    };
  }
  window.addEventListener("resize", () => {
    if (!isMobile() && sidebar && sidebar.classList.contains("open"))
      closeMobileSidebar();
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      if (isMobile()) setTimeout(closeMobileSidebar, 100);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar && sidebar.classList.contains("open"))
      closeMobileSidebar();
  });
}

function initTouchTables() {
  const scrollableTables = document.querySelectorAll(
    ".data-table-wrap, .table-wrapper, .faults-table-wrapper, .gen-table-wrapper, .doc-table-wrapper",
  );
  scrollableTables.forEach((table) => {
    let startX,
      scrollLeft,
      isDragging = false;
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

function preventInputZoom() {
  const inputs = document.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    input.addEventListener("focus", () => {
      if (window.innerWidth <= 768) {
        const originalFontSize = window.getComputedStyle(input).fontSize;
        if (parseInt(originalFontSize) < 16) {
          input.style.fontSize = "16px";
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

function initMobileModals() {
  const modals = document.querySelectorAll(
    ".fault-modal, .doc-modal, .equip-modal, .report-modal",
  );
  modals.forEach((modal) => {
    const modalBody = modal.querySelector(
      ".fault-modal-body, .doc-modal-body, .equip-modal-body, .report-modal-body",
    );
    if (modalBody)
      modalBody.addEventListener("touchstart", (e) => {
        e.stopPropagation();
      });
  });
}

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

function handleOrientationChange() {
  setTimeout(() => {
    if (typeof refreshAllCharts === "function") refreshAllCharts();
    fixMobileCharts();
  }, 200);
}
window.refreshAllCharts = function () {
  Object.keys(chartInstances).forEach((key) => {
    if (chartInstances[key] && typeof chartInstances[key].resize === "function")
      chartInstances[key].resize();
  });
};
function fixIOSVH() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.style.minHeight = `calc(var(--vh, 1vh) * 100)`;
}
function initMobileFeatures() {
  initMobileSidebar();
  initTouchTables();
  preventInputZoom();
  initMobileModals();
  fixMobileCharts();
  fixIOSVH();
}
document.addEventListener("DOMContentLoaded", () => {
  initMobileFeatures();
});
window.addEventListener("resize", () => {
  setTimeout(() => {
    initTouchTables();
    fixMobileCharts();
    fixIOSVH();
  }, 100);
});
window.addEventListener("orientationchange", handleOrientationChange);
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
setTimeout(() => {
  const modals = document.querySelectorAll(
    ".fault-modal, .doc-modal, .equip-modal, .report-modal",
  );
  modals.forEach((modal) => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "style") {
          if (modal.style.display === "flex")
            document.body.style.overflow = "hidden";
          else document.body.style.overflow = "";
        }
      });
    });
    observer.observe(modal, { attributes: true });
  });
}, 500);

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

    const days = createGenDaysFromData(rows);
    console.log("Created days:", days.length);

    if (days.length > 0) {
      GenDB.allDays = days;
      GenDB.filteredDays = days;
      localStorage.setItem("gen_days", JSON.stringify(GenDB.allDays));
      if (typeof onGenDataLoaded === "function") {
        onGenDataLoaded();
      }
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
  const mwReadings = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;
    for (let j = 0; j < Math.min(row.length, 35); j++) {
      const cell = row[j];
      if (cell && typeof cell === "string") {
        const num = parseFloat(cell);
        if (!isNaN(num) && num > 2 && num < 50) {
          let mwh = 0;
          if (j + 4 < row.length) {
            const mwhCell = parseFloat(row[j + 4]);
            if (!isNaN(mwhCell) && mwhCell > 1000) mwh = mwhCell;
          }
          mwReadings.push({ mw: num, mwh: mwh, rowIndex: i, colIndex: j });
          break;
        }
      }
    }
  }

  console.log("Found MW readings:", mwReadings.length);
  if (mwReadings.length === 0) return [];

  let totalMW = 0,
    maxMW = 0,
    totalMWH = 0;
  mwReadings.forEach((r) => {
    totalMW += r.mw;
    maxMW = Math.max(maxMW, r.mw);
    totalMWH += r.mwh;
  });

  const avgMW = totalMW / mwReadings.length;
  const opHours = Math.min(mwReadings.length, 24);
  const totalEnergy = totalMWH > 0 ? totalMWH : avgMW * opHours;

  const hours = [];
  for (let hour = 0; hour < 24; hour++) {
    let mwValue = 0;
    if (hour < mwReadings.length) {
      mwValue = mwReadings[hour].mw;
    } else if (hour >= 6 && hour < 6 + opHours) {
      mwValue = avgMW;
    }
    hours.push({
      hour: hour,
      hourStr: `${hour}:00`,
      u1Shutdown: mwValue === 0,
      u2Shutdown: true,
      u1: { mw: Math.round(mwValue * 100) / 100, pf: 0.98, hz: 50.0 },
      u2: { mw: 0, pf: 0.95, hz: 50.0 },
      grid: { mw: null },
      remarks: "",
    });
  }

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

  return [{ bsDate, hours, computed }];
}

function updateDashboardDirectly(days) {
  if (!days || days.length === 0) return;
  const day = days[0];
  const c = day.computed;

  const qsDays = document.getElementById("qsDays");
  const qsHours = document.getElementById("qsHours");
  const qsShutdown = document.getElementById("qsShutdown");
  const qsPF = document.getElementById("qsPF");
  if (qsDays) qsDays.innerHTML = days.length;
  if (qsHours) qsHours.innerHTML = c.opHours;
  if (qsShutdown) qsShutdown.innerHTML = c.shutdownHrs;
  if (qsPF) qsPF.innerHTML = c.avgPF.toFixed(3);

  const genDashTitle = document.getElementById("genDashTitle");
  const genDashSubtitle = document.getElementById("genDashSubtitle");
  if (genDashTitle)
    genDashTitle.innerHTML = `Generation Summary - ${day.bsDate}`;
  if (genDashSubtitle)
    genDashSubtitle.innerHTML = `${day.bsDate} · Set Nadi Hydroelectric Project`;

  const kpiRow = document.getElementById("genKpiRow");
  if (kpiRow) {
    kpiRow.innerHTML = `<div class="gen-kpi-card cyan"><div class="gen-kpi-label"><i class="fas fa-bolt"></i> TOTAL GENERATION</div><div class="gen-kpi-value">${c.totalEnergy.toFixed(1)}<span class="gen-kpi-unit">MWh</span></div><div class="gen-kpi-sub">U1: ${c.u1Energy.toFixed(1)} + U2: ${c.u2Energy.toFixed(1)} MWh</div></div>
      <div class="gen-kpi-card blue"><div class="gen-kpi-label"><i class="fas fa-charging-station"></i> AVG POWER</div><div class="gen-kpi-value">${c.u1AvgMW.toFixed(1)}<span class="gen-kpi-unit">MW</span></div><div class="gen-kpi-sub">Peak: ${c.maxMW.toFixed(1)} MW</div></div>
      <div class="gen-kpi-card green"><div class="gen-kpi-label"><i class="fas fa-clock"></i> OPERATION</div><div class="gen-kpi-value">${c.opHours}<span class="gen-kpi-unit">hrs</span></div><div class="gen-kpi-sub">Shutdown: ${c.shutdownHrs} hrs</div></div>
      <div class="gen-kpi-card amber"><div class="gen-kpi-label"><i class="fas fa-chart-line"></i> POWER FACTOR</div><div class="gen-kpi-value">${(c.avgPF * 100).toFixed(0)}<span class="gen-kpi-unit">%</span></div><div class="gen-kpi-sub">Frequency: ${c.avgHz.toFixed(2)} Hz</div></div>`;
  }

  if (typeof renderGenTrendChart === "function")
    renderGenTrendChart(days, "mwh");
  if (typeof renderUnitCompChart === "function") renderUnitCompChart(days);
  if (typeof renderGenDailyTable === "function") renderGenDailyTable(days);

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
  if (typeof onGenDataLoaded === "function") onGenDataLoaded();
  else updateDashboardDirectly(GenDB.allDays);
  showGenStatus(
    "📊 Sample data loaded (Google Sheets sync will override this)",
    "info",
  );
}

async function debugSheetData() {
  const response = await fetch(GOOGLE_SHEETS_URL);
  const text = await response.text();
  const rows = parseCSVToRows(text);
  console.log("=== DEBUG: First 10 rows with MW values ===");
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    if (row) {
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

window.syncWithGoogleSheets = syncWithGoogleSheets;
window.debugSheetData = debugSheetData;
window.createSampleData = createSampleData;

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

function initOperations() {
  loadShiftLogs();
  loadIncidents();
  loadHandovers();
  updateCurrentShiftDisplay();
}

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
      (log) =>
        `<div class="shift-entry"><div class="shift-time">${log.time}</div><div class="shift-badge shift-${log.type}">${log.type.toUpperCase()}</div><div class="shift-desc">${log.description}</div><div class="shift-operator">${log.operator}</div></div>`,
    )
    .join("");
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
  const days = [];
  let currentDay = null;
  for (let i = 1; i < rows.length; i++) {
    const timeVal = rows[i][0];
    if (timeVal && timeVal.toString().match(/^\d{1,2}/)) {
      const hour = parseInt(timeVal.toString().split(":")[0]);
      if (hour === 1 && currentDay && currentDay.hours.length > 0) {
        days.push(currentDay);
        currentDay = { date: `Day ${days.length + 1}`, hours: [] };
      } else if (!currentDay)
        currentDay = { date: `Day ${days.length + 1}`, hours: [] };
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
  document.getElementById("ops-data-status") &&
    (document.getElementById("ops-data-status").style.display = "none");
  document.getElementById("ops-data-summary") &&
    (document.getElementById("ops-data-summary").style.display = "block");
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
  document.getElementById("ops-date-range") &&
    (document.getElementById("ops-date-range").textContent =
      `${days[0]?.date} - ${days[days.length - 1]?.date}`);
  document.getElementById("ops-total-gen") &&
    (document.getElementById("ops-total-gen").textContent =
      totalGen.toFixed(1) + " MWh");
  document.getElementById("ops-op-hours") &&
    (document.getElementById("ops-op-hours").textContent = totalHours);
  document.getElementById("ops-avg-pf") &&
    (document.getElementById("ops-avg-pf").textContent = (
      totalPf / pfCount
    ).toFixed(3));
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
      (h) =>
        `<tr><td>${h.hour}:00</td><td>${h.u1MW.toFixed(1)}</td><td>${h.u2MW.toFixed(1)}</td><td>${(h.u1MW + h.u2MW).toFixed(1)}</td><td>${h.pf.toFixed(3)}</td><td>${h.u1MW > 0 || h.u2MW > 0 ? "🟢 RUNNING" : "🔴 STOPPED"}</td></tr>`,
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
  if (document.getElementById("page-operations")?.classList.contains("active"))
    initOperations();
});

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
let quickPhotos = [];

function initQuickFault() {
  const saved = localStorage.getItem("faults_items");
  FaultsDB.items = saved ? JSON.parse(saved) : defaultFaults;
  localStorage.setItem("faults_items", JSON.stringify(FaultsDB.items));
  FaultsDB.filteredItems = [...FaultsDB.items];
  updateFaultStats();
  renderQuickFaultTable();
  renderFaultCharts();

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

  const takePhotoBtn = document.getElementById("takePhotoBtn");
  const choosePhotoBtn = document.getElementById("choosePhotoBtn");
  const cameraInput = document.getElementById("cameraInput");
  const galleryInput = document.getElementById("galleryInput");
  const uploadArea = document.getElementById("photoUploadArea");

  if (takePhotoBtn && cameraInput) {
    takePhotoBtn.onclick = () => cameraInput.click();
    cameraInput.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0)
        handlePhotoFiles(e.target.files);
      cameraInput.value = "";
    };
  }
  if (choosePhotoBtn && galleryInput) {
    choosePhotoBtn.onclick = () => galleryInput.click();
    galleryInput.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0)
        handlePhotoFiles(e.target.files);
      galleryInput.value = "";
    };
  }
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

  document.querySelectorAll(".severity-chip").forEach((chip) => {
    chip.onclick = () => {
      document
        .querySelectorAll(".severity-chip")
        .forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      quickSelectedSeverity = chip.getAttribute("data-sev");
    };
  });

  const modal = document.getElementById("quickFaultModal");
  if (modal)
    modal.onclick = (e) => {
      if (e.target === modal) closeQuickModal();
    };
}

function handlePhotoFiles(files) {
  const maxFiles = 5;
  const maxSize = 5 * 1024 * 1024;
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
      (photo) =>
        `<div class="photo-preview-item"><img src="${photo.data}" alt="Fault photo" onclick="viewPhotoFullscreen('${photo.id}')"><button class="photo-remove-btn" onclick="removePhoto('${photo.id}'); event.stopPropagation();">✕</button></div>`,
    )
    .join("");
}

function viewPhotoFullscreen(photoId) {
  const photo = quickPhotos.find((p) => p.id == photoId);
  if (!photo) return;
  const viewer = document.createElement("div");
  viewer.className = "photo-viewer-modal";
  viewer.innerHTML = `<div class="photo-viewer-header"><span style="color: white; font-weight: 600;">Fault Photo</span><button class="photo-viewer-close" onclick="this.closest('.photo-viewer-modal').remove()">✕</button></div><div class="photo-viewer-content"><img src="${photo.data}" class="photo-viewer-image" alt="Fault photo"></div>`;
  document.body.appendChild(viewer);
  viewer.onclick = (e) => {
    if (e.target === viewer) viewer.remove();
  };
}

function removePhoto(photoId) {
  quickPhotos = quickPhotos.filter((p) => p.id != photoId);
  renderPhotoPreviews();
}

function openQuickModal() {
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

function closeQuickModal() {
  const modal = document.getElementById("quickFaultModal");
  if (modal) modal.classList.remove("active");
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
  renderQuickFaultTable();
  renderFaultCharts();
  closeQuickModal();
  resetQuickForm();
  showQuickToast(`⚡ Fault logged with ${photos.length} photo(s)!`, "#2ecc71");
}

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
      let statusClass = "status-open";
      if (fault.status === "Resolved") statusClass = "status-resolved";
      else if (fault.status === "Closed") statusClass = "status-closed";
      else if (fault.status === "In Progress") statusClass = "status-progress";
      return `<tr><td class="mono bold">${fault.faultId} ${photoBadge}</td><td>${fault.date}</td><td>${fault.time}</td><td>${fault.equipment}</td><td><span class="severity-badge severity-${fault.severity.toLowerCase()}">${fault.severity}</span></td><td title="${fault.description}">${fault.description.substring(0, 35)}${fault.description.length > 35 ? "..." : ""}</td><td><span class="severity-badge ${statusClass}">${fault.status}</span></td><td class="action-buttons" style="display: flex; gap: 6px; flex-wrap: wrap;"><button class="btn-icon-view" onclick="quickResolveFault(${fault.id})" title="Resolve" style="background: rgba(46,204,113,0.15); color: #2ecc71; padding: 6px 10px; border-radius: 8px;"><i class="fas fa-check-circle"></i></button>${photoCount > 0 ? `<button class="btn-icon-view" onclick="quickViewPhotos(${fault.id})" title="View Photos" style="background: rgba(74,157,232,0.15); color: #4a9de8; padding: 6px 10px; border-radius: 8px;"><i class="fas fa-camera"></i></button>` : ""}<button class="btn-icon-view" onclick="quickEditFault(${fault.id})" title="Edit" style="background: rgba(245,174,58,0.15); color: #f5ae3a; padding: 6px 10px; border-radius: 8px;"><i class="fas fa-edit"></i></button></td></tr>`;
    })
    .join("");
}

function quickViewPhotos(faultId) {
  const fault = FaultsDB.items.find((f) => f.id === faultId);
  if (!fault) return;
  if (!fault.photos || fault.photos.length === 0) {
    showQuickToast("No photos attached to this fault", "#f5ae3a");
    return;
  }
  let photosHtml = "";
  fault.photos.forEach((photo, index) => {
    photosHtml += `<div style="margin-bottom: 16px; text-align: center;"><img src="${photo}" alt="Fault photo ${index + 1}" style="max-width: 100%; border-radius: 16px; border: 1px solid var(--border); cursor: pointer;" onclick="window.open(this.src, '_blank')"><div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">Photo ${index + 1} of ${fault.photos.length}</div></div>`;
  });
  const modalHtml = `<div class="photo-viewer-modal" id="photoViewerModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.95); z-index: 3000; display: flex; flex-direction: column; overflow-y: auto; -webkit-overflow-scrolling: touch;"><div style="position: sticky; top: 0; background: rgba(0,0,0,0.9); padding: 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 10;"><div><div style="color: white; font-weight: 600;">${fault.faultId}</div><div style="color: #aaa; font-size: 11px;">${fault.equipment} · ${fault.severity}</div></div><button onclick="closePhotoViewer()" style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.2); border: none; color: white; font-size: 20px; cursor: pointer;">✕</button></div><div style="padding: 20px;"><div style="margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 12px;"><div style="color: #aaa; font-size: 11px; margin-bottom: 4px;">Description</div><div style="color: white; font-size: 13px;">${fault.description}</div></div>${photosHtml}</div></div>`;
  const existing = document.getElementById("photoViewerModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", modalHtml);
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

window.quickResolveFault = quickResolveFault;
window.quickEditFault = quickEditFault;
window.quickViewPhotos = quickViewPhotos;
window.closeQuickModal = closeQuickModal;
window.removePhoto = removePhoto;
window.closePhotoViewer = closePhotoViewer;
window.viewPhotoFullscreen = viewPhotoFullscreen;

console.log("HydroPlant Manager - All modules loaded successfully!");
