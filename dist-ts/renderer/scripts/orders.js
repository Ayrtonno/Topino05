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

  // src/renderer/scripts/orders.ts
  var orders = [];
  var articles = [];
  var materials = [];
  var inventory = [];
  var laborConfig = { hourlyRate: 4 };
  var editingId = null;
  var items = [];
  var detailsOpenId = null;
  var filterText = "";
  var filterStatus = "";
  var form = qs("#order-form");
  var toggleBtn = qs("#toggle-form");
  var ordersBody = qs("#orders-body");
  var itemsBody = qs("#items-body");
  var searchInput = qs("#search-orders");
  var statusFilter = qs("#filter-status");
  var clientInput = qs("#order-client");
  var emailInput = qs("#order-email");
  var discountInput = qs("#order-discount");
  var statusSelect = qs("#order-status");
  var notesInput = qs("#order-notes");
  var submitBtn = qs("#submit-order");
  var itemArticle = qs("#item-article");
  var itemQty = qs("#item-qty");
  var addItemBtn = qs("#add-item");
  function setFormVisible(visible) {
    form.classList.toggle("hidden", !visible);
    toggleBtn.textContent = visible ? "Annulla" : "+ Nuovo Ordine";
  }
  function resetForm() {
    clientInput.value = "";
    emailInput.value = "";
    discountInput.value = "0";
    statusSelect.value = "draft";
    notesInput.value = "";
    itemArticle.value = "";
    itemQty.value = "1";
    items = [];
    editingId = null;
    submitBtn.textContent = "Crea Ordine";
    renderItems();
  }
  async function loadData() {
    try {
      orders = await window.api.getOrders();
      articles = await window.api.getArticles();
      materials = await window.api.getMaterials();
      inventory = await window.api.getInventory();
      laborConfig = await window.api.getLaborConfig();
      renderArticleOptions();
      renderOrders();
    } catch {
      showMessage("Errore nel caricamento dei dati", "error");
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
  function getArticleName(id) {
    return articles.find((a) => a.id === id)?.name || "-";
  }
  function getArticleCode(id) {
    return articles.find((a) => a.id === id)?.code || "-";
  }
  function calculateArticlePrice(article) {
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
    const finalPrice = materialSell + laborSell;
    return parseFloat(finalPrice.toFixed(2));
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
  function normalizeColor(value) {
    return (value || "").trim().toLowerCase();
  }
  function computeRequiredMaterials(orderItems) {
    const map = /* @__PURE__ */ new Map();
    for (const item of orderItems) {
      const article = articles.find((a) => a.id === item.articleId);
      if (!article) continue;
      for (const comp of article.composition) {
        const key = `${comp.materialId}::${normalizeColor(comp.colorName)}`;
        const qty = comp.quantity * item.quantity;
        map.set(key, (map.get(key) || 0) + qty);
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
          colorName: colorKey ? colorKey : void 0,
          quantity: 0,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
        updated.push(row);
      }
      if (row.quantity + delta < 0) {
        return { ok: false, message: "Giacenza insufficiente per materiale/colore" };
      }
      row.quantity += delta;
      row.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    }
    return { ok: true, updated };
  }
  function renderItems() {
    itemsBody.innerHTML = "";
    items.forEach((item, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${getArticleCode(item.articleId)} - ${getArticleName(item.articleId)}</td>
            <td>${item.quantity}</td>
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
    const statTotalOrders = document.getElementById("stat-total-orders");
    const statTotalRevenue = document.getElementById("stat-total-revenue");
    const statTotalCosts = document.getElementById("stat-total-costs");
    const statTotalProfit = document.getElementById("stat-total-profit");
    const totalRevenue = orders.reduce((sum, o) => sum + o.finalAmount, 0);
    const totalCosts = orders.reduce((sum, o) => sum + o.materialCost + o.laborCost, 0);
    const totalProfit = totalRevenue - totalCosts;
    if (statTotalOrders) statTotalOrders.textContent = orders.length.toString();
    if (statTotalRevenue) statTotalRevenue.textContent = `EUR ${totalRevenue.toFixed(2)}`;
    if (statTotalCosts) statTotalCosts.textContent = `EUR ${totalCosts.toFixed(2)}`;
    if (statTotalProfit) statTotalProfit.textContent = `EUR ${totalProfit.toFixed(2)}`;
    const filtered = orders.filter((order) => {
      const articleNames = order.items.map((i) => `${getArticleCode(i.articleId)} ${getArticleName(i.articleId)}`).join(" ");
      const text = `${order.clientName} ${order.clientEmail || ""} ${articleNames}`.toLowerCase();
      const matchesText = text.includes(filterText);
      const matchesStatus = !filterStatus || order.status === filterStatus;
      return matchesText && matchesStatus;
    });
    filtered.forEach((order) => {
      const costs = calculateOrderCosts(order.items, order.discountPercentage);
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${order.clientName}</td>
            <td>${formatDate(order.createdAt)}</td>
            <td>${order.items.length}</td>
            <td>EUR ${costs.materialCost.toFixed(2)}</td>
            <td>EUR ${costs.laborCost.toFixed(2)}</td>
            <td><strong>EUR ${costs.finalAmount.toFixed(2)}</strong></td>
            <td><span class="pill ${order.status}">${order.status}</span></td>
            <td>
                <button class="btn-small" data-action="details" data-id="${order.id}">Dettagli</button>
                <button class="btn-small" data-action="edit" data-id="${order.id}">Modifica</button>
                <button class="btn-small btn-danger" data-action="delete" data-id="${order.id}">Elimina</button>
            </td>
        `;
      ordersBody.appendChild(tr);
      if (detailsOpenId === order.id) {
        const detailTr = document.createElement("tr");
        detailTr.innerHTML = `
                <td colspan="8">
                    <div style="padding: 10px 0;">
                        <p><strong>Email:</strong> ${order.clientEmail || "N/A"}</p>
                        <p><strong>Sconto:</strong> ${order.discountPercentage}%</p>
                        ${order.notes ? `<p><strong>Note:</strong> ${order.notes}</p>` : ""}
                        <details open>
                            <summary style="cursor:pointer; font-weight:700;">Articoli Dettagliati</summary>
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Codice</th>
                                            <th>Articolo</th>
                                            <th>Qty</th>
                                            <th>Prezzo Unit.</th>
                                            <th>Totale</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${order.items.map((item) => `
                                            <tr>
                                                <td>${getArticleCode(item.articleId)}</td>
                                                <td>${getArticleName(item.articleId)}</td>
                                                <td>${item.quantity}</td>
                                                <td>EUR ${item.unitPrice.toFixed(2)}</td>
                                                <td>EUR ${(item.unitPrice * item.quantity).toFixed(2)}</td>
                                            </tr>
                                        `).join("")}
                                    </tbody>
                                </table>
                            </div>
                        </details>
                    </div>
                </td>
            `;
        ordersBody.appendChild(detailTr);
      }
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
  addItemBtn.addEventListener("click", () => {
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
    items.push({
      articleId: article.id,
      quantity: qty,
      unitPrice: calculateArticlePrice(article)
    });
    itemArticle.value = "";
    itemQty.value = "1";
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
  itemsBody.addEventListener("click", (e) => {
    const target = e.target;
    const action = target.getAttribute("data-action");
    const indexStr = target.getAttribute("data-index");
    if (action !== "remove" || indexStr === null) return;
    const index = parseInt(indexStr, 10);
    items = items.filter((_, i) => i !== index);
    renderItems();
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!clientInput.value || items.length === 0) {
      showMessage("Completa i campi obbligatori", "error");
      return;
    }
    const costs = calculateOrderCosts(items, parseFloat(discountInput.value) || 0);
    let updated;
    const previousInventory = [...inventory];
    const newReq = computeRequiredMaterials(items);
    let deltaMap = /* @__PURE__ */ new Map();
    if (editingId) {
      const oldOrder = orders.find((o) => o.id === editingId);
      if (oldOrder) {
        const oldReq = computeRequiredMaterials(oldOrder.items);
        for (const [key, qty] of oldReq.entries()) {
          deltaMap.set(key, (deltaMap.get(key) || 0) + qty);
        }
        for (const [key, qty] of newReq.entries()) {
          deltaMap.set(key, (deltaMap.get(key) || 0) - qty);
        }
      }
      updated = orders.map(
        (o) => o.id === editingId ? {
          ...o,
          clientName: clientInput.value.trim(),
          clientEmail: emailInput.value.trim(),
          items,
          discountPercentage: parseFloat(discountInput.value) || 0,
          status: statusSelect.value,
          notes: notesInput.value.trim(),
          ...costs
        } : o
      );
    } else {
      for (const [key, qty] of newReq.entries()) {
        deltaMap.set(key, (deltaMap.get(key) || 0) - qty);
      }
      const newOrder = {
        id: Date.now().toString(),
        clientName: clientInput.value.trim(),
        clientEmail: emailInput.value.trim(),
        items,
        materialCost: costs.materialCost,
        laborCost: costs.laborCost,
        finalAmount: costs.finalAmount,
        discountPercentage: parseFloat(discountInput.value) || 0,
        status: statusSelect.value,
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
      const invSaved = await window.api.saveInventory(invResult.updated);
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
      setFormVisible(false);
      resetForm();
      showMessage("Ordine salvato!", "success");
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
    if (!action || !id) return;
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    if (action === "details") {
      detailsOpenId = detailsOpenId === id ? null : id;
      renderOrders();
    }
    if (action === "edit") {
      editingId = id;
      clientInput.value = order.clientName;
      emailInput.value = order.clientEmail || "";
      discountInput.value = order.discountPercentage.toString();
      statusSelect.value = order.status;
      notesInput.value = order.notes || "";
      items = [...order.items];
      submitBtn.textContent = "Salva Modifiche";
      setFormVisible(true);
      renderItems();
    }
    if (action === "delete") {
      if (!window.confirm("Eliminare questo ordine?")) return;
      const previousInventory = [...inventory];
      const oldReq = computeRequiredMaterials(order.items);
      const deltaMap = /* @__PURE__ */ new Map();
      for (const [key, qty] of oldReq.entries()) {
        deltaMap.set(key, (deltaMap.get(key) || 0) + qty);
      }
      if (deltaMap.size > 0) {
        const invResult = applyInventoryDelta(deltaMap);
        if (!invResult.ok) {
          showMessage(invResult.message || "Errore giacenza", "error");
          return;
        }
        const invSaved = await window.api.saveInventory(invResult.updated);
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
  });
  loadData();
})();
//# sourceMappingURL=orders.js.map
