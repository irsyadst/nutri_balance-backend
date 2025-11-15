document.addEventListener("DOMContentLoaded", function () {
  const TOKEN_KEY = "adminToken";
  window.API_ENDPOINTS = {
    foods: "/api/admin/foods",
    food: (id) => `/api/admin/foods/${id}`,
  };

  const elements = {
    tableBody: document.getElementById("food-table-body"),
    searchInput: document.getElementById("search-input"),
    categoryFilter: document.getElementById("category-filter"),
    emptyState: document.getElementById("empty-state"),
    tableContainer: document.querySelector(".table-container"),
  };

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    showAlert(
      "Anda harus login sebagai admin untuk mengakses halaman ini.",
      "error"
    );
    setTimeout(() => (window.location.href = "/admin.html"), 2000);
    return;
  }

  window.headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  let allFoods = [];
  let filteredFoods = [];

  function showAlert(message, type = "success") {
    const alertElement = document.getElementById("custom-alert");
    if (!alertElement) return;

    alertElement.innerHTML = `
        <div class="icon">
            <i class="fas ${
              type === "success" ? "fa-check-circle" : "fa-times-circle"
            }"></i>
        </div>
        <div class="message">${message}</div>
    `;
    alertElement.className = `custom-alert ${type}`;

    setTimeout(() => {
      alertElement.classList.add("show");
    }, 10);

    setTimeout(() => {
      alertElement.classList.remove("show");
    }, 3000);
  }
  window.showAlert = showAlert;

  async function fetchFoods() {
    try {
      const response = await fetch(window.API_ENDPOINTS.foods, {
        headers: window.headers,
      });
      allFoods = await response.json();
      filteredFoods = [...allFoods];
      renderFoodTable(filteredFoods);
    } catch (error) {
      console.error("Error fetching foods:", error);
      elements.tableBody.innerHTML =
        '<tr><td colspan="8" class="text-center"><div class="loading-state"><i class="fas fa-exclamation-circle" style="color: #EF4444;"></i><span style="color: #EF4444;">Gagal memuat data</span></div></td></tr>';
    }
  }
  window.fetchFoods = fetchFoods;

  async function deleteFood(id) {
    try {
      const response = await fetch(window.API_ENDPOINTS.food(id), {
        method: "DELETE",
        headers: window.headers,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menghapus data");
      }
      showAlert("Data makanan berhasil dihapus.", "success");
      fetchFoods();
    } catch (error) {
      showAlert(error.message, "error");
    }
  }

  function filterFoods() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const category = elements.categoryFilter.value;

    filteredFoods = allFoods.filter((food) => {
      const matchesSearch = food.name.toLowerCase().includes(searchTerm);
      const matchesCategory = !category || food.category === category;
      return matchesSearch && matchesCategory;
    });

    renderFoodTable(filteredFoods);
  }

  function renderFoodTable(foods) {
    if (foods.length === 0) {
      elements.tableContainer.style.display = "none";
      elements.emptyState.style.display = "block";
      return;
    }

    elements.tableContainer.style.display = "block";
    elements.emptyState.style.display = "none";

    elements.tableBody.innerHTML = foods
      .map(
        (food) => `
      <tr>
        <td>
          <div class="food-name">${food.name}</div>
        </td>
        <td>
          <span class="category-badge">${food.category}</span>
        </td>
        <td>
          <div class="nutrient-value">
            <span class="value">${food.calories}</span>
            <span class="unit">kkal</span>
          </div>
        </td>
        <td>
          <div class="nutrient-value">
            <span class="value">${food.proteins || 0}</span>
            <span class="unit">g</span>
          </div>
        </td>
        <td>
          <div class="nutrient-value">
            <span class="value">${food.carbs || 0}</span>
            <span class="unit">g</span>
          </div>
        </td>
        <td>
          <div class="nutrient-value">
            <span class="value">${food.fats || 0}</span>
            <span class="unit">g</span>
          </div>
        </td>
        <td>
          <div class="serving-info">${food.servingQuantity} ${
          food.servingUnit
        }</div>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-edit" data-action="edit" data-food='${JSON.stringify(
              food
            )}'>
              <i class="fas fa-edit"></i>
              <span>Edit</span>
            </button>
            <button class="btn-action btn-delete" data-action="delete" data-id="${
              food._id
            }">
              <i class="fas fa-trash"></i>
              <span>Hapus</span>
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
  }

  function handleTableClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    if (target.dataset.action === "edit") {
      const foodData = JSON.parse(target.dataset.food);
      window.openModal(foodData);
    }

    if (target.dataset.action === "delete") {
      Swal.fire({
        title: "Apakah Anda yakin?",
        text: "Data makanan yang dihapus tidak dapat dikembalikan.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DC2626",
        cancelButtonColor: "#6B7280",
        confirmButtonText: "Ya, hapus!",
        cancelButtonText: "Batal",
      }).then((result) => {
        if (result.isConfirmed) {
          deleteFood(target.dataset.id);
        }
      });
    }
  }

  // Event Listeners
  elements.tableBody.addEventListener("click", handleTableClick);
  elements.searchInput.addEventListener("input", filterFoods);
  elements.categoryFilter.addEventListener("change", filterFoods);

  fetchFoods();
});
