import { qs, showMessage, clearMessage } from "./shared";

type Order = {
    finalAmount: number;
    materialCost: number;
    laborCost: number;
    status: string;
    createdAt: string;
};

type DashboardConfig = {
    salesTarget: number;
    lastUpdated: string;
};

let orders: Order[] = [];
let salesTarget = 10000;

const kpiOrders = qs<HTMLDivElement>("#kpi-orders");
const kpiProfit = qs<HTMLDivElement>("#kpi-profit");
const kpiRevenue = qs<HTMLDivElement>("#kpi-revenue");
const kpiCost = qs<HTMLDivElement>("#kpi-cost");

const targetDisplay = qs<HTMLDivElement>("#target-display");
const targetEdit = qs<HTMLDivElement>("#target-edit");
const targetInput = qs<HTMLInputElement>("#target-input");
const targetEditBtn = qs<HTMLButtonElement>("#target-edit-btn");
const targetSave = qs<HTMLButtonElement>("#target-save");
const targetCancel = qs<HTMLButtonElement>("#target-cancel");
const targetProgress = qs<HTMLDivElement>("#target-progress");
const targetNote = qs<HTMLDivElement>("#target-note");

const statOrders = qs<HTMLTableCellElement>("#stat-orders");
const statRevenue = qs<HTMLTableCellElement>("#stat-revenue");
const statCost = qs<HTMLTableCellElement>("#stat-cost");
const statProfit = qs<HTMLTableCellElement>("#stat-profit");
const statMargin = qs<HTMLTableCellElement>("#stat-margin");
const statTarget = qs<HTMLTableCellElement>("#stat-target");

async function loadData() {
    try {
        orders = await window.api.getOrders();
        const config = await window.api.getDashboardConfig();
        salesTarget = config.salesTarget || 10000;
        targetDisplay.textContent = `EUR ${salesTarget.toFixed(2)}`;
        targetInput.value = salesTarget.toString();
        renderKpi();
    } catch {
        showMessage("Errore nel caricamento dei dati", "error");
    }
}

function getKpi() {
    const completedOrders = orders.filter((o) => o.status === "processed");
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthOrders = completedOrders.filter((o) => {
        const d = new Date(o.createdAt);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const totalRevenue = monthOrders.reduce((sum, o) => {
        if (o.status === "processed" && typeof (o as any).paymentReceived === "number") {
            return sum + (o as any).paymentReceived;
        }
        return sum + o.finalAmount;
    }, 0);
    const totalCost = monthOrders.reduce(
        (sum, o) => sum + o.materialCost + o.laborCost,
        0
    );
    const totalProfit = totalRevenue - totalCost;
    const percentageReached = salesTarget > 0 ? (totalRevenue / salesTarget) * 100 : 0;

    return {
        totalOrders: monthOrders.length,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        percentageReached: parseFloat(percentageReached.toFixed(1)),
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
    statMargin.textContent = kpi.totalRevenue > 0
        ? `${((kpi.totalProfit / kpi.totalRevenue) * 100).toFixed(1)}%`
        : "0%";
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

    const config: DashboardConfig = {
        salesTarget: newTarget,
        lastUpdated: new Date().toISOString(),
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
