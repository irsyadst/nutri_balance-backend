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
  const sidebarToggle = document.querySelector(".sidebar-toggle");
  const overlay = document.querySelector(".overlay");
  const menuToggle = document.querySelector(".menu-toggle");

  const token = localStorage.getItem("adminToken");
  if (!token) {
    alert("Anda harus login sebagai admin untuk mengakses halaman ini.");
    window.location.href = "/admin.html";
    return;
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      sidebarEl.classList.toggle("collapsed");
      headerEl.classList.toggle("sidebar-collapsed");
      mainContent.classList.toggle("sidebar-collapsed");

      const icon = sidebarToggle.querySelector("i");
      icon.classList.toggle("fa-chevron-right");
      icon.classList.toggle("fa-chevron-left");
    });
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
    }, 250);
  });

  if (menuToggle && overlay) {
    menuToggle.addEventListener("click", () => {
      sidebarEl.classList.toggle("mobile-visible");
      overlay.classList.toggle("visible");
    });

    overlay.addEventListener("click", () => {
      sidebarEl.classList.remove("mobile-visible");
      overlay.classList.remove("visible");
    });
  }

  const logoutBtn = document.getElementById("logout-button");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("adminToken");
      window.location.href = "/admin.html";
    });
  }
});
