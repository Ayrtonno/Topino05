import { qs, showMessage, formatCurrency } from "./shared";

type OrderItem = {
    articleId: string;
    quantity: number;
    unitPrice: number;
    packaging?: boolean;
};

type Order = {
    id: string;
    clientId?: string;
    clientFirstName?: string;
    clientLastName?: string;
    status: "pending" | "refused" | "confirmed" | "processed";
    items: OrderItem[];
    materialCost: number;
    laborCost: number;
    finalAmount: number;
    discountPercentage: number;
    createdAt: string;
    requestedDate?: string;
    processedDate?: string;
    paymentReceived?: number;
};

type Client = {
    id: string;
    firstName: string;
    lastName: string;
};

type Article = {
    id: string;
    code: string;
    name: string;
    composition: {
        materialId: string;
        quantity: number;
    }[];
    laborHoursRequired: number;
    materialMarkupPct: number;
    laborMarkupPct: number;
};

type Material = {
    id: string;
    costPerUnit: number;
    sellingPricePerUnit: number;
};

type InventoryItem = {
    materialId: string;
    quantity: number;
};

type ArticleInventoryItem = {
    articleId: string;
    quantity: number;
};

type LaborConfig = {
    hourlyRate: number;
};

type IncomeMovement = {
    amount: number;
    receivedDate: string;
};

type EconomicMovement = {
    date: string;
    type: "expense" | "income";
    amount: number;
};

let orders: Order[] = [];
let clients: Client[] = [];
let articles: Article[] = [];
let materials: Material[] = [];
let inventory: InventoryItem[] = [];
let articleInventory: ArticleInventoryItem[] = [];
let laborConfig: LaborConfig = { hourlyRate: 0 };
let incomeMovements: IncomeMovement[] = [];
let economicMovements: EconomicMovement[] = [];

const filterRange = qs<HTMLSelectElement>("#filter-range");
const filterFrom = qs<HTMLInputElement>("#filter-from");
const filterTo = qs<HTMLInputElement>("#filter-to");
const filterClient = qs<HTMLSelectElement>("#filter-client");
const filterView = qs<HTMLSelectElement>("#filter-view");

const kpiOrders = qs<HTMLDivElement>("#kpi-orders");
const kpiRevenue = qs<HTMLDivElement>("#kpi-revenue");
const kpiMaterialCost = qs<HTMLDivElement>("#kpi-material-cost");
const kpiLaborHours = qs<HTMLDivElement>("#kpi-labor-hours");
const kpiProfit = qs<HTMLDivElement>("#kpi-profit");
const kpiNetProfit = qs<HTMLDivElement>("#kpi-net-profit");
const kpiStockMaterialCost = qs<HTMLDivElement>("#kpi-stock-material-cost");
const kpiFinishedStockValue = qs<HTMLDivElement>("#kpi-finished-stock-value");

const chartRevenue = qs<SVGSVGElement>("#chart-revenue");
const chartOrders = qs<SVGSVGElement>("#chart-orders");
const chartMaterialUsage = qs<SVGSVGElement>("#chart-material-usage");
const chartRevenueNet = qs<SVGSVGElement>("#chart-revenue-net");
const chartTooltip = qs<HTMLDivElement>("#chart-tooltip");

const metricAvgOrder = qs<HTMLDivElement>("#metric-avg-order");
const metricBestMonth = qs<HTMLDivElement>("#metric-best-month");
const metricTopClient = qs<HTMLDivElement>("#metric-top-client");
const metricTopArticle = qs<HTMLDivElement>("#metric-top-article");

const tableTopClients = qs<HTMLTableSectionElement>("#table-top-clients");
const tableTopArticles = qs<HTMLTableSectionElement>("#table-top-articles");

const monthLabels = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic",
];

const round2 = (value: number) => parseFloat(value.toFixed(2));
const roundToHalf = (value: number) => Math.round(value * 2) / 2;
const toMonthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

const getOrderDate = (order: Order) =>
    new Date(order.processedDate || order.requestedDate || order.createdAt);

