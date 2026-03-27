﻿import { qs, showMessage, clearMessage, formatDate, formatCurrency } from "./shared";

import { openSingletonWindow } from "./shared";

type OrderItem = {
    articleId: string;
    quantity: number;
    unitPrice: number;
    packaging?: boolean;
    colorSelections?: string[];
    variantId?: string;
    variantCode?: string;
    depositUsed?: number;
    depositMissing?: number;
};

type Order = {
    id: string;
    clientFirstName?: string;
    clientLastName?: string;
    clientEmail?: string;
    clientPhone?: string;
    requestedDate?: string;
    deliveryDate?: string;
    items: OrderItem[];
    materialCost: number;
    laborCost: number;
    discountPercentage: number;
    finalAmount: number;
    createdAt: string;
    status: "pending" | "refused" | "confirmed" | "processed";
    notes?: string;
    processedDate?: string;
    paymentReceived?: number;
};

type Article = {
    id: string;
    code: string;
    name: string;
    composition: {
        materialId: string;
        description?: string;
        quantity: number;
    }[];
    laborHoursRequired: number;
    materialMarkupPct: number;
    laborMarkupPct: number;
};

type Material = {
    id: string;
    name: string;
    costPerUnit: number;
    sellingPricePerUnit: number;
};

type LaborConfig = {
    hourlyRate: number;
    lastUpdated?: string;
};

type IncomeMovement = {
    id: string;
    orderId: string;
    amount: number;
    receivedDate: string;
    createdAt: string;
};

type ArticleInventoryItem = {
    id: string;
    articleId: string;
    variantCode: string;
    colors: string[];
    quantity: number;
    lastUpdated?: string;
};

let orders: Order[] = [];
let articles: Article[] = [];
let materials: Material[] = [];
let laborConfig: LaborConfig = { hourlyRate: 4 };
let articleInventory: ArticleInventoryItem[] = [];
let filterText = "";
let filterStatus = "";
let sortMode = "date-desc";

const refreshBtn = qs<HTMLButtonElement>("#refresh-production");
const productionBody = qs<HTMLTableSectionElement>("#production-body");
const searchInput = qs<HTMLInputElement>("#search-production");
const statusFilter = qs<HTMLSelectElement>("#filter-production-status");
const sortSelect = qs<HTMLSelectElement>("#sort-production");
const listSection = qs<HTMLDivElement>("#production-list-section");
const detailSection = qs<HTMLDivElement>("#production-detail-section");
const detailTitle = qs<HTMLDivElement>("#production-detail-title");
const detailClient = qs<HTMLDivElement>("#production-client");
const detailRequestDate = qs<HTMLDivElement>("#production-request-date");
const detailDeliveryDate = qs<HTMLDivElement>("#production-delivery-date");
const detailStatus = qs<HTMLDivElement>("#production-status");
const detailPaymentDate = qs<HTMLDivElement>("#production-payment-date");
const detailPaymentAmount = qs<HTMLDivElement>("#production-payment-amount");
const detailItemsBody = qs<HTMLTableSectionElement>("#production-items-body");
const detailProfitNoLabor = qs<HTMLDivElement>("#production-profit-no-labor");
const detailProfitWithLabor = qs<HTMLDivElement>(
    "#production-profit-with-labor",
);
const detailEditBtn = qs<HTMLButtonElement>("#production-edit");
const detailProcessBtn = qs<HTMLButtonElement>("#production-process");
const detailCloseBtn = qs<HTMLButtonElement>("#production-close");
const detailPdfBtn = qs<HTMLButtonElement>("#production-pdf");
const pdfModal = qs<HTMLDivElement>("#pdf-modal");
const pdfFilenameInput = qs<HTMLInputElement>("#pdf-filename");
const pdfCancelBtn = qs<HTMLButtonElement>("#pdf-cancel");
const pdfConfirmBtn = qs<HTMLButtonElement>("#pdf-confirm");
const pdfBackdrop = qs<HTMLDivElement>("#pdf-modal .modal-backdrop");
const processModal = qs<HTMLDivElement>("#process-modal");
const processDateInput = qs<HTMLInputElement>("#process-date");
const processAmountInput = qs<HTMLInputElement>("#process-amount");
const processCancelBtn = qs<HTMLButtonElement>("#process-cancel");
const processConfirmBtn = qs<HTMLButtonElement>("#process-confirm");
const processBackdrop = qs<HTMLDivElement>("#process-modal .modal-backdrop");

function getPopupParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        popup: params.get("popup") === "1",
        view: params.get("view") || "list",
        id: params.get("id"),
    };
}

function showOnly(section: "list" | "detail") {
    listSection.classList.toggle("hidden", section !== "list");
    detailSection.classList.toggle("hidden", section !== "detail");
}

function getOrderFullName(order: Order) {
    const legacyName = (order as unknown as { clientName?: string }).clientName;
    const first = order.clientFirstName || "";
    const last = order.clientLastName || "";
    const full = `${first} ${last}`.trim();
    return full || legacyName || "-";
}

function getOrderYearKey(order: Order) {
    const dateStr =
        order.requestedDate || order.createdAt || order.deliveryDate;
    const d = dateStr ? new Date(dateStr) : new Date();
    const yy = (d.getFullYear() % 100).toString().padStart(2, "0");
    return yy;
}

function isNewOrderId(id: string) {
    return /^\d{5}$/.test(id);
}

function buildOrderIdIndex(list: Order[]) {
    const byYear = new Map<string, number>();
    list.forEach((o) => {
        if (!isNewOrderId(o.id)) return;
        const yearKey = o.id.slice(0, 2);
        const seq = parseInt(o.id.slice(2), 10);
        if (Number.isNaN(seq)) return;
        byYear.set(yearKey, Math.max(byYear.get(yearKey) || 0, seq));
    });
    return byYear;
}

