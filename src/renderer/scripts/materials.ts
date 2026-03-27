import { qs, showMessage, clearMessage } from "./shared";

type Material = {
    id: string;
    name: string;
    costPerUnit: number;
    sellingPricePerUnit: number;
    stockQuantity: number;
    unit: "grammi" | "pezzi";
    lastUpdated?: string;
};

let materials: Material[] = [];
let editingId: string | null = null;
let filterText = "";
let sortMode = "name-asc";

const form = qs<HTMLFormElement>("#material-form");
const toggleBtn = qs<HTMLButtonElement>("#toggle-form");
const tbody = qs<HTMLTableSectionElement>("#materials-body");
const searchInput = qs<HTMLInputElement>("#search-materials");
const refreshBtn = qs<HTMLButtonElement>("#refresh-materials");
const sortSelect = qs<HTMLSelectElement>("#sort-materials");

const nameInput = qs<HTMLInputElement>("#mat-name");
const costInput = qs<HTMLInputElement>("#mat-cost");
const sellingInput = qs<HTMLInputElement>("#mat-selling");
const unitSelect = qs<HTMLSelectElement>("#mat-unit");
const submitBtn = qs<HTMLButtonElement>("#submit-material");

function setFormVisible(visible: boolean) {
    form.classList.toggle("hidden", !visible);
    toggleBtn.textContent = visible ? "Annulla" : "Nuovo Materiale";
}

function resetForm() {
    nameInput.value = "";
    costInput.value = "0";
    sellingInput.value = "0";
    unitSelect.value = "grammi";
    submitBtn.textContent = "Aggiungi Materiale";
    editingId = null;
}

async function loadMaterials() {
    try {
        materials = await window.api.getMaterials();
        renderTable();
    } catch {
        showMessage("Errore nel caricamento dei materiali", "error");
    }
}

function renderTable() {
    tbody.innerHTML = "";
    const empty = document.getElementById("materials-empty");
    const filtered = materials.filter((m) =>
        m.name.toLowerCase().includes(filterText)
    );
    filtered.sort((a, b) => {
        switch (sortMode) {
            case "name-desc":
                return b.name.localeCompare(a.name);
            case "cost-asc":
                return a.costPerUnit - b.costPerUnit;
            case "cost-desc":
                return b.costPerUnit - a.costPerUnit;
            case "selling-asc":
                return a.sellingPricePerUnit - b.sellingPricePerUnit;
            case "selling-desc":
                return b.sellingPricePerUnit - a.sellingPricePerUnit;
            case "unit-asc":
                return a.unit.localeCompare(b.unit);
            case "unit-desc":
                return b.unit.localeCompare(a.unit);
            case "name-asc":
            default:
                return a.name.localeCompare(b.name);
        }
    });
    filtered.forEach((m) => {
        const unitLabel = m.unit === "pezzi" ? "€/pz" : "€/g";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${m.name}</td>
            <td>${m.costPerUnit.toFixed(3)} ${unitLabel}</td>
            <td>${m.sellingPricePerUnit.toFixed(3)} ${unitLabel}</td>
            <td>${m.unit}</td>
            <td>
                <button class="btn-small" data-action="edit" data-id="${m.id}">Modifica</button>
                <button class="btn-small btn-danger" data-action="delete" data-id="${m.id}">Elimina</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    if (empty) {
        empty.classList.toggle("hidden", filtered.length > 0);
    }
}

searchInput?.addEventListener("input", () => {
    filterText = searchInput.value.trim().toLowerCase();
    renderTable();
});

sortSelect?.addEventListener("change", () => {
    sortMode = sortSelect.value;
    renderTable();
});

refreshBtn?.addEventListener("click", () => {
    loadMaterials();
});

toggleBtn.addEventListener("click", () => {
    const visible = form.classList.contains("hidden");
    if (visible) {
        resetForm();
    }
    setFormVisible(visible);
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!nameInput.value || !costInput.value) {
        showMessage("Completa tutti i campi richiesti", "error");
        return;
    }

    const data: Material = {
        id: editingId ?? Date.now().toString(),
        name: nameInput.value.trim(),
        costPerUnit: parseFloat(costInput.value) || 0,
        sellingPricePerUnit: parseFloat(sellingInput.value) || 0,
        stockQuantity: 0,
        unit: unitSelect.value as "grammi" | "pezzi",
        lastUpdated: new Date().toISOString(),
    };

    let updated: Material[];
    if (editingId) {
        updated = materials.map((m) => (m.id === editingId ? data : m));
    } else {
        updated = [...materials, data];
    }

    const success = await window.api.saveMaterials(updated);
    if (success) {
        materials = updated;
        renderTable();
        setFormVisible(false);
        resetForm();
        showMessage("Materiale salvato!", "success");
        clearMessage();
    }
});

tbody.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (!action || !id) return;

    const material = materials.find((m) => m.id === id);
    if (!material) return;

    if (action === "edit") {
        editingId = id;
        nameInput.value = material.name;
        costInput.value = material.costPerUnit.toString();
        sellingInput.value = material.sellingPricePerUnit.toString();
        unitSelect.value = material.unit;
        submitBtn.textContent = "Salva Modifiche";
        setFormVisible(true);
    }

    if (action === "delete") {
        if (!window.confirm("Eliminare questo materiale?")) return;
        const updated = materials.filter((m) => m.id !== id);
        const success = await window.api.saveMaterials(updated);
        if (success) {
            materials = updated;
            renderTable();
            showMessage("Materiale eliminato!", "success");
            clearMessage();
        }
    }
});

loadMaterials();
