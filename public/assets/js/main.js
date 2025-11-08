// =============================================================
//  NutriBalance Admin Dashboard - Main Script
//  Fitur: Dynamic Components, Auth Check, Sidebar Responsive
// =============================================================

document.addEventListener("DOMContentLoaded", async () => {
  const headerContainer = document.getElementById("header-container");
  const sidebarContainer = document.getElementById("sidebar-container");

  // Load header & sidebar secara dinamis
  const [header, sidebar] = await Promise.all([
    fetch("/components/header.html").then((r) => r.text()),
    fetch("/components/sidebar.html").then((r) => r.text()),
  ]);

  headerContainer.innerHTML = header;
  sidebarContainer.innerHTML = sidebar;

  // If the injected sidebar HTML contained a <script src="/assets/js/sidebar.js"> tag,
  // it won't execute when inserted via innerHTML. Load the sidebar script explicitly
  // so sidebar behavior (highlighting, mobile toggle) runs reliably.
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

  // Ambil elemen utama
  const sidebarEl = document.querySelector(".sidebar");
  const headerEl = document.querySelector(".header");
  const mainContent = document.querySelector(".main-content");
  const sidebarToggle = document.querySelector(".sidebar-toggle");
  const overlay = document.querySelector(".overlay");
  const menuToggle = document.querySelector(".menu-toggle");

  // =============================================================
  // 1. Auth Check
  // =============================================================
  const token = localStorage.getItem("adminToken");
  if (!token) {
    alert("Anda harus login sebagai admin untuk mengakses halaman ini.");
    window.location.href = "/admin.html";
    return;
  }

  // =============================================================
  // 2. Sidebar Toggle (Desktop)
  // =============================================================
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

  // =============================================================
  // 3. Sidebar Toggle (Mobile)
  // =============================================================
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebarMobileToggle = document.getElementById("sidebarToggle");

  // Fungsi toggle sidebar untuk mobile
  function toggleSidebarMobile() {
    sidebarEl.classList.toggle("active");
    sidebarOverlay.classList.toggle("active");
    document.body.style.overflow = sidebarEl.classList.contains("active")
      ? "hidden"
      : "";
  }

  // Tombol toggle sidebar (mobile)
  if (sidebarMobileToggle) {
    sidebarMobileToggle.addEventListener("click", toggleSidebarMobile);
  }

  // Klik overlay untuk menutup sidebar
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", toggleSidebarMobile);
  }

  // Tutup sidebar jika user klik link di mobile
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 768 && sidebarEl.classList.contains("active")) {
        toggleSidebarMobile();
      }
    });
  });

  // Handle resize agar sidebar tertutup otomatis saat kembali ke desktop
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

  // =============================================================
  // 4. Overlay & Mobile Menu Toggle (Global)
  // =============================================================
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

  // =============================================================
  // 5. Logout
  // =============================================================
  const logoutBtn = document.getElementById("logout-button");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("adminToken");
      window.location.href = "/admin.html";
    });
  }
});