function normalizeOrderIds(list: Order[]) {
    const updated = [...list];
    const byYear = buildOrderIdIndex(updated);
    const toFix = updated.filter((o) => !isNewOrderId(o.id));
    if (!toFix.length) return { updated, changed: false };
    toFix.sort(
        (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    toFix.forEach((o) => {
        const yearKey = getOrderYearKey(o);
        const next = (byYear.get(yearKey) || 0) + 1;
        byYear.set(yearKey, next);
        o.id = `${yearKey}${next.toString().padStart(3, "0")}`;
    });
    return { updated, changed: true };
}

function getArticleCode(id: string) {
    return articles.find((a) => a.id === id)?.code || "-";
}

function getArticleName(id: string) {
    return articles.find((a) => a.id === id)?.name || "-";
}

function normalizeColor(value?: string) {
    return (value || "").trim().toLowerCase();
}

function normalizeColors(colors: string[], len: number) {
    return Array.from({ length: len }).map((_, i) => normalizeColor(colors[i]));
}

function getVariantKey(articleId: string, colors: string[]) {
    return `${articleId}::${colors.join("|")}`;
}

function buildVariantIndex() {
    const byId = new Map<string, ArticleInventoryItem>();
    const byCode = new Map<string, ArticleInventoryItem>();
    const byKey = new Map<string, ArticleInventoryItem>();
    articleInventory.forEach((v) => {
        byId.set(v.id, v);
        if (v.variantCode) byCode.set(v.variantCode, v);
        const article = articles.find((a) => a.id === v.articleId);
        const colorsLen = article?.composition.length || v.colors?.length || 0;
        const colors = normalizeColors(v.colors || [], colorsLen);
        const key = getVariantKey(v.articleId, colors);
        byKey.set(key, v);
    });
    return { byId, byCode, byKey };
}

function formatVariantLabel(
    article: Article | undefined,
    variantCode?: string,
) {
    if (!variantCode) return "-";
    if (!article) return variantCode.replace("-", "");
    return variantCode.replace(`${article.code}-`, "").replace("-", "");
}

async function migrateLegacyVariants() {
    let changed = false;
    articleInventory = articleInventory.map((item) => {
        const article = articles.find((a) => a.id === item.articleId);
        if (!article) return item;

        const targetLen = article.composition.length;
        const hasValidColors = Array.isArray(item.colors);
        const normalizedColors = Array.from({ length: targetLen }).map(
            (_, i) => ((hasValidColors ? item.colors[i] : "") || "").trim(),
        );
        const hasLengthMismatch =
            !hasValidColors || item.colors.length !== targetLen;
        const hasMissingCode = !item.variantCode;

        if (!hasLengthMismatch && !hasMissingCode) {
            return item;
        }

        changed = true;
        return {
            ...item,
            variantCode: item.variantCode || `${article.code}-0000`,
            colors: normalizedColors,
        };
    });
    if (changed) {
        await window.api.saveArticleInventory(articleInventory);
    }
}

function computeMissingByItem(itemsList: OrderItem[]) {
    const availability = new Map<string, number>();
    const index = buildVariantIndex();
    articleInventory.forEach((row) => {
        availability.set(row.id, row.quantity);
    });
    return itemsList.map((item) => {
        let variant: ArticleInventoryItem | undefined;
        if (item.variantId) {
            variant = index.byId.get(item.variantId);
        } else if (item.variantCode) {
            variant = index.byCode.get(item.variantCode);
        } else if (item.colorSelections?.length) {
            const article = articles.find((a) => a.id === item.articleId);
            const normalized = normalizeColors(
                item.colorSelections,
                article?.composition.length || item.colorSelections.length,
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

function formatItemColors(item: OrderItem) {
    const article = articles.find((a) => a.id === item.articleId);
    if (!article || !item.colorSelections?.length) return "-";
    const parts = article.composition
        .map((comp, idx) => {
            const color = item.colorSelections?.[idx];
            if (!color) return "";
            const material = materials.find((m) => m.id === comp.materialId);
            return `${material?.name || "Materiale"}: ${color}`;
        })
        .filter(Boolean);
    return parts.length ? parts.join(", ") : "-";
}

function calculateOrderCosts(itemsList: OrderItem[], discount: number) {
    let materialCost = 0;
    let laborCost = 0;

    for (const item of itemsList) {
        const article = articles.find((a) => a.id === item.articleId);
        if (!article) continue;
        for (const comp of article.composition) {
            const material = materials.find((m) => m.id === comp.materialId);
            if (material) {
                materialCost +=
                    material.costPerUnit * comp.quantity * item.quantity;
            }
        }
        laborCost +=
            article.laborHoursRequired * laborConfig.hourlyRate * item.quantity;
    }

    const subtotal = itemsList.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
    );
    const discountAmount = subtotal * (discount / 100);
    const finalAmount = subtotal - discountAmount;

    return {
        materialCost: parseFloat(materialCost.toFixed(2)),
        laborCost: parseFloat(laborCost.toFixed(2)),
        finalAmount: parseFloat(finalAmount.toFixed(2)),
    };
}

function getOrderSaleTotal(order: Order) {
    const costs = calculateOrderCosts(order.items, order.discountPercentage);
    return costs.finalAmount;
}

function roundToHalf(value: number) {
    return Math.round(value * 2) / 2;
}

function calculateArticlePricing(article: Article, packaging: boolean) {
    let materialCost = 0;
    let materialSellBase = 0;
    for (const comp of article.composition) {
        const material = materials.find((m) => m.id === comp.materialId);
        if (material) {
            materialCost += material.costPerUnit * comp.quantity;
            materialSellBase +=
                (material.sellingPricePerUnit || material.costPerUnit) *
                comp.quantity;
        }
    }
    const laborCost = article.laborHoursRequired * laborConfig.hourlyRate;
    const colorSurcharge = article.composition.length * 0.1;
    const materialSell =
        (materialSellBase + colorSurcharge) *
        (1 + article.materialMarkupPct / 100);
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
        finalPrice,
    };
}

function calculateOrderSummary(order: Order) {
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
    return {
        materialSell,
        laborHours,
        finalTotal,
        finalAfterDiscount,
    };
}

function buildOrderPdfHtml(order: Order) {
    const summary = calculateOrderSummary(order);
    const costs = calculateOrderCosts(order.items, order.discountPercentage);
    const colorsList = order.items
        .map((item) => formatItemColors(item))
        .filter((txt) => txt && txt !== "-")
        .join(", ");
    const packaging = order.items.some((i) => i.packaging)
        ? "Prodotto impacchettato."
        : "Prodotto non impacchettato.";
    const totalRaw = order.items.reduce((sum, item) => {
        const article = articles.find((a) => a.id === item.articleId);
        if (!article) return sum;
        const pricing = calculateArticlePricing(article, !!item.packaging);
        const rawUnit = pricing.total + (item.packaging ? 0.5 : 0);
        return sum + rawUnit * item.quantity;
    }, 0);
    const totalRounded = roundToHalf(totalRaw);
    const title = `Preventivo Ordine ${order.id}`;
    const itemDetailsHtml = order.items
        .map((item) => {
            const article = articles.find((a) => a.id === item.articleId);
            if (!article) return "";
            const lines = article.composition
                .map((c, idx) => {
                    const material = materials.find(
                        (m) => m.id === c.materialId,
                    );
                    const materialLabel =
                        material?.name || c.materialId || "Materiale";
                    const descLabel = c.description || materialLabel;
                    const color =
                        item.colorSelections && item.colorSelections[idx]
                            ? item.colorSelections[idx]
                            : "";
                    const value = color
                        ? `${materialLabel} ${color}`
                        : materialLabel;
                    return `<div class="info-line"><span class="info-label">${descLabel}</span><span class="info-value">${value}</span></div>`;
                })
                .join("");
            return `
            <div class="info-item">
                <div class="info-item-title">${article.name}</div>
                <div class="info-lines">${lines || ""}</div>
            </div>
        `;
        })
        .join("");
    const packagingItems = order.items.filter((i) => i.packaging);
    const packagingInfo =
        packagingItems.length === 0
            ? "Packaging non richiesto."
            : packagingItems.length === order.items.length
              ? "Packaging incluso su tutti i prodotti."
              : `Packaging incluso su: ${packagingItems.map((i) => getArticleName(i.articleId)).join(", ")}.`;

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
        .total {
            background: var(--mint);
            border: 1px solid #bfe3d0;
            border-radius: 14px;
            padding: 10px 14px;
            text-align: center;
        }
        .total .label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--muted);
            font-weight: 700;
        }
        .total .value {
            margin-top: 6px;
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
            </div>
            <div class="grid">
                <div class="card">
                    <div class="label">Costo Materiale</div>
                    <div class="value">${formatCurrency(costs.materialCost, 2)}</div>
                </div>
                <div class="card">
                    <div class="label">Ore Lavoro</div>
                    <div class="value">${summary.laborHours}</div>
                </div>
                <div class="card">
                    <div class="label">Manodopera</div>
                    <div class="value">${formatCurrency(costs.laborCost, 2)}</div>
                </div>
                <div class="card">
                    <div class="label">Totale</div>
                    <div class="value">${formatCurrency(totalRaw, 2)}</div>
                </div>
            </div>
            <div class="split">
                <div class="total">
                    <div class="label">Totale</div>
                    <div class="value">${formatCurrency(totalRaw, 2)}</div>
                </div>
                <div class="total">
                    <div class="label">Totale Arrotondato</div>
                    <div class="value">${formatCurrency(totalRounded, 2)}</div>
                </div>
            </div>

            <div class="info">
                <div class="info-title">Informazioni aggiuntive</div>
                <div class="info-body">
                    ${itemDetailsHtml || ""}
                    <div class="info-footer">${packagingInfo}</div>
                </div>
            </div>
            <div class="footnote">Il totale e' arrotondato (eccesso o difetto) ad ogni 50 centesimi.</div>
        </div>
    </div>
</body>
</html>
    `.trim();
}

function renderProduction() {
    productionBody.innerHTML = "";
    const empty = document.getElementById("production-empty");
    const filtered = orders.filter((order) => {
        if (order.status !== "confirmed" && order.status !== "processed")
            return false;
        const articleNames = order.items
            .map(
                (i) =>
                    `${getArticleCode(i.articleId)} ${getArticleName(i.articleId)}`,
            )
            .join(" ");
        const text =
            `${getOrderFullName(order)} ${order.clientEmail || ""} ${articleNames}`.toLowerCase();
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
        const costs = calculateOrderCosts(
            order.items,
            order.discountPercentage,
        );
        const saleTotal = getOrderSaleTotal(order);
        const soldAmount =
            order.status === "processed" &&
            typeof order.paymentReceived === "number"
                ? order.paymentReceived
                : null;
        const totalQty = order.items.reduce(
            (sum, item) => sum + item.quantity,
            0,
        );
        const codes = order.items
            .map((item) => {
                const article = articles.find((a) => a.id === item.articleId);
                const variantLabel = formatVariantLabel(
                    article,
                    item.variantCode,
                );
                return `${getArticleCode(item.articleId)} ${variantLabel} x${item.quantity}`;
            })
            .join(", ");
        const tr = document.createElement("tr");
        tr.dataset.id = order.id;
        tr.innerHTML = `
            <td>${getOrderFullName(order)}</td>
            <td>${formatDate(order.requestedDate || order.createdAt)}</td>
            <td><span class="hover-hint" data-tooltip="${codes}">${totalQty}</span></td>
            <td>
                <strong>${formatCurrency(saleTotal, 2)}</strong>
                ${soldAmount !== null ? `<div class="muted">Venduto a ${formatCurrency(soldAmount, 2)}</div>` : ""}
            </td>
            <td><span class="pill ${order.status}">${order.status}</span></td>
        `;
        productionBody.appendChild(tr);
    });

    if (empty) {
        empty.classList.toggle("hidden", filtered.length > 0);
    }
}

function renderDetail(order: Order) {
    detailTitle.textContent = `Dettaglio Produzione`;
    detailClient.textContent = getOrderFullName(order);
    detailRequestDate.textContent = formatDate(order.requestedDate || "");
    detailDeliveryDate.textContent = formatDate(order.deliveryDate || "");
    detailStatus.textContent = order.status;
    detailPaymentDate.textContent = order.processedDate
        ? formatDate(order.processedDate)
        : "-";
    detailPaymentAmount.textContent =
        typeof order.paymentReceived === "number"
            ? `${formatCurrency(order.paymentReceived, 2)}`
            : "-";

    const costs = calculateOrderCosts(order.items, order.discountPercentage);
    const saleTotal = getOrderSaleTotal(order);
    const actualSale =
        order.status === "processed" &&
        typeof order.paymentReceived === "number"
            ? order.paymentReceived
            : saleTotal;
    const profitNoLabor = actualSale - costs.materialCost;
    const profitWithLabor = actualSale - costs.materialCost - costs.laborCost;
    detailProfitNoLabor.textContent = `${formatCurrency(profitNoLabor, 2)}`;
    detailProfitWithLabor.textContent = `${formatCurrency(profitWithLabor, 2)}`;

    const missingList = computeMissingByItem(order.items);
    detailItemsBody.innerHTML = order.items
        .map((item, idx) => {
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
            <td>${formatCurrency(item.unitPrice, 2)}</td>
            <td>${formatCurrency((item.unitPrice * item.quantity), 2)}</td>
        </tr>
    `;
        })
        .join("");

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
    const target = e.target as HTMLElement;
    const row = target.closest("tr") as HTMLTableRowElement | null;
    const rowId = row?.dataset.id;
    if (!rowId) return;
    const url = `orders-production.html?popup=1&view=detail&id=${rowId}`;
    openSingletonWindow(
        "orders-production-popup",
        url,
        "width=1200,height=800",
    );
});

detailCloseBtn.addEventListener("click", () => window.close());

detailEditBtn.addEventListener("click", () => {
    const { id } = getPopupParams();
    if (!id) return;
    const url = `orders.html?popup=1&id=${id}`;
    openSingletonWindow("orders-popup", url, "width=1200,height=800");
});

detailProcessBtn.addEventListener("click", async () => {
    const { id } = getPopupParams();
    if (!id) return;
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    if (order.status !== "confirmed") {
        showMessage(
            "L'ordine deve essere Confirmed per essere venduto",
            "error",
        );
        clearMessage();
        return;
    }
    processDateInput.value = order.processedDate || "";
    processAmountInput.value = order.paymentReceived?.toString() || "";
    processModal.classList.remove("hidden");
});

detailPdfBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { id } = getPopupParams();
    if (!id) return;
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    pdfFilenameInput.value = `preventivo-${order.id}.pdf`;
    pdfModal.classList.remove("hidden");
});

