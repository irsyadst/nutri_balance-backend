function createToastContainer() {
  const container = document.createElement("div");
  container.id = "toast-container";
  document.body.appendChild(container);
  return container;
}

function showToast(message, type = "success") {
  console.log("showToast called with message:", message, "and type:", type);
  const toastContainer =
    document.getElementById("toast-container") || createToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconClass =
    type === "success" ? "fa-check-circle" : "fa-exclamation-circle";
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas ${iconClass}"></i>
    </div>
    <div class="toast-content">
      <p class="toast-message">${message}</p>
    </div>
    <button class="toast-close-btn">&times;</button>
    <div class="toast-progress"></div>
  `;

  toastContainer.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  const closeBtn = toast.querySelector(".toast-close-btn");
  closeBtn.addEventListener("click", () => {
    hideToast(toast);
  });

  setTimeout(() => {
    hideToast(toast);
  }, 5000);
}

function hideToast(toast) {
  toast.classList.remove("show");
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 400);
}

document.addEventListener("DOMContentLoaded", async () => {
  const headerContainer = document.getElementById("header-container");
  const sidebarContainer = document.getElementById("sidebar-container");

  const [header, sidebar] = await Promise.all([
    fetch("/components/header.html").then((r) => r.text()),
    fetch("/components/sidebar.html").then((r) => r.text()),
  ]);

  headerContainer.innerHTML = header;
  sidebarContainer.innerHTML = sidebar;

  (function ensureSidebarScript() {
    const existing = document.querySelector(
      'script[src="/assets/js/sidebar.js"]'
    );
    if (!existing) {
      const s = document.createElement("script");
      s.src = "/assets/js/sidebar.js";
      s.defer = true;
      document.body.appendChild(s);
    }
  })();

  const sidebarEl = document.querySelector(".sidebar");
  const headerEl = document.querySelector(".header");
  const mainContent = document.querySelector(".main-content");
  

  const token = localStorage.getItem("adminToken");
  if (!token) {
    alert("Anda harus login sebagai admin untuk mengakses halaman ini.");
    window.location.href = "/admin.html";
    return;
  }



  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebarMobileToggle = document.getElementById("sidebarToggle");

  function toggleSidebarMobile() {
    sidebarEl.classList.toggle("active");
    sidebarOverlay.classList.toggle("active");
    document.body.style.overflow = sidebarEl.classList.contains("active")
      ? "hidden"
      : "";
  }

  function handleSidebarToggleVisibility() {
    if (sidebarMobileToggle) {
      if (window.innerWidth > 768) {
        sidebarMobileToggle.classList.add("hidden-desktop");
      } else {
        sidebarMobileToggle.classList.remove("hidden-desktop");
      }
    }
  }

  // Initial check for sidebar toggle visibility
  handleSidebarToggleVisibility();

  if (sidebarMobileToggle) {
    sidebarMobileToggle.addEventListener("click", toggleSidebarMobile);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", toggleSidebarMobile);
  }

  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 768 && sidebarEl.classList.contains("active")) {
        toggleSidebarMobile();
      }
    });
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 768 && sidebarEl.classList.contains("active")) {
        sidebarEl.classList.remove("active");
        sidebarOverlay.classList.remove("active");
        document.body.style.overflow = "";
      }
      handleSidebarToggleVisibility();
    }, 250);
  });

  const logoutBtn = document.getElementById("logout-button");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("adminToken");
      window.location.href = "/admin.html";
    });
  }
});
