document.addEventListener('DOMContentLoaded', () => {
    const modalContainer = document.getElementById('food-modal-container');

    fetch('/components/food-modal.html')
        .then(response => response.text())
        .then(html => {
            modalContainer.innerHTML = html;
            initializeFoodModal();
        });
});

function initializeFoodModal() {
    const elements = {
        modal: document.getElementById("food-modal"),
        form: document.getElementById("food-form"),
        modalTitle: document.getElementById("modal-title"),
        foodIdField: document.getElementById("food-id"),
        addButton: document.getElementById("add-food-button"),
        cancelButton: document.getElementById("cancel-button"),
        category: document.getElementById("category"),
    };

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
        otherValue
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag && !tags.includes(tag))
            .forEach((tag) => tags.push(tag));
    
        return tags.join(", ");
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
          
          const successMessage = foodId 
            ? "Data makanan berhasil diperbarui." 
            : "Makanan baru berhasil ditambahkan.";
          window.showAlert(successMessage, "success");
    
          closeModal();
          fetchFoods();
        } catch (error) {
          window.showAlert(error.message, "error");
        }
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
            element.value = food[field];
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
          window.showAlert("Harap pilih kategori makanan.", "error");
          return;
        }
    
        const foodId = elements.foodIdField.value;
        const formData = new FormData(elements.form);
        const foodData = Object.fromEntries(formData.entries());
    
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

    elements.addButton.addEventListener("click", () => openModal());
    elements.cancelButton.addEventListener("click", closeModal);
    elements.form.addEventListener("submit", handleFormSubmit);

    window.openModal = openModal;
}
