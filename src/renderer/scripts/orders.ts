import { qs, showMessage, clearMessage, formatDate } from "./shared";

type OrderItem = {
    articleId: string;
    quantity: number;
    unitPrice: number;
    packaging?: boolean;
    colorSelections?: string[];
};

type Order = {
    id: string;
    clientFirstName: string;
    clientLastName: string;
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
};

type Article = {
    id: string;
    code: string;
    name: string;
    composition: { materialId: string; description?: string; quantity: number }[];
    laborHoursRequired: number;
    materialMarkupPct: number;
    laborMarkupPct: number;
};

type Material = {
    id: string;
    costPerUnit: number;
    sellingPricePerUnit: number;
    name?: string;
    unit?: "grammi" | "pezzi";
};

type InventoryItem = {
    id: string;
    materialId: string;
    colorName?: string;
    quantity: number;
    lastUpdated: string;
};

type LaborConfig = {
    hourlyRate: number;
};

let orders: Order[] = [];
let articles: Article[] = [];
let materials: Material[] = [];
let inventory: InventoryItem[] = [];
let laborConfig: LaborConfig = { hourlyRate: 4 };
let editingId: string | null = null;
let items: OrderItem[] = [];
let detailsOpenId: string | null = null;
let filterText = "";
let filterStatus = "";
let currentColorSelections: string[] = [];

const form = qs<HTMLFormElement>("#order-form");
const toggleBtn = qs<HTMLButtonElement>("#toggle-form");
const refreshBtn = qs<HTMLButtonElement>("#refresh-orders");
const ordersBody = qs<HTMLTableSectionElement>("#orders-body");
const itemsBody = qs<HTMLTableSectionElement>("#items-body");
const searchInput = qs<HTMLInputElement>("#search-orders");
const statusFilter = qs<HTMLSelectElement>("#filter-status");
const statsSection = qs<HTMLDivElement>("#orders-stats");
const toolbarSection = qs<HTMLDivElement>("#orders-toolbar");
const listSection = qs<HTMLDivElement>("#orders-list-section");
const detailSection = qs<HTMLDivElement>("#order-detail-section");

const firstNameInput = qs<HTMLInputElement>("#order-first-name");
const lastNameInput = qs<HTMLInputElement>("#order-last-name");
const emailInput = qs<HTMLInputElement>("#order-email");
const phoneInput = qs<HTMLInputElement>("#order-phone");
const requestDateInput = qs<HTMLInputElement>("#order-request-date");
const deliveryDateInput = qs<HTMLInputElement>("#order-delivery-date");
const discountInput = qs<HTMLInputElement>("#order-discount");
const notesInput = qs<HTMLTextAreaElement>("#order-notes");
const submitBtn = qs<HTMLButtonElement>("#submit-order");

const itemArticle = qs<HTMLSelectElement>("#item-article");
const itemQty = qs<HTMLInputElement>("#item-qty");
const itemPackaging = qs<HTMLInputElement>("#item-packaging");
const addItemBtn = qs<HTMLButtonElement>("#add-item");
const itemColorsBody = qs<HTMLTableSectionElement>("#item-colors-body");
const previewMaterialSell = qs<HTMLDivElement>("#order-preview-material-sell");
const previewHours = qs<HTMLDivElement>("#order-preview-hours");
const previewFinal = qs<HTMLDivElement>("#order-preview-final");

