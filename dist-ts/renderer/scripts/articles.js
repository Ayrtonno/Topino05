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

  // src/renderer/scripts/articles.ts
  var articles = [];
  var materials = [];
  var editingId = null;
  var composition = [];
  var filterText = "";
  var hourlyRate = 0;
  var form = qs("#article-form");
  var toggleBtn = qs("#toggle-form");
  var tbody = qs("#articles-body");
  var compBody = qs("#composition-body");
  var compCost = qs("#composition-cost");
  var unitLabel = qs("#comp-unit-label");
  var searchInput = qs("#search-articles");
  var previewMaterialCost = qs("#preview-material-cost");
  var previewMaterialSell = qs("#preview-material-sell");
  var previewLaborCost = qs("#preview-labor-cost");
  var previewLaborSell = qs("#preview-labor-sell");
  var previewColorSurcharge = qs("#preview-color-surcharge");
  var previewTotalSell = qs("#preview-total-sell");
  var codeInput = qs("#article-code");
  var nameInput = qs("#article-name");
  var laborInput = qs("#article-labor");
  var materialMarkupInput = qs("#article-material-markup");
  var laborMarkupInput = qs("#article-labor-markup");
  var submitBtn = qs("#submit-article");
  var compMaterial = qs("#comp-material");
  var compColor = qs("#comp-color");
  var compQty = qs("#comp-qty");
  var addCompBtn = qs("#add-comp");
  var COLOR_SURCHARGE = 0.1;
  function setFormVisible(visible) {
    form.classList.toggle("hidden", !visible);
    toggleBtn.textContent = visible ? "Annulla" : "+ Nuovo Articolo";
  }
  function resetForm() {
    codeInput.value = "";
    nameInput.value = "";
    laborInput.value = "0";
    materialMarkupInput.value = "0";
    laborMarkupInput.value = "0";
    composition = [];
    compMaterial.value = "";
    compColor.value = "";
    compQty.value = "0";
    submitBtn.textContent = "Aggiungi Articolo";
    editingId = null;
    renderComposition();
  }
  async function loadData() {
    try {
      articles = await window.api.getArticles();
      materials = await window.api.getMaterials();
      const laborConfig = await window.api.getLaborConfig();
      hourlyRate = laborConfig.hourlyRate || 0;
      renderMaterialOptions();
      renderTable();
      updatePreview();
    } catch {
      showMessage("Errore nel caricamento dei dati", "error");
    }
  }
  function renderMaterialOptions() {
    compMaterial.innerHTML = '<option value="">Seleziona materiale</option>';
    materials.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      compMaterial.appendChild(opt);
    });
  }
  function getMaterialName(id) {
    return materials.find((m) => m.id === id)?.name || "-";
  }
  function compositionCost() {
    return composition.reduce((total, comp) => {
      const material = materials.find((m) => m.id === comp.materialId);
      return total + (material?.costPerUnit || 0) * comp.quantity;
    }, 0);
  }
  function renderComposition() {
    compBody.innerHTML = "";
    composition.forEach((comp, idx) => {
      const material = getMaterialName(comp.materialId);
      const color = comp.colorName || "-";
      const materialData = materials.find((m) => m.id === comp.materialId);
      const materialCost = materialData?.costPerUnit || 0;
      const unitLabel2 = materialData?.unit === "pezzi" ? "pz" : "g";
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${material}</td>
            <td>${color}</td>
            <td>${comp.quantity} ${unitLabel2}</td>
            <td>EUR ${(materialCost * comp.quantity).toFixed(3)}</td>
            <td><button class="btn-small btn-danger" data-action="remove" data-index="${idx}">Rimuovi</button></td>
        `;
      compBody.appendChild(tr);
    });
    compCost.textContent = `Costo Materiale: EUR ${compositionCost().toFixed(2)}`;
    updatePreview();
  }
  function renderTable() {
    tbody.innerHTML = "";
    const empty = document.getElementById("articles-empty");
    const filtered = articles.filter((a) => {
      const text = `${a.code} ${a.name}`.toLowerCase();
      return text.includes(filterText);
    });
    filtered.forEach((a) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${a.code}</td>
            <td>${a.name}</td>
            <td>${a.composition.length}</td>
            <td>${a.laborHoursRequired}h</td>
            <td>${a.materialMarkupPct}%</td>
            <td>${a.laborMarkupPct}%</td>
            <td>EUR ${compositionCostFor(a).toFixed(2)}</td>
            <td>
                <button class="btn-small" data-action="edit" data-id="${a.id}">Modifica</button>
                <button class="btn-small btn-danger" data-action="delete" data-id="${a.id}">Elimina</button>
            </td>
        `;
      tbody.appendChild(tr);
    });
    if (empty) {
      empty.classList.toggle("hidden", filtered.length > 0);
    }
  }
  function compositionCostFor(article) {
    return article.composition.reduce((total, comp) => {
      const material = materials.find((m) => m.id === comp.materialId);
      return total + (material?.costPerUnit || 0) * comp.quantity;
    }, 0);
  }
  function updatePreview() {
    const materialCost = compositionCost();
    const materialSellBase = composition.reduce((total, comp) => {
      const material = materials.find((m) => m.id === comp.materialId);
      return total + (material?.sellingPricePerUnit || material?.costPerUnit || 0) * comp.quantity;
    }, 0);
    const colorSurcharge = composition.length * COLOR_SURCHARGE;
    const materialMarkupPct = parseFloat(materialMarkupInput.value) || 0;
    const materialSell = (materialSellBase + colorSurcharge) * (1 + materialMarkupPct / 100);
    const laborHours = parseFloat(laborInput.value) || 0;
    const laborCost = laborHours * hourlyRate;
    const laborMarkupPct = parseFloat(laborMarkupInput.value) || 0;
    const laborSell = laborCost * (1 + laborMarkupPct / 100);
    previewMaterialCost.textContent = `EUR ${materialCost.toFixed(2)}`;
    previewMaterialSell.textContent = `EUR ${materialSell.toFixed(2)}`;
    previewLaborCost.textContent = `EUR ${laborCost.toFixed(2)}`;
    previewLaborSell.textContent = `EUR ${laborSell.toFixed(2)}`;
    previewColorSurcharge.textContent = `EUR ${colorSurcharge.toFixed(2)}`;
    previewTotalSell.textContent = `EUR ${(materialSell + laborSell).toFixed(2)}`;
  }
  toggleBtn.addEventListener("click", () => {
    const visible = form.classList.contains("hidden");
    if (visible) resetForm();
    setFormVisible(visible);
  });
  compMaterial.addEventListener("change", () => {
    const materialId = compMaterial.value;
    const materialData = materials.find((m) => m.id === materialId);
    if (unitLabel) {
      const label = materialData?.unit === "pezzi" ? "pz" : "g";
      unitLabel.textContent = materialData ? `Unita: ${label}` : "Unita: -";
    }
  });
  addCompBtn.addEventListener("click", () => {
    if (!compMaterial.value || !compQty.value) {
      showMessage("Completa tutti i campi della composizione", "error");
      return;
    }
    const qty = parseFloat(compQty.value) || 0;
    if (qty <= 0) {
      showMessage("Quantita non valida", "error");
      return;
    }
    composition.push({
      materialId: compMaterial.value,
      colorName: compColor.value.trim() || void 0,
      quantity: qty
    });
    compMaterial.value = "";
    compColor.value = "";
    compQty.value = "0";
    if (unitLabel) {
      unitLabel.textContent = "Unita: -";
    }
    renderComposition();
    showMessage("Componente aggiunto!", "success");
    clearMessage();
  });
  compBody.addEventListener("click", (e) => {
    const target = e.target;
    const action = target.getAttribute("data-action");
    const indexStr = target.getAttribute("data-index");
    if (action !== "remove" || indexStr === null) return;
    const index = parseInt(indexStr, 10);
    composition = composition.filter((_, i) => i !== index);
    renderComposition();
  });
  searchInput?.addEventListener("input", () => {
    filterText = searchInput.value.trim().toLowerCase();
    renderTable();
  });
  laborInput.addEventListener("input", updatePreview);
  materialMarkupInput.addEventListener("input", updatePreview);
  laborMarkupInput.addEventListener("input", updatePreview);
  compQty.addEventListener("input", updatePreview);
  compColor.addEventListener("input", updatePreview);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!codeInput.value || !nameInput.value || composition.length === 0) {
      showMessage("Completa tutti i campi obbligatori", "error");
      return;
    }
    const data = {
      id: editingId ?? Date.now().toString(),
      code: codeInput.value.trim(),
      name: nameInput.value.trim(),
      composition,
      laborHoursRequired: parseFloat(laborInput.value) || 0,
      materialMarkupPct: parseFloat(materialMarkupInput.value) || 0,
      laborMarkupPct: parseFloat(laborMarkupInput.value) || 0,
      createdAt: editingId ? articles.find((a) => a.id === editingId)?.createdAt || (/* @__PURE__ */ new Date()).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    };
    let updated;
    if (editingId) {
      updated = articles.map((a) => a.id === editingId ? data : a);
    } else {
      updated = [...articles, data];
    }
    const success = await window.api.saveArticles(updated);
    if (success) {
      articles = updated;
      renderTable();
      setFormVisible(false);
      resetForm();
      showMessage("Articolo salvato!", "success");
      clearMessage();
    }
  });
  tbody.addEventListener("click", async (e) => {
    const target = e.target;
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (!action || !id) return;
    const article = articles.find((a) => a.id === id);
    if (!article) return;
    if (action === "edit") {
      editingId = id;
      codeInput.value = article.code;
      nameInput.value = article.name;
      laborInput.value = article.laborHoursRequired.toString();
      materialMarkupInput.value = article.materialMarkupPct.toString();
      laborMarkupInput.value = article.laborMarkupPct.toString();
      composition = [...article.composition];
      renderComposition();
      submitBtn.textContent = "Salva Modifiche";
      setFormVisible(true);
    }
    if (action === "delete") {
      if (!window.confirm("Eliminare questo articolo?")) return;
      const updated = articles.filter((a) => a.id !== id);
      const success = await window.api.saveArticles(updated);
      if (success) {
        articles = updated;
        renderTable();
        showMessage("Articolo eliminato!", "success");
        clearMessage();
      }
    }
  });
  loadData();
})();
//# sourceMappingURL=articles.js.map
