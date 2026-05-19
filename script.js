// ============================================
// HYDROPLANT MANAGER - COMPLETE WITH LOGIN
// ============================================

// Global variables
let GenDB = { allDays: [], filteredDays: [] };
let MaintDB = { tasks: [], history: [], assets: [] };
let EquipmentDB = { items: [] };
let FaultsDB = { items: [] };
let feedPhotos = [];
const chartInstances = {};

// User Management
let UserDB = { currentUser: null, users: [] };

const ROLES = {
  super_admin: { name: "Super Admin", level: 1, permissions: ["*"] },
  plant_incharge: {
    name: "Plant Incharge",
    level: 2,
    permissions: [
      "view_dashboard",
      "view_operations",
      "view_generation",
      "view_maintenance",
      "view_workorders",
      "view_equipment",
      "view_faults",
      "view_inventory",
      "create_workorders",
      "approve_workorders",
    ],
  },
  headworks_incharge: {
    name: "Headworks Incharge",
    level: 3,
    permissions: [
      "view_dashboard",
      "view_operations",
      "view_generation",
      "view_maintenance",
      "view_workorders",
      "view_equipment",
      "view_faults",
      "create_workorders",
    ],
  },
  operator: {
    name: "Operator",
    level: 4,
    permissions: [
      "view_dashboard",
      "view_operations",
      "view_generation",
      "view_maintenance",
      "view_workorders",
      "view_equipment",
      "log_operations",
      "complete_workorders",
    ],
  },
  viewer: {
    name: "Viewer",
    level: 5,
    permissions: [
      "view_dashboard",
      "view_generation",
      "view_equipment",
      "view_reports",
    ],
  },
};

const DEFAULT_USERS = [
  {
    id: "user_1",
    username: "admin",
    email: "admin@hydroplant.com",
    password: "Admin@123",
    fullName: "System Administrator",
    role: "super_admin",
    phone: "",
    employeeId: "ADMIN001",
    department: "IT",
    shift: null,
    isActive: true,
    lastLogin: null,
    createdAt: new Date().toISOString(),
    createdBy: "system",
  },
  {
    id: "user_2",
    username: "rajesh.kumar",
    email: "rajesh.kumar@hydroplant.com",
    password: "Plant@2024",
    fullName: "Rajesh Kumar",
    role: "plant_incharge",
    phone: "",
    employeeId: "HPP001",
    department: "Operations",
    shift: null,
    isActive: true,
    lastLogin: null,
    createdAt: new Date().toISOString(),
    createdBy: "admin",
  },
  {
    id: "user_3",
    username: "prakash.thapa",
    email: "prakash.thapa@hydroplant.com",
    password: "Head@2024",
    fullName: "Prakash Thapa",
    role: "headworks_incharge",
    phone: "",
    employeeId: "HPP002",
    department: "Headworks",
    shift: null,
    isActive: true,
    lastLogin: null,
    createdAt: new Date().toISOString(),
    createdBy: "admin",
  },
  {
    id: "user_4",
    username: "suresh.gurung",
    email: "suresh.gurung@hydroplant.com",
    password: "Shift@2024",
    fullName: "Suresh Gurung",
    role: "operator",
    phone: "",
    employeeId: "HPP003",
    department: "Operations",
    shift: "A",
    isActive: true,
    lastLogin: null,
    createdAt: new Date().toISOString(),
    createdBy: "admin",
  },
  {
    id: "user_5",
    username: "anita.shrestha",
    email: "anita.shrestha@hydroplant.com",
    password: "View@2024",
    fullName: "Anita Shrestha",
    role: "viewer",
    phone: "",
    employeeId: "HPP004",
    department: "Management",
    shift: null,
    isActive: true,
    lastLogin: null,
    createdAt: new Date().toISOString(),
    createdBy: "admin",
  },
];

// Initialize user system
function initUserSystem() {
  const saved = localStorage.getItem("hydroplant_users");
  UserDB.users = saved ? JSON.parse(saved) : DEFAULT_USERS;
  if (!saved)
    localStorage.setItem("hydroplant_users", JSON.stringify(UserDB.users));

  const savedSession = localStorage.getItem("hydroplant_session");
  if (savedSession) {
    const session = JSON.parse(savedSession);
    if (session.expires > Date.now()) {
      UserDB.currentUser = UserDB.users.find((u) => u.id === session.userId);
      if (UserDB.currentUser && UserDB.currentUser.isActive) {
        showMainApp();
        return;
      }
    }
  }
  showLoginPage();
}

function showLoginPage() {
  document.getElementById("loginPage").style.display = "flex";
  document.getElementById("mainApp").style.display = "none";
}

function showMainApp() {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("mainApp").style.display = "flex";

  // Update sidebar with user info
  document.getElementById("sidebarUserName").textContent =
    UserDB.currentUser.fullName;
  document.getElementById("sidebarUserRole").textContent =
    ROLES[UserDB.currentUser.role].name;
  document.getElementById("userAvatar").textContent =
    UserDB.currentUser.fullName.charAt(0);

  // Show/hide admin section
  const adminSection = document.getElementById("adminSection");
  if (adminSection)
    adminSection.style.display =
      UserDB.currentUser.role === "super_admin" ? "block" : "none";

  // Initialize data
  initDashboardCharts();
  initMaintenance();
  initEquipment();
  initFaults();
  loadMaintenanceFeed();

  // Show dashboard
  showPage("dashboard");
  initMobileSidebar();
  initNavHandlers();
}

// Login handler
document.addEventListener("DOMContentLoaded", () => {
  initUserSystem();

  document.getElementById("loginForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const rememberMe = document.getElementById("rememberMe").checked;

    const user = UserDB.users.find(
      (u) => u.email === email && u.password === password && u.isActive,
    );
    if (user) {
      user.lastLogin = new Date().toISOString();
      localStorage.setItem("hydroplant_users", JSON.stringify(UserDB.users));

      const session = {
        userId: user.id,
        loginTime: Date.now(),
        expires: rememberMe
          ? Date.now() + 30 * 24 * 60 * 60 * 1000
          : Date.now() + 8 * 60 * 60 * 1000,
      };
      localStorage.setItem("hydroplant_session", JSON.stringify(session));
      UserDB.currentUser = user;
      showMainApp();
    } else {
      alert("Invalid email or password");
    }
  });
});