const detailTitle = qs<HTMLDivElement>("#order-detail-title");
const detailClient = qs<HTMLDivElement>("#detail-client");
const detailEmail = qs<HTMLDivElement>("#detail-email");
const detailPhone = qs<HTMLDivElement>("#detail-phone");
const detailRequestDate = qs<HTMLDivElement>("#detail-request-date");
const detailDeliveryDate = qs<HTMLDivElement>("#detail-delivery-date");
const detailStatus = qs<HTMLDivElement>("#detail-status");
const detailNotes = qs<HTMLDivElement>("#detail-notes");
const detailItemsBody = qs<HTMLTableSectionElement>("#detail-items-body");
const detailProfitNoLabor = qs<HTMLDivElement>("#detail-profit-no-labor");
const detailProfitWithLabor = qs<HTMLDivElement>("#detail-profit-with-labor");
const detailEditBtn = qs<HTMLButtonElement>("#order-detail-edit");
const detailCloseBtn = qs<HTMLButtonElement>("#order-detail-close");
const detailConfirmBtn = qs<HTMLButtonElement>("#order-detail-confirm");
const detailRefuseBtn = qs<HTMLButtonElement>("#order-detail-refuse");

function setFormVisible(visible: boolean) {
    form.classList.toggle("hidden", !visible);
    toggleBtn.textContent = visible ? "Annulla" : "+ Nuovo Ordine";
}

function resetForm() {
    firstNameInput.value = "";
    lastNameInput.value = "";
    emailInput.value = "";
    phoneInput.value = "";
    requestDateInput.value = "";
    deliveryDateInput.value = "";
    discountInput.value = "0";
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
    const params = new URLSearchParams(window.location.search);
    return {
        popup: params.get("popup") === "1",
        view: params.get("view") || "form",
        id: params.get("id"),
    };
}

function showOnly(section: "list" | "form" | "detail") {
    form.classList.toggle("hidden", section !== "form");
    listSection.classList.toggle("hidden", section !== "list");
    statsSection.classList.toggle("hidden", section !== "list");
    toolbarSection.classList.toggle("hidden", section !== "list");
    detailSection.classList.toggle("hidden", section !== "detail");
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
        const { popup, view, id } = getPopupParams();
        if (popup && view === "detail" && id) {
            const order = orders.find((o) => o.id === id);
            if (order) renderOrderDetail(order);
        }
        if (popup && view === "form" && id) {
            const order = orders.find((o) => o.id === id);
            if (order) {
                editingId = id;
                const legacyName = (order as unknown as { clientName?: string }).clientName || "";
                const nameParts = legacyName ? legacyName.split(" ") : [];
                firstNameInput.value = order.clientFirstName || nameParts.shift() || "";
                lastNameInput.value = order.clientLastName || nameParts.join(" ");
                emailInput.value = order.clientEmail || "";
                phoneInput.value = order.clientPhone || "";
                requestDateInput.value = order.requestedDate || "";
                deliveryDateInput.value = order.deliveryDate || "";
                discountInput.value = order.discountPercentage.toString();
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
        }
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

function getAvailableColors(materialId: string) {
    const colors = new Set<string>();
    inventory.forEach((row) => {
        if (row.materialId !== materialId) return;
        const name = (row.colorName || "").trim();
        if (name) colors.add(name);
    });
    return Array.from(colors).sort((a, b) => a.localeCompare(b));
}

function renderColorRows(article: Article | undefined) {
    itemColorsBody.innerHTML = "";
    currentColorSelections = [];
    if (!article) return;
    article.composition.forEach((comp, index) => {
        const material = materials.find((m) => m.id === comp.materialId);
        const unitLabel = material?.unit === "pezzi" ? "pz" : "g";
        const colors = getAvailableColors(comp.materialId);
        const tr = document.createElement("tr");
        const colorCell = colors.length
            ? `<select data-color-index="${index}">
                    <option value="">Nessun colore</option>
                    ${colors.map((c) => `<option value="${c}">${c}</option>`).join("")}
               </select>`
            : `<span class="muted">N/A</span>`;
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

function getArticleName(id: string) {
    return articles.find((a) => a.id === id)?.name || "-";
}

function getArticleCode(id: string) {
    return articles.find((a) => a.id === id)?.code || "-";
}

function formatItemColors(item: OrderItem) {
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

function getOrderFullName(order: Order) {
    const legacyName = (order as unknown as { clientName?: string }).clientName;
    const first = order.clientFirstName || "";
    const last = order.clientLastName || "";
    const full = `${first} ${last}`.trim();
    return full || legacyName || "-";
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
        finalPrice,
    };
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
        finalAmount: parseFloat(finalAmount.toFixed(2)),
    };
}

function getOrderSaleTotal(order: Order) {
    if (order.status === "processed" && typeof order.paymentReceived === "number") {
        return order.paymentReceived;
    }
    return order.finalAmount;
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
    const saleTotal = getOrderSaleTotal(order);
    return {
        materialSell,
        laborHours,
        finalTotal,
        finalAfterDiscount,
        saleTotal,
    };
}

function renderOrderDetail(order: Order) {
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

    detailItemsBody.innerHTML = order.items.map((item) => `
        <tr>
            <td>${getArticleCode(item.articleId)}</td>
            <td>${getArticleName(item.articleId)}</td>
            <td>${item.quantity}</td>
            <td>${item.packaging ? "Si" : "No"}</td>
            <td>${formatItemColors(item)}</td>
            <td>EUR ${item.unitPrice.toFixed(2)}</td>
            <td>EUR ${(item.unitPrice * item.quantity).toFixed(2)}</td>
        </tr>
    `).join("");
}

function normalizeColor(value?: string) {
    return (value || "").trim().toLowerCase();
}

type InventoryDelta = { qty: number; colorName?: string };

function computeRequiredMaterials(orderItems: OrderItem[]) {
    const map = new Map<string, InventoryDelta>();
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
                colorName: existing?.colorName || colorName,
            });
        }
    }
    return map;
}

