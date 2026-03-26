import { qs, showMessage, clearMessage } from "./shared";

type ArticleComposition = {
    materialId: string;
    colorId: string;
    quantityGramms: number;
};

type Article = {
    id: string;
    code: string;
    name: string;
    composition: ArticleComposition[];
    laborHoursRequired: number;
    marginPercentage: number;
    createdAt: string;
};

type Material = {
    id: string;
    name: string;
    costPerGramm: number;
};

type Color = {
    id: string;
    materialId: string;
    colorName: string;
};

let articles: Article[] = [];
let materials: Material[] = [];
let colors: Color[] = [];
let editingId: string | null = null;
let composition: ArticleComposition[] = [];

const form = qs<HTMLFormElement>("#article-form");
const toggleBtn = qs<HTMLButtonElement>("#toggle-form");
const tbody = qs<HTMLTableSectionElement>("#articles-body");
const compBody = qs<HTMLTableSectionElement>("#composition-body");
const compCost = qs<HTMLDivElement>("#composition-cost");

const codeInput = qs<HTMLInputElement>("#article-code");
const nameInput = qs<HTMLInputElement>("#article-name");
const laborInput = qs<HTMLInputElement>("#article-labor");
const marginInput = qs<HTMLInputElement>("#article-margin");
const submitBtn = qs<HTMLButtonElement>("#submit-article");

const compMaterial = qs<HTMLSelectElement>("#comp-material");
const compColor = qs<HTMLSelectElement>("#comp-color");
const compQty = qs<HTMLInputElement>("#comp-qty");
const addCompBtn = qs<HTMLButtonElement>("#add-comp");

function setFormVisible(visible: boolean) {
    form.classList.toggle("hidden", !visible);
    toggleBtn.textContent = visible ? "Annulla" : "+ Nuovo Articolo";
}

function resetForm() {
    codeInput.value = "";
    nameInput.value = "";
    laborInput.value = "0";
    marginInput.value = "0";
    composition = [];
    compMaterial.value = "";
    compColor.value = "";
    compColor.disabled = true;
    compQty.value = "0";
    submitBtn.textContent = "Aggiungi Articolo";
    editingId = null;
    renderComposition();
}

async function loadData() {
    try {
        articles = await window.api.getArticles();
        materials = await window.api.getMaterials();
        colors = await window.api.getColors();
        renderMaterialOptions();
        renderTable();
    } catch {
        showMessage("Errore nel caricamento dei dati", "error");
    }
}

function renderMaterialOptions() {
    compMaterial.innerHTML = '<option value="">Seleziona materiale</option>';
    materials.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name;
        compMaterial.appendChild(opt);
    });
}

function renderColorOptions(materialId: string) {
    compColor.innerHTML = '<option value="">Seleziona colore</option>';
    colors.filter((c) => c.materialId === materialId).forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.colorName;
        compColor.appendChild(opt);
    });
}

function getMaterialName(id: string) {
    return materials.find((m) => m.id === id)?.name || "-";
}

function getColorName(id: string) {
    return colors.find((c) => c.id === id)?.colorName || "-";
}

function compositionCost() {
    return composition.reduce((total, comp) => {
        const material = materials.find((m) => m.id === comp.materialId);
        return total + (material?.costPerGramm || 0) * comp.quantityGramms;
    }, 0);
}

