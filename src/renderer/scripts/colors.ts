import { qs, showMessage, clearMessage, formatDate } from "./shared";

type Color = {
    id: string;
    materialId: string;
    colorName: string;
    colorCode?: string;
    stockInGramms: number;
    lastUpdated: string;
};

type Material = {
    id: string;
    name: string;
};

let colors: Color[] = [];
let materials: Material[] = [];
let editingId: string | null = null;

const form = qs<HTMLFormElement>("#color-form");
const toggleBtn = qs<HTMLButtonElement>("#toggle-form");
const tbody = qs<HTMLTableSectionElement>("#colors-body");

const materialSelect = qs<HTMLSelectElement>("#color-material");
const nameInput = qs<HTMLInputElement>("#color-name");
const codeInput = qs<HTMLInputElement>("#color-code");
const stockInput = qs<HTMLInputElement>("#color-stock");
const submitBtn = qs<HTMLButtonElement>("#submit-color");

function setFormVisible(visible: boolean) {
    form.classList.toggle("hidden", !visible);
    toggleBtn.textContent = visible ? "Annulla" : "+ Nuovo Colore";
}

function resetForm() {
    materialSelect.value = "";
    nameInput.value = "";
    codeInput.value = "";
    stockInput.value = "0";
    submitBtn.textContent = "Aggiungi Colore";
    editingId = null;
}

async function loadData() {
    try {
        colors = await window.api.getColors();
        materials = await window.api.getMaterials();
        renderMaterialOptions();
        renderTable();
    } catch {
        showMessage("Errore nel caricamento dei dati", "error");
    }
}

function renderMaterialOptions() {
    materialSelect.innerHTML = '<option value="">Seleziona un materiale</option>';
    materials.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name;
        materialSelect.appendChild(opt);
    });
}

function renderTable() {
    tbody.innerHTML = "";
    const empty = document.getElementById("colors-empty");
    colors.forEach((c) => {
        const materialName = materials.find((m) => m.id === c.materialId)?.name || "-";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${materialName}</td>
            <td>${c.colorName}</td>
            <td>${c.colorCode || "-"}</td>
            <td>${c.stockInGramms.toFixed(0)}</td>
            <td>${formatDate(c.lastUpdated)}</td>
            <td>
                <button class="btn-small" data-action="edit" data-id="${c.id}">Modifica</button>
                <button class="btn-small btn-danger" data-action="delete" data-id="${c.id}">Elimina</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    if (empty) {
        empty.classList.toggle("hidden", colors.length > 0);
    }
}

toggleBtn.addEventListener("click", () => {
    const visible = form.classList.contains("hidden");
    if (visible) resetForm();
    setFormVisible(visible);
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!materialSelect.value || !nameInput.value || !stockInput.value) {
        showMessage("Completa tutti i campi richiesti", "error");
        return;
    }

    const data: Color = {
        id: editingId ?? Date.now().toString(),
        materialId: materialSelect.value,
        colorName: nameInput.value.trim(),
        colorCode: codeInput.value.trim(),
        stockInGramms: parseFloat(stockInput.value) || 0,
        lastUpdated: new Date().toISOString(),
    };

    let updated: Color[];
    if (editingId) {
        updated = colors.map((c) => (c.id === editingId ? data : c));
    } else {
        updated = [...colors, data];
    }

    const success = await window.api.saveColors(updated);
    if (success) {
        colors = updated;
        renderTable();
        setFormVisible(false);
        resetForm();
        showMessage("Colore salvato!", "success");
        clearMessage();
    }
});

tbody.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (!action || !id) return;

    const color = colors.find((c) => c.id === id);
    if (!color) return;

    if (action === "edit") {
        editingId = id;
        materialSelect.value = color.materialId;
        nameInput.value = color.colorName;
        codeInput.value = color.colorCode || "";
        stockInput.value = color.stockInGramms.toString();
        submitBtn.textContent = "Salva Modifiche";
        setFormVisible(true);
    }

    if (action === "delete") {
        if (!window.confirm("Eliminare questo colore?")) return;
        const updated = colors.filter((c) => c.id !== id);
        const success = await window.api.saveColors(updated);
        if (success) {
            colors = updated;
            renderTable();
            showMessage("Colore eliminato!", "success");
            clearMessage();
        }
    }
});

loadData();