const getOrderRevenue = (order: Order) =>
    order.status === "processed" && typeof order.paymentReceived === "number"
        ? order.paymentReceived
        : order.finalAmount;

const getOrderProfit = (order: Order) =>
    getOrderRevenue(order) - order.materialCost;

const getOrderNetProfit = (order: Order) =>
    getOrderRevenue(order) - order.materialCost - order.laborCost;

const getOrderLaborHours = (order: Order) =>
    laborConfig.hourlyRate > 0 ? order.laborCost / laborConfig.hourlyRate : 0;

function buildFilters() {
    filterClient.innerHTML = `<option value="">Tutti</option>${clients
        .map(
            (c) =>
                `<option value="${c.id}">${c.firstName} ${c.lastName}</option>`,
        )
        .join("")}`;
    const today = new Date();
    filterRange.value = "12";
    filterTo.value = today.toISOString().slice(0, 10);
    const yearAgo = new Date(today);
    yearAgo.setMonth(yearAgo.getMonth() - 11);
    yearAgo.setDate(1);
    filterFrom.value = yearAgo.toISOString().slice(0, 10);
    updateRangeInputs();
}

function updateRangeInputs() {
    const isCustom = filterRange.value === "custom";
    filterFrom.disabled = !isCustom;
    filterTo.disabled = !isCustom;
    filterFrom.style.opacity = isCustom ? "1" : "0.6";
    filterTo.style.opacity = isCustom ? "1" : "0.6";
}

function resolveRange(): { from: Date; to: Date } {
    const today = new Date();
    if (filterRange.value === "custom") {
        return {
            from: new Date(filterFrom.value || today.toISOString().slice(0, 10)),
            to: new Date(filterTo.value || today.toISOString().slice(0, 10)),
        };
    }
    const months = parseInt(filterRange.value, 10);
    const from = new Date(today);
    from.setMonth(from.getMonth() - (months - 1));
    from.setDate(1);
    const to = new Date(today);
    return { from, to };
}

function matchClient(order: Order, clientId: string) {
    if (!clientId) return true;
    return !!order.clientId && order.clientId === clientId;
}

function getScopedOrders(from: Date, to: Date) {
    const clientId = filterClient.value;
    const view = filterView.value;
    return orders.filter((o) => {
        const d = getOrderDate(o);
        if (d < from || d > to) return false;
        if (!matchClient(o, clientId)) return false;
        if (view === "current" && o.status !== "processed") return false;
        if (view === "forecast" && o.status === "refused") return false;
        return true;
    });
}

function buildMonthBuckets(from: Date, to: Date) {
    const buckets: { label: string; key: string; date: Date }[] = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= end) {
        const label = `${monthLabels[cursor.getMonth()]} ${cursor.getFullYear()}`;
        buckets.push({ label, key: toMonthKey(cursor), date: new Date(cursor) });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
}

function computeArticleRoundedSell(article: Article) {
    let materialCost = 0;
    let materialSellBase = 0;
    article.composition.forEach((comp) => {
        const material = materials.find((m) => m.id === comp.materialId);
        if (!material) return;
        materialCost += material.costPerUnit * comp.quantity;
        materialSellBase +=
            (material.sellingPricePerUnit || material.costPerUnit) *
            comp.quantity;
    });
    const laborCost = article.laborHoursRequired * laborConfig.hourlyRate;
    const colorSurcharge = article.composition.length * 0.1;
    const materialSell =
        (materialSellBase + colorSurcharge) *
        (1 + article.materialMarkupPct / 100);
    const laborSell = laborCost * (1 + article.laborMarkupPct / 100);
    return roundToHalf(materialSell + laborSell);
}

function computeCurrentStockMaterialCost() {
    const total = inventory.reduce((sum, row) => {
        const material = materials.find((m) => m.id === row.materialId);
        if (!material) return sum;
        return sum + material.costPerUnit * row.quantity;
    }, 0);
    return round2(total);
}

function computeCurrentFinishedStockSellValue() {
    const total = articleInventory.reduce((sum, row) => {
        if (!row.quantity) return sum;
        const article = articles.find((a) => a.id === row.articleId);
        if (!article) return sum;
        return sum + computeArticleRoundedSell(article) * row.quantity;
    }, 0);
    return round2(total);
}