function logout() {
  localStorage.removeItem("hydroplant_session");
  UserDB.currentUser = null;
  showLoginPage();
}

// Navigation
function showPage(pageId) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById(`page-${pageId}`)?.classList.add("active");

  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document
    .querySelector(`.nav-item[data-page="${pageId}"]`)
    ?.classList.add("active");

  const breadcrumb = document.getElementById("breadcrumb");
  const names = {
    dashboard: "Dashboard",
    operations: "Operations",
    generation: "Generation",
    maintenance: "Maintenance",
    workorders: "Work Orders",
    equipment: "Equipment",
    faults: "Faults",
    inventory: "Inventory",
    documents: "Documents",
    reports: "Reports",
    users: "User Management",
    feed: "Maintenance Feed",
  };
  if (breadcrumb) breadcrumb.textContent = names[pageId] || pageId;

  if (pageId === "users" && UserDB.currentUser?.role === "super_admin")
    renderUserManagement();
  if (pageId === "feed") loadMaintenanceFeed();
}

// Dashboard Charts
function initDashboardCharts() {
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
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
          label: "Generation (MW)",
          data: gen,
          borderColor: "#4a9de8",
          backgroundColor: "rgba(74,157,232,.1)",
          fill: true,
          tension: 0.4,
        },
        {
          label: "Water (m³/s)",
          data: water,
          borderColor: "#29c48f",
          borderDash: [5, 5],
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y1: { position: "right" } },
    },
  });
}

function mkChart(id, config) {
  if (chartInstances[id]) chartInstances[id].destroy();
  const ctx = document.getElementById(id);
  if (ctx) chartInstances[id] = new Chart(ctx, config);
}

function toggleTheme() {
  document.documentElement.setAttribute(
    "data-theme",
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "light"
      : "dark",
  );
  initDashboardCharts();
}

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

function initNavHandlers() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    if (item.dataset.navInit === "true") return;
    item.dataset.navInit = "true";
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const pageId = item.dataset.page;
      if (pageId) showPage(pageId);
      if (
        window.innerWidth <= 768 &&
        typeof window.closeMobileSidebar === "function"
      ) {
        setTimeout(window.closeMobileSidebar, 100);
      }
    });
  });
}

function initMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  let overlay = document.querySelector(".sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
  }

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

  overlay.onclick = window.closeMobileSidebar;
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && sidebar.classList.contains("open")) {
      window.closeMobileSidebar();
    }
  });
}

function toggleNotif() {
  document.getElementById("notifPanel")?.classList.toggle("open");
}

// ============================================
// ENHANCED FEED SYSTEM - Instagram Style
// ============================================

// Google Apps Script Web App URL - UPDATE THIS AFTER DEPLOYMENT
// const FEED_API_URL =
//   "https://script.google.com/macros/s/AKfycbx1J8Hl7TUMfXXWZ_X9fKEgIr2kSmFm-zSgoifNxSdk7G2Xe7YifT7DCTeb1IVBYa0G/exec";

// Current user for feed interactions
let feedCurrentUser = null;
let pendingPhotos = [];

// Load feed posts from localStorage
async function loadMaintenanceFeed() {
  const container = document.getElementById("feedPosts");
  const loadingIndicator = document.getElementById("feedLoadingIndicator");

  if (!container) return;

  try {
    if (loadingIndicator) loadingIndicator.style.display = "block";
    container.innerHTML = "";

    // Load posts from localStorage instead of external API
    let posts = JSON.parse(localStorage.getItem("maintenance_feed_posts") || "[]");

    // If no posts exist, use sample data
    if (posts.length === 0) {
      posts = [
        {
          id: 1,
          userId: "user1",
          userName: "Rajesh Kumar",
          userRole: "Plant Incharge",
          avatar: "RK",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          title: "Unit 2 Generator Bearing Replacement Completed",
          description: "Successfully replaced the upper guide bearing on Unit 2. Bearing temperature now within optimal range.",
          equipment: "Unit 2 Generator",
          type: "complete",
          tags: ["bearing", "unit2", "maintenance"],
          likes: [],
          comments: [],
          photos: []
        },
        {
          id: 2,
          userId: "user2",
          userName: "Prakash Thapa",
          userRole: "Technician",
          avatar: "PT",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          title: "Unit 3 Governor Quarterly Service Due",
          description: "Reminder: Unit 3 Governor quarterly service is due this week. Pre-inspection checklist completed.",
          equipment: "Unit 3 Governor",
          type: "update",
          tags: ["governor", "unit3", "urgent"],
          likes: [],
          comments: [],
          photos: []
        },
        {
          id: 3,
          userId: "user3",
          userName: "Nirmala Sharma",
          userRole: "Technician",
          avatar: "NS",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          title: "Water Intake Gate Valve Inspection",
          description: "Completed weekly inspection of intake gate valves. All readings nominal, no issues detected.",
          equipment: "Water Intake",
          type: "inspection",
          tags: ["intake", "inspection", "water"],
          likes: [],
          comments: [],
          photos: []
        }
      ];
      localStorage.setItem("maintenance_feed_posts", JSON.stringify(posts));
    }

    const result = { success: true, posts };

    if (!result.success) {
      throw new Error(result.error || "Failed to load posts");
    }

    if (posts.length === 0) {
      container.innerHTML = `
        <div class="feed-empty-state">
          <i class="fas fa-instagram" style="font-size: 48px; opacity: 0.5; margin-bottom: 16px; display: block;"></i>
          <h3>No posts yet</h3>
          <p>Be the first to share a maintenance update!</p>
          <button class="btn btn-primary" style="margin-top: 16px;" onclick="toggleInlinePostForm()">
            <i class="fas fa-plus-circle"></i> Create Post
          </button>
        </div>
      `;
      return;
    }

    // Render each post
    posts.forEach((post) => {
      const postElement = createFeedPostElement(post);
      container.appendChild(postElement);
    });
  } catch (error) {
    console.error("Error loading feed:", error);
    container.innerHTML = `
      <div class="feed-empty-state">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; opacity: 0.5; margin-bottom: 16px; display: block;"></i>
        <h3>Error Loading Feed</h3>
        <p>${error.message}</p>
        <button class="btn btn-primary" style="margin-top: 16px;" onclick="loadMaintenanceFeed()">
          <i class="fas fa-sync-alt"></i> Try Again
        </button>
      </div>
    `;
  } finally {
    if (loadingIndicator) loadingIndicator.style.display = "none";
  }
}

