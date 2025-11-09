document.addEventListener("DOMContentLoaded", function () {
  const TOKEN_KEY = "adminToken";
  const API_ENDPOINTS = {
    foods: "/api/admin/foods",
    food: (id) => `/api/admin/foods/${id}`,
  };

  const elements = {
    tableBody: document.getElementById("food-table-body"),
    modal: document.getElementById("food-modal"),
    form: document.getElementById("food-form"),
    modalTitle: document.getElementById("modal-title"),
    foodIdField: document.getElementById("food-id"),
    addButton: document.getElementById("add-food-button"),
    cancelButton: document.getElementById("cancel-button"),
    category: document.getElementById("category"),
  };

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    alert("Anda harus login sebagai admin untuk mengakses halaman ini.");
    window.location.href = "/admin.html";
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  async function fetchFoods() {
    try {
      const response = await fetch(API_ENDPOINTS.foods, { headers });
      if (response.status === 403) {
        alert("Sesi Anda berakhir. Silakan login kembali.");
        window.location.href = "/admin.html";
        return;
      }
      const foods = await response.json();
      renderFoodTable(foods);
    } catch (error) {
      console.error("Error fetching foods:", error);
      elements.tableBody.innerHTML =
        '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Gagal memuat data.</td></tr>';
    }
  }

  async function saveFoodData(foodData, foodId = null) {
    const url = foodId ? API_ENDPOINTS.food(foodId) : API_ENDPOINTS.foods;
    const method = foodId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(foodData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menyimpan data");
      }

      closeModal();
      fetchFoods();
    } catch (error) {
      alert("Error: " + error.message);
    }
  }

  async function deleteFood(id) {
    try {
      const response = await fetch(API_ENDPOINTS.food(id), {
        method: "DELETE",
        headers,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menghapus data");
      }
      fetchFoods();
    } catch (error) {
      alert("Error: " + error.message);
    }
  }

  function renderFoodTable(foods) {
    if (!foods || foods.length === 0) {
      elements.tableBody.innerHTML =
        '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Belum ada data makanan.</td></tr>';
      return;
    }

    elements.tableBody.innerHTML = foods
      .map(
        (food) => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${
                      food.name
                    }</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        ${food.category}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    ${food.calories} kkal
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    ${food.servingQuantity} ${food.servingUnit}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button class="text-blue-600 hover:text-blue-900" data-action="edit" data-food='${JSON.stringify(
                      food
                    )}'>
                        Edit
                    </button>
                    <button class="text-red-600 hover:text-red-900" data-action="delete" data-id="${
                      food._id
                    }">
                        Hapus
                    </button>
                </td>
            </tr>
        `
      )
      .join("");
  }

  function clearCheckboxes(containerId) {
    document
      .querySelectorAll(`#${containerId} input[type="checkbox"]`)
      .forEach((cb) => (cb.checked = false));
  }

  function setCheckboxes(containerId, otherId, tags = []) {
    const predefinedTags = new Set();
    document
      .querySelectorAll(`#${containerId} input[type="checkbox"]`)
      .forEach((cb) => {
        predefinedTags.add(cb.value);
        cb.checked = tags.includes(cb.value);
      });

    const otherTags = tags.filter((tag) => !predefinedTags.has(tag));
    document.getElementById(otherId).value = otherTags.join(", ");
  }

  function getCheckboxData(containerId, otherId) {
    const tags = Array.from(
      document.querySelectorAll(
        `#${containerId} input[type="checkbox"]:checked`
      ),
      (cb) => cb.value
    );

    const otherValue = document.getElementById(otherId).value;
    if (otherValue) {
      otherValue
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag && !tags.includes(tag))
        .forEach((tag) => tags.push(tag));
    }

    return tags.join(", ");
  }

  function openModal(food = null) {
    elements.form.reset();
    clearCheckboxes("dietaryTags-container");
    clearCheckboxes("allergens-container");
    elements.category.value = "";

    if (food) {
      elements.modalTitle.textContent = "Edit Data Makanan";
      elements.foodIdField.value = food._id;

      [
        "name",
        "category",
        "calories",
        "proteins",
        "carbs",
        "fats",
        "servingQuantity",
        "servingUnit",
      ].forEach((field) => {
        const element = document.getElementById(field);
        if (element) element.value = food[field];
      });

      setCheckboxes(
        "dietaryTags-container",
        "dietaryTags-other",
        food.dietaryTags || []
      );
      setCheckboxes(
        "allergens-container",
        "allergens-other",
        food.allergens || []
      );
    } else {
      elements.modalTitle.textContent = "Tambah Makanan Baru";
      elements.foodIdField.value = "";
    }

    elements.modal.style.display = "flex";
  }

  function closeModal() {
    elements.modal.style.display = "none";
    elements.form.reset();
  }

  function handleFormSubmit(event) {
    event.preventDefault();

    if (!elements.category.value) {
      alert("Harap pilih kategori makanan.");
      return;
    }

    const foodId = elements.foodIdField.value;
    const formData = new FormData(elements.form);
    const foodData = {};

    formData.forEach((value, key) => {
      if (key !== "dietaryTag" && key !== "allergen") {
        foodData[key] = value;
      }
    });

    foodData.dietaryTags = getCheckboxData(
      "dietaryTags-container",
      "dietaryTags-other"
    );
    foodData.allergens = getCheckboxData(
      "allergens-container",
      "allergens-other"
    );

    saveFoodData(foodData, foodId);
  }

  function handleTableClick(event) {
    const target = event.target;
    if (target.matches('[data-action="edit"]')) {
      const foodData = JSON.parse(target.dataset.food);
      openModal(foodData);
    }
    if (target.matches('[data-action="delete"]')) {
      if (confirm("Apakah Anda yakin ingin menghapus data makanan ini?")) {
        deleteFood(target.dataset.id);
      }
    }
  }

  elements.addButton.addEventListener("click", () => openModal());
  elements.cancelButton.addEventListener("click", closeModal);
  elements.form.addEventListener("submit", handleFormSubmit);
  elements.tableBody.addEventListener("click", handleTableClick);

  fetchFoods();
});