function computeMonthlySeries(
    scopedOrders: Order[],
    from: Date,
    to: Date,
) {
    const buckets = buildMonthBuckets(from, to);
    const labels = buckets.map((b) => b.label);
    const revenue = labels.map(() => 0);
    const costMat = labels.map(() => 0);
    const laborVal = labels.map(() => 0);
    const extra = labels.map(() => 0);
    const ricavoMateria = labels.map(() => 0);
    const ordersCount = labels.map(() => 0);
    const materialUsage = labels.map(() => 0);

    scopedOrders.forEach((o) => {
        const idx = buckets.findIndex((b) => b.key === toMonthKey(getOrderDate(o)));
        if (idx === -1) return;
        const revenueValue = getOrderRevenue(o);
        const packagingExtra = o.items.reduce(
            (sum, it) => sum + (it.packaging ? 0.5 * it.quantity : 0),
            0,
        );
        const base = revenueValue - o.materialCost - o.laborCost;
        const extraValue = Math.max(0, Math.min(packagingExtra, Math.max(0, base)));
        const ricavoValue = Math.max(0, base - extraValue);

        revenue[idx] += revenueValue;
        costMat[idx] += o.materialCost;
        laborVal[idx] += o.laborCost;
        extra[idx] += extraValue;
        ricavoMateria[idx] += ricavoValue;
        ordersCount[idx] += 1;
        materialUsage[idx] += o.materialCost;
    });

    const monthIncome = labels.map(() => 0);
    const monthExpenseRaw = labels.map(() => 0);

    incomeMovements.forEach((m) => {
        const d = new Date(m.receivedDate);
        const idx = buckets.findIndex((b) => b.key === toMonthKey(d));
        if (idx === -1) return;
        monthIncome[idx] += m.amount || 0;
    });

    economicMovements.forEach((m) => {
        const d = new Date(m.date);
        const idx = buckets.findIndex((b) => b.key === toMonthKey(d));
        if (idx === -1) return;
        if (m.type === "income") {
            monthIncome[idx] += m.amount || 0;
        } else {
            monthExpenseRaw[idx] += m.amount || 0;
        }
    });

    const monthExpense = monthExpenseRaw.map((v) => -v);
    const monthNet = labels.map((_, i) => monthIncome[i] + monthExpense[i]);
    const cumulativeBalance = labels.map(() => 0);
    let runningBalance = 0;
    labels.forEach((_, i) => {
        runningBalance += monthNet[i];
        cumulativeBalance[i] = runningBalance;
    });

    return {
        labels,
        buckets,
        revenue,
        costMat,
        laborVal,
        extra,
        ricavoMateria,
        ordersCount,
        materialUsage,
        monthIncome,
        monthExpense,
        monthNet,
        cumulativeBalance,
    };
}

function drawStackedBar(
    svg: SVGSVGElement,
    labels: string[],
    stacks: { name: string; color: string; data: number[] }[],
) {
    const width = 700;
    const height = 320;
    const padding = 36;
    const maxValue = Math.max(
        1,
        ...labels.map((_, i) => stacks.reduce((sum, s) => sum + s.data[i], 0)),
    );
    const barWidth = (width - padding * 2) / Math.max(1, labels.length);

    const grid = Array.from({ length: 4 }).map((_, i) => {
        const y = padding + (i / 3) * (height - padding * 2);
        const value = Math.round(maxValue - (i / 3) * maxValue);
        return `
            <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>
            <text x="${padding - 6}" y="${y + 4}" font-size="10" fill="#94a3b8" text-anchor="end">${value}</text>
        `;
    });

    const bars = labels
        .map((_, i) => {
            let yOffset = height - padding;
            return stacks
                .map((s) => {
                    const value = s.data[i];
                    const h = (value / maxValue) * (height - padding * 2);
                    const y = yOffset - h;
                    yOffset = y;
                    return `<rect x="${padding + i * barWidth + 6}" y="${y}" width="${barWidth - 12}" height="${h}" fill="${s.color}" rx="4" data-label="${labels[i]}" data-series="${s.name}" data-value="${value}" data-kind="currency" />`;
                })
                .join("");
        })
        .join("");

    const xLabels = labels
        .map((l, i) => {
            const x = padding + i * barWidth + barWidth / 2;
            return `<text x="${x}" y="${height - 8}" font-size="10" fill="#64748b" text-anchor="middle">${l}</text>`;
        })
        .join("");

    svg.innerHTML = `
        <rect width="${width}" height="${height}" fill="transparent" pointer-events="none"></rect>
        ${grid.join("")}
        ${bars}
        ${xLabels}
    `;
}

