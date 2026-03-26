import { qs, showMessage, clearMessage } from "./shared";

type Material = {
    id: string;
    name: string;
    costPerGramm: number;
    sellingPricePerGramm: number;
    currentStockGramms: number;
    unit: "grammi" | "pezzi";
    lastUpdated: string;
};

let materials: Material[] = [];
let editingId: string | null = null;

const form = qs<HTMLFormElement>("#material-form");
const toggleBtn = qs<HTMLButtonElement>("#toggle-form");
const tbody = qs<HTMLTableSectionElement>("#materials-body");

const nameInput = qs<HTMLInputElement>("#mat-name");
const costInput = qs<HTMLInputElement>("#mat-cost");
const sellingInput = qs<HTMLInputElement>("#mat-selling");
const stockInput = qs<HTMLInputElement>("#mat-stock");
const unitSelect = qs<HTMLSelectElement>("#mat-unit");
const submitBtn = qs<HTMLButtonElement>("#submit-material");

function setFormVisible(visible: boolean) {
    form.classList.toggle("hidden", !visible);
    toggleBtn.textContent = visible ? "Annulla" : "+ Nuovo Materiale";
}

function resetForm() {
    nameInput.value = "";
    costInput.value = "0";
    sellingInput.value = "0";
    stockInput.value = "0";
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
    materials.forEach((m) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${m.name}</td>
            <td>${m.costPerGramm.toFixed(3)}</td>
            <td>${m.sellingPricePerGramm.toFixed(3)}</td>
            <td>${m.currentStockGramms.toFixed(0)}</td>
            <td>${m.unit}</td>
            <td>
                <button class="btn-small" data-action="edit" data-id="${m.id}">Modifica</button>
                <button class="btn-small btn-danger" data-action="delete" data-id="${m.id}">Elimina</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    if (empty) {
        empty.classList.toggle("hidden", materials.length > 0);
    }
}

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
        costPerGramm: parseFloat(costInput.value) || 0,
        sellingPricePerGramm: parseFloat(sellingInput.value) || 0,
        currentStockGramms: parseFloat(stockInput.value) || 0,
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
        costInput.value = material.costPerGramm.toString();
        sellingInput.value = material.sellingPricePerGramm.toString();
        stockInput.value = material.currentStockGramms.toString();
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
