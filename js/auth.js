// Authentication and authorization functions

function checkAuth() {
  const currentUser = sessionStorage.getItem("currentUser")
  if (!currentUser) {
    window.location.href = "login.html"
    return false
  }
  return true
}

function logout() {
  sessionStorage.removeItem("currentUser")
  window.location.href = "login.html"
}

function getCurrentUser() {
  const userStr = sessionStorage.getItem("currentUser")
  return userStr ? JSON.parse(userStr) : null
}

function setupNavigation() {
  const currentUser = getCurrentUser()
  if (!currentUser) return

  const navLinks = document.getElementById("navLinks")
  const userInfo = document.getElementById("userInfo")

  // Set user info
  if (userInfo) {
    userInfo.textContent = `${currentUser.username} (${currentUser.type})`
    userInfo.style.color = "#64748b"
    userInfo.style.fontSize = "0.875rem"
    userInfo.style.fontWeight = "500"
  }

  // Set navigation based on user type
  let navHTML = ""

  if (currentUser.type === "admin") {
    navHTML = `
            <a href="dashboard.html" ${window.location.pathname.includes("dashboard") ? 'class="active"' : ""}>Dashboard</a>
            <a href="raw-materials.html" ${window.location.pathname.includes("raw-materials") ? 'class="active"' : ""}>Raw Materials</a>
            <a href="products.html" ${window.location.pathname.includes("products") ? 'class="active"' : ""}>Products</a>
            <a href="reports.html" ${window.location.pathname.includes("reports") ? 'class="active"' : ""}>Reports</a>
            <a href="manage-users.html" ${window.location.pathname.includes("manage-users") ? 'class="active"' : ""}>Manage Users</a>
        `
  } else if (currentUser.type === "staff") {
    navHTML = `
            <a href="dashboard.html" ${window.location.pathname.includes("dashboard") ? 'class="active"' : ""}>Dashboard</a>
            <a href="raw-materials.html" ${window.location.pathname.includes("raw-materials") ? 'class="active"' : ""}>Raw Materials</a>
            <a href="products.html" ${window.location.pathname.includes("products") ? 'class="active"' : ""}>Products</a>
        `
  }

  if (navLinks) {
    navLinks.innerHTML = navHTML
  }
}

function hasAdminAccess() {
  const currentUser = getCurrentUser()
  return currentUser && currentUser.type === "admin"
}