function drawBarChart(
    svg: SVGSVGElement,
    labels: string[],
    data: number[],
    options: { color: string; series: string; kind: "count" | "currency" },
) {
    const width = 700;
    const height = 320;
    const padding = 36;
    const maxValue = Math.max(1, ...data);
    const barWidth = (width - padding * 2) / Math.max(1, data.length);

    const grid = Array.from({ length: 4 }).map((_, i) => {
        const y = padding + (i / 3) * (height - padding * 2);
        const value = Math.round(maxValue - (i / 3) * maxValue);
        return `
            <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>
            <text x="${padding - 6}" y="${y + 4}" font-size="10" fill="#94a3b8" text-anchor="end">${value}</text>
        `;
    });

    const bars = data
        .map((v, i) => {
            const x = padding + i * barWidth;
            const h = (v / maxValue) * (height - padding * 2);
            const y = height - padding - h;
            return `<rect x="${x + 6}" y="${y}" width="${barWidth - 12}" height="${h}" fill="${options.color}" rx="4" data-label="${labels[i]}" data-series="${options.series}" data-value="${v}" data-kind="${options.kind}" />`;
        })
        .join("");

    const xLabels = labels
        .map((l, i) => {
            const x = padding + i * barWidth + barWidth / 2;
            return `<text x="${x}" y="${height - 8}" font-size="10" fill="#64748b" text-anchor="middle">${l}</text>`;
        })
        .join("");

    svg.innerHTML = `
        <rect width="${width}" height="${height}" fill="transparent" pointer-events="none"></rect>
        ${grid.join("")}
        ${bars}
        ${xLabels}
    `;
}

function getScaleBounds(series: number[][]) {
    const values = series.flat();
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values, 1);
    if (min === max) {
        return { min: min - 1, max: max + 1 };
    }
    return { min, max };
}

function drawLineChart(
    svg: SVGSVGElement,
    labels: string[],
    data: number[],
    options: { color: string; series: string; kind: "count" | "currency" },
) {
    const width = 700;
    const height = 320;
    const padding = 36;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;
    const { min, max } = getScaleBounds([data]);
    const xStep = labels.length > 1 ? plotWidth / (labels.length - 1) : 0;
    const yScale = (v: number) => padding + ((max - v) / (max - min)) * plotHeight;

    const grid = Array.from({ length: 4 }).map((_, i) => {
        const y = padding + (i / 3) * plotHeight;
        const value = (max - (i / 3) * (max - min)).toFixed(0);
        return `
            <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>
            <text x="${padding - 6}" y="${y + 4}" font-size="10" fill="#94a3b8" text-anchor="end">${value}</text>
        `;
    });

    const zeroY = yScale(0);
    const zeroLine =
        min < 0 && max > 0
            ? `<line x1="${padding}" y1="${zeroY}" x2="${width - padding}" y2="${zeroY}" stroke="#94a3b8" stroke-width="1.2"/>`
            : "";

    const points = labels.map((_, i) => ({
        x: padding + i * xStep,
        y: yScale(data[i] || 0),
        v: data[i] || 0,
    }));
    const polyline = `<polyline points="${points.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="${options.color}" stroke-width="2.5"/>`;
    const hitTargets = points
        .map(
            (p, i) =>
                `<circle cx="${p.x}" cy="${p.y}" r="8" fill="transparent" data-label="${labels[i]}" data-series="${options.series}" data-value="${p.v}" data-kind="${options.kind}" />`,
        )
        .join("");

    const xLabels = labels
        .map((l, i) => {
            const x = padding + i * xStep;
            return `<text x="${x}" y="${height - 8}" font-size="10" fill="#64748b" text-anchor="middle">${l}</text>`;
        })
        .join("");

    svg.innerHTML = `
        <rect width="${width}" height="${height}" fill="transparent" pointer-events="none"></rect>
        ${grid.join("")}
        ${zeroLine}
        ${polyline}
        ${hitTargets}
        ${xLabels}
    `;
}

