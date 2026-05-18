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
  document.getElementById("sidebar")?.classList.toggle("collapsed");
}
function toggleNotif() {
  document.getElementById("notifPanel")?.classList.toggle("open");
}

// Maintenance Feed
function loadMaintenanceFeed() {
  const container = document.getElementById("feedPosts");
  if (!container) return;
  let posts = JSON.parse(
    localStorage.getItem("maintenance_feed_posts") || "[]",
  );
  if (posts.length === 0) {
    container.innerHTML =
      '<div class="feed-empty-state">No posts yet. Click "New Post" to share updates.</div>';
    return;
  }
  container.innerHTML = posts
    .map(
      (post) =>
        `<div class="feed-post-card"><div class="feed-post-header"><div class="feed-post-avatar">${(post.author || "U")[0]}</div><div class="feed-post-author-info"><div class="feed-post-author">${post.author || "Unknown"}</div><div class="feed-post-time">${new Date(post.timestamp).toLocaleString()}</div></div></div><div class="feed-post-caption"><div class="caption-text"><strong>${post.title || ""}</strong> ${post.description || ""}</div></div></div>`,
    )
    .join("");
}

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
