(function initSidebar() {
  function setup() {
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const mainContent = document.querySelector(".main-content");
    const header = document.querySelector(".header");
    const mobileMenuBtn = document.querySelector(".menu-toggle");

    if (!sidebar) {
      return false; 
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
        if (window.innerWidth <= 768) {
          sidebar.classList.toggle("mobile-visible");
          sidebarOverlay.classList.toggle("visible");
        } else {
          toggleSidebar();
        }
      });
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener("click", function () {
        sidebar.classList.remove("mobile-visible");
        sidebarOverlay.classList.remove("visible");
      });
    }

    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) {
        sidebar.classList.remove("mobile-visible");
        sidebarOverlay.classList.remove("visible");
      }
    });

    (function highlightNav() {
      console.log("highlightNav function started.");
      const normalizePath = (p) => (p === "/" ? "/dashboard.html" : p);
      const currentPath = normalizePath(window.location.pathname);
      console.log("Current normalized path:", currentPath);

      function runHighlight() {
        const links = document.querySelectorAll(".nav-link");
        if (!links || links.length === 0) {
          console.log("No .nav-link elements found.");
          return false;
        }
        links.forEach((link) => {
          try {
            const linkPath = new URL(link.href, window.location.origin)
              .pathname;
            console.log("Comparing link:", link.href, "Normalized link path:", normalizePath(linkPath), "with current path:", currentPath);
            if (normalizePath(linkPath) === currentPath) {
              link.classList.add("active");
              console.log("Added 'active' class to:", link.href);
              link.setAttribute("aria-current", "page");
            } else {
              link.classList.remove("active");
              console.log("Removed 'active' class from:", link.href);
              link.removeAttribute("aria-current");
            }
          } catch (e) {
            console.error("Error processing link href:", link.href, e);
          }
        });
        return true;
      }

      if (!runHighlight()) {
        let attempts = 0;
        const retry = setInterval(() => {
          attempts++;
          console.log("Retrying highlightNav, attempt:", attempts);
          if (runHighlight() || attempts > 20) {
            clearInterval(retry);
            if (attempts > 20) console.warn("highlightNav retries exhausted.");
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (!setup()) {
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
