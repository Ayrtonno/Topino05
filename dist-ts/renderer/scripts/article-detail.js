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
  setActiveNav();

  // src/renderer/scripts/article-detail.ts
  var COLOR_SURCHARGE = 0.1;
  var detailTitle = qs("#detail-title");
  var detailCode = qs("#detail-code");
  var detailName = qs("#detail-name");
  var detailHours = qs("#detail-hours");
  var detailMatMarkup = qs("#detail-mat-markup");
  var detailLabMarkup = qs("#detail-lab-markup");
  var editLink = qs("#edit-link");
  var compBody = qs("#detail-composition");
  var previewMaterialCost = qs("#preview-material-cost");
  var previewMaterialSell = qs("#preview-material-sell");
  var previewLaborCost = qs("#preview-labor-cost");
  var previewLaborSell = qs("#preview-labor-sell");
  var previewColorSurcharge = qs("#preview-color-surcharge");
  var previewTotalSell = qs("#preview-total-sell");
  var previewMaterialMargin = qs("#preview-material-margin");
  function getQueryId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }
  async function loadData() {
    try {
      const id = getQueryId();
      if (!id) {
        showMessage("Articolo non trovato", "error");
        return;
      }
      const articles = await window.api.getArticles();
      const materials = await window.api.getMaterials();
      const laborConfig = await window.api.getLaborConfig();
      const hourlyRate = laborConfig.hourlyRate || 0;
      const article = articles.find((a) => a.id === id);
      if (!article) {
        showMessage("Articolo non trovato", "error");
        return;
      }
      detailTitle.textContent = `Dettaglio Articolo: ${article.name}`;
      detailCode.textContent = article.code;
      detailName.textContent = article.name;
      detailHours.textContent = `${article.laborHoursRequired}h`;
      detailMatMarkup.textContent = `${article.materialMarkupPct}%`;
      detailLabMarkup.textContent = `${article.laborMarkupPct}%`;
      const returnUrl = encodeURIComponent(`article-detail.html?id=${article.id}`);
      editLink.href = `article-form.html?id=${article.id}&return=${returnUrl}&popup=1`;
      editLink.target = "_blank";
      editLink.rel = "noopener";
      compBody.innerHTML = "";
      let materialCost = 0;
      let materialSellBase = 0;
      article.composition.forEach((comp) => {
        const material = materials.find((m) => m.id === comp.materialId);
        const unitLabel = material?.unit === "pezzi" ? "pz" : "g";
        const costUnit = material?.costPerUnit || 0;
        const sellUnit = material?.sellingPricePerUnit || costUnit;
        const rowCost = costUnit * comp.quantity;
        materialCost += rowCost;
        materialSellBase += sellUnit * comp.quantity;
        const tr = document.createElement("tr");
        tr.innerHTML = `
                <td>${material?.name || "-"}</td>
                <td>${comp.description || "-"}</td>
                <td>${comp.quantity} ${unitLabel}</td>
                <td>EUR ${rowCost.toFixed(2)}</td>
            `;
        compBody.appendChild(tr);
      });
      const colorSurcharge = article.composition.length * COLOR_SURCHARGE;
      const materialSell = (materialSellBase + colorSurcharge) * (1 + article.materialMarkupPct / 100);
      const laborCost = article.laborHoursRequired * hourlyRate;
      const laborSell = laborCost * (1 + article.laborMarkupPct / 100);
      const materialMargin = materialSell - materialCost + colorSurcharge;
      previewMaterialCost.textContent = `EUR ${materialCost.toFixed(2)}`;
      previewMaterialSell.textContent = `EUR ${materialSell.toFixed(2)}`;
      previewLaborCost.textContent = `EUR ${laborCost.toFixed(2)}`;
      previewLaborSell.textContent = `EUR ${laborSell.toFixed(2)}`;
      previewColorSurcharge.textContent = `EUR ${colorSurcharge.toFixed(2)}`;
      previewTotalSell.textContent = `EUR ${(materialSell + laborSell).toFixed(2)}`;
      previewMaterialMargin.textContent = `EUR ${materialMargin.toFixed(2)}`;
      previewMaterialMargin.classList.remove("text-success", "text-danger");
      previewMaterialMargin.classList.add(materialMargin >= 0 ? "text-success" : "text-danger");
    } catch {
      showMessage("Errore nel caricamento dati", "error");
    }
  }
  loadData();
})();
//# sourceMappingURL=article-detail.js.map