// Create DOM element for a single feed post
function createFeedPostElement(post) {
  const postDiv = document.createElement("div");
  postDiv.className = "feed-post-card";
  postDiv.dataset.postId = post.id;

  const likes = post.likes || [];
  const comments = post.comments || [];
  const photos = post.photos || [];
  const isLiked = likes.some((like) => like.userId === feedCurrentUser?.id);

  // Header
  const header = `
    <div class="feed-post-header">
      <div class="feed-post-avatar" style="background: ${getAvatarColorByRole(post.authorRole)}">
        ${post.authorAvatar || post.author.charAt(0)}
      </div>
      <div class="feed-post-author-info">
        <div class="feed-post-author">${escapeHtml(post.author)}</div>
        <div class="feed-post-time">
          ${formatTimeAgo(post.timestamp)}
          <span class="feed-post-badge ${post.type || "update"}">${getPostTypeLabel(post.type)}</span>
        </div>
      </div>
    </div>
  `;

  // Photos grid
  let photosHtml = "";
  if (photos.length > 0) {
    let gridClass = "one-photo";
    if (photos.length === 2) gridClass = "two-photos";
    if (photos.length >= 3) gridClass = "three-photos";

    photosHtml = `
      <div class="feed-post-photos ${gridClass}">
        ${photos
          .map(
            (photo, idx) => `
          <div class="photo-item" onclick="viewPhoto('${photo}', ${idx})">
            <img src="${photo}" alt="Post photo" loading="lazy" />
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  // Caption
  const caption = `
    <div class="feed-post-caption">
      ${post.title ? `<div class="caption-title">${escapeHtml(post.title)}</div>` : ""}
      ${post.equipment ? `<div class="caption-equipment"><i class="fas fa-microchip"></i> ${escapeHtml(post.equipment)}</div>` : ""}
      <div class="caption-text">${escapeHtml(post.description || "")}</div>
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

  // Stats (likes count)
  const stats = `
    <div class="feed-post-stats">
      <span class="like-count" onclick="toggleLikeUsersModal('${post.id}')">
        ${likes.length} ${likes.length === 1 ? "like" : "likes"}
      </span>
    </div>
  `;

  // Action buttons
  const actions = `
    <div class="feed-post-actions">
      <button class="feed-action-btn ${isLiked ? "liked" : ""}" onclick="toggleLike('${post.id}')">
        <i class="fas ${isLiked ? "fa-heart" : "fa-heart"}"></i> ${isLiked ? "Liked" : "Like"}
      </button>
      <button class="feed-action-btn" onclick="focusCommentInput('${post.id}')">
        <i class="far fa-comment"></i> Comment
      </button>
    </div>
  `;

  // Comments section
  let commentsHtml = "";
  const visibleComments = comments.slice(0, 2);
  const hasMoreComments = comments.length > 2;

  if (comments.length > 0) {
    commentsHtml = `
      <div class="feed-comments-section" id="comments-${post.id}">
        ${visibleComments
          .map(
            (comment) => `
          <div class="feed-comment" data-comment-id="${comment.id}">
            <div class="feed-comment-avatar" style="background: ${getAvatarColorByRole(comment.userRole)}">
              ${comment.userAvatar || comment.userName.charAt(0)}
            </div>
            <div class="feed-comment-content">
              <div class="feed-comment-author">${escapeHtml(comment.userName)}</div>
              <div class="feed-comment-text">${escapeHtml(comment.text)}</div>
              <div class="feed-comment-time">${formatTimeAgo(comment.timestamp)}</div>
            </div>
            ${
              comment.userId === feedCurrentUser?.id ||
              feedCurrentUser?.role === "super_admin"
                ? `
              <button class="delete-comment-btn" onclick="deleteComment('${post.id}', '${comment.id}')">
                <i class="fas fa-trash-alt"></i>
              </button>
            `
                : ""
            }
          </div>
        `,
          )
          .join("")}
        ${
          hasMoreComments
            ? `
          <div class="view-more-comments" onclick="loadAllComments('${post.id}')">
            View all ${comments.length} comments
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  // Comment input
  const commentInput = `
    <div class="feed-comment-form">
      <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Add a comment..." maxlength="500" />
      <button class="comment-submit-btn" onclick="submitComment('${post.id}')">Post</button>
    </div>
  `;

  postDiv.innerHTML =
    header +
    photosHtml +
    caption +
    stats +
    actions +
    commentsHtml +
    commentInput;

  return postDiv;
}

// Helper Functions
function getAvatarColorByRole(role) {
  const colors = {
    super_admin: "#e24b4a",
    plant_incharge: "#4a9de8",
    headworks_incharge: "#29c48f",
    operator: "#f5ae3a",
    viewer: "#9f7aea",
  };
  return colors[role] || "#576170";
}

function getPostTypeLabel(type) {
  const labels = {
    update: "🔧 Update",
    issue: "⚠️ Issue",
    complete: "✅ Complete",
    inspection: "🔍 Inspection",
  };
  return labels[type] || "📝 Post";
}

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`;
    }
  }
  return "just now";
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Like functionality
async function toggleLike(postId) {
  if (!feedCurrentUser) return;

  const post = document.querySelector(
    `.feed-post-card[data-post-id="${postId}"]`,
  );
  const likeBtn = post?.querySelector(".feed-action-btn");
  const isLiked = likeBtn?.classList.contains("liked");

  const action = isLiked ? "unlikePost" : "likePost";

  try {
    const response = await fetch(FEED_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: action,
        postId: postId,
        userId: feedCurrentUser.id,
        userName: feedCurrentUser.fullName,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Update UI
      if (action === "likePost") {
        likeBtn?.classList.add("liked");
        likeBtn.innerHTML = '<i class="fas fa-heart"></i> Liked';
      } else {
        likeBtn?.classList.remove("liked");
        likeBtn.innerHTML = '<i class="far fa-heart"></i> Like';
      }

      // Update like count
      const likeCountSpan = post?.querySelector(".like-count");
      if (likeCountSpan && result.likes) {
        const count = result.likes.length;
        likeCountSpan.textContent = `${count} ${count === 1 ? "like" : "likes"}`;
      }
    }
  } catch (error) {
    console.error("Error toggling like:", error);
  }
}

// Submit comment
async function submitComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const text = input?.value.trim();

  if (!text || !feedCurrentUser) return;

  try {
    const response = await fetch(FEED_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addComment",
        postId: postId,
        userId: feedCurrentUser.id,
        userName: feedCurrentUser.fullName,
        userAvatar: feedCurrentUser.fullName.charAt(0),
        text: text,
      }),
    });

    const result = await response.json();

    if (result.success) {
      input.value = "";
      // Refresh just this post's comments
      refreshPostComments(postId, result.allComments);
    }
  } catch (error) {
    console.error("Error submitting comment:", error);
  }
}

