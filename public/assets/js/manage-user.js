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

  const headers = getAuthHeaders();
  if (!headers) return;

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
      applyFilters();
      updatePagination();
      renderUsers();
    } catch (error) {
      console.error("Error fetching users:", error);
      elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center text-red-500">
                        Gagal memuat data: ${error.message}
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

      console.log("Sending request to:", url, "with method:", method);
      console.log("Request data:", userData);

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
                    <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                        Tidak ada data pengguna yang sesuai dengan filter
                    </td>
                </tr>
            `;
      return;
    }

    elements.tableBody.innerHTML = usersToShow
      .map(
        (user) => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${
                      user.name
                    }</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${user.email}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === "admin"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-green-100 text-green-800"
                    }">
                        ${user.role === "admin" ? "Admin" : "User"}
                    </span>
                </td>

                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 mr-3" data-action="edit" data-id="${
                      user._id
                    }">
                        Edit
                    </button>
                    <button class="text-red-600 hover:text-red-900" data-action="delete" data-id="${
                      user._id
                    }">
                        Hapus
                    </button>
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

        // Disable dan style email input untuk mode edit
        emailInput.readOnly = true;
        emailInput.classList.add(
          "bg-gray-100",
          "text-gray-600",
          "cursor-not-allowed"
        );
      } else {
        elements.userForm.userId.value = "";
        elements.userForm.password.required = true;

        // Enable email input untuk user baru
        emailInput.readOnly = false;
        emailInput.classList.remove(
          "bg-gray-100",
          "text-gray-600",
          "cursor-not-allowed"
        );
      }
    }

    modal.classList.remove("hidden");
  }

  function closeModal(modal) {
    modal.classList.add("hidden");
  }

  function showToast(message, type = "success") {
    alert(message);
  }

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
    const target = e.target;
    if (!target.matches("[data-action]")) return;

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
    }
  });

  elements.nextPageButton.addEventListener("click", () => {
    const totalPages = Math.ceil(state.filteredUsers.length / ITEMS_PER_PAGE);
    if (state.currentPage < totalPages) {
      state.currentPage++;
      updatePagination();
      renderUsers();
    }
  });

  document.querySelectorAll(".modal-close").forEach((button) => {
    button.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal");
      closeModal(modal);
    });
  });

  fetchUsers();
});
