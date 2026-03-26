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
    composition: { materialId: string; description?: string; quantity: number }[];
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
};

type IncomeMovement = {
    id: string;
    orderId: string;
    amount: number;
    receivedDate: string;
    createdAt: string;
};

let orders: Order[] = [];
let articles: Article[] = [];
let materials: Material[] = [];
let laborConfig: LaborConfig = { hourlyRate: 4 };
let filterText = "";
let filterStatus = "";

const refreshBtn = qs<HTMLButtonElement>("#refresh-production");
const productionBody = qs<HTMLTableSectionElement>("#production-body");
const searchInput = qs<HTMLInputElement>("#search-production");
const statusFilter = qs<HTMLSelectElement>("#filter-production-status");
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
const detailProfitWithLabor = qs<HTMLDivElement>("#production-profit-with-labor");
const detailProcessBtn = qs<HTMLButtonElement>("#production-process");
const detailCloseBtn = qs<HTMLButtonElement>("#production-close");
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

function getArticleCode(id: string) {
    return articles.find((a) => a.id === id)?.code || "-";
}

function getArticleName(id: string) {
    return articles.find((a) => a.id === id)?.name || "-";
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
    const costs = calculateOrderCosts(order.items, order.discountPercentage);
    return costs.finalAmount;
}

function renderProduction() {
    productionBody.innerHTML = "";
    const empty = document.getElementById("production-empty");
    const filtered = orders.filter((order) => {
        if (order.status !== "confirmed" && order.status !== "processed") return false;
        const articleNames = order.items
            .map((i) => `${getArticleCode(i.articleId)} ${getArticleName(i.articleId)}`)
            .join(" ");
        const text = `${getOrderFullName(order)} ${order.clientEmail || ""} ${articleNames}`.toLowerCase();
        const matchesText = text.includes(filterText);
        const matchesStatus = !filterStatus || order.status === filterStatus;
        return matchesText && matchesStatus;
    });

    filtered.forEach((order) => {
        const costs = calculateOrderCosts(order.items, order.discountPercentage);
        const saleTotal = getOrderSaleTotal(order);
        const soldAmount =
            order.status === "processed" && typeof order.paymentReceived === "number"
                ? order.paymentReceived
                : null;
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

function renderDetail(order: Order) {
    detailTitle.textContent = `Dettaglio Produzione`;
    detailClient.textContent = getOrderFullName(order);
    detailRequestDate.textContent = formatDate(order.requestedDate || "");
    detailDeliveryDate.textContent = formatDate(order.deliveryDate || "");
    detailStatus.textContent = order.status;
    detailPaymentDate.textContent = order.processedDate ? formatDate(order.processedDate) : "-";
    detailPaymentAmount.textContent =
        typeof order.paymentReceived === "number" ? `EUR ${order.paymentReceived.toFixed(2)}` : "-";

    const costs = calculateOrderCosts(order.items, order.discountPercentage);
    const saleTotal = getOrderSaleTotal(order);
    const profitNoLabor = saleTotal - costs.materialCost;
    const profitWithLabor = saleTotal - costs.materialCost - costs.laborCost;
    detailProfitNoLabor.textContent = `EUR ${profitNoLabor.toFixed(2)}`;
    detailProfitWithLabor.textContent = `EUR ${profitWithLabor.toFixed(2)}`;

    detailItemsBody.innerHTML = order.items
        .map(
            (item) => `
        <tr>
            <td>${getArticleCode(item.articleId)}</td>
            <td>${getArticleName(item.articleId)}</td>
            <td>${item.quantity}</td>
            <td>${item.packaging ? "Si" : "No"}</td>
            <td>${formatItemColors(item)}</td>
            <td>EUR ${item.unitPrice.toFixed(2)}</td>
            <td>EUR ${(item.unitPrice * item.quantity).toFixed(2)}</td>
        </tr>
    `
        )
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
        articles = await window.api.getArticles();
        materials = await window.api.getMaterials();
        laborConfig = await window.api.getLaborConfig();
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

productionBody.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const row = target.closest("tr") as HTMLTableRowElement | null;
    const rowId = row?.dataset.id;
    if (!rowId) return;
    const url = `orders-production.html?popup=1&view=detail&id=${rowId}`;
    window.open(url, "_blank", "width=1200,height=800");
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

    const updatedOrders = orders.map((o) =>
        o.id === id
            ? {
                  ...o,
                  status: "processed",
                  processedDate: date,
                  paymentReceived: amount,
              }
            : o
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
    const moveSaved = await window.api.saveIncomeMovements([...movements, newMovement]);
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