// Delete comment
async function deleteComment(postId, commentId) {
  if (!confirm("Delete this comment?")) return;

  try {
    const response = await fetch(FEED_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "deleteComment",
        postId: postId,
        commentId: commentId,
        userId: feedCurrentUser.id,
      }),
    });

    const result = await response.json();

    if (result.success) {
      refreshPostComments(postId, result.comments);
    }
  } catch (error) {
    console.error("Error deleting comment:", error);
  }
}

// Refresh comments for a post
function refreshPostComments(postId, comments) {
  const commentsSection = document.getElementById(`comments-${postId}`);
  if (!commentsSection) return;

  const visibleComments = comments.slice(0, 2);
  const hasMoreComments = comments.length > 2;

  commentsSection.innerHTML = `
    ${visibleComments
      .map(
        (comment) => `
      <div class="feed-comment" data-comment-id="${comment.id}">
        <div class="feed-comment-avatar" style="background: ${getAvatarColorByRole(comment.userRole)}">
          ${comment.userAvatar || comment.userName.charAt(0)}
        </div>
        <div class="feed-comment-content">
          <div class="feed-comment-author">${escapeHtml(comment.userName)}</div>
          <div class="feed-comment-text">${escapeHtml(comment.text)}</div>
          <div class="feed-comment-time">${formatTimeAgo(comment.timestamp)}</div>
        </div>
        ${
          comment.userId === feedCurrentUser?.id ||
          feedCurrentUser?.role === "super_admin"
            ? `
          <button class="delete-comment-btn" onclick="deleteComment('${postId}', '${comment.id}')">
            <i class="fas fa-trash-alt"></i>
          </button>
        `
            : ""
        }
      </div>
    `,
      )
      .join("")}
    ${
      hasMoreComments
        ? `
      <div class="view-more-comments" onclick="loadAllComments('${postId}')">
        View all ${comments.length} comments
      </div>
    `
        : ""
    }
  `;
}

// Load all comments in a modal
function loadAllComments(postId) {
  const post = document.querySelector(
    `.feed-post-card[data-post-id="${postId}"]`,
  );
  // This would open a modal showing all comments
  alert("All comments feature - would show modal with full comment list");
}

// Focus comment input
function focusCommentInput(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  if (input) input.focus();
}