function renderComposition() {
    compBody.innerHTML = "";
    composition.forEach((comp, idx) => {
        const material = getMaterialName(comp.materialId);
        const color = getColorName(comp.colorId);
        const materialCost = materials.find((m) => m.id === comp.materialId)?.costPerGramm || 0;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${material}</td>
            <td>${color}</td>
            <td>${comp.quantityGramms}</td>
            <td>EUR ${(materialCost * comp.quantityGramms).toFixed(3)}</td>
            <td><button class="btn-small btn-danger" data-action="remove" data-index="${idx}">Rimuovi</button></td>
        `;
        compBody.appendChild(tr);
    });
    compCost.textContent = `Costo Materiale: EUR ${compositionCost().toFixed(2)}`;
}

function renderTable() {
    tbody.innerHTML = "";
    const empty = document.getElementById("articles-empty");
    articles.forEach((a) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${a.code}</td>
            <td>${a.name}</td>
            <td>${a.composition.length}</td>
            <td>${a.laborHoursRequired}h</td>
            <td>${a.marginPercentage}%</td>
            <td>EUR ${compositionCostFor(a).toFixed(2)}</td>
            <td>
                <button class="btn-small" data-action="edit" data-id="${a.id}">Modifica</button>
                <button class="btn-small btn-danger" data-action="delete" data-id="${a.id}">Elimina</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    if (empty) {
        empty.classList.toggle("hidden", articles.length > 0);
    }
}

function compositionCostFor(article: Article) {
    return article.composition.reduce((total, comp) => {
        const material = materials.find((m) => m.id === comp.materialId);
        return total + (material?.costPerGramm || 0) * comp.quantityGramms;
    }, 0);
}

toggleBtn.addEventListener("click", () => {
    const visible = form.classList.contains("hidden");
    if (visible) resetForm();
    setFormVisible(visible);
});

compMaterial.addEventListener("change", () => {
    const materialId = compMaterial.value;
    compColor.disabled = !materialId;
    renderColorOptions(materialId);
});

addCompBtn.addEventListener("click", () => {
    if (!compMaterial.value || !compColor.value || !compQty.value) {
        showMessage("Completa tutti i campi della composizione", "error");
        return;
    }
    const qty = parseFloat(compQty.value) || 0;
    if (qty <= 0) {
        showMessage("Quantita non valida", "error");
        return;
    }
    composition.push({
        materialId: compMaterial.value,
        colorId: compColor.value,
        quantityGramms: qty,
    });
    compMaterial.value = "";
    compColor.innerHTML = '<option value="">Seleziona colore</option>';
    compColor.disabled = true;
    compQty.value = "0";
    renderComposition();
    showMessage("Componente aggiunto!", "success");
    clearMessage();
});

compBody.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const action = target.getAttribute("data-action");
    const indexStr = target.getAttribute("data-index");
    if (action !== "remove" || indexStr === null) return;
    const index = parseInt(indexStr, 10);
    composition = composition.filter((_, i) => i !== index);
    renderComposition();
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!codeInput.value || !nameInput.value || composition.length === 0) {
        showMessage("Completa tutti i campi obbligatori", "error");
        return;
    }

    const data: Article = {
        id: editingId ?? Date.now().toString(),
        code: codeInput.value.trim(),
        name: nameInput.value.trim(),
        composition: composition,
        laborHoursRequired: parseFloat(laborInput.value) || 0,
        marginPercentage: parseFloat(marginInput.value) || 0,
        createdAt: editingId
            ? articles.find((a) => a.id === editingId)?.createdAt || new Date().toISOString()
            : new Date().toISOString(),
    };

    let updated: Article[];
    if (editingId) {
        updated = articles.map((a) => (a.id === editingId ? data : a));
    } else {
        updated = [...articles, data];
    }

    const success = await window.api.saveArticles(updated);
    if (success) {
        articles = updated;
        renderTable();
        setFormVisible(false);
        resetForm();
        showMessage("Articolo salvato!", "success");
        clearMessage();
    }
});

tbody.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (!action || !id) return;

    const article = articles.find((a) => a.id === id);
    if (!article) return;

    if (action === "edit") {
        editingId = id;
        codeInput.value = article.code;
        nameInput.value = article.name;
        laborInput.value = article.laborHoursRequired.toString();
        marginInput.value = article.marginPercentage.toString();
        composition = [...article.composition];
        renderComposition();
        submitBtn.textContent = "Salva Modifiche";
        setFormVisible(true);
    }

    if (action === "delete") {
        if (!window.confirm("Eliminare questo articolo?")) return;
        const updated = articles.filter((a) => a.id !== id);
        const success = await window.api.saveArticles(updated);
        if (success) {
            articles = updated;
            renderTable();
            showMessage("Articolo eliminato!", "success");
            clearMessage();
        }
    }
});

loadData();
