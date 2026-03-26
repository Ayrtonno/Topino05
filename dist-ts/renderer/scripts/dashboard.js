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

  // src/renderer/scripts/dashboard.ts
  var orders = [];
  var salesTarget = 1e4;
  var kpiOrders = qs("#kpi-orders");
  var kpiProfit = qs("#kpi-profit");
  var kpiRevenue = qs("#kpi-revenue");
  var kpiCost = qs("#kpi-cost");
  var targetDisplay = qs("#target-display");
  var targetEdit = qs("#target-edit");
  var targetInput = qs("#target-input");
  var targetEditBtn = qs("#target-edit-btn");
  var targetSave = qs("#target-save");
  var targetCancel = qs("#target-cancel");
  var targetProgress = qs("#target-progress");
  var targetNote = qs("#target-note");
  var statOrders = qs("#stat-orders");
  var statRevenue = qs("#stat-revenue");
  var statCost = qs("#stat-cost");
  var statProfit = qs("#stat-profit");
  var statMargin = qs("#stat-margin");
  var statTarget = qs("#stat-target");
  async function loadData() {
    try {
      orders = await window.api.getOrders();
      const config = await window.api.getDashboardConfig();
      salesTarget = config.salesTarget || 1e4;
      targetDisplay.textContent = `EUR ${salesTarget.toFixed(2)}`;
      targetInput.value = salesTarget.toString();
      renderKpi();
    } catch {
      showMessage("Errore nel caricamento dei dati", "error");
    }
  }
  function getKpi() {
    const completedOrders = orders.filter((o) => o.status === "completed");
    const now = /* @__PURE__ */ new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthOrders = completedOrders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    const totalRevenue = monthOrders.reduce((sum, o) => sum + o.finalAmount, 0);
    const totalCost = monthOrders.reduce(
      (sum, o) => sum + o.materialCost + o.laborCost,
      0
    );
    const totalProfit = totalRevenue - totalCost;
    const percentageReached = salesTarget > 0 ? totalRevenue / salesTarget * 100 : 0;
    return {
      totalOrders: monthOrders.length,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      percentageReached: parseFloat(percentageReached.toFixed(1))
    };
  }
  function renderKpi() {
    const kpi = getKpi();
    kpiOrders.textContent = kpi.totalOrders.toString();
    kpiProfit.textContent = `EUR ${kpi.totalProfit.toFixed(2)}`;
    kpiRevenue.textContent = `EUR ${kpi.totalRevenue.toFixed(2)}`;
    kpiCost.textContent = `EUR ${kpi.totalCost.toFixed(2)}`;
    statOrders.textContent = kpi.totalOrders.toString();
    statRevenue.textContent = `EUR ${kpi.totalRevenue.toFixed(2)}`;
    statCost.textContent = `EUR ${kpi.totalCost.toFixed(2)}`;
    statProfit.textContent = `EUR ${kpi.totalProfit.toFixed(2)}`;
    statMargin.textContent = kpi.totalRevenue > 0 ? `${(kpi.totalProfit / kpi.totalRevenue * 100).toFixed(1)}%` : "0%";
    statTarget.textContent = `${kpi.percentageReached.toFixed(1)}% / 100%`;
    targetProgress.style.width = `${Math.min(kpi.percentageReached, 100)}%`;
    targetProgress.textContent = `${kpi.percentageReached.toFixed(1)}%`;
    targetProgress.style.background = kpi.percentageReached >= 100 ? "#16a34a" : "#2563eb";
    if (kpi.percentageReached >= 100) {
      targetNote.textContent = "Target raggiunto!";
      targetNote.style.color = "#16a34a";
    } else {
      targetNote.textContent = `Mancano: EUR ${(salesTarget - kpi.totalRevenue).toFixed(2)}`;
      targetNote.style.color = "#ea580c";
    }
  }
  targetEditBtn.addEventListener("click", () => {
    targetEdit.classList.remove("hidden");
    targetEditBtn.classList.add("hidden");
  });
  targetCancel.addEventListener("click", () => {
    targetEdit.classList.add("hidden");
    targetEditBtn.classList.remove("hidden");
    targetInput.value = salesTarget.toString();
  });
  targetSave.addEventListener("click", async () => {
    const newTarget = parseFloat(targetInput.value);
    if (isNaN(newTarget) || newTarget <= 0) {
      showMessage("Inserisci un valore valido", "error");
      return;
    }
    const config = {
      salesTarget: newTarget,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    const success = await window.api.saveDashboardConfig(config);
    if (success) {
      salesTarget = newTarget;
      targetDisplay.textContent = `EUR ${salesTarget.toFixed(2)}`;
      targetEdit.classList.add("hidden");
      targetEditBtn.classList.remove("hidden");
      renderKpi();
      showMessage("Target salvato!", "success");
      clearMessage();
    } else {
      showMessage("Errore nel salvataggio!", "error");
    }
  });
  loadData();
})();
//# sourceMappingURL=dashboard.js.map