function drawBalanceChart(
    svg: SVGSVGElement,
    labels: string[],
    balance: number[],
) {
    const width = 700;
    const height = 320;
    const padding = 36;
    drawLineChart(svg, labels, balance, {
        color: "#16a34a",
        series: "Bilancio",
        kind: "currency",
    });
}

function showChartTooltip(text: string, event: MouseEvent) {
    chartTooltip.textContent = text;
    chartTooltip.style.left = `${event.clientX + 12}px`;
    chartTooltip.style.top = `${event.clientY + 12}px`;
    chartTooltip.classList.remove("hidden");
}

function hideChartTooltip() {
    chartTooltip.classList.add("hidden");
}

function formatChartValue(value: number, kind: string) {
    if (kind === "count") return value.toFixed(0);
    return formatCurrency(value);
}

function attachChartTooltip(svg: SVGSVGElement) {
    svg.addEventListener("mousemove", (event) => {
        const target = event.target as SVGElement | null;
        if (!target || (target.tagName !== "rect" && target.tagName !== "circle")) {
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
        const text = series ? `${label} Â· ${series}: ${formatted}` : `${label}: ${formatted}`;
        showChartTooltip(text, event);
    });
    svg.addEventListener("mouseleave", hideChartTooltip);
}

function renderTables(filtered: Order[]) {
    const clientMap = new Map<
        string,
        { name: string; orders: number; revenue: number; profit: number }
    >();
    const articleMap = new Map<string, { name: string; qty: number; revenue: number }>();

    filtered.forEach((o) => {
        const revenue = getOrderRevenue(o);
        const profit = getOrderProfit(o);
        const clientName = o.clientId
            ? `${clients.find((c) => c.id === o.clientId)?.firstName || ""} ${
                  clients.find((c) => c.id === o.clientId)?.lastName || ""
              }`.trim()
            : `${o.clientFirstName || ""} ${o.clientLastName || ""}`.trim() ||
              "Cliente";

        const entry = clientMap.get(clientName) || {
            name: clientName,
            orders: 0,
            revenue: 0,
            profit: 0,
        };
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

    const topClients = Array.from(clientMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    tableTopClients.innerHTML = topClients
        .map(
            (c) => `
        <tr>
            <td>${c.name}</td>
            <td>${c.orders}</td>
            <td>${formatCurrency(c.revenue)}</td>
            <td>${formatCurrency(c.profit)}</td>
        </tr>`,
        )
        .join("");

    const topArticles = Array.from(articleMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    tableTopArticles.innerHTML = topArticles
        .map(
            (a) => `
        <tr>
            <td>${a.name}</td>
            <td>${a.qty}</td>
            <td>${formatCurrency(a.revenue)}</td>
            <td>-</td>
        </tr>`,
        )
        .join("");
}

function render() {
    const { from, to } = resolveRange();
    const scopedOrders = getScopedOrders(from, to);

    const revenue = scopedOrders.reduce((sum, o) => sum + getOrderRevenue(o), 0);
    const materialCost = scopedOrders.reduce((sum, o) => sum + o.materialCost, 0);
    const laborHours = scopedOrders.reduce((sum, o) => sum + getOrderLaborHours(o), 0);
    const profit = scopedOrders.reduce((sum, o) => sum + getOrderProfit(o), 0);
    const netProfit = scopedOrders.reduce((sum, o) => sum + getOrderNetProfit(o), 0);

    const stockMaterialCost = computeCurrentStockMaterialCost();
    const finishedStockValue = computeCurrentFinishedStockSellValue();

    kpiOrders.textContent = scopedOrders.length.toString();
    kpiRevenue.textContent = formatCurrency(revenue);
    kpiMaterialCost.textContent = formatCurrency(materialCost);
    kpiLaborHours.textContent = `${laborHours.toFixed(1)}h`;
    kpiProfit.textContent = formatCurrency(profit);
    kpiNetProfit.textContent = formatCurrency(netProfit);
    kpiStockMaterialCost.textContent = formatCurrency(stockMaterialCost);
    kpiFinishedStockValue.textContent = formatCurrency(finishedStockValue);

    const series = computeMonthlySeries(scopedOrders, from, to);

    drawStackedBar(chartRevenue, series.labels, [
        { name: "Costo Materia", color: "#f59e0b", data: series.costMat },
        { name: "Ricavo Materia", color: "#8b5cf6", data: series.ricavoMateria },
        { name: "Valore Lavoro", color: "#3b82f6", data: series.laborVal },
        { name: "Extra", color: "#10b981", data: series.extra },
    ]);
    drawBarChart(chartOrders, series.labels, series.ordersCount, {
        color: "#2563eb",
        series: "Ordini",
        kind: "count",
    });
    drawLineChart(chartMaterialUsage, series.labels, series.materialUsage, {
        color: "#f59e0b",
        series: "Materia Utilizzata",
        kind: "currency",
    });
    drawBalanceChart(
        chartRevenueNet,
        series.labels,
        series.cumulativeBalance,
    );

    const avgOrder = scopedOrders.length ? revenue / scopedOrders.length : 0;
    metricAvgOrder.textContent = formatCurrency(avgOrder);

    const bestMonthIndex = series.labels.length
        ? series.labels.reduce((best, _, i) =>
              series.revenue[i] > (series.revenue[best] || 0) ? i : best,
          0)
        : -1;
    metricBestMonth.textContent =
        bestMonthIndex >= 0 ? series.labels[bestMonthIndex] : "-";

    const clientTotals = new Map<string, number>();
    scopedOrders.forEach((o) => {
        const name = o.clientId
            ? `${clients.find((c) => c.id === o.clientId)?.firstName || ""} ${
                  clients.find((c) => c.id === o.clientId)?.lastName || ""
              }`.trim()
            : `${o.clientFirstName || ""} ${o.clientLastName || ""}`.trim();
        if (!name) return;
        clientTotals.set(name, (clientTotals.get(name) || 0) + getOrderRevenue(o));
    });
    const topClient = Array.from(clientTotals.entries()).sort(
        (a, b) => b[1] - a[1],
    )[0];
    metricTopClient.textContent = topClient ? topClient[0] : "-";

    const articleTotals = new Map<string, number>();
    scopedOrders.forEach((o) => {
        o.items.forEach((it) => {
            const article = articles.find((a) => a.id === it.articleId);
            const name = article ? `${article.code} - ${article.name}` : it.articleId;
            articleTotals.set(
                name,
                (articleTotals.get(name) || 0) + it.unitPrice * it.quantity,
            );
        });
    });
    const topArticle = Array.from(articleTotals.entries()).sort(
        (a, b) => b[1] - a[1],
    )[0];
    metricTopArticle.textContent = topArticle ? topArticle[0] : "-";

    renderTables(scopedOrders);
}

async function loadData() {
    try {
        orders = await window.api.getOrders();
        clients = await window.api.getClients();
        articles = await window.api.getArticles();
        materials = await window.api.getMaterials();
        inventory = await window.api.getInventory();
        articleInventory = await window.api.getArticleInventory();
        laborConfig = await window.api.getLaborConfig();
        incomeMovements = await window.api.getIncomeMovements();
        economicMovements = await window.api.getEconomicMovements();

        buildFilters();
        render();
        attachChartTooltip(chartRevenue);
        attachChartTooltip(chartOrders);
        attachChartTooltip(chartMaterialUsage);
        attachChartTooltip(chartRevenueNet);
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

