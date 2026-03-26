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

  // src/renderer/scripts/dashboard.ts
  var orders = [];
  var clients = [];
  var articles = [];
  var laborConfig = { hourlyRate: 0 };
  var filterRange = qs("#filter-range");
  var filterFrom = qs("#filter-from");
  var filterTo = qs("#filter-to");
  var filterClient = qs("#filter-client");
  var filterView = qs("#filter-view");
  var kpiOrders = qs("#kpi-orders");
  var kpiRevenue = qs("#kpi-revenue");
  var kpiMaterialCost = qs("#kpi-material-cost");
  var kpiLaborHours = qs("#kpi-labor-hours");
  var kpiProfit = qs("#kpi-profit");
  var kpiNetProfit = qs("#kpi-net-profit");
  var chartRevenue = qs("#chart-revenue");
  var chartOrders = qs("#chart-orders");
  var chartTooltip = qs("#chart-tooltip");
  var metricAvgOrder = qs("#metric-avg-order");
  var metricBestMonth = qs("#metric-best-month");
  var metricTopClient = qs("#metric-top-client");
  var metricTopArticle = qs("#metric-top-article");
  var tableTopClients = qs("#table-top-clients");
  var tableTopArticles = qs("#table-top-articles");
  var monthLabels = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  var getOrderDate = (order) => new Date(order.requestedDate || order.createdAt);
  var getOrderRevenue = (order) => order.status === "processed" && typeof order.paymentReceived === "number" ? order.paymentReceived : order.finalAmount;
  var getOrderProfit = (order) => getOrderRevenue(order) - order.materialCost;
  var getOrderNetProfit = (order) => getOrderRevenue(order) - order.materialCost - order.laborCost;
  var getOrderLaborHours = (order) => laborConfig.hourlyRate > 0 ? order.laborCost / laborConfig.hourlyRate : 0;
  function buildFilters() {
    filterClient.innerHTML = `<option value="">Tutti</option>${clients.map((c) => `<option value="${c.id}">${c.firstName} ${c.lastName}</option>`).join("")}`;
    const today = /* @__PURE__ */ new Date();
    filterTo.value = today.toISOString().slice(0, 10);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    filterFrom.value = monthAgo.toISOString().slice(0, 10);
    updateRangeInputs();
  }
  function updateRangeInputs() {
    const isCustom = filterRange.value === "custom";
    filterFrom.disabled = !isCustom;
    filterTo.disabled = !isCustom;
    filterFrom.style.opacity = isCustom ? "1" : "0.6";
    filterTo.style.opacity = isCustom ? "1" : "0.6";
  }
  function resolveRange() {
    const today = /* @__PURE__ */ new Date();
    if (filterRange.value === "custom") {
      return {
        from: new Date(filterFrom.value || today.toISOString().slice(0, 10)),
        to: new Date(filterTo.value || today.toISOString().slice(0, 10))
      };
    }
    const months = parseInt(filterRange.value, 10);
    const from = new Date(today);
    from.setMonth(from.getMonth() - (months - 1));
    from.setDate(1);
    const to = new Date(today);
    return { from, to };
  }
  function matchClient(order, clientId) {
    if (!clientId) return true;
    if (order.clientId) return order.clientId === clientId;
    return false;
  }
  function getFilteredOrders() {
    const { from, to } = resolveRange();
    const clientId = filterClient.value;
    const view = filterView.value;
    return orders.filter((o) => {
      const d = getOrderDate(o);
      if (d < from || d > to) return false;
      if (!matchClient(o, clientId)) return false;
      if (view === "current") {
        if (o.status !== "processed") return false;
      } else if (view === "forecast") {
        if (o.status === "refused") return false;
      }
      return true;
    });
  }
  function buildMonthBuckets(from, to) {
    const buckets = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= end) {
      const label = `${monthLabels[cursor.getMonth()]} ${cursor.getFullYear()}`;
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      buckets.push({ label, key, date: new Date(cursor) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }
  function computeMonthlySeries(data, from, to) {
    const buckets = buildMonthBuckets(from, to);
    const revenue = buckets.map(() => 0);
    const costMat = buckets.map(() => 0);
    const laborVal = buckets.map(() => 0);
    const extra = buckets.map(() => 0);
    const ricavoMateria = buckets.map(() => 0);
    const ordersCount = buckets.map(() => 0);
    data.forEach((o) => {
      const d = getOrderDate(o);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const idx = buckets.findIndex((b) => b.key === key);
      if (idx === -1) return;
      const revenueValue = getOrderRevenue(o);
      const packagingExtra = o.items.reduce((sum, it) => sum + (it.packaging ? 0.5 * it.quantity : 0), 0);
      const base = revenueValue - o.materialCost - o.laborCost;
      const extraValue = Math.max(0, Math.min(packagingExtra, Math.max(0, base)));
      const ricavoValue = Math.max(0, base - extraValue);
      revenue[idx] += revenueValue;
      costMat[idx] += o.materialCost;
      laborVal[idx] += o.laborCost;
      extra[idx] += extraValue;
      ricavoMateria[idx] += ricavoValue;
      ordersCount[idx] += 1;
    });
    return { buckets, revenue, costMat, laborVal, extra, ricavoMateria, ordersCount };
  }
  function drawStackedBar(svg, labels, stacks) {
    const width = 700;
    const height = 320;
    const padding = 36;
    const maxValue = Math.max(1, ...labels.map((_, i) => stacks.reduce((sum, s) => sum + s.data[i], 0)));
    const barWidth = (width - padding * 2) / labels.length;
    const grid = Array.from({ length: 4 }).map((_, i) => {
      const y = padding + i / 3 * (height - padding * 2);
      const value = Math.round(maxValue - i / 3 * maxValue);
      return `
            <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>
            <text x="${padding - 6}" y="${y + 4}" font-size="10" fill="#94a3b8" text-anchor="end">${value}</text>
        `;
    });
    const bars = labels.map((_, i) => {
      let yOffset = height - padding;
      return stacks.map((s) => {
        const value = s.data[i];
        const h = value / maxValue * (height - padding * 2);
        const y = yOffset - h;
        yOffset = y;
        return `<rect x="${padding + i * barWidth + 6}" y="${y}" width="${barWidth - 12}" height="${h}" fill="${s.color}" rx="4" data-label="${labels[i]}" data-series="${s.name}" data-value="${value}" data-kind="currency" />`;
      }).join("");
    }).join("");
    const xLabels = labels.map((l, i) => {
      const x = padding + i * barWidth + barWidth / 2;
      return `<text x="${x}" y="${height - 8}" font-size="10" fill="#64748b" text-anchor="middle">${l}</text>`;
    }).join("");
    svg.innerHTML = `
        <rect width="${width}" height="${height}" fill="transparent" pointer-events="none"></rect>
        ${grid.join("")}
        ${bars}
        ${xLabels}
    `;
  }
  function drawBarChart(svg, labels, data) {
    const width = 360;
    const height = 320;
    const padding = 36;
    const maxValue = Math.max(1, ...data);
    const barWidth = (width - padding * 2) / data.length;
    const grid = Array.from({ length: 4 }).map((_, i) => {
      const y = padding + i / 3 * (height - padding * 2);
      const value = Math.round(maxValue - i / 3 * maxValue);
      return `
            <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>
            <text x="${padding - 6}" y="${y + 4}" font-size="10" fill="#94a3b8" text-anchor="end">${value}</text>
        `;
    });
    const bars = data.map((v, i) => {
      const x = padding + i * barWidth;
      const h = v / maxValue * (height - padding * 2);
      const y = height - padding - h;
      return `<rect x="${x + 6}" y="${y}" width="${barWidth - 12}" height="${h}" fill="#2563eb" rx="4" data-label="${labels[i]}" data-series="Ordini" data-value="${v}" data-kind="count" />`;
    }).join("");
    const xLabels = labels.map((l, i) => {
      const x = padding + i * barWidth + barWidth / 2;
      return `<text x="${x}" y="${height - 8}" font-size="10" fill="#64748b" text-anchor="middle">${l}</text>`;
    }).join("");
    svg.innerHTML = `
        <rect width="${width}" height="${height}" fill="transparent" pointer-events="none"></rect>
        ${grid.join("")}
        ${bars}
        ${xLabels}
    `;
  }
  function showChartTooltip(text, event) {
    chartTooltip.textContent = text;
    chartTooltip.style.left = `${event.clientX + 12}px`;
    chartTooltip.style.top = `${event.clientY + 12}px`;
    chartTooltip.classList.remove("hidden");
  }
  function hideChartTooltip() {
    chartTooltip.classList.add("hidden");
  }
  function formatChartValue(value, kind) {
    if (kind === "count") {
      return value.toFixed(0);
    }
    return `EUR ${value.toFixed(2)}`;
  }
  function attachChartTooltip(svg) {
    svg.addEventListener("mousemove", (event) => {
      const target = event.target;
      if (!target || target.tagName !== "rect") {
        hideChartTooltip();
        return;
      }
      const label = target.getAttribute("data-label");
      const series = target.getAttribute("data-series");
      const value = target.getAttribute("data-value");
      if (!label || !value) {
        hideChartTooltip();
        return;
      }
      const kind = target.getAttribute("data-kind") || "currency";
      const formatted = formatChartValue(parseFloat(value), kind);
      const text = series ? `${label} \xB7 ${series}: ${formatted}` : `${label}: ${formatted}`;
      showChartTooltip(text, event);
    });
    svg.addEventListener("mouseleave", hideChartTooltip);
  }
  function renderTables(filtered) {
    const clientMap = /* @__PURE__ */ new Map();
    const articleMap = /* @__PURE__ */ new Map();
    filtered.forEach((o) => {
      const revenue = getOrderRevenue(o);
      const profit = getOrderProfit(o);
      const clientName = o.clientId ? `${clients.find((c) => c.id === o.clientId)?.firstName || ""} ${clients.find((c) => c.id === o.clientId)?.lastName || ""}`.trim() : `${o.clientFirstName || ""} ${o.clientLastName || ""}`.trim() || "Cliente";
      const entry = clientMap.get(clientName) || { name: clientName, orders: 0, revenue: 0, profit: 0 };
      entry.orders += 1;
      entry.revenue += revenue;
      entry.profit += profit;
      clientMap.set(clientName, entry);
      o.items.forEach((it) => {
        const article = articles.find((a) => a.id === it.articleId);
        const name = article ? `${article.code} - ${article.name}` : it.articleId;
        const itemRevenue = it.unitPrice * it.quantity;
        const articleEntry = articleMap.get(name) || { name, qty: 0, revenue: 0 };
        articleEntry.qty += it.quantity;
        articleEntry.revenue += itemRevenue;
        articleMap.set(name, articleEntry);
      });
    });
    const topClients = Array.from(clientMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    tableTopClients.innerHTML = topClients.map(
      (c) => `
        <tr>
            <td>${c.name}</td>
            <td>${c.orders}</td>
            <td>EUR ${c.revenue.toFixed(2)}</td>
            <td>EUR ${c.profit.toFixed(2)}</td>
        </tr>`
    ).join("");
    const topArticles = Array.from(articleMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    tableTopArticles.innerHTML = topArticles.map(
      (a) => `
        <tr>
            <td>${a.name}</td>
            <td>${a.qty}</td>
            <td>EUR ${a.revenue.toFixed(2)}</td>
            <td>-</td>
        </tr>`
    ).join("");
  }
  function render() {
    const filtered = getFilteredOrders();
    const revenue = filtered.reduce((sum, o) => sum + getOrderRevenue(o), 0);
    const materialCost = filtered.reduce((sum, o) => sum + o.materialCost, 0);
    const laborHours = filtered.reduce((sum, o) => sum + getOrderLaborHours(o), 0);
    const profit = filtered.reduce((sum, o) => sum + getOrderProfit(o), 0);
    const netProfit = filtered.reduce((sum, o) => sum + getOrderNetProfit(o), 0);
    kpiOrders.textContent = filtered.length.toString();
    kpiRevenue.textContent = `EUR ${revenue.toFixed(2)}`;
    kpiMaterialCost.textContent = `EUR ${materialCost.toFixed(2)}`;
    kpiLaborHours.textContent = `${laborHours.toFixed(1)}h`;
    kpiProfit.textContent = `EUR ${profit.toFixed(2)}`;
    kpiNetProfit.textContent = `EUR ${netProfit.toFixed(2)}`;
    const { from, to } = resolveRange();
    const series = computeMonthlySeries(
      orders.filter((o) => {
        const d = getOrderDate(o);
        if (d < from || d > to) return false;
        if (!matchClient(o, filterClient.value)) return false;
        if (filterView.value === "current") return o.status === "processed";
        if (filterView.value === "forecast") return o.status !== "refused";
        return true;
      }),
      from,
      to
    );
    drawStackedBar(chartRevenue, series.buckets.map((b) => b.label), [
      { name: "Costo Materia", color: "#f59e0b", data: series.costMat },
      { name: "Ricavo Materia", color: "#8b5cf6", data: series.ricavoMateria },
      { name: "Valore Lavoro", color: "#3b82f6", data: series.laborVal },
      { name: "Extra", color: "#10b981", data: series.extra }
    ]);
    drawBarChart(chartOrders, series.buckets.map((b) => b.label), series.ordersCount);
    const avgOrder = filtered.length ? revenue / filtered.length : 0;
    metricAvgOrder.textContent = `EUR ${avgOrder.toFixed(2)}`;
    const bestMonthIndex = series.buckets.reduce((best, b, i) => series.revenue[i] > (series.revenue[best] || 0) ? i : best, 0);
    metricBestMonth.textContent = series.buckets.length ? series.buckets[bestMonthIndex].label : "-";
    const clientTotals = /* @__PURE__ */ new Map();
    filtered.forEach((o) => {
      const name = o.clientId ? `${clients.find((c) => c.id === o.clientId)?.firstName || ""} ${clients.find((c) => c.id === o.clientId)?.lastName || ""}`.trim() : `${o.clientFirstName || ""} ${o.clientLastName || ""}`.trim();
      if (!name) return;
      clientTotals.set(name, (clientTotals.get(name) || 0) + getOrderRevenue(o));
    });
    const topClient = Array.from(clientTotals.entries()).sort((a, b) => b[1] - a[1])[0];
    metricTopClient.textContent = topClient ? topClient[0] : "-";
    const articleTotals = /* @__PURE__ */ new Map();
    filtered.forEach((o) => {
      o.items.forEach((it) => {
        const article = articles.find((a) => a.id === it.articleId);
        const name = article ? `${article.code} - ${article.name}` : it.articleId;
        articleTotals.set(name, (articleTotals.get(name) || 0) + it.unitPrice * it.quantity);
      });
    });
    const topArticle = Array.from(articleTotals.entries()).sort((a, b) => b[1] - a[1])[0];
    metricTopArticle.textContent = topArticle ? topArticle[0] : "-";
    renderTables(filtered);
  }
  async function loadData() {
    try {
      orders = await window.api.getOrders();
      clients = await window.api.getClients();
      articles = await window.api.getArticles();
      laborConfig = await window.api.getLaborConfig();
      buildFilters();
      render();
      attachChartTooltip(chartRevenue);
      attachChartTooltip(chartOrders);
    } catch {
      showMessage("Errore nel caricamento dei dati", "error");
    }
  }
  filterRange.addEventListener("change", () => {
    updateRangeInputs();
    render();
  });
  filterFrom.addEventListener("change", () => {
    filterRange.value = "custom";
    render();
  });
  filterTo.addEventListener("change", () => {
    filterRange.value = "custom";
    render();
  });
  filterClient.addEventListener("change", render);
  filterView.addEventListener("change", render);
  loadData();
})();
//# sourceMappingURL=dashboard.js.map