document.addEventListener(
    "click",
    (e) => {
        const target = e.target as HTMLElement;
        if (target.closest("#production-pdf")) {
            showMessage("Esportazione PDF in corso...", "success");
        }
    },
    true,
);

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
    const filename =
        pdfFilenameInput.value.trim() || `preventivo-${order.id}.pdf`;
    try {
        showMessage("Esportazione PDF in corso...", "success");
        const result = await window.api.exportOrderPdf({
            html,
            filename,
            skipDialog: true,
        });
        if (result?.ok) {
            showMessage(
                `PDF esportato: ${result.filePath || filename}`,
                "success",
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
        showMessage(
            `Deposito insufficiente. Da produrre: ${missingTotal}`,
            "error",
        );
        return;
    }

    const updatedInventory = [...articleInventory];
    const index = buildVariantIndex();
    const now = new Date().toISOString();
    order.items.forEach((item) => {
        let row: ArticleInventoryItem | undefined;
        if (item.variantId) {
            row = index.byId.get(item.variantId);
        } else if (item.variantCode) {
            row = index.byCode.get(item.variantCode);
        } else if (item.colorSelections?.length) {
            const article = articles.find((a) => a.id === item.articleId);
            const normalized = normalizeColors(
                item.colorSelections,
                article?.composition.length || item.colorSelections.length,
            );
            const key = getVariantKey(item.articleId, normalized);
            row = index.byKey.get(key);
        }
        if (!row) return;
        const invRow = updatedInventory.find((r) => r.id === row?.id);
        if (!invRow) return;
        invRow.quantity = Math.max(0, invRow.quantity - item.quantity);
        invRow.lastUpdated = now;
    });
    const inventorySaved =
        await window.api.saveArticleInventory(updatedInventory);
    if (!inventorySaved) {
        showMessage("Errore salvataggio deposito articoli", "error");
        return;
    }
    articleInventory = updatedInventory;

    const updatedOrders = orders.map((o) =>
        o.id === id
            ? {
                  ...o,
                  status: "processed" as Order["status"],
                  processedDate: date,
                  paymentReceived: amount,
                  items: o.items.map((it) => ({
                      ...it,
                      depositUsed: it.quantity,
                      depositMissing: 0,
                  })),
              }
            : o,
    );
    const orderSaved = await window.api.saveOrders(updatedOrders);
    if (!orderSaved) {
        showMessage("Errore salvataggio ordine", "error");
        return;
    }

    const movements = await window.api.getIncomeMovements();
    const newMovement: IncomeMovement = {
        id: Date.now().toString(),
        orderId: id,
        amount,
        receivedDate: date,
        createdAt: new Date().toISOString(),
    };
    const moveSaved = await window.api.saveIncomeMovements([
        ...movements,
        newMovement,
    ]);
    if (!moveSaved) {
        showMessage("Errore salvataggio movimento economico", "error");
        return;
    }

    orders = updatedOrders;
    renderDetail(updatedOrders.find((o) => o.id === id)!);
    closeProcessModal();
    showMessage("Ordine processato", "success");
    clearMessage();
});

const params = getPopupParams();
if (params.popup) {
    document.body.classList.add("popup", "popup-detail");
    showOnly("detail");
} else {
    showOnly("list");
}

loadData();

