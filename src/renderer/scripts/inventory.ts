import { qs, showMessage, clearMessage, formatDate, formatCurrency } from "./shared";

type InventoryItem = {
    id: string;
    materialId: string;
    colorName?: string;
    quantity: number;
    lastUpdated?: string;
};

type Material = {
    id: string;
    name: string;
    unit: "grammi" | "pezzi";
    costPerUnit: number;
};

type EconomicMovement = {
    id: string;
    date: string;
    type: "expense" | "income";
    category: string;
    amount: number;
    note?: string;
    createdAt: string;
};

type MaterialMovement = {
    id: string;
    date: string;
    direction: "in" | "out";
    materialId: string;
    materialName: string;
    colorName?: string;
    quantity: number;
    unitCost: number;
    totalValue: number;
    source: "inventory";
    note?: string;
    createdAt: string;
};

let items: InventoryItem[] = [];
let materials: Material[] = [];
let editingId: string | null = null;
let filterText = "";
let filterMaterial = "";
let sortMode = "material-asc";

const form = qs<HTMLFormElement>("#inventory-form");
const toggleBtn = qs<HTMLButtonElement>("#toggle-form");
const tbody = qs<HTMLTableSectionElement>("#inventory-body");
const searchInput = qs<HTMLInputElement>("#search-inventory");
const filterSelect = qs<HTMLSelectElement>("#filter-material");
const refreshBtn = qs<HTMLButtonElement>("#refresh-inventory");
const sortSelect = qs<HTMLSelectElement>("#sort-inventory");

const materialSelect = qs<HTMLSelectElement>("#inv-material");
const colorInput = qs<HTMLInputElement>("#inv-color");
const qtyInput = qs<HTMLInputElement>("#inv-qty");
const unitLabel = qs<HTMLDivElement>("#inv-unit-label");
const moveType = qs<HTMLSelectElement>("#inv-move-type");
const submitBtn = qs<HTMLButtonElement>("#submit-inventory");
const purchaseForm = qs<HTMLFormElement>("#purchase-form");
const purchaseMaterialSelect = qs<HTMLSelectElement>("#purchase-material");
const purchaseColorInput = qs<HTMLInputElement>("#purchase-color");
const purchaseQtyInput = qs<HTMLInputElement>("#purchase-qty");
const purchaseUnitLabel = qs<HTMLDivElement>("#purchase-unit-label");
const purchaseTotalPreview = qs<HTMLDivElement>("#purchase-total-preview");

function setFormVisible(visible: boolean) {
    form.classList.toggle("hidden", !visible);
    toggleBtn.textContent = visible
        ? "Annulla"
        : "+ Correzione Giacenza";
}

function resetForm() {
    materialSelect.value = "";
    colorInput.value = "";
    qtyInput.value = "0";
    unitLabel.textContent = "Unita: -";
    moveType.value = "carico";
    submitBtn.textContent = "Salva Correzione";
    editingId = null;
}

function updatePurchasePreview() {
    const mat = getMaterialById(purchaseMaterialSelect.value);
    const qty = parseFloat(purchaseQtyInput.value) || 0;
    const label = mat?.unit === "pezzi" ? "pz" : "g";
    purchaseUnitLabel.textContent = mat ? `Unita: ${label}` : "Unita: -";
    if (!mat || qty <= 0) {
        purchaseTotalPreview.textContent = formatCurrency(0);
        return;
    }
    const total = qty * mat.costPerUnit;
    purchaseTotalPreview.textContent = `${formatCurrency(total, 2)}`;
}

async function loadData() {
    try {
        items = await window.api.getInventory();
        materials = await window.api.getMaterials();
        renderMaterialOptions();
        renderTable();
    } catch {
        showMessage("Errore nel caricamento dei dati", "error");
    }
}