// Create new post
async function submitInlinePost() {
  const title = document.getElementById("inlinePostTitle")?.value || "";
  const description = document.getElementById("inlinePostDesc")?.value || "";
  const equipment = document.getElementById("inlinePostEquipment")?.value || "";
  const workOrder = document.getElementById("inlinePostWorkOrder")?.value || "";
  const tags = document.getElementById("inlinePostTags")?.value || "";

  const activeTypeBtn = document.querySelector(".post-type-btn.active");
  const type = activeTypeBtn?.dataset.type || "update";

  if (!description && !title) {
    alert("Please enter a description or title");
    return;
  }

  // Convert photos to base64
  const photoPromises = pendingPhotos.map((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  });

  const photos = await Promise.all(photoPromises);

  try {
    const response = await fetch(FEED_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createPost",
        author: feedCurrentUser?.fullName || "Unknown",
        authorRole: feedCurrentUser?.role || "operator",
        authorAvatar: feedCurrentUser?.fullName?.charAt(0) || "U",
        title: title,
        description: description,
        type: type,
        equipment: equipment,
        workOrder: workOrder,
        tags: tags,
        photos: photos,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Clear form
      document.getElementById("inlinePostTitle").value = "";
      document.getElementById("inlinePostDesc").value = "";
      document.getElementById("inlinePostEquipment").value = "";
      document.getElementById("inlinePostWorkOrder").value = "";
      document.getElementById("inlinePostTags").value = "";
      document.getElementById("photoPreviewContainer").innerHTML = "";
      pendingPhotos = [];

      // Close form and refresh feed
      toggleInlinePostForm();
      loadMaintenanceFeed();

      // Show success message
      showToast("Post created successfully!", "success");
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("Error creating post:", error);
    alert("Error creating post: " + error.message);
  }
}

// Photo preview function
function previewFeedPhotos(input) {
  const previewContainer = document.getElementById("photoPreviewContainer");
  if (!previewContainer) return;

  pendingPhotos = [...pendingPhotos, ...Array.from(input.files)];

  previewContainer.innerHTML = pendingPhotos
    .map(
      (file, idx) => `
    <div class="feed-photo-preview">
      <img src="${URL.createObjectURL(file)}" alt="Preview" />
      <button class="feed-photo-remove" onclick="removePendingPhoto(${idx})">×</button>
    </div>
  `,
    )
    .join("");

  input.value = "";
}

function removePendingPhoto(index) {
  pendingPhotos.splice(index, 1);
  previewFeedPhotos({ files: [] }); // Refresh preview
}

// View photo fullscreen
function viewPhoto(photoUrl, index) {
  const modal = document.createElement("div");
  modal.className = "photo-viewer-overlay";
  modal.onclick = () => modal.remove();
  modal.innerHTML = `
    <div class="photo-viewer-content" onclick="event.stopPropagation()">
      <img src="${photoUrl}" alt="Full size" />
    </div>
    <button class="photo-viewer-close" onclick="this.closest('.photo-viewer-overlay').remove()">×</button>
  `;
  document.body.appendChild(modal);
}

// Toast notification
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fas ${type === "success" ? "fa-check-circle" : "fa-info-circle"}"></i>
    <span>${message}</span>
  `;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: var(--bg-card);
    border-left: 4px solid ${type === "success" ? "#29c48f" : "#4a9de8"};
    padding: 12px 20px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    animation: slideInRight 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Set current user from logged-in user
function setFeedCurrentUser() {
  feedCurrentUser = UserDB.currentUser;
}

// Initialize feed when page loads
function initFeed() {
  setFeedCurrentUser();
  loadMaintenanceFeed();
}

// Call this when showing feed page
// Override the existing showPage function to load feed when feed page is shown
const originalShowPage = window.showPage;
window.showPage = function (pageId) {
  if (originalShowPage) originalShowPage(pageId);
  if (pageId === "feed") {
    initFeed();
  }
};

// Add CSS for toast animation
const toastStyle = document.createElement("style");
toastStyle.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(toastStyle);

function toggleInlinePostForm() {
  const f = document.getElementById("inlinePostForm");
  if (f) f.style.display = f.style.display === "none" ? "block" : "none";
}
function submitInlinePost() {
  alert("Post feature - would save to localStorage");
  toggleInlinePostForm();
  loadMaintenanceFeed();
}

// User Management
function renderUserManagement() {
  const tbody = document.getElementById("userTableBody");
  if (!tbody) return;
  tbody.innerHTML = UserDB.users
    .map(
      (user) =>
        `<tr><td><div class="user-avatar-mini" style="background:${getAvatarColor(user.role)}">${user.fullName[0]}</div></td><td><div><strong>${user.fullName}</strong><br><small>${user.email}</small></div></td><td>${user.employeeId || "-"}</td><td><span class="role-badge role-${user.role}">${ROLES[user.role]?.name || user.role}</span></td><td>${user.shift || "-"}</td><td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}</td><td><span class="status-badge ${user.isActive ? "status-active" : "status-inactive"}">${user.isActive ? "Active" : "Inactive"}</span></td><td><button class="btn-icon-sm" onclick="editUser('${user.id}')"><i class="fas fa-edit"></i></button> <button class="btn-icon-sm" onclick="resetUserPassword('${user.id}')"><i class="fas fa-key"></i></button> <button class="btn-icon-sm" onclick="toggleUserStatus('${user.id}')"><i class="fas ${user.isActive ? "fa-ban" : "fa-check-circle"}"></i></button></td></tr>`,
    )
    .join("");
  document.getElementById("totalUsers").innerText = UserDB.users.length;
  document.getElementById("activeUsers").innerText = UserDB.users.filter(
    (u) => u.isActive,
  ).length;
}

function getAvatarColor(role) {
  return (
    {
      super_admin: "#e24b4a",
      plant_incharge: "#4a9de8",
      headworks_incharge: "#29c48f",
      operator: "#f5ae3a",
      viewer: "#9f7aea",
    }[role] || "#576170"
  );
}

function showAddUserModal() {
  document.getElementById("userId").value = "";
  document.getElementById("userForm")?.reset();
  document.getElementById("userModal").style.display = "flex";
}
function closeUserModal() {
  document.getElementById("userModal").style.display = "none";
}
function editUser(id) {
  const u = UserDB.users.find((u) => u.id === id);
  if (u) {
    document.getElementById("userId").value = u.id;
    document.getElementById("userFullName").value = u.fullName;
    document.getElementById("userEmail").value = u.email;
    document.getElementById("userUsername").value = u.username;
    document.getElementById("userRole").value = u.role;
    document.getElementById("userPhone").value = u.phone || "";
    document.getElementById("userEmployeeId").value = u.employeeId || "";
    document.getElementById("userDepartment").value = u.department || "";
    document.getElementById("userShift").value = u.shift || "";
    document.getElementById("userPassword").value = "";
    document.getElementById("userModal").style.display = "flex";
  }
}
function saveUser() {
  const id = document.getElementById("userId").value;
  const userData = {
    id: id || "user_" + Date.now(),
    fullName: document.getElementById("userFullName").value,
    email: document.getElementById("userEmail").value,
    username: document.getElementById("userUsername").value,
    role: document.getElementById("userRole").value,
    phone: document.getElementById("userPhone").value,
    employeeId: document.getElementById("userEmployeeId").value,
    department: document.getElementById("userDepartment").value,
    shift: document.getElementById("userShift").value || null,
    isActive: true,
    lastLogin: null,
    createdAt: new Date().toISOString(),
    createdBy: UserDB.currentUser?.username || "admin",
  };
  const pwd = document.getElementById("userPassword").value;
  if (pwd) userData.password = pwd;
  if (id) {
    const index = UserDB.users.findIndex((u) => u.id === id);
    if (index !== -1) {
      if (pwd) UserDB.users[index] = { ...UserDB.users[index], ...userData };
      else
        UserDB.users[index] = {
          ...UserDB.users[index],
          ...userData,
          password: UserDB.users[index].password,
        };
    }
  } else {
    if (!pwd) {
      alert("Password required for new user");
      return;
    }
    UserDB.users.push(userData);
  }
  localStorage.setItem("hydroplant_users", JSON.stringify(UserDB.users));
  closeUserModal();
  renderUserManagement();
  alert(id ? "User updated" : "User created");
}
// ============================================
// PASSWORD RESET SYSTEM WITH EMAIL SIMULATION
// ============================================

// Store password reset requests
let passwordResetRequests = [];

// Show forgot password modal
function showForgotPassword() {
  document.getElementById("forgotModal").style.display = "flex";
  document.getElementById("resetStep1").style.display = "block";
  document.getElementById("resetStep2").style.display = "none";
  document.getElementById("resetStep3").style.display = "none";
  document.getElementById("resetEmail").value = "";
  document.getElementById("resetCode").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
  document.getElementById("resetBtn").innerHTML = "Send Reset Code";
  document.getElementById("resetBtn").onclick = sendResetCode;
}

function closeForgotModal() {
  document.getElementById("forgotModal").style.display = "none";
  // Clear any timeouts
  if (window.countdownInterval) clearInterval(window.countdownInterval);
}

// Step 1: Send reset code to email
function sendResetCode() {
  const email = document.getElementById("resetEmail").value.trim();

  if (!email) {
    showResetMessage("Please enter your email address", "error");
    return;
  }

  // Find user by email
  const user = UserDB.users.find((u) => u.email === email);

  if (!user) {
    showResetMessage("No account found with this email address", "error");
    return;
  }

  // Generate 6-digit verification code
  const verificationCode = Math.floor(
    100000 + Math.random() * 900000,
  ).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

  // Store reset request
  const resetRequest = {
    email: email,
    code: verificationCode,
    expiresAt: expiresAt,
    userId: user.id,
  };

  passwordResetRequests = passwordResetRequests.filter(
    (r) => r.email !== email,
  );
  passwordResetRequests.push(resetRequest);

  // SIMULATE SENDING EMAIL
  // In production, replace this with actual email API call
  showEmailSimulation(email, verificationCode);

  // Also show in console for testing
  console.log(`Password reset code for ${email}: ${verificationCode}`);

  // Move to step 2
  document.getElementById("resetStep1").style.display = "none";
  document.getElementById("resetStep2").style.display = "block";
  document.getElementById("resetBtn").innerHTML = "Verify Code";
  document.getElementById("resetBtn").onclick = verifyResetCode;

  // Start countdown timer
  startCountdown(600); // 10 minutes = 600 seconds
}

// Simulate email sending with a modal
function showEmailSimulation(email, code) {
  // Create email simulation modal
  const emailModal = document.createElement("div");
  emailModal.className = "email-sim-modal";
  emailModal.innerHTML = `
    <div class="email-sim-content">
      <div class="email-sim-header">
        <i class="fas fa-envelope-open-text"></i>
        <h3>📧 Email Sent (Demo)</h3>
        <button class="email-sim-close" onclick="this.closest('.email-sim-modal').remove()">×</button>
      </div>
      <div class="email-sim-body">
        <p><strong>To:</strong> ${email}</p>
        <p><strong>Subject:</strong> Password Reset Request - HydroPlant Manager</p>
        <div class="email-sim-divider"></div>
        <div class="email-sim-code">
          <p>Your password reset verification code is:</p>
          <div class="verification-code">${code}</div>
          <p class="email-note">This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      </div>
      <div class="email-sim-footer">
        <button class="btn-primary" onclick="this.closest('.email-sim-modal').remove()">Got it</button>
      </div>
    </div>
  `;
  document.body.appendChild(emailModal);

  // Auto-close after 8 seconds
  setTimeout(() => {
    if (emailModal.parentNode) emailModal.remove();
  }, 8000);
}

// Start countdown timer
function startCountdown(seconds) {
  if (window.countdownInterval) clearInterval(window.countdownInterval);

  const timerDisplay = document.getElementById("resetTimer");
  if (!timerDisplay) return;

  let remaining = seconds;

  function updateTimer() {
    const minutes = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timerDisplay.textContent = `${minutes}:${secs.toString().padStart(2, "0")}`;
    timerDisplay.style.color =
      remaining < 60 ? "#e24b4a" : "var(--text-secondary)";

    if (remaining <= 0) {
      clearInterval(window.countdownInterval);
      timerDisplay.textContent = "Expired";
      document.getElementById("resetBtn").disabled = true;
      showResetMessage("Code expired. Please request a new one.", "error");
    }
  }

  updateTimer();
  window.countdownInterval = setInterval(() => {
    remaining--;
    updateTimer();
    if (remaining <= 0) clearInterval(window.countdownInterval);
  }, 1000);
}

// Step 2: Verify the code
function verifyResetCode() {
  const email = document.getElementById("resetEmail").value;
  const enteredCode = document.getElementById("resetCode").value.trim();

  if (!enteredCode) {
    showResetMessage("Please enter the verification code", "error");
    return;
  }

  const resetRequest = passwordResetRequests.find((r) => r.email === email);

  if (!resetRequest) {
    showResetMessage(
      "No reset request found. Please request a new code.",
      "error",
    );
    return;
  }

  if (Date.now() > resetRequest.expiresAt) {
    showResetMessage("Code has expired. Please request a new one.", "error");
    passwordResetRequests = passwordResetRequests.filter(
      (r) => r.email !== email,
    );
    return;
  }

  if (resetRequest.code !== enteredCode) {
    showResetMessage("Invalid verification code. Please try again.", "error");
    return;
  }

  // Code verified - move to step 3
  document.getElementById("resetStep2").style.display = "none";
  document.getElementById("resetStep3").style.display = "block";
  document.getElementById("resetBtn").innerHTML = "Reset Password";
  document.getElementById("resetBtn").onclick = resetPassword;

  if (window.countdownInterval) clearInterval(window.countdownInterval);
}

// Step 3: Reset the password
function resetPassword() {
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const email = document.getElementById("resetEmail").value;

  // Validate password
  if (!newPassword) {
    showResetMessage("Please enter a new password", "error");
    return;
  }

  if (newPassword.length < 6) {
    showResetMessage("Password must be at least 6 characters long", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    showResetMessage("Passwords do not match", "error");
    return;
  }

  // Find and update user
  const userIndex = UserDB.users.findIndex((u) => u.email === email);

  if (userIndex !== -1) {
    UserDB.users[userIndex].password = newPassword;
    localStorage.setItem("hydroplant_users", JSON.stringify(UserDB.users));

    // Clear reset request
    passwordResetRequests = passwordResetRequests.filter(
      (r) => r.email !== email,
    );

    // Show success message
    showResetMessage(
      "✓ Password reset successful! You can now login with your new password.",
      "success",
    );

    // Close modal after 2 seconds and redirect to login
    setTimeout(() => {
      closeForgotModal();
      // Clear any stored session
      localStorage.removeItem("hydroplant_session");
      // Show login page
      showLoginPage();
    }, 2000);
  } else {
    showResetMessage("User not found. Please request a new reset.", "error");
  }
}

// Show message in reset modal
function showResetMessage(message, type) {
  const messageDiv = document.getElementById("resetMessage");
  if (!messageDiv) return;

  messageDiv.textContent = message;
  messageDiv.className = `reset-message ${type}`;
  messageDiv.style.display = "block";

  setTimeout(() => {
    messageDiv.style.display = "none";
  }, 5000);
}

// Resend verification code
function resendVerificationCode() {
  const email = document.getElementById("resetEmail").value;

  if (!email) {
    showResetMessage("Email address is required", "error");
    return;
  }

  const user = UserDB.users.find((u) => u.email === email);

  if (!user) {
    showResetMessage("No account found with this email", "error");
    return;
  }

  // Generate new code
  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  // Update reset request
  const existingIndex = passwordResetRequests.findIndex(
    (r) => r.email === email,
  );
  if (existingIndex !== -1) {
    passwordResetRequests[existingIndex] = {
      ...passwordResetRequests[existingIndex],
      code: newCode,
      expiresAt: expiresAt,
    };
  } else {
    passwordResetRequests.push({
      email: email,
      code: newCode,
      expiresAt: expiresAt,
      userId: user.id,
    });
  }

  // Show email simulation
  showEmailSimulation(email, newCode);
  console.log(`New reset code for ${email}: ${newCode}`);

  showResetMessage("New verification code sent to your email!", "success");

  // Restart timer
  startCountdown(600);
}

function resetUserPassword(id) {
  const user = UserDB.users.find((u) => u.id === id);
  if (!user) {
    alert("User not found");
    return;
  }

  const newPassword = Math.random().toString(36).slice(-8) + "A1";
  user.password = newPassword;
  localStorage.setItem("hydroplant_users", JSON.stringify(UserDB.users));
  alert(`Password for ${user.fullName} has been reset to: ${newPassword}`);
  renderUserManagement();
}

function toggleUserStatus(id) {
  const u = UserDB.users.find((u) => u.id === id);
  if (u) {
    u.isActive = !u.isActive;
    localStorage.setItem("hydroplant_users", JSON.stringify(UserDB.users));
    renderUserManagement();
  }
}
function filterUsers() {
  const search =
    document.getElementById("userSearch")?.value.toLowerCase() || "";
  const role = document.getElementById("userRoleFilter")?.value || "all";
  const status = document.getElementById("userStatusFilter")?.value || "all";
  let filtered = UserDB.users;
  if (search)
    filtered = filtered.filter(
      (u) =>
        u.fullName.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search),
    );
  if (role !== "all") filtered = filtered.filter((u) => u.role === role);
  if (status !== "all")
    filtered = filtered.filter((u) => u.isActive === (status === "active"));
  const tbody = document.getElementById("userTableBody");
  if (tbody)
    tbody.innerHTML = filtered
      .map(
        (user) =>
          `<tr><td><div class="user-avatar-mini" style="background:${getAvatarColor(user.role)}">${user.fullName[0]}</div></td><td><div><strong>${user.fullName}</strong><br><small>${user.email}</small></div></td><td>${user.employeeId || "-"}</td><td><span class="role-badge role-${user.role}">${ROLES[user.role]?.name || user.role}</span></td><td>${user.shift || "-"}</td><td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}</td><td><span class="status-badge ${user.isActive ? "status-active" : "status-inactive"}">${user.isActive ? "Active" : "Inactive"}</span></td><td><button class="btn-icon-sm" onclick="editUser('${user.id}')"><i class="fas fa-edit"></i></button> <button class="btn-icon-sm" onclick="resetUserPassword('${user.id}')"><i class="fas fa-key"></i></button> <button class="btn-icon-sm" onclick="toggleUserStatus('${user.id}')"><i class="fas ${user.isActive ? "fa-ban" : "fa-check-circle"}"></i></button></td></tr>`,
      )
      .join("");
}

// Maintenance
function initMaintenance() {
  const defaultTasks = [
    {
      id: 1,
      asset: "Unit 2 Generator",
      task: "Replace Upper Guide Bearing",
      nextDue: "2081/08/15",
      assignedTo: "Rajesh Kumar",
      priority: "critical",
    },
  ];
  MaintDB.tasks =
    JSON.parse(localStorage.getItem("maint_tasks")) || defaultTasks;
  renderPMTasks();
}
function renderPMTasks() {
  const c = document.getElementById("pmTaskList");
  if (c)
    c.innerHTML = MaintDB.tasks
      .map(
        (t) =>
          `<div class="pm-task ${t.priority}"><div class="pm-info"><div class="pm-title">${t.task}</div><div class="pm-meta"><span>${t.asset}</span><span>${t.assignedTo}</span></div></div><div class="pm-due">Due: ${t.nextDue}</div></div>`,
      )
      .join("");
}
function addMaintenanceTask() {
  alert("Add maintenance task feature");
}

// Equipment
function initEquipment() {
  const defaultEquip = [
    {
      id: 1,
      name: "Unit 1 Generator",
      type: "Generator",
      model: "Siemens",
      status: "Operational",
      healthScore: 82,
      ratedPower: "15 MW",
    },
    {
      id: 2,
      name: "Unit 2 Generator",
      type: "Generator",
      model: "Siemens",
      status: "Maintenance",
      healthScore: 60,
      ratedPower: "15 MW",
    },
  ];
  EquipmentDB.items =
    JSON.parse(localStorage.getItem("equipment_items")) || defaultEquip;
  renderEquipmentGrid();
}
function renderEquipmentGrid() {
  const c = document.getElementById("equipmentGrid");
  if (c)
    c.innerHTML = EquipmentDB.items
      .map(
        (item) =>
          `<div class="equip-card"><div class="equip-card-icon"><i class="fas fa-microchip"></i></div><div class="equip-card-name">${item.name}</div><div class="equip-card-model">${item.model}</div><div class="equip-card-stats"><div class="equip-stat"><div class="equip-stat-label">Power</div><div class="equip-stat-val">${item.ratedPower}</div></div><div class="equip-stat"><div class="equip-stat-label">Health</div><div class="equip-stat-val">${item.healthScore}%</div></div></div></div>`,
      )
      .join("");
}

// Faults
function initFaults() {
  const defaultFaults = [
    {
      id: 1,
      faultId: "FLT-001",
      date: "2081/07/10",
      equipment: "Unit 2 Generator",
      severity: "Critical",
      description: "Bearing temperature high",
      status: "Open",
    },
  ];
  FaultsDB.items =
    JSON.parse(localStorage.getItem("faults_items")) || defaultFaults;
  renderFaultsTable();
}
function renderFaultsTable() {
  const tbody = document.getElementById("faultsTableBody");
  if (tbody)
    tbody.innerHTML = FaultsDB.items
      .map(
        (f) =>
          `<tr><td class="mono">${f.faultId}</td><td>${f.date}</td><td>${f.equipment}</td><td><span class="severity-badge severity-${f.severity.toLowerCase()}">${f.severity}</span></td><td>${f.description}</td><td><span class="status-badge">${f.status}</span></td><td><button class="btn-icon-sm" onclick="alert('View details')"><i class="fas fa-eye"></i></button></td></tr>`,
      )
      .join("");
}
function showAddFaultForm() {
  alert("Report fault feature");
}

// Generation
function manualGenSync() {
  const sample = {
    bsDate: new Date().toISOString().split("T")[0],
    computed: {
      totalEnergy: 425.7,
      u1Energy: 210.5,
      u2Energy: 215.2,
      u1AvgMW: 12.5,
      u2AvgMW: 12.8,
      maxMW: 14.2,
      opHours: 17,
      shutdownHrs: 7,
      avgPF: 0.955,
    },
  };
  GenDB.allDays = [sample];
  localStorage.setItem("gen_days", JSON.stringify(GenDB.allDays));
  document.getElementById("genEmptyState").style.display = "none";
  document.getElementById("genDashboardContent").style.display = "block";
  document.getElementById("genKpiRow").innerHTML =
    `<div class="gen-kpi-card cyan"><div class="gen-kpi-label">TOTAL GENERATION</div><div class="gen-kpi-value">${sample.computed.totalEnergy}<span class="gen-kpi-unit">MWh</span></div></div><div class="gen-kpi-card blue"><div class="gen-kpi-label">AVG POWER</div><div class="gen-kpi-value">${sample.computed.u1AvgMW}<span class="gen-kpi-unit">MW</span></div></div><div class="gen-kpi-card green"><div class="gen-kpi-label">OPERATION</div><div class="gen-kpi-value">${sample.computed.opHours}<span class="gen-kpi-unit">hrs</span></div></div><div class="gen-kpi-card amber"><div class="gen-kpi-label">POWER FACTOR</div><div class="gen-kpi-value">${(sample.computed.avgPF * 100).toFixed(0)}<span class="gen-kpi-unit">%</span></div></div>`;
}

// Forgot password
let resetToken = null;
function showForgotPassword() {
  document.getElementById("forgotModal").style.display = "flex";
  document.getElementById("otpSection").style.display = "none";
  document.getElementById("resetBtn").innerHTML = "Send Code";
  document.getElementById("resetBtn").onclick = sendResetCode;
}
function closeForgotModal() {
  document.getElementById("forgotModal").style.display = "none";
  resetToken = null;
  document.getElementById("resetEmail").value = "";
  document.getElementById("otpCode").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
}
function sendResetCode() {
  const email = document.getElementById("resetEmail").value;
  const user = UserDB.users.find((u) => u.email === email);
  if (!user) {
    alert("Email not found");
    return;
  }
  if (!resetToken) {
    resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    alert(`Verification code sent to ${email}\n\nCode: ${resetToken}`);
    document.getElementById("otpSection").style.display = "block";
    document.getElementById("resetBtn").innerHTML = "Verify & Reset";
    document.getElementById("resetBtn").onclick = verifyAndReset;
  }
}
function verifyAndReset() {
  const otp = document.getElementById("otpCode").value;
  const newPwd = document.getElementById("newPassword").value;
  const confirmPwd = document.getElementById("confirmPassword").value;
  if (otp !== resetToken) {
    alert("Invalid code");
    return;
  }
  if (newPwd !== confirmPwd) {
    alert("Passwords don't match");
    return;
  }
  if (newPwd.length < 6) {
    alert("Password must be 6+ characters");
    return;
  }
  const email = document.getElementById("resetEmail").value;
  const userIndex = UserDB.users.findIndex((u) => u.email === email);
  if (userIndex !== -1) {
    UserDB.users[userIndex].password = newPwd;
    localStorage.setItem("hydroplant_users", JSON.stringify(UserDB.users));
    alert("Password reset successful! Please login.");
    closeForgotModal();
  }
}
function togglePasswordVisibility() {
  const pwd = document.getElementById("loginPassword");
  const icon = document.querySelector(".toggle-password i");
  if (pwd.type === "password") {
    pwd.type = "text";
    icon.className = "fas fa-eye";
  } else {
    pwd.type = "password";
    icon.className = "fas fa-eye-slash";
  }
}

// Expose globals
window.showPage = showPage;
window.logout = logout;
window.toggleSidebar = toggleSidebar;
window.toggleTheme = toggleTheme;
window.toggleNotif = toggleNotif;
window.toggleInlinePostForm = toggleInlinePostForm;
window.submitInlinePost = submitInlinePost;
window.addMaintenanceTask = addMaintenanceTask;
window.manualGenSync = manualGenSync;
window.showAddUserModal = showAddUserModal;
window.closeUserModal = closeUserModal;
window.editUser = editUser;
window.saveUser = saveUser;
window.resetUserPassword = resetUserPassword;
window.toggleUserStatus = toggleUserStatus;
window.filterUsers = filterUsers;
window.showForgotPassword = showForgotPassword;
window.closeForgotModal = closeForgotModal;
window.togglePasswordVisibility = togglePasswordVisibility;
window.showAddFaultForm = showAddFaultForm;

// Live clock
setInterval(() => {
  const t = document.getElementById("live-time");
  if (t) t.textContent = new Date().toLocaleString();
}, 1000);
// Add these to your existing global exports
window.resendVerificationCode = resendVerificationCode;
window.showForgotPassword = showForgotPassword;
window.closeForgotModal = closeForgotModal;

console.log("HydroPlant Manager - Ready!");
