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
  setActiveNav();

  // src/renderer/scripts/materials.ts
  var materials = [];
  var editingId = null;
  var form = qs("#material-form");
  var toggleBtn = qs("#toggle-form");
  var tbody = qs("#materials-body");
  var nameInput = qs("#mat-name");
  var costInput = qs("#mat-cost");
  var sellingInput = qs("#mat-selling");
  var stockInput = qs("#mat-stock");
  var unitSelect = qs("#mat-unit");
  var submitBtn = qs("#submit-material");
  function setFormVisible(visible) {
    form.classList.toggle("hidden", !visible);
    toggleBtn.textContent = visible ? "Annulla" : "+ Nuovo Materiale";
  }
  function resetForm() {
    nameInput.value = "";
    costInput.value = "0";
    sellingInput.value = "0";
    stockInput.value = "0";
    unitSelect.value = "grammi";
    submitBtn.textContent = "Aggiungi Materiale";
    editingId = null;
  }
  async function loadMaterials() {
    try {
      materials = await window.api.getMaterials();
      renderTable();
    } catch {
      showMessage("Errore nel caricamento dei materiali", "error");
    }
  }
  function renderTable() {
    tbody.innerHTML = "";
    const empty = document.getElementById("materials-empty");
    materials.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${m.name}</td>
            <td>${m.costPerGramm.toFixed(3)}</td>
            <td>${m.sellingPricePerGramm.toFixed(3)}</td>
            <td>${m.currentStockGramms.toFixed(0)}</td>
            <td>${m.unit}</td>
            <td>
                <button class="btn-small" data-action="edit" data-id="${m.id}">Modifica</button>
                <button class="btn-small btn-danger" data-action="delete" data-id="${m.id}">Elimina</button>
            </td>
        `;
      tbody.appendChild(tr);
    });
    if (empty) {
      empty.classList.toggle("hidden", materials.length > 0);
    }
  }
  toggleBtn.addEventListener("click", () => {
    const visible = form.classList.contains("hidden");
    if (visible) {
      resetForm();
    }
    setFormVisible(visible);
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!nameInput.value || !costInput.value) {
      showMessage("Completa tutti i campi richiesti", "error");
      return;
    }
    const data = {
      id: editingId ?? Date.now().toString(),
      name: nameInput.value.trim(),
      costPerGramm: parseFloat(costInput.value) || 0,
      sellingPricePerGramm: parseFloat(sellingInput.value) || 0,
      currentStockGramms: parseFloat(stockInput.value) || 0,
      unit: unitSelect.value,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    let updated;
    if (editingId) {
      updated = materials.map((m) => m.id === editingId ? data : m);
    } else {
      updated = [...materials, data];
    }
    const success = await window.api.saveMaterials(updated);
    if (success) {
      materials = updated;
      renderTable();
      setFormVisible(false);
      resetForm();
      showMessage("Materiale salvato!", "success");
      clearMessage();
    }
  });
  tbody.addEventListener("click", async (e) => {
    const target = e.target;
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (!action || !id) return;
    const material = materials.find((m) => m.id === id);
    if (!material) return;
    if (action === "edit") {
      editingId = id;
      nameInput.value = material.name;
      costInput.value = material.costPerGramm.toString();
      sellingInput.value = material.sellingPricePerGramm.toString();
      stockInput.value = material.currentStockGramms.toString();
      unitSelect.value = material.unit;
      submitBtn.textContent = "Salva Modifiche";
      setFormVisible(true);
    }
    if (action === "delete") {
      if (!window.confirm("Eliminare questo materiale?")) return;
      const updated = materials.filter((m) => m.id !== id);
      const success = await window.api.saveMaterials(updated);
      if (success) {
        materials = updated;
        renderTable();
        showMessage("Materiale eliminato!", "success");
        clearMessage();
      }
    }
  });
  loadMaterials();
})();
//# sourceMappingURL=materials.js.map
