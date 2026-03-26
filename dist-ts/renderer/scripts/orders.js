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

  // src/renderer/scripts/orders.ts
  var orders = [];
  var articles = [];
  var materials = [];
  var clients = [];
  var inventory = [];
  var articleInventory = [];
  var laborConfig = { hourlyRate: 4 };
  var editingId = null;
  var items = [];
  var filterText = "";
  var filterStatus = "";
  var sortMode = "date-desc";
  var currentColorSelections = [];
  var orderLoadRetry = false;
  var currentDetailOrderId = null;
  var openOrderWindows = /* @__PURE__ */ new Map();
  var form = qs("#order-form");
  var toggleBtn = qs("#toggle-form");
  var refreshBtn = qs("#refresh-orders");
  var ordersBody = qs("#orders-body");
  var itemsBody = qs("#items-body");
  var searchInput = qs("#search-orders");
  var statusFilter = qs("#filter-status");
  var sortSelect = qs("#sort-orders");
  var statsSection = qs("#orders-stats");
  var toolbarSection = qs("#orders-toolbar");
  var listSection = qs("#orders-list-section");
  var detailSection = qs("#order-detail-section");
  var clientSelect = qs("#order-client");
  var firstNameInput = qs("#order-first-name");
  var lastNameInput = qs("#order-last-name");
  var emailInput = qs("#order-email");
  var phoneInput = qs("#order-phone");
  var requestDateInput = qs("#order-request-date");
  var deliveryDateInput = qs("#order-delivery-date");
  var notesInput = qs("#order-notes");
  var submitBtn = qs("#submit-order");
  var itemArticle = qs("#item-article");
  var itemQty = qs("#item-qty");
  var itemPackaging = qs("#item-packaging");
  var addItemBtn = qs("#add-item");
  var itemColorsBody = qs("#item-colors-body");
  var previewMaterialSell = qs("#order-preview-material-sell");
  var previewHours = qs("#order-preview-hours");
  var previewFinal = qs("#order-preview-final");
  var detailTitle = qs("#order-detail-title");
  var detailClient = qs("#detail-client");
  var detailEmail = qs("#detail-email");
  var detailPhone = qs("#detail-phone");
  var detailRequestDate = qs("#detail-request-date");
  var detailDeliveryDate = qs("#detail-delivery-date");
  var detailStatus = qs("#detail-status");
  var detailNotes = qs("#detail-notes");
  var detailItemsBody = qs("#detail-items-body");
  var detailProfitNoLabor = qs("#detail-profit-no-labor");
  var detailProfitWithLabor = qs("#detail-profit-with-labor");
  var detailEditBtn = qs("#order-detail-edit");
  var detailCloseBtn = qs("#order-detail-close");
  var detailConfirmBtn = qs("#order-detail-confirm");
  var detailRefuseBtn = qs("#order-detail-refuse");
  var detailPdfBtn = qs("#order-detail-pdf");
  var pdfModal = qs("#pdf-modal");
  var pdfFilenameInput = qs("#pdf-filename");
  var pdfCancelBtn = qs("#pdf-cancel");
  var pdfConfirmBtn = qs("#pdf-confirm");
  var pdfBackdrop = qs("#pdf-modal .modal-backdrop");
  function setFormVisible(visible) {
    form.classList.toggle("hidden", !visible);
    toggleBtn.textContent = visible ? "Annulla" : "+ Nuovo Ordine";
  }
  function resetForm() {
    clientSelect.value = "";
    firstNameInput.value = "";
    lastNameInput.value = "";
    emailInput.value = "";
    phoneInput.value = "";
    requestDateInput.value = "";
    deliveryDateInput.value = "";
    notesInput.value = "";
    itemArticle.value = "";
    itemQty.value = "1";
    itemPackaging.checked = false;
    items = [];
    editingId = null;
    currentColorSelections = [];
    itemColorsBody.innerHTML = "";
    previewMaterialSell.textContent = "EUR 0.00";
    previewHours.textContent = "0h";
    previewFinal.textContent = "EUR 0.00";
    submitBtn.textContent = "Crea Ordine";
    renderItems();
  }
  function getPopupParams() {
    const params2 = new URLSearchParams(window.location.search);
    return {
      popup: params2.get("popup") === "1",
      view: params2.get("view") || "form",
      id: params2.get("id")
    };
  }
  function showOnly(section) {
    form.classList.toggle("hidden", section !== "form");
    listSection.classList.toggle("hidden", section !== "list");
    statsSection.classList.toggle("hidden", section !== "list");
    toolbarSection.classList.toggle("hidden", section !== "list");
    detailSection.classList.toggle("hidden", section !== "detail");
  }
  async function loadData() {
    try {
      const safeGet = async (fn, fallback) => {
        if (!fn) return fallback;
        try {
          return await fn();
        } catch {
          return fallback;
        }
      };
      orders = await safeGet(window.api?.getOrders, []);
      const normalized = normalizeOrderIds(orders);
      if (normalized.changed) {
        await window.api.saveOrders(normalized.updated);
        orders = normalized.updated;
      }
      const rawArticles = await safeGet(window.api?.getArticles, []);
      materials = await safeGet(window.api?.getMaterials, []);
      articles = rawArticles.map((a) => ({
        ...a,
        composition: a.composition.map((comp) => ({
          ...comp,
          materialName: materials.find((m) => m.id === comp.materialId)?.name || comp.materialId
        }))
      }));
      inventory = await safeGet(window.api?.getInventory, []);
      articleInventory = await safeGet(window.api?.getArticleInventory, []);
      await migrateLegacyVariants();
      clients = await safeGet(window.api?.getClients, []);
      laborConfig = await safeGet(window.api?.getLaborConfig, {
        hourlyRate: 0
      });
      renderArticleOptions();
      renderClientOptions();
      renderOrders();
      const { popup, view, id } = getPopupParams();
      if (popup && view === "detail" && id) {
        const order = orders.find((o) => o.id === id);
        if (order) renderOrderDetail(order);
      }
      if (popup && view === "form" && id) {
        const order = orders.find((o) => o.id === id);
        if (order) {
          populateFormFromOrder(order);
        } else {
          if (!orderLoadRetry) {
            orderLoadRetry = true;
            const fetched = await loadOrderById(id);
            if (fetched) {
              populateFormFromOrder(fetched);
              return;
            }
            setTimeout(loadData, 500);
          } else {
            const fetched = await loadOrderById(id);
            if (fetched) {
              populateFormFromOrder(fetched);
              return;
            }
            showMessage(`Ordine non trovato (id: ${id})`, "error");
          }
        }
      }
    } catch {
      showMessage("Errore nel caricamento dei dati", "error");
    }
  }
  function renderClientOptions() {
    clientSelect.innerHTML = '<option value="">Seleziona cliente</option>';
    clients.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.firstName} ${c.lastName}`;
      clientSelect.appendChild(opt);
    });
  }
  function fillClientFields(clientId) {
    const client = clients.find((c) => c.id === clientId);
    firstNameInput.value = client?.firstName || "";
    lastNameInput.value = client?.lastName || "";
    emailInput.value = client?.email || "";
    phoneInput.value = client?.phone || "";
  }
  function populateFormFromOrder(order) {
    editingId = order.id;
    if (order.clientId) {
      clientSelect.value = order.clientId;
      fillClientFields(order.clientId);
    } else {
      clientSelect.value = "";
    }
    const legacyName = order.clientName || "";
    const nameParts = legacyName ? legacyName.split(" ") : [];
    firstNameInput.value = order.clientFirstName || nameParts.shift() || firstNameInput.value;
    lastNameInput.value = order.clientLastName || nameParts.join(" ") || lastNameInput.value;
    emailInput.value = order.clientEmail || emailInput.value;
    phoneInput.value = order.clientPhone || phoneInput.value;
    requestDateInput.value = order.requestedDate || "";
    deliveryDateInput.value = order.deliveryDate || "";
    notesInput.value = order.notes || "";
    items = [...order.items];
    submitBtn.textContent = "Salva Modifiche";
    setFormVisible(true);
    itemArticle.value = "";
    itemQty.value = "1";
    itemPackaging.checked = false;
    currentColorSelections = [];
    itemColorsBody.innerHTML = "";
    updateItemPreview();
    renderItems();
  }
  async function loadOrderById(orderId) {
    try {
      const fresh = await window.api.getOrders();
      orders = fresh;
      return fresh.find((o) => o.id === orderId);
    } catch {
      return null;
    }
  }
  function renderArticleOptions() {
    itemArticle.innerHTML = '<option value="">Seleziona articolo</option>';
    articles.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = `(${a.code}) ${a.name}`;
      itemArticle.appendChild(opt);
    });
  }
  function getAvailableColors(materialId) {
    const colors = /* @__PURE__ */ new Set();
    inventory.forEach((row) => {
      if (row.materialId !== materialId) return;
      const name = (row.colorName || "").trim();
      if (name) colors.add(name);
    });
    return Array.from(colors).sort((a, b) => a.localeCompare(b));
  }
  function renderColorRows(article) {
    itemColorsBody.innerHTML = "";
    currentColorSelections = [];
    if (!article) return;
    article.composition.forEach((comp, index) => {
      const material = materials.find((m) => m.id === comp.materialId);
      const unitLabel = material?.unit === "pezzi" ? "pz" : "g";
      const colors = getAvailableColors(comp.materialId);
      const tr = document.createElement("tr");
      const colorCell = colors.length ? `<select data-color-index="${index}">
                    <option value="">Nessun colore</option>
                    ${colors.map((c) => `<option value="${c}">${c}</option>`).join("")}
               </select>` : `<span class="muted">N/A</span>`;
      tr.innerHTML = `
            <td>${material?.name || "-"}</td>
            <td>${comp.description || "-"}</td>
            <td>${comp.quantity} ${unitLabel}</td>
            <td>${colorCell}</td>
        `;
      itemColorsBody.appendChild(tr);
      currentColorSelections[index] = "";
    });
  }
  function updateItemPreview() {
    const article = articles.find((a) => a.id === itemArticle.value);
    if (!article) {
      previewMaterialSell.textContent = "EUR 0.00";
      previewHours.textContent = "0h";
      previewFinal.textContent = "EUR 0.00";
      return;
    }
    const pricing = calculateArticlePricing(article, itemPackaging.checked);
    previewMaterialSell.textContent = `EUR ${pricing.materialSell.toFixed(2)}`;
    previewHours.textContent = `${pricing.laborHours}h`;
    previewFinal.textContent = `EUR ${pricing.finalPrice.toFixed(2)}`;
  }
  refreshBtn.addEventListener("click", () => {
    loadData();
  });
  function getArticleName(id) {
    return articles.find((a) => a.id === id)?.name || "-";
  }
  function getArticleCode(id) {
    return articles.find((a) => a.id === id)?.code || "-";
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
  function getOrderFullName(order) {
    const legacyName = order.clientName;
    const first = order.clientFirstName || "";
    const last = order.clientLastName || "";
    const full = `${first} ${last}`.trim();
    return full || legacyName || "-";
  }
  function roundToHalf(value) {
    return Math.round(value * 2) / 2;
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
    toFix.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    toFix.forEach((o) => {
      const yearKey = getOrderYearKey(o);
      const next = (byYear.get(yearKey) || 0) + 1;
      byYear.set(yearKey, next);
      o.id = `${yearKey}${next.toString().padStart(3, "0")}`;
    });
    return { updated, changed: true };
  }
  function nextOrderId() {
    const now = /* @__PURE__ */ new Date();
    const yearKey = (now.getFullYear() % 100).toString().padStart(2, "0");
    const byYear = buildOrderIdIndex(orders);
    const next = (byYear.get(yearKey) || 0) + 1;
    return `${yearKey}${next.toString().padStart(3, "0")}`;
  }
  function calculateArticlePricing(article, packaging) {
    let materialCost = 0;
    let materialSellBase = 0;
    for (const comp of article.composition) {
      const material = materials.find((m) => m.id === comp.materialId);
      if (material) {
        materialCost += material.costPerUnit * comp.quantity;
        materialSellBase += (material.sellingPricePerUnit || material.costPerUnit) * comp.quantity;
      }
    }
    const laborCost = article.laborHoursRequired * laborConfig.hourlyRate;
    const colorSurcharge = article.composition.length * 0.1;
    const materialSell = (materialSellBase + colorSurcharge) * (1 + article.materialMarkupPct / 100);
    const laborSell = laborCost * (1 + article.laborMarkupPct / 100);
    const total = materialSell + laborSell;
    const rounded = roundToHalf(total);
    const finalPrice = rounded + (packaging ? 0.5 : 0);
    return {
      materialCost,
      materialSell,
      laborHours: article.laborHoursRequired,
      laborCost,
      laborSell,
      colorSurcharge,
      total,
      rounded,
      finalPrice
    };
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
    const subtotal = itemsList.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const discountAmount = subtotal * (discount / 100);
    const finalAmount = subtotal - discountAmount;
    return {
      materialCost: parseFloat(materialCost.toFixed(2)),
      laborCost: parseFloat(laborCost.toFixed(2)),
      finalAmount: parseFloat(finalAmount.toFixed(2))
    };
  }
  function getOrderSaleTotal(order) {
    if (order.status === "processed" && typeof order.paymentReceived === "number") {
      return order.paymentReceived;
    }
    return order.finalAmount;
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
        const normalized = normalizeColors(
          item.colorSelections,
          article?.composition.length || item.colorSelections.length
        );
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
  function getOrderMissingTotal(order) {
    const missing = computeMissingByItem(order.items);
    return missing.reduce((sum, value) => sum + value, 0);
  }
  function getItemMissing(item, missingList, index) {
    if (missingList[index] !== void 0) return missingList[index];
    if (typeof item.depositMissing === "number") return item.depositMissing;
    if (typeof item.depositUsed === "number")
      return Math.max(0, item.quantity - item.depositUsed);
    return 0;
  }
  function calculateOrderSummary(order) {
    let materialSell = 0;
    let laborHours = 0;
    let finalTotal = 0;
    order.items.forEach((item) => {
      const article = articles.find((a) => a.id === item.articleId);
      if (!article) return;
      const pricing = calculateArticlePricing(article, !!item.packaging);
      materialSell += pricing.materialSell * item.quantity;
      laborHours += pricing.laborHours * item.quantity;
      finalTotal += item.unitPrice * item.quantity;
    });
    const discountAmount = finalTotal * ((order.discountPercentage || 0) / 100);
    const finalAfterDiscount = finalTotal - discountAmount;
    const saleTotal = getOrderSaleTotal(order);
    return {
      materialSell,
      laborHours,
      finalTotal,
      finalAfterDiscount,
      saleTotal
    };
  }
  function buildOrderPdfHtml(order) {
    const summary = calculateOrderSummary(order);
    const costs = calculateOrderCosts(order.items, order.discountPercentage);
    const colorsList = order.items.map((item) => formatItemColors(item)).filter((txt) => txt && txt !== "-").join(", ");
    const packaging = order.items.some((i) => i.packaging) ? "Prodotto impacchettato." : "Prodotto non impacchettato.";
    const totalRaw = order.items.reduce((sum, item) => {
      const article = articles.find((a) => a.id === item.articleId);
      if (!article) return sum;
      const pricing = calculateArticlePricing(article, !!item.packaging);
      const rawUnit = pricing.total + (item.packaging ? 0.5 : 0);
      return sum + rawUnit * item.quantity;
    }, 0);
    const totalRounded = roundToHalf(totalRaw);
    const title = `Preventivo Ordine ${order.id}`;
    const itemDetailsHtml = order.items.map((item) => {
      const article = articles.find((a) => a.id === item.articleId);
      if (!article) return "";
      const lines = article.composition.map((c, idx) => {
        const material = materials.find((m) => m.id === c.materialId);
        const materialLabel = material?.name || c.materialId || "Materiale";
        const descLabel = c.description || materialLabel;
        const color = item.colorSelections && item.colorSelections[idx] ? item.colorSelections[idx] : "";
        const value = color ? `${materialLabel} ${color}` : materialLabel;
        return `<div class="info-line"><span class="info-label">${descLabel}</span><span class="info-value">${value}</span></div>`;
      }).join("");
      return `
            <div class="info-item">
                <div class="info-item-title">Articolo: ${article.name}</div>
                <div class="info-lines">${lines || ""}</div>
            </div>
        `;
    }).join("");
    const packagingItems = order.items.filter((i) => i.packaging);
    const packagingInfo = packagingItems.length === 0 ? "Packaging non richiesto." : packagingItems.length === order.items.length ? "Packaging incluso su tutti i prodotti." : `Packaging incluso su: ${packagingItems.map((i) => getArticleName(i.articleId)).join(", ")}.`;
    return `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8" />
    <style>
        :root {
            --blue: #4aa3ff;
            --blue-dark: #1d6ec6;
            --blue-soft: #e7f3ff;
            --blue-veil: #f3f9ff;
            --mint: #e8f8ef;
            --ink: #0f172a;
            --muted: #526074;
            --card: #ffffff;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: "Segoe UI", "Trebuchet MS", Arial, sans-serif;
            color: var(--ink);
            background: #dfeeff;
        }
        .page {
            padding: 26px 28px 34px;
        }
        .sheet {
            background: #ffffff;
            border-radius: 22px;
            padding: 22px 22px 26px;
            box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
            border: 1px solid #cfe2ff;
            position: relative;
            overflow: hidden;
        }
        .sheet::before {
            content: "";
            position: absolute;
            inset: 0;
            background:
                radial-gradient(circle at 10% 0%, rgba(74, 163, 255, 0.16), transparent 45%),
                radial-gradient(circle at 100% 0%, rgba(74, 163, 255, 0.12), transparent 40%),
                radial-gradient(circle at 10% 100%, rgba(209, 238, 255, 0.5), transparent 50%);
            pointer-events: none;
        }
        .header {
            position: relative;
            border-radius: 18px;
            padding: 16px 18px 18px;
            text-align: center;
            font-weight: 800;
            font-size: 20px;
            color: var(--ink);
            background: linear-gradient(180deg, #f8fbff 0%, #ffffff 75%);
            border: 2px solid #c7ddff;
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
            z-index: 1;
        }
        .header::before,
        .header::after {
            content: "";
            position: absolute;
            width: 28px;
            height: 38px;
            border: 2px solid #c7ddff;
            border-radius: 16px 16px 9px 9px;
            top: -22px;
            background: #f8fbff;
        }
        .header::before { left: 30px; transform: rotate(-6deg); }
        .header::after { right: 30px; transform: rotate(6deg); }
        .badge {
            position: absolute;
            right: 14px;
            top: 12px;
            background: var(--blue);
            color: #fff;
            font-weight: 800;
            font-size: 10px;
            letter-spacing: 0.06em;
            padding: 4px 8px;
            border-radius: 999px;
            text-transform: uppercase;
            box-shadow: 0 8px 16px rgba(74, 163, 255, 0.35);
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin: 16px 0 12px;
            position: relative;
            z-index: 1;
        }
        .card {
            background: var(--card);
            border: 1px solid #dbeafe;
            border-radius: 16px;
            padding: 12px 14px;
            box-shadow: 0 12px 20px rgba(15, 23, 42, 0.08);
        }
        .card .label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--muted);
            font-weight: 700;
        }
        .card .value {
            margin-top: 6px;
            font-size: 16px;
            font-weight: 800;
        }
        .split {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            position: relative;
            z-index: 1;
        }
        .pill {
            background: var(--blue-veil);
            border: 1px dashed #b9d7ff;
            border-radius: 12px;
            padding: 10px 12px;
            text-align: center;
            font-weight: 800;
        }
        .total {
            background: var(--mint);
            border: 1px solid #bfe3d0;
            border-radius: 14px;
            padding: 10px 14px;
            text-align: center;
        }
        .total .value {
            font-size: 19px;
            font-weight: 900;
        }
        .info {
            border: 1px solid #cfe2ff;
            border-radius: 16px;
            margin-top: 12px;
            background: #ffffff;
            box-shadow: 0 8px 16px rgba(15, 23, 42, 0.05);
            position: relative;
            z-index: 1;
        }
        .info-title {
            background: var(--blue-soft);
            text-align: center;
            font-weight: 800;
            padding: 8px 10px;
            border-bottom: 1px dashed #b9d7ff;
        }
        .info-body {
            padding: 10px 12px;
            text-align: left;
            font-size: 12px;
            line-height: 1.4;
        }
        .info-item {
            padding: 8px 10px;
            margin: 6px 0;
            border: 1px solid #d8e9ff;
            border-radius: 12px;
            background: #f6fbff;
            box-shadow: 0 6px 12px rgba(15, 23, 42, 0.06);
        }
        .info-item-title {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-weight: 800;
            color: #0f5aa6;
            margin-bottom: 6px;
        }
        .info-item-title::before {
            content: "Articolo";
            font-size: 9px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: 999px;
            background: #dbeafe;
            color: #1d4ed8;
        }
        .info-line {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            padding: 2px 0;
        }
        .info-label {
            font-weight: 700;
            color: #334155;
        }
        .info-value {
            color: #0f172a;
        }
        .info-footer {
            margin-top: 6px;
            text-align: center;
            font-weight: 700;
            color: #0f5aa6;
        }
        .footnote {
            margin-top: 10px;
            text-align: center;
            color: #0f5aa6;
            font-size: 11px;
            font-weight: 800;
            position: relative;
            z-index: 1;
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="sheet">
            <div class="header">
                ${title}
                <span class="badge">Preventivo</span>
            </div>
            <div class="grid">
                <div class="card">
                    <div class="label">Costo Materiale</div>
                    <div class="value">EUR ${costs.materialCost.toFixed(2)}</div>
                </div>
                <div class="card">
                    <div class="label">Ore Lavoro</div>
                    <div class="value">${summary.laborHours}</div>
                </div>
                <div class="card">
                    <div class="label">Manodopera</div>
                    <div class="value">EUR ${costs.laborCost.toFixed(2)}</div>
                </div>
                <div class="card">
                    <div class="label">Totale</div>
                    <div class="value">EUR ${totalRaw.toFixed(2)}</div>
                </div>
            </div>
            <div class="split">
                <div class="pill">Totale: EUR ${totalRaw.toFixed(2)}</div>
                <div class="total">
                    <div class="label">Totale Arrotondato</div>
                    <div class="value">EUR ${totalRounded.toFixed(2)}</div>
                </div>
            </div>

            <div class="info">
                <div class="info-title">Informazioni aggiuntive</div>
                <div class="info-body">
                    ${itemDetailsHtml || ""}
                    <div class="info-footer">${packagingInfo}</div>
                </div>
            </div>
            <div class="footnote">Il totale \uFFFD arrotondato (eccesso o difetto) ad ogni 50 centesimi.</div>
        </div>
    </div>
</body>
</html>
    `.trim();
  }
  function renderOrderDetail(order) {
    currentDetailOrderId = order.id;
    detailTitle.textContent = `Dettaglio Ordine`;
    detailClient.textContent = getOrderFullName(order);
    detailEmail.textContent = order.clientEmail || "-";
    detailPhone.textContent = order.clientPhone || "-";
    detailRequestDate.textContent = formatDate(order.requestedDate || "");
    detailDeliveryDate.textContent = formatDate(order.deliveryDate || "");
    detailStatus.textContent = order.status;
    detailNotes.textContent = order.notes || "-";
    const summary = calculateOrderSummary(order);
    const costs = calculateOrderCosts(order.items, order.discountPercentage);
    const saleTotal = summary.saleTotal;
    const profitNoLabor = saleTotal - costs.materialCost;
    const profitWithLabor = saleTotal - costs.materialCost - costs.laborCost;
    detailProfitNoLabor.textContent = `EUR ${profitNoLabor.toFixed(2)}`;
    detailProfitWithLabor.textContent = `EUR ${profitWithLabor.toFixed(2)}`;
    const canChange = order.status === "pending";
    detailConfirmBtn.disabled = !canChange;
    detailRefuseBtn.disabled = !canChange;
    const missingList = computeMissingByItem(order.items);
    detailItemsBody.innerHTML = order.items.map((item, idx) => {
      const article = articles.find((a) => a.id === item.articleId);
      const colorsLabel = formatVariantColors(
        article,
        item.colorSelections || []
      );
      const variantLabel = formatVariantLabel(article, item.variantCode);
      return `
        <tr>
            <td>${getArticleCode(item.articleId)}</td>
            <td>${getArticleName(item.articleId)}</td>
            <td><span class="hover-hint" data-tooltip="${colorsLabel}">${variantLabel}</span></td>
            <td>${item.quantity}</td>
            <td>${item.packaging ? "Si" : "No"}</td>
            <td>${formatItemColors(item)}</td>
            <td>${getItemMissing(item, missingList, idx) > 0 ? `Da produrre: ${getItemMissing(item, missingList, idx)}` : "Disponibile"}</td>
            <td>EUR ${item.unitPrice.toFixed(2)}</td>
            <td>EUR ${(item.unitPrice * item.quantity).toFixed(2)}</td>
        </tr>
    `;
    }).join("");
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
          colors: Array.from({ length: article.composition.length }).map(
            () => ""
          )
        };
      }
      return item;
    });
    if (changed) {
      await window.api.saveArticleInventory(articleInventory);
    }
  }
  function nextVariantCode(article) {
    const prefix = `${article.code}-`;
    const existing = articleInventory.filter(
      (v) => v.articleId === article.id && v.variantCode?.startsWith(prefix)
    ).map((v) => parseInt(v.variantCode.replace(prefix, ""), 10)).filter((n) => !Number.isNaN(n));
    const next = existing.length ? Math.max(...existing) + 1 : 0;
    return `${article.code}-${next.toString().padStart(4, "0")}`;
  }
  async function ensureVariant(article, colors) {
    const normalized = normalizeColors(colors, article.composition.length);
    const index = buildVariantIndex();
    const key = getVariantKey(article.id, normalized);
    const existing = index.byKey.get(key);
    if (existing) return existing;
    const newVariant = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      articleId: article.id,
      variantCode: nextVariantCode(article),
      colors: normalized.map((_, idx) => colors[idx] || ""),
      quantity: 0,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    const updated = [...articleInventory, newVariant];
    const saved = await window.api.saveArticleInventory(updated);
    if (saved) {
      articleInventory = updated;
      return newVariant;
    }
    return newVariant;
  }
  function formatVariantColors(article, colors) {
    if (!article) return "-";
    const parts = article.composition.map((comp, idx) => {
      const color = colors[idx];
      if (!color) return "";
      const material = materials.find((m) => m.id === comp.materialId);
      return `${material?.name || "Materiale"}: ${color}`;
    }).filter(Boolean);
    return parts.length ? parts.join(", ") : "Nessun colore";
  }
  function formatVariantLabel(article, variantCode) {
    if (!variantCode) return "-";
    if (!article) return variantCode.replace("-", "");
    return variantCode.replace(`${article.code}-`, "").replace("-", "");
  }
  function computeRequiredMaterials(orderItems) {
    const map = /* @__PURE__ */ new Map();
    for (const item of orderItems) {
      const article = articles.find((a) => a.id === item.articleId);
      if (!article) continue;
      for (let i = 0; i < article.composition.length; i += 1) {
        const comp = article.composition[i];
        const colorName = item.colorSelections?.[i];
        const colorKey = normalizeColor(colorName);
        const key = `${comp.materialId}::${colorKey}`;
        const qty = comp.quantity * item.quantity;
        const existing = map.get(key);
        map.set(key, {
          qty: (existing?.qty || 0) + qty,
          colorName: existing?.colorName || colorName
        });
      }
    }
    return map;
  }
  function applyInventoryDelta(deltaMap) {
    const updated = [...inventory];
    for (const [key, delta] of deltaMap.entries()) {
      const [materialId, colorKey] = key.split("::");
      let row = updated.find(
        (i) => i.materialId === materialId && normalizeColor(i.colorName) === colorKey
      );
      if (!row) {
        row = {
          id: Date.now().toString(),
          materialId,
          colorName: colorKey ? delta.colorName || colorKey : void 0,
          quantity: 0,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
        updated.push(row);
      }
      if (row.quantity + delta.qty < 0) {
        return {
          ok: false,
          message: "Giacenza insufficiente per materiale/colore"
        };
      }
      row.quantity += delta.qty;
      row.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    }
    return { ok: true, updated };
  }
  function renderItems() {
    itemsBody.innerHTML = "";
    items.forEach((item, idx) => {
      const article = articles.find((a) => a.id === item.articleId);
      const colorsLabel = formatVariantColors(
        article,
        item.colorSelections || []
      );
      const variantLabel = formatVariantLabel(article, item.variantCode);
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${getArticleCode(item.articleId)} - ${getArticleName(item.articleId)}</td>
            <td><span class="hover-hint" data-tooltip="${colorsLabel}">${variantLabel}</span></td>
            <td>
                <input class="inline-input" data-field="quantity" data-index="${idx}" type="number" min="1" value="${item.quantity}" />
            </td>
            <td>
                <select class="inline-input" data-field="packaging" data-index="${idx}">
                    <option value="no" ${item.packaging ? "" : "selected"}>No</option>
                    <option value="yes" ${item.packaging ? "selected" : ""}>Si</option>
                </select>
            </td>
            <td>EUR ${item.unitPrice.toFixed(2)}</td>
            <td>EUR ${(item.unitPrice * item.quantity).toFixed(2)}</td>
            <td><button class="btn-small btn-danger" data-action="remove" data-index="${idx}">Rimuovi</button></td>
        `;
      itemsBody.appendChild(tr);
    });
  }
  function renderOrders() {
    ordersBody.innerHTML = "";
    const empty = document.getElementById("orders-empty");
    const filtered = orders.filter((order) => {
      if (order.status === "confirmed" || order.status === "processed")
        return false;
      const articleNames = order.items.map(
        (i) => `${getArticleCode(i.articleId)} ${getArticleName(i.articleId)}`
      ).join(" ");
      const fullName = getOrderFullName(order);
      const text = `${fullName} ${order.clientEmail || ""} ${articleNames}`.toLowerCase();
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
      const depA = getOrderMissingTotal(a);
      const depB = getOrderMissingTotal(b);
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
        case "deposit-asc":
          return depA - depB;
        case "deposit-desc":
          return depB - depA;
        case "date-desc":
        default:
          return dateB - dateA;
      }
    });
    filtered.forEach((order) => {
      const costs = calculateOrderCosts(
        order.items,
        order.discountPercentage
      );
      const saleTotal = getOrderSaleTotal(order);
      const totalQty = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      const codes = order.items.map((item) => {
        const article = articles.find((a) => a.id === item.articleId);
        const variantLabel = formatVariantLabel(
          article,
          item.variantCode
        );
        return `${getArticleCode(item.articleId)} ${variantLabel} x${item.quantity}`;
      }).join(", ");
      const missingTotal = getOrderMissingTotal(order);
      const depositLabel = missingTotal > 0 ? `Da produrre: ${missingTotal}` : "Disponibile";
      const tr = document.createElement("tr");
      tr.dataset.id = order.id;
      tr.innerHTML = `
            <td>${getOrderFullName(order)}</td>
            <td>${formatDate(order.requestedDate || order.createdAt)}</td>
            <td><span class="hover-hint" data-tooltip="${codes}">${totalQty}</span></td>
            <td>${depositLabel}</td>
            <td>EUR ${costs.materialCost.toFixed(2)}</td>
            <td>EUR ${costs.laborCost.toFixed(2)}</td>
            <td><strong>EUR ${saleTotal.toFixed(2)}</strong></td>
            <td><span class="pill ${order.status}">${order.status}</span></td>
            <td>
                <button class="btn-small btn-danger" data-action="delete" data-id="${order.id}">Elimina</button>
            </td>
        `;
      ordersBody.appendChild(tr);
    });
    if (empty) {
      empty.classList.toggle("hidden", filtered.length > 0);
    }
  }
  toggleBtn.addEventListener("click", () => {
    const { popup } = getPopupParams();
    if (popup) {
      window.close();
      return;
    }
    const url = "orders.html?popup=1";
    window.open(url, "_blank", "width=1200,height=800");
  });
  itemArticle.addEventListener("change", () => {
    const article = articles.find((a) => a.id === itemArticle.value);
    renderColorRows(article);
    updateItemPreview();
  });
  clientSelect.addEventListener("change", () => {
    fillClientFields(clientSelect.value);
  });
  itemPackaging.addEventListener("change", () => {
    updateItemPreview();
  });
  itemColorsBody.addEventListener("change", (e) => {
    const target = e.target;
    if (!target || target.tagName !== "SELECT") return;
    const indexStr = target.getAttribute("data-color-index");
    if (indexStr === null) return;
    const index = parseInt(indexStr, 10);
    currentColorSelections[index] = target.value;
  });
  addItemBtn.addEventListener("click", async () => {
    if (!itemArticle.value || !itemQty.value) {
      showMessage("Seleziona articolo e quantita", "error");
      return;
    }
    const article = articles.find((a) => a.id === itemArticle.value);
    if (!article) return;
    const qty = parseInt(itemQty.value, 10) || 0;
    if (qty <= 0) {
      showMessage("Quantita non valida", "error");
      return;
    }
    const pricing = calculateArticlePricing(article, itemPackaging.checked);
    const variant = await ensureVariant(article, currentColorSelections);
    items.push({
      articleId: article.id,
      quantity: qty,
      unitPrice: parseFloat(pricing.finalPrice.toFixed(2)),
      packaging: itemPackaging.checked,
      colorSelections: [...currentColorSelections],
      variantId: variant?.id,
      variantCode: variant?.variantCode
    });
    itemArticle.value = "";
    itemQty.value = "1";
    itemPackaging.checked = false;
    currentColorSelections = [];
    itemColorsBody.innerHTML = "";
    updateItemPreview();
    renderItems();
    showMessage("Articolo aggiunto!", "success");
    clearMessage();
  });
  searchInput?.addEventListener("input", () => {
    filterText = searchInput.value.trim().toLowerCase();
    renderOrders();
  });
  statusFilter?.addEventListener("change", () => {
    filterStatus = statusFilter.value;
    renderOrders();
  });
  sortSelect?.addEventListener("change", () => {
    sortMode = sortSelect.value;
    renderOrders();
  });
  itemsBody.addEventListener("click", (e) => {
    const target = e.target;
    const action = target.getAttribute("data-action");
    const indexStr = target.getAttribute("data-index");
    if (action !== "remove" || indexStr === null) return;
    const index = parseInt(indexStr, 10);
    items = items.filter((_, i) => i !== index);
    renderItems();
  });
  itemsBody.addEventListener("change", (e) => {
    const target = e.target;
    const indexStr = target.getAttribute("data-index");
    const field = target.getAttribute("data-field");
    if (indexStr === null || !field) return;
    const index = parseInt(indexStr, 10);
    const item = items[index];
    if (!item) return;
    if (field === "quantity") {
      const qty = parseInt(target.value, 10) || 1;
      item.quantity = Math.max(1, qty);
    }
    if (field === "packaging") {
      const packaging = target.value === "yes";
      item.packaging = packaging;
      const article = articles.find((a) => a.id === item.articleId);
      if (article) {
        const pricing = calculateArticlePricing(article, packaging);
        item.unitPrice = parseFloat(pricing.finalPrice.toFixed(2));
      }
    }
    renderItems();
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!clientSelect.value || items.length === 0) {
      showMessage("Completa i campi obbligatori", "error");
      return;
    }
    const costs = calculateOrderCosts(items, 0);
    let updated;
    const previousInventory = [...inventory];
    const newReq = computeRequiredMaterials(items);
    let deltaMap = /* @__PURE__ */ new Map();
    const missingList = computeMissingByItem(items);
    const missingTotal = missingList.reduce((sum, value) => sum + value, 0);
    const itemsWithDeposit = items.map((item, idx) => ({
      ...item,
      depositMissing: missingList[idx],
      depositUsed: Math.max(0, item.quantity - missingList[idx])
    }));
    if (editingId) {
      const oldOrder = orders.find((o) => o.id === editingId);
      if (oldOrder) {
        const oldReq = computeRequiredMaterials(oldOrder.items);
        for (const [key, data] of oldReq.entries()) {
          const existing = deltaMap.get(key);
          deltaMap.set(key, {
            qty: (existing?.qty || 0) + data.qty,
            colorName: existing?.colorName || data.colorName
          });
        }
        for (const [key, data] of newReq.entries()) {
          const existing = deltaMap.get(key);
          deltaMap.set(key, {
            qty: (existing?.qty || 0) - data.qty,
            colorName: existing?.colorName || data.colorName
          });
        }
      }
      updated = orders.map(
        (o) => o.id === editingId ? {
          ...o,
          clientId: clientSelect.value,
          clientFirstName: firstNameInput.value.trim(),
          clientLastName: lastNameInput.value.trim(),
          clientEmail: emailInput.value.trim(),
          clientPhone: phoneInput.value.trim(),
          requestedDate: requestDateInput.value,
          deliveryDate: deliveryDateInput.value,
          items: itemsWithDeposit,
          discountPercentage: 0,
          status: o.status,
          notes: notesInput.value.trim(),
          ...costs
        } : o
      );
    } else {
      for (const [key, data] of newReq.entries()) {
        const existing = deltaMap.get(key);
        deltaMap.set(key, {
          qty: (existing?.qty || 0) - data.qty,
          colorName: existing?.colorName || data.colorName
        });
      }
      const newOrder = {
        id: nextOrderId(),
        clientId: clientSelect.value,
        clientFirstName: firstNameInput.value.trim(),
        clientLastName: lastNameInput.value.trim(),
        clientEmail: emailInput.value.trim(),
        clientPhone: phoneInput.value.trim(),
        requestedDate: requestDateInput.value,
        deliveryDate: deliveryDateInput.value,
        items: itemsWithDeposit,
        materialCost: costs.materialCost,
        laborCost: costs.laborCost,
        finalAmount: costs.finalAmount,
        discountPercentage: 0,
        status: "pending",
        notes: notesInput.value.trim(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      updated = [...orders, newOrder];
    }
    if (deltaMap.size > 0) {
      const invResult = applyInventoryDelta(deltaMap);
      if (!invResult.ok) {
        showMessage(invResult.message || "Errore giacenza", "error");
        return;
      }
      const invSaved = await window.api.saveInventory(
        invResult.updated
      );
      if (!invSaved) {
        showMessage("Errore salvataggio magazzino", "error");
        return;
      }
      inventory = invResult.updated;
    }
    const success = await window.api.saveOrders(updated);
    if (success) {
      orders = updated;
      renderOrders();
      const { popup } = getPopupParams();
      if (popup) {
        window.close();
        return;
      }
      setFormVisible(false);
      resetForm();
      if (missingTotal > 0) {
        showMessage(
          `Ordine salvato. Da produrre: ${missingTotal}`,
          "success"
        );
      } else {
        showMessage("Ordine salvato!", "success");
      }
      clearMessage();
    } else {
      await window.api.saveInventory(previousInventory);
      inventory = previousInventory;
      showMessage("Errore salvataggio ordine", "error");
    }
  });
  ordersBody.addEventListener("click", async (e) => {
    const target = e.target;
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (action && id) {
      const order2 = orders.find((o) => o.id === id);
      if (!order2) return;
      if (action === "delete") {
        if (!window.confirm("Eliminare questo ordine?")) return;
        const previousInventory = [...inventory];
        const oldReq = computeRequiredMaterials(order2.items);
        const deltaMap = /* @__PURE__ */ new Map();
        for (const [key, data] of oldReq.entries()) {
          const existing2 = deltaMap.get(key);
          deltaMap.set(key, {
            qty: (existing2?.qty || 0) + data.qty,
            colorName: existing2?.colorName || data.colorName
          });
        }
        if (deltaMap.size > 0) {
          const invResult = applyInventoryDelta(deltaMap);
          if (!invResult.ok) {
            showMessage(
              invResult.message || "Errore giacenza",
              "error"
            );
            return;
          }
          const invSaved = await window.api.saveInventory(
            invResult.updated
          );
          if (!invSaved) {
            showMessage("Errore salvataggio magazzino", "error");
            return;
          }
          inventory = invResult.updated;
        }
        const updated = orders.filter((o) => o.id !== id);
        const success = await window.api.saveOrders(updated);
        if (success) {
          orders = updated;
          renderOrders();
          showMessage("Ordine eliminato!", "success");
          clearMessage();
        } else {
          await window.api.saveInventory(previousInventory);
          inventory = previousInventory;
          showMessage("Errore eliminazione ordine", "error");
        }
      }
      return;
    }
    const row = target.closest("tr");
    const rowId = row?.dataset.id;
    if (!rowId) return;
    const order = orders.find((o) => o.id === rowId);
    if (!order) return;
    const existing = openOrderWindows.get(order.id);
    if (existing && !existing.closed) {
      existing.focus();
      return;
    }
    const url = `orders.html?popup=1&view=detail&id=${order.id}`;
    const win = window.open(
      url,
      `order-detail-${order.id}`,
      "width=1200,height=800"
    );
    if (win) {
      openOrderWindows.set(order.id, win);
      win.addEventListener("beforeunload", () => {
        openOrderWindows.delete(order.id);
      });
    }
  });
  var params = getPopupParams();
  if (params.popup) {
    document.body.classList.add("popup");
    if (params.view === "detail") {
      document.body.classList.add("popup-detail");
      showOnly("detail");
    } else {
      document.body.classList.add("popup-form");
      showOnly("form");
      setFormVisible(true);
      if (!params.id) {
        resetForm();
      }
    }
  } else {
    showOnly("list");
  }
  detailCloseBtn.addEventListener("click", () => {
    window.close();
  });
  detailEditBtn.addEventListener("click", () => {
    const id = currentDetailOrderId || getPopupParams().id;
    if (!id) return;
    const order = orders.find((o) => o.id === id);
    if (order) {
      document.body.classList.remove("popup-detail");
      document.body.classList.add("popup-form");
      showOnly("form");
      setFormVisible(true);
      populateFormFromOrder(order);
      return;
    }
    loadOrderById(id).then((found) => {
      if (found) {
        document.body.classList.remove("popup-detail");
        document.body.classList.add("popup-form");
        showOnly("form");
        setFormVisible(true);
        populateFormFromOrder(found);
      } else {
        showMessage(`Ordine non trovato (id: ${id})`, "error");
      }
    });
  });
  async function updateOrderStatus(orderId, status) {
    const updated = orders.map(
      (o) => o.id === orderId ? { ...o, status } : o
    );
    const success = await window.api.saveOrders(updated);
    if (success) {
      orders = updated;
      return true;
    }
    return false;
  }
  detailConfirmBtn.addEventListener("click", async () => {
    const { id } = getPopupParams();
    if (!id) return;
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const missingTotal = getOrderMissingTotal(order);
    if (missingTotal > 0) {
      showMessage(
        `Attenzione: deposito insufficiente. Da produrre: ${missingTotal}`,
        "error"
      );
      clearMessage(3e3);
    }
    const ok = await updateOrderStatus(id, "confirmed");
    if (ok) {
      showMessage("Ordine confermato e spostato in produzione", "success");
      clearMessage();
      window.close();
    } else {
      showMessage("Errore aggiornamento ordine", "error");
    }
  });
  detailRefuseBtn.addEventListener("click", async () => {
    const { id } = getPopupParams();
    if (!id) return;
    const ok = await updateOrderStatus(id, "refused");
    if (ok) {
      showMessage("Ordine rifiutato", "success");
      clearMessage();
      window.close();
    } else {
      showMessage("Errore aggiornamento ordine", "error");
    }
  });
  detailPdfBtn.addEventListener("click", async () => {
    const { id } = getPopupParams();
    if (!id) return;
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    pdfFilenameInput.value = `preventivo-${order.id}.pdf`;
    pdfModal.classList.remove("hidden");
  });
  function closePdfModal() {
    pdfModal.classList.add("hidden");
  }
  pdfCancelBtn.addEventListener("click", () => closePdfModal());
  pdfBackdrop.addEventListener("click", () => closePdfModal());
  pdfConfirmBtn.addEventListener("click", async () => {
    const { id } = getPopupParams();
    if (!id) return;
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    if (!window.api?.exportOrderPdf) {
      showMessage("Export PDF non disponibile", "error");
      return;
    }
    const html = buildOrderPdfHtml(order);
    const filename = pdfFilenameInput.value.trim() || `preventivo-${order.id}.pdf`;
    try {
      showMessage("Esportazione PDF in corso...", "success");
      const result = await window.api.exportOrderPdf({
        html,
        filename,
        skipDialog: true
      });
      if (result?.ok) {
        showMessage(
          `PDF esportato: ${result.filePath || filename}`,
          "success"
        );
        clearMessage();
        closePdfModal();
      } else {
        showMessage(result?.message || "Errore esportazione PDF", "error");
      }
    } catch {
      showMessage("Errore esportazione PDF", "error");
    }
  });
  loadData();
  var retryParams = getPopupParams();
  if (retryParams.popup && retryParams.id) {
    setTimeout(() => {
      const order = orders.find((o) => o.id === retryParams.id);
      if (order && document.body.classList.contains("popup-form")) {
        populateFormFromOrder(order);
      }
    }, 200);
  }
})();
//# sourceMappingURL=orders.js.map