function renderMaterialOptions() {
    materialSelect.innerHTML = '<option value="">Seleziona un materiale</option>';
    purchaseMaterialSelect.innerHTML =
        '<option value="">Seleziona un materiale</option>';
    filterSelect.innerHTML = '<option value="">Tutti i materiali</option>';
    materials.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name;
        materialSelect.appendChild(opt);
        const optPurchase = document.createElement("option");
        optPurchase.value = m.id;
        optPurchase.textContent = m.name;
        purchaseMaterialSelect.appendChild(optPurchase);
        const optFilter = document.createElement("option");
        optFilter.value = m.id;
        optFilter.textContent = m.name;
        filterSelect.appendChild(optFilter);
    });
}

function getMaterialById(id: string) {
    return materials.find((m) => m.id === id);
}

function normalizeColor(value?: string) {
    return (value || "").trim().toLowerCase();
}

function renderTable() {
    tbody.innerHTML = "";
    const empty = document.getElementById("inventory-empty");
    const filtered = items.filter((i) => {
        const mat = getMaterialById(i.materialId);
        const text = `${mat?.name || ""} ${i.colorName || ""}`.toLowerCase();
        const matchesText = text.includes(filterText);
        const matchesMaterial = !filterMaterial || i.materialId === filterMaterial;
        return matchesText && matchesMaterial;
    });
    filtered.sort((a, b) => {
        const matA = getMaterialById(a.materialId);
        const matB = getMaterialById(b.materialId);
        const nameA = matA?.name || "";
        const nameB = matB?.name || "";
        const colorA = (a.colorName || "").toLowerCase();
        const colorB = (b.colorName || "").toLowerCase();
        const costA = matA?.costPerUnit || 0;
        const costB = matB?.costPerUnit || 0;
        const valueA = costA * a.quantity;
        const valueB = costB * b.quantity;
        switch (sortMode) {
            case "material-desc":
                return nameB.localeCompare(nameA);
            case "color-asc":
                return colorA.localeCompare(colorB);
            case "color-desc":
                return colorB.localeCompare(colorA);
            case "qty-asc":
                return a.quantity - b.quantity;
            case "qty-desc":
                return b.quantity - a.quantity;
            case "cost-asc":
                return costA - costB;
            case "cost-desc":
                return costB - costA;
            case "value-asc":
                return valueA - valueB;
            case "value-desc":
                return valueB - valueA;
            case "material-asc":
            default:
                return nameA.localeCompare(nameB);
        }
    });
    filtered.forEach((i) => {
        const mat = getMaterialById(i.materialId);
        const unitLabelText = mat?.unit === "pezzi" ? "pz" : "g";
        const cost = mat?.costPerUnit || 0;
        const total = cost * i.quantity;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${mat?.name || "-"}</td>
            <td>${i.colorName || "-"}</td>
            <td>${i.quantity.toFixed(0)} ${unitLabelText}</td>
            <td>${mat?.unit || "-"}</td>
            <td>${formatCurrency(cost, 3)}</td>
            <td>${formatCurrency(total, 2)}</td>
            <td>${formatDate(i.lastUpdated || "")}</td>
            <td>
                <button class="btn-small" data-action="edit" data-id="${i.id}">Modifica</button>
                <button class="btn-small btn-danger" data-action="delete" data-id="${i.id}">Elimina</button>
            </td>
        `;
        tbody.appendChild(tr);
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

materialSelect.addEventListener("change", () => {
    const mat = getMaterialById(materialSelect.value);
    const label = mat?.unit === "pezzi" ? "pz" : "g";
    unitLabel.textContent = mat ? `Unita: ${label}` : "Unita: -";
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!materialSelect.value || !qtyInput.value) {
        showMessage("Completa tutti i campi richiesti", "error");
        return;
    }

    const colorValue = colorInput.value.trim();
    const qtyValue = parseFloat(qtyInput.value) || 0;
    const now = new Date().toISOString();
    const material = getMaterialById(materialSelect.value);
    const isEditCorrection = !!editingId;

    let updated: InventoryItem[];
    if (editingId) {
        const oldRow = items.find((i) => i.id === editingId);
        if (!oldRow) return;
        updated = items.map((i) =>
            i.id === editingId
                ? {
                      ...i,
                      materialId: materialSelect.value,
                      colorName: colorValue || undefined,
                      quantity: qtyValue,
                      lastUpdated: now,
                  }
                : i
        );
    } else {
        if (moveType.value === "carico") {
            showMessage(
                "Per il carico reale usa il pannello Acquisto Materiale",
                "error",
            );
            return;
        }
        // merge if same material+color exists
        const existing = items.find((i) =>
            i.materialId === materialSelect.value &&
            normalizeColor(i.colorName) === normalizeColor(colorValue)
        );
        const sign = moveType.value === "scarico" ? -1 : 1;
        if (existing) {
            const nextQty = existing.quantity + qtyValue * sign;
            if (nextQty < 0) {
                showMessage("Giacenza insufficiente per lo scarico", "error");
                return;
            }
            updated = items.map((i) =>
                i.id === existing.id
                    ? { ...i, quantity: nextQty, lastUpdated: now }
                    : i
            );
        } else {
            if (sign < 0) {
                showMessage("Giacenza non esistente per lo scarico", "error");
                return;
            }
            updated = [
                ...items,
                {
                    id: Date.now().toString(),
                    materialId: materialSelect.value,
                    colorName: colorValue || undefined,
                    quantity: qtyValue,
                    lastUpdated: now,
                },
            ];
        }
    }

    const success = await window.api.saveInventory(updated);
    if (success) {
        if (!isEditCorrection && material && qtyValue > 0) {
            const materialMoves = await window.api.getMaterialMovements();
            const materialMove: MaterialMovement = {
                id: `mat-move-${Date.now()}`,
                date: now.slice(0, 10),
                direction: "out",
                materialId: material.id,
                materialName: material.name,
                colorName: colorValue || undefined,
                quantity: parseFloat(qtyValue.toFixed(3)),
                unitCost: parseFloat(material.costPerUnit.toFixed(4)),
                totalValue: parseFloat((qtyValue * material.costPerUnit).toFixed(2)),
                source: "inventory",
                note: "Uscita materiale da magazzino (movimento manuale)",
                createdAt: now,
            };
            const savedMaterialMoves = await window.api.saveMaterialMovements([
                ...materialMoves,
                materialMove,
            ]);
            if (!savedMaterialMoves) {
                showMessage(
                    "Giacenza salvata, ma errore registrazione movimento materiale",
                    "error",
                );
                return;
            }
        }

        items = updated;
        renderTable();
        setFormVisible(false);
        resetForm();
        showMessage(
            isEditCorrection
                ? "Correzione giacenza salvata (non contabilizzata)"
                : "Movimento scarico salvato",
            "success",
        );
        clearMessage();
    }
});

purchaseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!purchaseMaterialSelect.value || !purchaseQtyInput.value) {
        showMessage("Completa tutti i campi acquisto richiesti", "error");
        return;
    }

    const material = getMaterialById(purchaseMaterialSelect.value);
    if (!material) {
        showMessage("Materiale non valido", "error");
        return;
    }
    const colorValue = purchaseColorInput.value.trim();
    const qtyValue = parseFloat(purchaseQtyInput.value) || 0;
    if (qtyValue <= 0) {
        showMessage("Quantita acquisto non valida", "error");
        return;
    }

    const now = new Date().toISOString();
    const existing = items.find(
        (i) =>
            i.materialId === material.id &&
            normalizeColor(i.colorName) === normalizeColor(colorValue),
    );
    let updated: InventoryItem[];
    if (existing) {
        updated = items.map((i) =>
            i.id === existing.id
                ? {
                      ...i,
                      quantity: i.quantity + qtyValue,
                      lastUpdated: now,
                  }
                : i,
        );
    } else {
        updated = [
            ...items,
            {
                id: Date.now().toString(),
                materialId: material.id,
                colorName: colorValue || undefined,
                quantity: qtyValue,
                lastUpdated: now,
            },
        ];
    }

    const savedInventory = await window.api.saveInventory(updated);
    if (!savedInventory) {
        showMessage("Errore salvataggio giacenza", "error");
        return;
    }

    const expenseAmount = qtyValue * material.costPerUnit;
    const economicMoves = await window.api.getEconomicMovements();
    const economicItem: EconomicMovement = {
        id: `purchase-${Date.now()}`,
        date: now.slice(0, 10),
        type: "expense",
        category: "inventory-load",
        amount: parseFloat(expenseAmount.toFixed(2)),
        note: `Acquisto materiale: ${material.name}${colorValue ? ` (${colorValue})` : ""}, qty ${qtyValue}`,
        createdAt: now,
    };
    const savedEconomic = await window.api.saveEconomicMovements([
        ...economicMoves,
        economicItem,
    ]);
    if (!savedEconomic) {
        showMessage(
            "Acquisto registrato in giacenza, ma errore contabilizzazione spesa",
            "error",
        );
        return;
    }

    const materialMoves = await window.api.getMaterialMovements();
    const materialMove: MaterialMovement = {
        id: `mat-move-${Date.now()}`,
        date: now.slice(0, 10),
        direction: "in",
        materialId: material.id,
        materialName: material.name,
        colorName: colorValue || undefined,
        quantity: parseFloat(qtyValue.toFixed(3)),
        unitCost: parseFloat(material.costPerUnit.toFixed(4)),
        totalValue: parseFloat((qtyValue * material.costPerUnit).toFixed(2)),
        source: "inventory",
        note: "Entrata materiale da acquisto",
        createdAt: now,
    };
    const savedMaterialMoves = await window.api.saveMaterialMovements([
        ...materialMoves,
        materialMove,
    ]);
    if (!savedMaterialMoves) {
        showMessage(
            "Acquisto registrato, ma errore salvataggio movimento materiale",
            "error",
        );
        return;
    }

    items = updated;
    renderTable();
    purchaseMaterialSelect.value = "";
    purchaseColorInput.value = "";
    purchaseQtyInput.value = "0";
    updatePurchasePreview();
    showMessage("Acquisto registrato e contabilizzato", "success");
    clearMessage();
});

tbody.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (!action || !id) return;

    const row = items.find((i) => i.id === id);
    if (!row) return;

    if (action === "edit") {
        editingId = id;
        materialSelect.value = row.materialId;
        colorInput.value = row.colorName || "";
        qtyInput.value = row.quantity.toString();
        const mat = getMaterialById(row.materialId);
        unitLabel.textContent = mat ? `Unita: ${mat.unit === "pezzi" ? "pz" : "g"}` : "Unita: -";
        submitBtn.textContent = "Salva Correzione";
        setFormVisible(true);
    }

    if (action === "delete") {
        if (!window.confirm("Eliminare questa giacenza?")) return;
        const updated = items.filter((i) => i.id !== id);
        const success = await window.api.saveInventory(updated);
        if (success) {
            items = updated;
            renderTable();
            showMessage("Giacenza eliminata!", "success");
            clearMessage();
        }
    }
});

searchInput?.addEventListener("input", () => {
    filterText = searchInput.value.trim().toLowerCase();
    renderTable();
});

filterSelect?.addEventListener("change", () => {
    filterMaterial = filterSelect.value;
    renderTable();
});

sortSelect?.addEventListener("change", () => {
    sortMode = sortSelect.value;
    renderTable();
});

refreshBtn?.addEventListener("click", () => {
    loadData();
});

purchaseMaterialSelect.addEventListener("change", updatePurchasePreview);
purchaseQtyInput.addEventListener("input", updatePurchasePreview);

loadData();