function applyInventoryDelta(deltaMap: Map<string, InventoryDelta>) {
    const updated = [...inventory];
    for (const [key, delta] of deltaMap.entries()) {
        const [materialId, colorKey] = key.split("::");
        let row = updated.find(
            (i) =>
                i.materialId === materialId &&
                normalizeColor(i.colorName) === colorKey
        );
        if (!row) {
            // auto-create row with 0 then validate
            row = {
                id: Date.now().toString(),
                materialId,
                colorName: colorKey ? delta.colorName || colorKey : undefined,
                quantity: 0,
                lastUpdated: new Date().toISOString(),
            };
            updated.push(row);
        }
        if (row.quantity + delta.qty < 0) {
            return { ok: false, message: "Giacenza insufficiente per materiale/colore" };
        }
        row.quantity += delta.qty;
        row.lastUpdated = new Date().toISOString();
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
            <td>${item.packaging ? "Si" : "No"}</td>
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
    const statTotalProfitNoLabor = document.getElementById("stat-total-profit-no-labor");
    const statTotalProfitWithLabor = document.getElementById("stat-total-profit-with-labor");

    const totalRevenue = orders.reduce((sum, o) => sum + getOrderSaleTotal(o), 0);
    const totalMaterialCosts = orders.reduce((sum, o) => sum + o.materialCost, 0);
    const totalLaborCosts = orders.reduce((sum, o) => sum + o.laborCost, 0);
    const totalProfitNoLabor = totalRevenue - totalMaterialCosts;
    const totalProfitWithLabor = totalRevenue - totalMaterialCosts - totalLaborCosts;

    if (statTotalOrders) statTotalOrders.textContent = orders.length.toString();
    if (statTotalRevenue) statTotalRevenue.textContent = `EUR ${totalRevenue.toFixed(2)}`;
    if (statTotalCosts) statTotalCosts.textContent = `EUR ${totalMaterialCosts.toFixed(2)}`;
    if (statTotalProfitNoLabor) statTotalProfitNoLabor.textContent = `EUR ${totalProfitNoLabor.toFixed(2)}`;
    if (statTotalProfitWithLabor) statTotalProfitWithLabor.textContent = `EUR ${totalProfitWithLabor.toFixed(2)}`;

    const filtered = orders.filter((order) => {
        if (order.status === "confirmed" || order.status === "processed") return false;
        const articleNames = order.items
            .map((i) => `${getArticleCode(i.articleId)} ${getArticleName(i.articleId)}`)
            .join(" ");
        const fullName = getOrderFullName(order);
        const text = `${fullName} ${order.clientEmail || ""} ${articleNames}`.toLowerCase();
        const matchesText = text.includes(filterText);
        const matchesStatus = !filterStatus || order.status === filterStatus;
        return matchesText && matchesStatus;
    });

    filtered.forEach((order) => {
        const costs = calculateOrderCosts(order.items, order.discountPercentage);
        const saleTotal = getOrderSaleTotal(order);
        const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const codes = order.items
            .map((item) => `${getArticleCode(item.articleId)} x${item.quantity}`)
            .join(", ");
        const tr = document.createElement("tr");
        tr.dataset.id = order.id;
        tr.innerHTML = `
            <td>${getOrderFullName(order)}</td>
            <td>${formatDate(order.requestedDate || order.createdAt)}</td>
            <td><span class="hover-hint" data-tooltip="${codes}">${totalQty}</span></td>
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

itemPackaging.addEventListener("change", () => {
    updateItemPreview();
});

itemColorsBody.addEventListener("change", (e) => {
    const target = e.target as HTMLSelectElement;
    if (!target || target.tagName !== "SELECT") return;
    const indexStr = target.getAttribute("data-color-index");
    if (indexStr === null) return;
    const index = parseInt(indexStr, 10);
    currentColorSelections[index] = target.value;
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

    const pricing = calculateArticlePricing(article, itemPackaging.checked);
    items.push({
        articleId: article.id,
        quantity: qty,
        unitPrice: parseFloat(pricing.finalPrice.toFixed(2)),
        packaging: itemPackaging.checked,
        colorSelections: [...currentColorSelections],
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

itemsBody.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const action = target.getAttribute("data-action");
    const indexStr = target.getAttribute("data-index");
    if (action !== "remove" || indexStr === null) return;
    const index = parseInt(indexStr, 10);
    items = items.filter((_, i) => i !== index);
    renderItems();
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!firstNameInput.value || !lastNameInput.value || items.length === 0) {
        showMessage("Completa i campi obbligatori", "error");
        return;
    }

    const costs = calculateOrderCosts(items, parseFloat(discountInput.value) || 0);
    let updated: Order[];
    const previousInventory = [...inventory];

    const newReq = computeRequiredMaterials(items);
    let deltaMap = new Map<string, InventoryDelta>();

    if (editingId) {
        const oldOrder = orders.find((o) => o.id === editingId);
        if (oldOrder) {
            const oldReq = computeRequiredMaterials(oldOrder.items);
            for (const [key, data] of oldReq.entries()) {
                const existing = deltaMap.get(key);
                deltaMap.set(key, {
                    qty: (existing?.qty || 0) + data.qty,
                    colorName: existing?.colorName || data.colorName,
                });
            }
            for (const [key, data] of newReq.entries()) {
                const existing = deltaMap.get(key);
                deltaMap.set(key, {
                    qty: (existing?.qty || 0) - data.qty,
                    colorName: existing?.colorName || data.colorName,
                });
            }
        }
        updated = orders.map((o) =>
            o.id === editingId
                ? {
                      ...o,
                      clientFirstName: firstNameInput.value.trim(),
                      clientLastName: lastNameInput.value.trim(),
                      clientEmail: emailInput.value.trim(),
                      clientPhone: phoneInput.value.trim(),
                      requestedDate: requestDateInput.value,
                      deliveryDate: deliveryDateInput.value,
                      items,
                      discountPercentage: parseFloat(discountInput.value) || 0,
                      status: o.status,
                      notes: notesInput.value.trim(),
                      ...costs,
                  }
                : o
        );
    } else {
        for (const [key, data] of newReq.entries()) {
            const existing = deltaMap.get(key);
            deltaMap.set(key, {
                qty: (existing?.qty || 0) - data.qty,
                colorName: existing?.colorName || data.colorName,
            });
        }
        const newOrder: Order = {
            id: Date.now().toString(),
            clientFirstName: firstNameInput.value.trim(),
            clientLastName: lastNameInput.value.trim(),
            clientEmail: emailInput.value.trim(),
            clientPhone: phoneInput.value.trim(),
            requestedDate: requestDateInput.value,
            deliveryDate: deliveryDateInput.value,
            items,
            materialCost: costs.materialCost,
            laborCost: costs.laborCost,
            finalAmount: costs.finalAmount,
            discountPercentage: parseFloat(discountInput.value) || 0,
            status: "pending",
            notes: notesInput.value.trim(),
            createdAt: new Date().toISOString(),
        };
        updated = [...orders, newOrder];
    }

    if (deltaMap.size > 0) {
        const invResult = applyInventoryDelta(deltaMap);
        if (!invResult.ok) {
            showMessage(invResult.message || "Errore giacenza", "error");
            return;
        }
        const invSaved = await window.api.saveInventory(invResult.updated as InventoryItem[]);
        if (!invSaved) {
            showMessage("Errore salvataggio magazzino", "error");
            return;
        }
        inventory = invResult.updated as InventoryItem[];
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
        showMessage("Ordine salvato!", "success");
        clearMessage();
    } else {
        // rollback inventory if order save fails
        await window.api.saveInventory(previousInventory);
        inventory = previousInventory;
        showMessage("Errore salvataggio ordine", "error");
    }
});

ordersBody.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (action && id) {
        const order = orders.find((o) => o.id === id);
        if (!order) return;

        if (action === "delete") {
            if (!window.confirm("Eliminare questo ordine?")) return;
            const previousInventory = [...inventory];
            const oldReq = computeRequiredMaterials(order.items);
            const deltaMap = new Map<string, InventoryDelta>();
            for (const [key, data] of oldReq.entries()) {
                const existing = deltaMap.get(key);
                deltaMap.set(key, {
                    qty: (existing?.qty || 0) + data.qty,
                    colorName: existing?.colorName || data.colorName,
                });
            }
            if (deltaMap.size > 0) {
                const invResult = applyInventoryDelta(deltaMap);
                if (!invResult.ok) {
                    showMessage(invResult.message || "Errore giacenza", "error");
                    return;
                }
                const invSaved = await window.api.saveInventory(invResult.updated as InventoryItem[]);
                if (!invSaved) {
                    showMessage("Errore salvataggio magazzino", "error");
                    return;
                }
                inventory = invResult.updated as InventoryItem[];
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

    const row = (target.closest("tr") as HTMLTableRowElement | null);
    const rowId = row?.dataset.id;
    if (!rowId) return;
    const order = orders.find((o) => o.id === rowId);
    if (!order) return;
    const url = `orders.html?popup=1&view=detail&id=${order.id}`;
    window.open(url, "_blank", "width=1200,height=800");
});

const params = getPopupParams();
if (params.popup) {
    document.body.classList.add("popup");
    if (params.view === "detail") {
        document.body.classList.add("popup-detail");
        showOnly("detail");
    } else {
        document.body.classList.add("popup-form");
        showOnly("form");
    }
} else {
    showOnly("list");
}

detailCloseBtn.addEventListener("click", () => {
    window.close();
});

detailEditBtn.addEventListener("click", () => {
    const { id } = getPopupParams();
    if (!id) return;
    const url = `orders.html?popup=1&id=${id}`;
    window.open(url, "_blank", "width=1200,height=800");
});

async function updateOrderStatus(orderId: string, status: Order["status"]) {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status } : o));
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

loadData();
