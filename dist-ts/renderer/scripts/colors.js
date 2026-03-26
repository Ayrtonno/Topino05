"use strict";
(() => {
  // src/renderer/scripts/shared.ts
  function qs(selector, parent = document) {
    return parent.querySelector(selector);
  }
  function qsa(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }
  function setActiveNav() {
    const page = document.body.getAttribute("data-page");
    qsa(".nav a").forEach((link) => {
      if (link.dataset.page === page) {
        link.classList.add("active");
      }
    });
  }
  function showMessage(text, type = "success") {
    const msg = document.getElementById("message");
    if (!msg) return;
    msg.className = `message ${type}`;
    msg.textContent = text;
  }
  function clearMessage(delayMs = 2e3) {
    const msg = document.getElementById("message");
    if (!msg) return;
    setTimeout(() => {
      msg.className = "message";
      msg.textContent = "";
    }, delayMs);
  }
  function formatDate(dateIso) {
    try {
      return new Date(dateIso).toLocaleDateString();
    } catch {
      return "-";
    }
  }
  setActiveNav();

  // src/renderer/scripts/colors.ts
  var colors = [];
  var materials = [];
  var editingId = null;
  var filterText = "";
  var filterMaterial = "";
  var form = qs("#color-form");
  var toggleBtn = qs("#toggle-form");
  var tbody = qs("#colors-body");
  var searchInput = qs("#search-colors");
  var filterSelect = qs("#filter-material");
  var materialSelect = qs("#color-material");
  var nameInput = qs("#color-name");
  var codeInput = qs("#color-code");
  var stockInput = qs("#color-stock");
  var submitBtn = qs("#submit-color");
  function setFormVisible(visible) {
    form.classList.toggle("hidden", !visible);
    toggleBtn.textContent = visible ? "Annulla" : "+ Nuovo Colore";
  }
  function resetForm() {
    materialSelect.value = "";
    nameInput.value = "";
    codeInput.value = "";
    stockInput.value = "0";
    submitBtn.textContent = "Aggiungi Colore";
    editingId = null;
  }
  async function loadData() {
    try {
      colors = await window.api.getColors();
      materials = await window.api.getMaterials();
      renderMaterialOptions();
      renderTable();
    } catch {
      showMessage("Errore nel caricamento dei dati", "error");
    }
  }
  function renderMaterialOptions() {
    materialSelect.innerHTML = '<option value="">Seleziona un materiale</option>';
    filterSelect.innerHTML = '<option value="">Tutti i materiali</option>';
    materials.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      materialSelect.appendChild(opt);
      const optFilter = document.createElement("option");
      optFilter.value = m.id;
      optFilter.textContent = m.name;
      filterSelect.appendChild(optFilter);
    });
  }
  function renderTable() {
    tbody.innerHTML = "";
    const empty = document.getElementById("colors-empty");
    const filtered = colors.filter((c) => {
      const materialName = materials.find((m) => m.id === c.materialId)?.name || "";
      const matchesText = c.colorName.toLowerCase().includes(filterText) || materialName.toLowerCase().includes(filterText);
      const matchesMaterial = !filterMaterial || c.materialId === filterMaterial;
      return matchesText && matchesMaterial;
    });
    filtered.forEach((c) => {
      const materialName = materials.find((m) => m.id === c.materialId)?.name || "-";
      const unit = materials.find((m) => m.id === c.materialId)?.unit || "grammi";
      const unitLabel = unit === "pezzi" ? "pz" : "g";
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${materialName}</td>
            <td>${c.colorName}</td>
            <td>${c.colorCode || "-"}</td>
            <td>${c.stockQuantity.toFixed(0)} ${unitLabel}</td>
            <td>${unit}</td>
            <td>${formatDate(c.lastUpdated)}</td>
            <td>
                <button class="btn-small" data-action="edit" data-id="${c.id}">Modifica</button>
                <button class="btn-small btn-danger" data-action="delete" data-id="${c.id}">Elimina</button>
            </td>
        `;
      tbody.appendChild(tr);
    });
    if (empty) {
      empty.classList.toggle("hidden", filtered.length > 0);
    }
  }
  searchInput?.addEventListener("input", () => {
    filterText = searchInput.value.trim().toLowerCase();
    renderTable();
  });
  filterSelect?.addEventListener("change", () => {
    filterMaterial = filterSelect.value;
    renderTable();
  });
  toggleBtn.addEventListener("click", () => {
    const visible = form.classList.contains("hidden");
    if (visible) resetForm();
    setFormVisible(visible);
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!materialSelect.value || !nameInput.value || !stockInput.value) {
      showMessage("Completa tutti i campi richiesti", "error");
      return;
    }
    const data = {
      id: editingId ?? Date.now().toString(),
      materialId: materialSelect.value,
      colorName: nameInput.value.trim(),
      colorCode: codeInput.value.trim(),
      stockQuantity: parseFloat(stockInput.value) || 0,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    let updated;
    if (editingId) {
      updated = colors.map((c) => c.id === editingId ? data : c);
    } else {
      updated = [...colors, data];
    }
    const success = await window.api.saveColors(updated);
    if (success) {
      colors = updated;
      renderTable();
      setFormVisible(false);
      resetForm();
      showMessage("Colore salvato!", "success");
      clearMessage();
    }
  });
  tbody.addEventListener("click", async (e) => {
    const target = e.target;
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (!action || !id) return;
    const color = colors.find((c) => c.id === id);
    if (!color) return;
    if (action === "edit") {
      editingId = id;
      materialSelect.value = color.materialId;
      nameInput.value = color.colorName;
      codeInput.value = color.colorCode || "";
      stockInput.value = color.stockQuantity.toString();
      submitBtn.textContent = "Salva Modifiche";
      setFormVisible(true);
    }
    if (action === "delete") {
      if (!window.confirm("Eliminare questo colore?")) return;
      const updated = colors.filter((c) => c.id !== id);
      const success = await window.api.saveColors(updated);
      if (success) {
        colors = updated;
        renderTable();
        showMessage("Colore eliminato!", "success");
        clearMessage();
      }
    }
  });
  loadData();
})();
//# sourceMappingURL=colors.js.map
