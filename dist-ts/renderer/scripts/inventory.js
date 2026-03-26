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

  // src/renderer/scripts/inventory.ts
  var items = [];
  var materials = [];
  var editingId = null;
  var filterText = "";
  var filterMaterial = "";
  var form = qs("#inventory-form");
  var toggleBtn = qs("#toggle-form");
  var tbody = qs("#inventory-body");
  var searchInput = qs("#search-inventory");
  var filterSelect = qs("#filter-material");
  var materialSelect = qs("#inv-material");
  var colorInput = qs("#inv-color");
  var qtyInput = qs("#inv-qty");
  var unitLabel = qs("#inv-unit-label");
  var submitBtn = qs("#submit-inventory");
  function setFormVisible(visible) {
    form.classList.toggle("hidden", !visible);
    toggleBtn.textContent = visible ? "Annulla" : "+ Nuova Giacenza";
  }
  function resetForm() {
    materialSelect.value = "";
    colorInput.value = "";
    qtyInput.value = "0";
    unitLabel.textContent = "Unita: -";
    submitBtn.textContent = "Salva";
    editingId = null;
  }
  async function loadData() {
    try {
      items = await window.api.getInventory();
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
  function getMaterialById(id) {
    return materials.find((m) => m.id === id);
  }
  function normalizeColor(value) {
    return (value || "").trim().toLowerCase();
  }
  function renderTable() {
    tbody.innerHTML = "";
    const empty = document.getElementById("inventory-empty");
    const filtered = items.filter((i) => {
      const mat = getMaterialById(i.materialId);
      const text = `${mat?.name || ""} ${i.colorName || ""}`.toLowerCase();
      const matchesText = text.includes(filterText);
      const matchesMaterial = !filterMaterial || i.materialId === filterMaterial;
      return matchesText && matchesMaterial;
    });
    filtered.forEach((i) => {
      const mat = getMaterialById(i.materialId);
      const unitLabelText = mat?.unit === "pezzi" ? "pz" : "g";
      const cost = mat?.costPerUnit || 0;
      const total = cost * i.quantity;
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${mat?.name || "-"}</td>
            <td>${i.colorName || "-"}</td>
            <td>${i.quantity.toFixed(0)} ${unitLabelText}</td>
            <td>${mat?.unit || "-"}</td>
            <td>EUR ${cost.toFixed(3)}</td>
            <td>EUR ${total.toFixed(2)}</td>
            <td>${formatDate(i.lastUpdated)}</td>
            <td>
                <button class="btn-small" data-action="edit" data-id="${i.id}">Modifica</button>
                <button class="btn-small btn-danger" data-action="delete" data-id="${i.id}">Elimina</button>
            </td>
        `;
      tbody.appendChild(tr);
    });
    if (empty) {
      empty.classList.toggle("hidden", filtered.length > 0);
    }
  }
  toggleBtn.addEventListener("click", () => {
    const visible = form.classList.contains("hidden");
    if (visible) resetForm();
    setFormVisible(visible);
  });
  materialSelect.addEventListener("change", () => {
    const mat = getMaterialById(materialSelect.value);
    const label = mat?.unit === "pezzi" ? "pz" : "g";
    unitLabel.textContent = mat ? `Unita: ${label}` : "Unita: -";
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!materialSelect.value || !qtyInput.value) {
      showMessage("Completa tutti i campi richiesti", "error");
      return;
    }
    const colorValue = colorInput.value.trim();
    const data = {
      id: editingId ?? Date.now().toString(),
      materialId: materialSelect.value,
      colorName: colorValue || void 0,
      quantity: parseFloat(qtyInput.value) || 0,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    let updated;
    if (editingId) {
      updated = items.map((i) => i.id === editingId ? data : i);
    } else {
      const existing = items.find(
        (i) => i.materialId === data.materialId && normalizeColor(i.colorName) === normalizeColor(data.colorName)
      );
      if (existing) {
        updated = items.map(
          (i) => i.id === existing.id ? { ...i, quantity: i.quantity + data.quantity, lastUpdated: data.lastUpdated } : i
        );
      } else {
        updated = [...items, data];
      }
    }
    const success = await window.api.saveInventory(updated);
    if (success) {
      items = updated;
      renderTable();
      setFormVisible(false);
      resetForm();
      showMessage("Giacenza salvata!", "success");
      clearMessage();
    }
  });
  tbody.addEventListener("click", async (e) => {
    const target = e.target;
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (!action || !id) return;
    const row = items.find((i) => i.id === id);
    if (!row) return;
    if (action === "edit") {
      editingId = id;
      materialSelect.value = row.materialId;
      colorInput.value = row.colorName || "";
      qtyInput.value = row.quantity.toString();
      const mat = getMaterialById(row.materialId);
      unitLabel.textContent = mat ? `Unita: ${mat.unit === "pezzi" ? "pz" : "g"}` : "Unita: -";
      submitBtn.textContent = "Salva Modifiche";
      setFormVisible(true);
    }
    if (action === "delete") {
      if (!window.confirm("Eliminare questa giacenza?")) return;
      const updated = items.filter((i) => i.id !== id);
      const success = await window.api.saveInventory(updated);
      if (success) {
        items = updated;
        renderTable();
        showMessage("Giacenza eliminata!", "success");
        clearMessage();
      }
    }
  });
  searchInput?.addEventListener("input", () => {
    filterText = searchInput.value.trim().toLowerCase();
    renderTable();
  });
  filterSelect?.addEventListener("change", () => {
    filterMaterial = filterSelect.value;
    renderTable();
  });
  loadData();
})();
//# sourceMappingURL=inventory.js.map
