import { qs, showMessage, clearMessage, formatDate } from "./shared";

type OrderItem = {
    articleId: string;
    quantity: number;
    unitPrice: number;
};

type Order = {
    id: string;
    clientName: string;
    clientEmail?: string;
    items: OrderItem[];
    materialCost: number;
    laborCost: number;
    discountPercentage: number;
    finalAmount: number;
    createdAt: string;
    status: "draft" | "sent" | "accepted" | "rejected" | "completed";
    notes?: string;
};

type Article = {
    id: string;
    code: string;
    name: string;
    composition: { materialId: string; quantityGramms: number }[];
    laborHoursRequired: number;
    marginPercentage: number;
};

type Material = {
    id: string;
    costPerGramm: number;
};

type LaborConfig = {
    hourlyRate: number;
};

let orders: Order[] = [];
let articles: Article[] = [];
let materials: Material[] = [];
let laborConfig: LaborConfig = { hourlyRate: 4 };
let editingId: string | null = null;
let items: OrderItem[] = [];
let detailsOpenId: string | null = null;

const form = qs<HTMLFormElement>("#order-form");
const toggleBtn = qs<HTMLButtonElement>("#toggle-form");
const ordersBody = qs<HTMLTableSectionElement>("#orders-body");
const itemsBody = qs<HTMLTableSectionElement>("#items-body");

const clientInput = qs<HTMLInputElement>("#order-client");
const emailInput = qs<HTMLInputElement>("#order-email");
const discountInput = qs<HTMLInputElement>("#order-discount");
const statusSelect = qs<HTMLSelectElement>("#order-status");
const notesInput = qs<HTMLTextAreaElement>("#order-notes");
const submitBtn = qs<HTMLButtonElement>("#submit-order");

const itemArticle = qs<HTMLSelectElement>("#item-article");
const itemQty = qs<HTMLInputElement>("#item-qty");
const addItemBtn = qs<HTMLButtonElement>("#add-item");

function setFormVisible(visible: boolean) {
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

function getArticleName(id: string) {
    return articles.find((a) => a.id === id)?.name || "-";
}

function getArticleCode(id: string) {
    return articles.find((a) => a.id === id)?.code || "-";
}

function calculateArticlePrice(article: Article) {
    let materialCost = 0;
    for (const comp of article.composition) {
        const material = materials.find((m) => m.id === comp.materialId);
        if (material) {
            materialCost += material.costPerGramm * comp.quantityGramms;
        }
    }
    const laborCost = article.laborHoursRequired * laborConfig.hourlyRate;
    const totalCost = materialCost + laborCost;
    const finalPrice = totalCost * (1 + article.marginPercentage / 100);
    return parseFloat(finalPrice.toFixed(2));
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
                materialCost += material.costPerGramm * comp.quantityGramms * item.quantity;
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

    orders.forEach((order) => {
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
        empty.classList.toggle("hidden", orders.length > 0);
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
        unitPrice: calculateArticlePrice(article),
    });
    itemArticle.value = "";
    itemQty.value = "1";
    renderItems();
    showMessage("Articolo aggiunto!", "success");
    clearMessage();
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
    if (!clientInput.value || items.length === 0) {
        showMessage("Completa i campi obbligatori", "error");
        return;
    }

    const costs = calculateOrderCosts(items, parseFloat(discountInput.value) || 0);
    let updated: Order[];

    if (editingId) {
        updated = orders.map((o) =>
            o.id === editingId
                ? {
                      ...o,
                      clientName: clientInput.value.trim(),
                      clientEmail: emailInput.value.trim(),
                      items,
                      discountPercentage: parseFloat(discountInput.value) || 0,
                      status: statusSelect.value as Order["status"],
                      notes: notesInput.value.trim(),
                      ...costs,
                  }
                : o
        );
    } else {
        const newOrder: Order = {
            id: Date.now().toString(),
            clientName: clientInput.value.trim(),
            clientEmail: emailInput.value.trim(),
            items,
            materialCost: costs.materialCost,
            laborCost: costs.laborCost,
            finalAmount: costs.finalAmount,
            discountPercentage: parseFloat(discountInput.value) || 0,
            status: statusSelect.value as Order["status"],
            notes: notesInput.value.trim(),
            createdAt: new Date().toISOString(),
        };
        updated = [...orders, newOrder];
    }

    const success = await window.api.saveOrders(updated);
    if (success) {
        orders = updated;
        renderOrders();
        setFormVisible(false);
        resetForm();
        showMessage("Ordine salvato!", "success");
        clearMessage();
    }
});

ordersBody.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
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
        const updated = orders.filter((o) => o.id !== id);
        const success = await window.api.saveOrders(updated);
        if (success) {
            orders = updated;
            renderOrders();
            showMessage("Ordine eliminato!", "success");
            clearMessage();
        }
    }
});

loadData();
