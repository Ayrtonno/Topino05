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
    if (!dateIso) return "-";
    try {
      return new Date(dateIso).toLocaleDateString();
    } catch {
      return "-";
    }
  }
  setActiveNav();

  // src/renderer/scripts/orders-production.ts
  var orders = [];
  var articles = [];
  var materials = [];
  var laborConfig = { hourlyRate: 4 };
  var articleInventory = [];
  var filterText = "";
  var filterStatus = "";
  var sortMode = "date-desc";
  var openProductionWindows = /* @__PURE__ */ new Map();
  var openingProductionLock = false;
  var refreshBtn = qs("#refresh-production");
  var productionBody = qs("#production-body");
  var searchInput = qs("#search-production");
  var statusFilter = qs("#filter-production-status");
  var sortSelect = qs("#sort-production");
  var listSection = qs("#production-list-section");
  var detailSection = qs("#production-detail-section");
  var detailTitle = qs("#production-detail-title");
  var detailClient = qs("#production-client");
  var detailRequestDate = qs("#production-request-date");
  var detailDeliveryDate = qs("#production-delivery-date");
  var detailStatus = qs("#production-status");
  var detailPaymentDate = qs("#production-payment-date");
  var detailPaymentAmount = qs("#production-payment-amount");
  var detailItemsBody = qs("#production-items-body");
  var detailProfitNoLabor = qs("#production-profit-no-labor");
  var detailProfitWithLabor = qs("#production-profit-with-labor");
  var detailProcessBtn = qs("#production-process");
  var detailCloseBtn = qs("#production-close");
  var processModal = qs("#process-modal");
  var processDateInput = qs("#process-date");
  var processAmountInput = qs("#process-amount");
  var processCancelBtn = qs("#process-cancel");
  var processConfirmBtn = qs("#process-confirm");
  var processBackdrop = qs("#process-modal .modal-backdrop");
  function getPopupParams() {
    const params2 = new URLSearchParams(window.location.search);
    return {
      popup: params2.get("popup") === "1",
      view: params2.get("view") || "list",
      id: params2.get("id")
    };
  }
  function showOnly(section) {
    listSection.classList.toggle("hidden", section !== "list");
    detailSection.classList.toggle("hidden", section !== "detail");
  }
  function getOrderFullName(order) {
    const legacyName = order.clientName;
    const first = order.clientFirstName || "";
    const last = order.clientLastName || "";
    const full = `${first} ${last}`.trim();
    return full || legacyName || "-";
  }
  function getOrderYearKey(order) {
    const dateStr = order.requestedDate || order.createdAt || order.deliveryDate;
    const d = dateStr ? new Date(dateStr) : /* @__PURE__ */ new Date();
    const yy = (d.getFullYear() % 100).toString().padStart(2, "0");
    return yy;
  }
  function isNewOrderId(id) {
    return /^\d{5}$/.test(id);
  }
  function buildOrderIdIndex(list) {
    const byYear = /* @__PURE__ */ new Map();
    list.forEach((o) => {
      if (!isNewOrderId(o.id)) return;
      const yearKey = o.id.slice(0, 2);
      const seq = parseInt(o.id.slice(2), 10);
      if (Number.isNaN(seq)) return;
      byYear.set(yearKey, Math.max(byYear.get(yearKey) || 0, seq));
    });
    return byYear;
  }
  function normalizeOrderIds(list) {
    const updated = [...list];
    const byYear = buildOrderIdIndex(updated);
    const toFix = updated.filter((o) => !isNewOrderId(o.id));
    if (!toFix.length) return { updated, changed: false };
    toFix.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    toFix.forEach((o) => {
      const yearKey = getOrderYearKey(o);
      const next = (byYear.get(yearKey) || 0) + 1;
      byYear.set(yearKey, next);
      o.id = `${yearKey}${next.toString().padStart(3, "0")}`;
    });
    return { updated, changed: true };
  }
  function getArticleCode(id) {
    return articles.find((a) => a.id === id)?.code || "-";
  }
  function getArticleName(id) {
    return articles.find((a) => a.id === id)?.name || "-";
  }
  function normalizeColor(value) {
    return (value || "").trim().toLowerCase();
  }
  function normalizeColors(colors, len) {
    return Array.from({ length: len }).map((_, i) => normalizeColor(colors[i]));
  }
  function getVariantKey(articleId, colors) {
    return `${articleId}::${colors.join("|")}`;
  }
  function buildVariantIndex() {
    const byId = /* @__PURE__ */ new Map();
    const byCode = /* @__PURE__ */ new Map();
    const byKey = /* @__PURE__ */ new Map();
    articleInventory.forEach((v) => {
      byId.set(v.id, v);
      if (v.variantCode) byCode.set(v.variantCode, v);
      const colors = normalizeColors(v.colors || [], v.colors?.length || 0);
      const key = getVariantKey(v.articleId, colors);
      byKey.set(key, v);
    });
    return { byId, byCode, byKey };
  }
  function formatVariantLabel(article, variantCode) {
    if (!variantCode) return "-";
    if (!article) return variantCode.replace("-", "");
    return variantCode.replace(`${article.code}-`, "").replace("-", "");
  }
  async function migrateLegacyVariants() {
    let changed = false;
    articleInventory = articleInventory.map((item) => {
      if (!item.variantCode || !Array.isArray(item.colors)) {
        const article = articles.find((a) => a.id === item.articleId);
        if (!article) return item;
        changed = true;
        return {
          ...item,
          variantCode: `${article.code}-0000`,
          colors: Array.from({ length: article.composition.length }).map(() => "")
        };
      }
      return item;
    });
    if (changed) {
      await window.api.saveArticleInventory(articleInventory);
    }
  }
  function computeMissingByItem(itemsList) {
    const availability = /* @__PURE__ */ new Map();
    const index = buildVariantIndex();
    articleInventory.forEach((row) => {
      availability.set(row.id, row.quantity);
    });
    return itemsList.map((item) => {
      let variant;
      if (item.variantId) {
        variant = index.byId.get(item.variantId);
      } else if (item.variantCode) {
        variant = index.byCode.get(item.variantCode);
      } else if (item.colorSelections?.length) {
        const article = articles.find((a) => a.id === item.articleId);
        const normalized = normalizeColors(item.colorSelections, article?.composition.length || item.colorSelections.length);
        const key = getVariantKey(item.articleId, normalized);
        variant = index.byKey.get(key);
      }
      if (!variant) {
        return item.quantity;
      }
      const available = availability.get(variant.id) ?? variant.quantity ?? 0;
      const used = Math.min(available, item.quantity);
      const missing = Math.max(0, item.quantity - used);
      availability.set(variant.id, available - used);
      return missing;
    });
  }
  function formatItemColors(item) {
    const article = articles.find((a) => a.id === item.articleId);
    if (!article || !item.colorSelections?.length) return "-";
    const parts = article.composition.map((comp, idx) => {
      const color = item.colorSelections?.[idx];
      if (!color) return "";
      const material = materials.find((m) => m.id === comp.materialId);
      return `${material?.name || "Materiale"}: ${color}`;
    }).filter(Boolean);
    return parts.length ? parts.join(", ") : "-";
  }
  function calculateOrderCosts(itemsList, discount) {
    let materialCost = 0;
    let laborCost = 0;
    for (const item of itemsList) {
      const article = articles.find((a) => a.id === item.articleId);
      if (!article) continue;
      for (const comp of article.composition) {
        const material = materials.find((m) => m.id === comp.materialId);
        if (material) {
          materialCost += material.costPerUnit * comp.quantity * item.quantity;
        }
      }
      laborCost += article.laborHoursRequired * laborConfig.hourlyRate * item.quantity;
    }
    const subtotal = itemsList.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discountAmount = subtotal * (discount / 100);
    const finalAmount = subtotal - discountAmount;
    return {
      materialCost: parseFloat(materialCost.toFixed(2)),
      laborCost: parseFloat(laborCost.toFixed(2)),
      finalAmount: parseFloat(finalAmount.toFixed(2))
    };
  }
  function getOrderSaleTotal(order) {
    const costs = calculateOrderCosts(order.items, order.discountPercentage);
    return costs.finalAmount;
  }
  function renderProduction() {
    productionBody.innerHTML = "";
    const empty = document.getElementById("production-empty");
    const filtered = orders.filter((order) => {
      if (order.status !== "confirmed" && order.status !== "processed") return false;
      const articleNames = order.items.map((i) => `${getArticleCode(i.articleId)} ${getArticleName(i.articleId)}`).join(" ");
      const text = `${getOrderFullName(order)} ${order.clientEmail || ""} ${articleNames}`.toLowerCase();
      const matchesText = text.includes(filterText);
      const matchesStatus = !filterStatus || order.status === filterStatus;
      return matchesText && matchesStatus;
    });
    filtered.sort((a, b) => {
      const nameA = getOrderFullName(a).toLowerCase();
      const nameB = getOrderFullName(b).toLowerCase();
      const dateA = new Date(a.requestedDate || a.createdAt).getTime();
      const dateB = new Date(b.requestedDate || b.createdAt).getTime();
      const totalA = getOrderSaleTotal(a);
      const totalB = getOrderSaleTotal(b);
      switch (sortMode) {
        case "date-asc":
          return dateA - dateB;
        case "client-asc":
          return nameA.localeCompare(nameB);
        case "client-desc":
          return nameB.localeCompare(nameA);
        case "total-asc":
          return totalA - totalB;
        case "total-desc":
          return totalB - totalA;
        case "date-desc":
        default:
          return dateB - dateA;
      }
    });
    filtered.forEach((order) => {
      const costs = calculateOrderCosts(order.items, order.discountPercentage);
      const saleTotal = getOrderSaleTotal(order);
      const soldAmount = order.status === "processed" && typeof order.paymentReceived === "number" ? order.paymentReceived : null;
      const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const codes = order.items.map((item) => {
        const article = articles.find((a) => a.id === item.articleId);
        const variantLabel = formatVariantLabel(article, item.variantCode);
        return `${getArticleCode(item.articleId)} ${variantLabel} x${item.quantity}`;
      }).join(", ");
      const tr = document.createElement("tr");
      tr.dataset.id = order.id;
      tr.innerHTML = `
            <td>${getOrderFullName(order)}</td>
            <td>${formatDate(order.requestedDate || order.createdAt)}</td>
            <td><span class="hover-hint" data-tooltip="${codes}">${totalQty}</span></td>
            <td>
                <strong>EUR ${saleTotal.toFixed(2)}</strong>
                ${soldAmount !== null ? `<div class="muted">Venduto a EUR ${soldAmount.toFixed(2)}</div>` : ""}
            </td>
            <td><span class="pill ${order.status}">${order.status}</span></td>
        `;
      productionBody.appendChild(tr);
    });
    if (empty) {
      empty.classList.toggle("hidden", filtered.length > 0);
    }
  }
  function renderDetail(order) {
    detailTitle.textContent = `Dettaglio Produzione`;
    detailClient.textContent = getOrderFullName(order);
    detailRequestDate.textContent = formatDate(order.requestedDate || "");
    detailDeliveryDate.textContent = formatDate(order.deliveryDate || "");
    detailStatus.textContent = order.status;
    detailPaymentDate.textContent = order.processedDate ? formatDate(order.processedDate) : "-";
    detailPaymentAmount.textContent = typeof order.paymentReceived === "number" ? `EUR ${order.paymentReceived.toFixed(2)}` : "-";
    const costs = calculateOrderCosts(order.items, order.discountPercentage);
    const saleTotal = getOrderSaleTotal(order);
    const actualSale = order.status === "processed" && typeof order.paymentReceived === "number" ? order.paymentReceived : saleTotal;
    const profitNoLabor = actualSale - costs.materialCost;
    const profitWithLabor = actualSale - costs.materialCost - costs.laborCost;
    detailProfitNoLabor.textContent = `EUR ${profitNoLabor.toFixed(2)}`;
    detailProfitWithLabor.textContent = `EUR ${profitWithLabor.toFixed(2)}`;
    const missingList = computeMissingByItem(order.items);
    detailItemsBody.innerHTML = order.items.map(
      (item, idx) => {
        const article = articles.find((a) => a.id === item.articleId);
        const colorsLabel = formatItemColors(item);
        const variantLabel = formatVariantLabel(article, item.variantCode);
        return `
        <tr>
            <td>${getArticleCode(item.articleId)}</td>
            <td>${getArticleName(item.articleId)}</td>
            <td><span class="hover-hint" data-tooltip="${colorsLabel}">${variantLabel}</span></td>
            <td>${item.quantity}</td>
            <td>${item.packaging ? "Si" : "No"}</td>
            <td>${formatItemColors(item)}</td>
            <td>${missingList[idx] > 0 ? `Da produrre: ${missingList[idx]}` : "Disponibile"}</td>
            <td>EUR ${item.unitPrice.toFixed(2)}</td>
            <td>EUR ${(item.unitPrice * item.quantity).toFixed(2)}</td>
        </tr>
    `;
      }
    ).join("");
    detailProcessBtn.textContent = "Venduto";
    detailProcessBtn.dataset.status = order.status;
    if (order.status === "processed") {
      detailProcessBtn.classList.add("hidden");
    } else {
      detailProcessBtn.classList.remove("hidden");
    }
  }
  async function loadData() {
    try {
      orders = await window.api.getOrders();
      const normalized = normalizeOrderIds(orders);
      if (normalized.changed) {
        await window.api.saveOrders(normalized.updated);
        orders = normalized.updated;
      }
      articles = await window.api.getArticles();
      materials = await window.api.getMaterials();
      laborConfig = await window.api.getLaborConfig();
      articleInventory = await window.api.getArticleInventory();
      await migrateLegacyVariants();
      renderProduction();
      const { popup, view, id } = getPopupParams();
      if (popup && view === "detail" && id) {
        const order = orders.find((o) => o.id === id);
        if (order) renderDetail(order);
      }
    } catch {
      showMessage("Errore nel caricamento dei dati", "error");
    }
  }
  refreshBtn.addEventListener("click", () => loadData());
  searchInput.addEventListener("input", () => {
    filterText = searchInput.value.trim().toLowerCase();
    renderProduction();
  });
  statusFilter.addEventListener("change", () => {
    filterStatus = statusFilter.value;
    renderProduction();
  });
  sortSelect?.addEventListener("change", () => {
    sortMode = sortSelect.value;
    renderProduction();
  });
  productionBody.addEventListener("click", (e) => {
    if (openingProductionLock) return;
    const target = e.target;
    const row = target.closest("tr");
    const rowId = row?.dataset.id;
    if (!rowId) return;
    const existing = openProductionWindows.get(rowId);
    if (existing && !existing.closed) {
      existing.focus();
      return;
    }
    openingProductionLock = true;
    const url = `orders-production.html?popup=1&view=detail&id=${rowId}`;
    const win = window.open(url, `production-detail-${rowId}`, "width=1200,height=800");
    if (win) {
      openProductionWindows.set(rowId, win);
      win.addEventListener("beforeunload", () => {
        openProductionWindows.delete(rowId);
      });
    }
    setTimeout(() => {
      openingProductionLock = false;
    }, 400);
  });
  detailCloseBtn.addEventListener("click", () => window.close());
  detailProcessBtn.addEventListener("click", async () => {
    const { id } = getPopupParams();
    if (!id) return;
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    if (order.status !== "confirmed") {
      showMessage("L'ordine deve essere Confirmed per essere venduto", "error");
      clearMessage();
      return;
    }
    processDateInput.value = order.processedDate || "";
    processAmountInput.value = order.paymentReceived?.toString() || "";
    processModal.classList.remove("hidden");
  });
  function closeProcessModal() {
    processModal.classList.add("hidden");
  }
  processCancelBtn.addEventListener("click", () => closeProcessModal());
  processBackdrop.addEventListener("click", () => closeProcessModal());
  processConfirmBtn.addEventListener("click", async () => {
    const { id } = getPopupParams();
    if (!id) return;
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const date = processDateInput.value;
    const amountStr = processAmountInput.value;
    if (!date || !amountStr) {
      showMessage("Inserisci data e importo", "error");
      return;
    }
    const amount = parseFloat(amountStr.replace(",", "."));
    if (Number.isNaN(amount)) {
      showMessage("Importo non valido", "error");
      return;
    }
    const missingList = computeMissingByItem(order.items);
    const missingTotal = missingList.reduce((sum, value) => sum + value, 0);
    if (missingTotal > 0) {
      showMessage(`Deposito insufficiente. Da produrre: ${missingTotal}`, "error");
      return;
    }
    const updatedInventory = [...articleInventory];
    const index = buildVariantIndex();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    order.items.forEach((item) => {
      let row;
      if (item.variantId) {
        row = index.byId.get(item.variantId);
      } else if (item.variantCode) {
        row = index.byCode.get(item.variantCode);
      } else if (item.colorSelections?.length) {
        const article = articles.find((a) => a.id === item.articleId);
        const normalized = normalizeColors(item.colorSelections, article?.composition.length || item.colorSelections.length);
        const key = getVariantKey(item.articleId, normalized);
        row = index.byKey.get(key);
      }
      if (!row) return;
      const invRow = updatedInventory.find((r) => r.id === row?.id);
      if (!invRow) return;
      invRow.quantity = Math.max(0, invRow.quantity - item.quantity);
      invRow.lastUpdated = now;
    });
    const inventorySaved = await window.api.saveArticleInventory(updatedInventory);
    if (!inventorySaved) {
      showMessage("Errore salvataggio deposito articoli", "error");
      return;
    }
    articleInventory = updatedInventory;
    const updatedOrders = orders.map(
      (o) => o.id === id ? {
        ...o,
        status: "processed",
        processedDate: date,
        paymentReceived: amount,
        items: o.items.map((it) => ({
          ...it,
          depositUsed: it.quantity,
          depositMissing: 0
        }))
      } : o
    );
    const orderSaved = await window.api.saveOrders(updatedOrders);
    if (!orderSaved) {
      showMessage("Errore salvataggio ordine", "error");
      return;
    }
    const movements = await window.api.getIncomeMovements();
    const newMovement = {
      id: Date.now().toString(),
      orderId: id,
      amount,
      receivedDate: date,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const moveSaved = await window.api.saveIncomeMovements([...movements, newMovement]);
    if (!moveSaved) {
      showMessage("Errore salvataggio movimento economico", "error");
      return;
    }
    orders = updatedOrders;
    renderDetail(updatedOrders.find((o) => o.id === id));
    closeProcessModal();
    showMessage("Ordine processato", "success");
    clearMessage();
  });
  var params = getPopupParams();
  if (params.popup) {
    document.body.classList.add("popup", "popup-detail");
    showOnly("detail");
  } else {
    showOnly("list");
  }
  loadData();
})();
//# sourceMappingURL=orders-production.js.map
