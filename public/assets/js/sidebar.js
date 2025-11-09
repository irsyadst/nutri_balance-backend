(function initSidebar() {
  function setup() {
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const mainContent = document.querySelector(".main-content");
    const header = document.querySelector(".header");
    const mobileMenuBtn = document.querySelector(".menu-toggle");

    if (!sidebar) {
      return false; // indicate not ready
    }

    function toggleSidebar() {
      sidebar.classList.toggle("collapsed");
      if (mainContent) mainContent.classList.toggle("sidebar-collapsed");
      if (header) header.classList.toggle("sidebar-collapsed");

      localStorage.setItem(
        "sidebarCollapsed",
        sidebar.classList.contains("collapsed")
      );
    }

    if (localStorage.getItem("sidebarCollapsed") === "true") {
      sidebar.classList.add("collapsed");
      if (mainContent) mainContent.classList.add("sidebar-collapsed");
      if (header) header.classList.add("sidebar-collapsed");
    }

    if (sidebarToggle) {
      sidebarToggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
      });
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener("click", function () {
        sidebar.classList.remove("mobile-visible");
        sidebarOverlay.classList.remove("visible");
      });
    }

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener("click", function () {
        sidebar.classList.add("mobile-visible");
        sidebarOverlay.classList.add("visible");
      });
    }

    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) {
        sidebar.classList.remove("mobile-visible");
        sidebarOverlay.classList.remove("visible");
      }
    });

    (function highlightNav() {
      // Normalize current path: treat '/' as '/dashboard.html'
      const normalizePath = (p) => (p === "/" ? "/dashboard.html" : p);
      const currentPath = normalizePath(window.location.pathname);

      function runHighlight() {
        const links = document.querySelectorAll(".nav-link");
        if (!links || links.length === 0) return false;
        links.forEach((link) => {
          try {
            const linkPath = new URL(link.href, window.location.origin)
              .pathname;
            if (normalizePath(linkPath) === currentPath) {
              link.classList.add("active");
              // set aria-current for accessibility
              link.setAttribute("aria-current", "page");
            } else {
              link.classList.remove("active");
              link.removeAttribute("aria-current");
            }
          } catch (e) {
            // ignore malformed hrefs
          }
        });
        return true;
      }

      // Try immediately and retry for a short while to handle async injection
      if (!runHighlight()) {
        let attempts = 0;
        const retry = setInterval(() => {
          attempts++;
          if (runHighlight() || attempts > 20) {
            clearInterval(retry);
          }
        }, 150);
      }
    })();

    const logoutBtn = document.getElementById("logout-button");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        localStorage.removeItem("adminToken");
        window.location.href = "/admin.html";
      });
    }

    return true;
  }

  // Run setup now or when DOM is ready. If not ready (sidebar not injected yet), retry.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (!setup()) {
        // retry a few times if sidebar isn't present yet
        let attempts = 0;
        const retry = setInterval(() => {
          attempts++;
          if (setup() || attempts > 20) clearInterval(retry);
        }, 150);
      }
    });
  } else {
    if (!setup()) {
      let attempts = 0;
      const retry = setInterval(() => {
        attempts++;
        if (setup() || attempts > 20) clearInterval(retry);
      }, 150);
    }
  }
})();
