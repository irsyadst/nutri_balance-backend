let allUsers = [];

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("adminToken");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  fetchUsers(token);
  setupFilters();
});

async function fetchUsers(token) {
  try {
    const response = await fetch("/api/admin/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("adminToken");
        window.location.href = "/login.html";
      }
      throw new Error("Failed to fetch users");
    }

    const users = await response.json();
    allUsers = users;
    displayUsers(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    const userTableBody = document.getElementById("user-table-body");
    if (userTableBody) {
      userTableBody.innerHTML =
        '<tr><td colspan="4">Failed to load users. Please try again later.</td></tr>';
    }
  }
}



function displayUsers(users) {
  const userTableBody = document.getElementById("user-table-body");
  if (!userTableBody) return;

  const sortedUsers = users.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  userTableBody.innerHTML = "";

  if (sortedUsers.length === 0) {
    userTableBody.innerHTML =
      '<tr><td colspan="4">No users found matching your search criteria.</td></tr>';
    return;
  }

  sortedUsers.forEach((user) => {
    const row = document.createElement("tr");

    const formattedDate = new Date(user.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    row.innerHTML = `
            <td data-label="Name">${escapeHtml(user.name)}</td>
            <td data-label="Email">${escapeHtml(user.email)}</td>
            <td data-label="Role">
                <span class="role-badge ${
                  user.role === "admin" ? "role-admin" : "role-user"
                }">
                    ${user.role}
                </span>
            </td>
            <td data-label="Joined">${formattedDate}</td>
        `;
    userTableBody.appendChild(row);
  });
}

function setupFilters() {
  const searchInput = document.getElementById("search-input");
  const roleFilter = document.getElementById("role-filter");

  if (searchInput) {
    searchInput.addEventListener("input", filterUsers);
  }

  if (roleFilter) {
    roleFilter.addEventListener("change", filterUsers);
  }
}

function filterUsers() {
  const searchInput = document.getElementById("search-input");
  const roleFilter = document.getElementById("role-filter");

  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  const selectedRole = roleFilter ? roleFilter.value : "all";

  let filteredUsers = allUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm);
    const matchesRole = selectedRole === "all" || user.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  displayUsers(filteredUsers);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
