document.addEventListener("DOMContentLoaded", function () {
  const TOKEN_KEY = "adminToken";
  const ITEMS_PER_PAGE = 10;
  const API_ENDPOINTS = {
    users: "/api/admin/users",
    user: (id) => `/api/admin/users/${id}`,
  };
  const elements = {
    tableBody: document.getElementById("user-table-body"),
    searchInput: document.getElementById("search-input"),
    roleFilter: document.getElementById("role-filter"),
    userModal: document.getElementById("user-modal"),
    deleteModal: document.getElementById("delete-modal"),
    userForm: document.getElementById("user-form"),
    modalTitle: document.getElementById("modal-title"),
    addUserButton: document.getElementById("add-user-button"),
    prevPageButton: document.getElementById("prev-page"),
    nextPageButton: document.getElementById("next-page"),
    showingStart: document.getElementById("showing-start"),
    showingEnd: document.getElementById("showing-end"),
    totalItems: document.getElementById("total-items"),
    confirmDelete: document.getElementById("confirm-delete"),
    totalAdminCount: document.getElementById("total-admin-count"),
    activeUsersCount: document.getElementById("active-users-count"),
  };
  let state = {
    users: [],
    filteredUsers: [],
    currentPage: 1,
    searchTerm: "",
    roleFilter: "",
    userToDelete: null,
  };

  function getAuthHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      alert("Sesi Anda telah berakhir. Silakan login kembali.");
      window.location.href = "/admin.html";
      return null;
    }
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  function getInitials(name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  }

  function getAvatarColor(name) {
    const colors = [
      "bg-blue-500 text-white",
      "bg-purple-500 text-white",
      "bg-green-500 text-white",
      "bg-pink-500 text-white",
      "bg-indigo-500 text-white",
      "bg-orange-500 text-white",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  async function fetchUsers() {
    try {
      const currentHeaders = getAuthHeaders();
      if (!currentHeaders) return;
      const response = await fetch(API_ENDPOINTS.users, {
        headers: currentHeaders,
      });
      if (response.status === 401 || response.status === 403) {
        alert("Sesi Anda telah berakhir. Silakan login kembali.");
        window.location.href = "/admin.html";
        return;
      }
      if (!response.ok) {
        throw new Error("Gagal memuat data pengguna");
      }
      const users = await response.json();
      state.users = users;
      state.filteredUsers = users;

      // Update stats
      const adminUsers = users.filter((user) => user.role === "admin");
      elements.totalAdminCount.textContent = adminUsers.length;
      elements.activeUsersCount.textContent = users.length;

      applyFilters();
      updatePagination();
      renderUsers();
    } catch (error) {
      console.error("Error fetching users:", error);
      elements.tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="px-6 py-12">
            <div class="empty-state text-center">
              <i class="fas fa-exclamation-circle text-red-400 text-4xl mb-3"></i>
              <p class="text-red-600 font-medium">Gagal memuat data</p>
              <p class="text-gray-500 text-sm mt-1">${error.message}</p>
            </div>
          </td>
        </tr>
      `;
    }
  }

  async function saveUser(userData, userId = null) {
    try {
      const currentHeaders = getAuthHeaders();
      if (!currentHeaders) return;
      const url = userId ? API_ENDPOINTS.user(userId) : API_ENDPOINTS.users;
      const method = userId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: currentHeaders,
        body: JSON.stringify(userData),
      });
      let errorData;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }
      if (!response.ok) {
        throw new Error(errorData.message || "Gagal menyimpan data pengguna");
      }
      closeModal(elements.userModal);
      await fetchUsers();
      showToast(
        userId
          ? "Data pengguna berhasil diperbarui!"
          : "Pengguna baru berhasil ditambahkan!",
        "success"
      );
    } catch (error) {
      console.error("Save user error:", error);
      showToast(error.message, "error");
    }
  }

  async function deleteUser(id) {
    try {
      const currentHeaders = getAuthHeaders();
      if (!currentHeaders) return;
      const response = await fetch(API_ENDPOINTS.user(id), {
        method: "DELETE",
        headers: currentHeaders,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal menghapus pengguna");
      }
      closeModal(elements.deleteModal);
      await fetchUsers();
      showToast("Pengguna berhasil dihapus!", "success");
    } catch (error) {
      console.error("Delete user error:", error);
      showToast(error.message, "error");
    }
  }

  function renderUsers() {
    const start = (state.currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const usersToShow = state.filteredUsers.slice(start, end);
    if (usersToShow.length === 0) {
      elements.tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="px-6 py-12">
            <div class="empty-state text-center">
              <i class="fas fa-users text-gray-300 text-5xl mb-4"></i>
              <p class="text-gray-600 font-medium text-lg mb-1">Tidak ada pengguna ditemukan</p>
              <p class="text-gray-400 text-sm">Coba ubah filter atau kata kunci pencarian Anda</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    elements.tableBody.innerHTML = usersToShow
      .map(
        (user) => `
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-4 md:px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="user-avatar ${getAvatarColor(user.name)}">
                ${getInitials(user.name)}
              </div>
              <div class="min-w-0">
                <div class="text-sm font-semibold text-gray-900 truncate">${
                  user.name
                }</div>
                <div class="text-xs text-gray-500 truncate lg:hidden">${
                  user.email
                }</div>
              </div>
            </div>
          </td>
          <td class="px-4 md:px-6 py-4 hidden lg:table-cell">
            <div class="text-sm text-gray-600">${user.email}</div>
          </td>
          <td class="px-4 md:px-6 py-4 hidden md:table-cell">
            <span class="badge ${
              user.role === "admin"
                ? "bg-purple-100 text-purple-700"
                : "bg-green-100 text-green-700"
            }">
              ${user.role === "admin" ? "Admin" : "User"}
            </span>
          </td>
          <td class="px-4 md:px-6 py-4 text-right">
            <div class="flex items-center justify-end gap-2">
              <button class="action-btn w-9 h-9 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg transition-all" data-action="edit" data-id="${
                user._id
              }" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn w-9 h-9 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-all" data-action="delete" data-id="${
                user._id
              }" title="Hapus">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        </tr>
      `
      )
      .join("");
    updateShowingCounts(
      start + 1,
      Math.min(end, state.filteredUsers.length),
      state.filteredUsers.length
    );
  }

  function updateShowingCounts(start, end, total) {
    elements.showingStart.textContent = start;
    elements.showingEnd.textContent = end;
    elements.totalItems.textContent = total;
  }

  function updatePagination() {
    const totalPages = Math.ceil(state.filteredUsers.length / ITEMS_PER_PAGE);
    elements.prevPageButton.disabled = state.currentPage === 1;
    elements.nextPageButton.disabled = state.currentPage === totalPages;
  }

  function applyFilters() {
    state.filteredUsers = state.users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(state.searchTerm.toLowerCase());
      const matchesRole = !state.roleFilter || user.role === state.roleFilter;
      return matchesSearch && matchesRole;
    });
    state.currentPage = 1;
    updatePagination();
    renderUsers();
  }

  function openModal(modal, user = null) {
    if (modal === elements.userModal) {
      elements.userForm.reset();
      elements.modalTitle.textContent = user
        ? "Edit Data Pengguna"
        : "Tambah Pengguna Baru";
      const emailInput = document.getElementById("email");
      if (user) {
        elements.userForm.userId.value = user._id;
        elements.userForm.name.value = user.name;
        elements.userForm.email.value = user.email;
        elements.userForm.role.value = user.role;
        elements.userForm.password.required = false;
        emailInput.readOnly = true;
        emailInput.classList.add(
          "bg-gray-100",
          "text-gray-600",
          "cursor-not-allowed"
        );
      } else {
        elements.userForm.userId.value = "";
        elements.userForm.password.required = true;
        elements.userForm.role.value = "admin"; // Ensure new users are admins
        emailInput.readOnly = false;
        emailInput.classList.remove(
          "bg-gray-100",
          "text-gray-600",
          "cursor-not-allowed"
        );
      }
    }
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  // Event Listeners
  elements.userForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userId = formData.get("userId");
    const userData = {
      name: formData.get("name"),
      email: formData.get("email"),
      role: formData.get("role"),
    };
    if (formData.get("password")) {
      userData.password = formData.get("password");
    }
    await saveUser(userData, userId || null);
  });

  elements.addUserButton.addEventListener("click", () =>
    openModal(elements.userModal)
  );

  elements.tableBody.addEventListener("click", async (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const userId = target.dataset.id;
    const user = state.users.find((u) => u._id === userId);
    if (action === "edit" && user) {
      openModal(elements.userModal, user);
    } else if (action === "delete") {
      state.userToDelete = userId;
      openModal(elements.deleteModal);
    }
  });

  elements.confirmDelete.addEventListener("click", () => {
    if (state.userToDelete) {
      deleteUser(state.userToDelete);
      state.userToDelete = null;
    }
  });

  elements.searchInput.addEventListener("input", (e) => {
    state.searchTerm = e.target.value;
    applyFilters();
  });

  elements.roleFilter.addEventListener("change", (e) => {
    state.roleFilter = e.target.value;
    applyFilters();
  });

  elements.prevPageButton.addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      updatePagination();
      renderUsers();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  elements.nextPageButton.addEventListener("click", () => {
    const totalPages = Math.ceil(state.filteredUsers.length / ITEMS_PER_PAGE);
    if (state.currentPage < totalPages) {
      state.currentPage++;
      updatePagination();
      renderUsers();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  document.querySelectorAll(".modal-close").forEach((button) => {
    button.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal");
      closeModal(modal);
    });
  });

  elements.userModal.addEventListener("click", (e) => {
    if (e.target === elements.userModal) {
      closeModal(elements.userModal);
    }
  });

  elements.deleteModal.addEventListener("click", (e) => {
    if (e.target === elements.deleteModal) {
      closeModal(elements.deleteModal);
    }
  });

  fetchUsers();
});
