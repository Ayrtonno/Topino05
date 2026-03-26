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

  // src/renderer/scripts/article-form.ts
  var articles = [];
  var materials = [];
  var composition = [];
  var hourlyRate = 0;
  var editingId = null;
  var form = qs("#article-form");
  var compBody = qs("#composition-body");
  var compCost = qs("#composition-cost");
  var unitLabel = qs("#comp-unit-label");
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
  function getQueryId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
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
  }
  async function loadData() {
    try {
      articles = await window.api.getArticles();
      materials = await window.api.getMaterials();
      const laborConfig = await window.api.getLaborConfig();
      hourlyRate = laborConfig.hourlyRate || 0;
      renderMaterialOptions();
      const id = getQueryId();
      if (id) {
        const article = articles.find((a) => a.id === id);
        if (article) {
          editingId = id;
          codeInput.value = article.code;
          nameInput.value = article.name;
          laborInput.value = article.laborHoursRequired.toString();
          materialMarkupInput.value = article.materialMarkupPct.toString();
          laborMarkupInput.value = article.laborMarkupPct.toString();
          composition = [...article.composition];
          const title = document.getElementById("form-title");
          if (title) title.textContent = "Modifica Articolo";
          submitBtn.textContent = "Salva Modifiche";
        }
      }
      renderComposition();
    } catch {
      showMessage("Errore nel caricamento dei dati", "error");
    }
  }
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
    unitLabel.textContent = "Unita: -";
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
      showMessage("Articolo salvato!", "success");
      clearMessage();
      window.location.href = "articles.html";
    }
  });
  loadData();
})();
//# sourceMappingURL=article-form.js.map
