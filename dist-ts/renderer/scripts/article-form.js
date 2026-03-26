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
  var editingCompIndex = null;
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
  var wizardPrev = qs("#wizard-prev");
  var wizardNext = qs("#wizard-next");
  var wizardCancel = qs("#wizard-cancel");
  var wizardSteps = Array.from(document.querySelectorAll(".wizard-step"));
  var wizardSections = Array.from(document.querySelectorAll(".wizard-section"));
  var wizardProgress = qs("#wizard-progress-bar");
  var currentStep = 1;
  var returnUrl = "articles.html";
  var isPopup = false;
  var compMaterial = qs("#comp-material");
  var compDesc = qs("#comp-desc");
  var compQty = qs("#comp-qty");
  var addCompBtn = qs("#add-comp");
  function getQueryId() {
    const params = new URLSearchParams(window.location.search);
    returnUrl = params.get("return") || "articles.html";
    isPopup = params.get("popup") === "1";
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
      const desc = comp.description || "-";
      const materialData = materials.find((m) => m.id === comp.materialId);
      const materialCost = materialData?.costPerUnit || 0;
      const unitLabel2 = materialData?.unit === "pezzi" ? "pz" : "g";
      const tr = document.createElement("tr");
      if (editingCompIndex === idx) {
        const options = materials.map((m) => `<option value="${m.id}" ${m.id === comp.materialId ? "selected" : ""}>${m.name}</option>`).join("");
        tr.innerHTML = `
                <td>
                    <select class="inline-field inline-material">
                        <option value="">Seleziona materiale</option>
                        ${options}
                    </select>
                </td>
                <td><input class="inline-field inline-desc" type="text" value="${comp.description || ""}"/></td>
                <td><input class="inline-field inline-qty" type="number" value="${comp.quantity}"/></td>
                <td>EUR ${(materialCost * comp.quantity).toFixed(3)}</td>
                <td>
                    <button class="btn-small" data-action="save" data-index="${idx}">Salva</button>
                    <button class="btn-small btn-danger" data-action="remove" data-index="${idx}">Rimuovi</button>
                </td>
            `;
        tr.classList.add("row-editing");
      } else {
        tr.innerHTML = `
                <td>${material}</td>
                <td>${desc}</td>
                <td>${comp.quantity} ${unitLabel2}</td>
                <td>EUR ${(materialCost * comp.quantity).toFixed(3)}</td>
                <td>
                    <button class="btn-small" data-action="edit" data-index="${idx}">Modifica</button>
                    <button class="btn-small btn-danger" data-action="remove" data-index="${idx}">Rimuovi</button>
                </td>
            `;
      }
      compBody.appendChild(tr);
    });
    compCost.textContent = `Costo Materiale: EUR ${compositionCost().toFixed(2)}`;
  }
  function setStep(step) {
    currentStep = step;
    wizardSteps.forEach((el) => {
      const s = parseInt(el.getAttribute("data-step") || "1", 10);
      el.classList.toggle("active", s === currentStep);
    });
    wizardSections.forEach((el) => {
      const s = parseInt(el.getAttribute("data-step") || "1", 10);
      el.classList.toggle("hidden", s !== currentStep);
    });
    wizardPrev.disabled = currentStep === 1;
    wizardNext.classList.toggle("hidden", currentStep === 3);
    submitBtn.classList.toggle("hidden", currentStep !== 3);
    if (wizardProgress) {
      const percent = (currentStep - 1) / 2 * 100;
      wizardProgress.style.width = `${percent}%`;
    }
  }
  async function loadData() {
    try {
      if (!window.api) {
        throw new Error("API non disponibile");
      }
      articles = await window.api.getArticles();
      materials = await window.api.getMaterials();
      try {
        const laborConfig = await window.api.getLaborConfig();
        hourlyRate = laborConfig.hourlyRate || 0;
      } catch {
        hourlyRate = 0;
      }
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
      setStep(1);
    } catch (err) {
      console.error("[article-form] loadData failed:", err);
      const msg = err instanceof Error ? err.message : "Errore nel caricamento dei dati";
      showMessage(`Errore nel caricamento dei dati: ${msg}`, "error");
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
    const nextComp = {
      materialId: compMaterial.value,
      description: compDesc.value.trim() || void 0,
      quantity: qty
    };
    composition.push(nextComp);
    compMaterial.value = "";
    compDesc.value = "";
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
    if (!action || indexStr === null) return;
    const index = parseInt(indexStr, 10);
    if (action === "edit") {
      editingCompIndex = index;
      renderComposition();
      return;
    }
    if (action === "save") {
      const row = target.closest("tr");
      if (!row) return;
      const matSelect = row.querySelector(".inline-material");
      const descInput = row.querySelector(".inline-desc");
      const qtyInput = row.querySelector(".inline-qty");
      if (!matSelect || !qtyInput) return;
      if (!matSelect.value) {
        showMessage("Seleziona materiale", "error");
        return;
      }
      const qty = parseFloat(qtyInput.value) || 0;
      if (qty <= 0) {
        showMessage("Quantita non valida", "error");
        return;
      }
      composition = composition.map(
        (c, i) => i === index ? {
          ...c,
          materialId: matSelect.value,
          description: descInput?.value.trim() || void 0,
          quantity: qty
        } : c
      );
      editingCompIndex = null;
      renderComposition();
      return;
    }
    if (action === "remove") {
      composition = composition.filter((_, i) => i !== index);
      if (editingCompIndex === index) {
        editingCompIndex = null;
      }
      renderComposition();
    }
  });
  wizardPrev.addEventListener("click", () => {
    if (currentStep > 1) setStep(currentStep - 1);
  });
  wizardNext.addEventListener("click", () => {
    if (currentStep < 3) setStep(currentStep + 1);
  });
  wizardCancel.addEventListener("click", () => {
    if (isPopup) {
      window.close();
      return;
    }
    window.location.href = returnUrl;
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
      if (isPopup) {
        window.close();
        return;
      }
      window.location.href = returnUrl;
    }
  });
  loadData();
})();
//# sourceMappingURL=article-form.js.map
