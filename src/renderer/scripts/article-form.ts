import { qs, showMessage, clearMessage } from "./shared";

type ArticleComposition = {
    materialId: string;
    description?: string;
    quantity: number;
};

type Article = {
    id: string;
    code: string;
    name: string;
    composition: ArticleComposition[];
    laborHoursRequired: number;
    materialMarkupPct: number;
    laborMarkupPct: number;
    createdAt: string;
};

type Material = {
    id: string;
    name: string;
    costPerUnit: number;
    sellingPricePerUnit: number;
    unit: "grammi" | "pezzi";
};

let articles: Article[] = [];
let materials: Material[] = [];
let composition: ArticleComposition[] = [];
let hourlyRate = 0;
let editingId: string | null = null;
let editingCompIndex: number | null = null;

const form = qs<HTMLFormElement>("#article-form");
const compBody = qs<HTMLTableSectionElement>("#composition-body");
const compCost = qs<HTMLDivElement>("#composition-cost");
const unitLabel = qs<HTMLDivElement>("#comp-unit-label");

const codeInput = qs<HTMLInputElement>("#article-code");
const nameInput = qs<HTMLInputElement>("#article-name");
const laborInput = qs<HTMLInputElement>("#article-labor");
const materialMarkupInput = qs<HTMLInputElement>("#article-material-markup");
const laborMarkupInput = qs<HTMLInputElement>("#article-labor-markup");
const submitBtn = qs<HTMLButtonElement>("#submit-article");
const wizardPrev = qs<HTMLButtonElement>("#wizard-prev");
const wizardNext = qs<HTMLButtonElement>("#wizard-next");
const wizardCancel = qs<HTMLButtonElement>("#wizard-cancel");
const wizardSteps = Array.from(document.querySelectorAll(".wizard-step"));
const wizardSections = Array.from(document.querySelectorAll(".wizard-section"));
const wizardProgress = qs<HTMLDivElement>("#wizard-progress-bar");
let currentStep = 1;
let returnUrl = "articles.html";
let isPopup = false;

const compMaterial = qs<HTMLSelectElement>("#comp-material");
const compDesc = qs<HTMLInputElement>("#comp-desc");
const compQty = qs<HTMLInputElement>("#comp-qty");
const addCompBtn = qs<HTMLButtonElement>("#add-comp");


function getQueryId() {
    const params = new URLSearchParams(window.location.search);
    returnUrl = params.get("return") || "articles.html";
    isPopup = params.get("popup") === "1";
    return params.get("id");
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

function getMaterialName(id: string) {
    return materials.find((m) => m.id === id)?.name || "-";
}

function compositionCost() {
    return composition.reduce((total, comp) => {
        const material = materials.find((m) => m.id === comp.materialId);
        return total + (material?.costPerUnit || 0) * comp.quantity;
    }, 0);
}

function renderComposition() {
    compBody.innerHTML = "";
    composition.forEach((comp, idx) => {
        const material = getMaterialName(comp.materialId);
        const desc = comp.description || "-";
        const materialData = materials.find((m) => m.id === comp.materialId);
        const materialCost = materialData?.costPerUnit || 0;
        const unitLabel = materialData?.unit === "pezzi" ? "pz" : "g";
        const tr = document.createElement("tr");
        if (editingCompIndex === idx) {
            const options = materials
                .map((m) => `<option value="${m.id}" ${m.id === comp.materialId ? "selected" : ""}>${m.name}</option>`)
                .join("");
            tr.innerHTML = `
                <td>
                    <select class="inline-field inline-material">
                        <option value="">Seleziona materiale</option>
                        ${options}
                    </select>
                </td>
                <td><input class="inline-field inline-desc" type="text" value="${comp.description || ""}"/></td>
                <td><input class="inline-field inline-qty" type="number" value="${comp.quantity}"/></td>
                <td>EUR ${(materialCost * comp.quantity).toFixed(3)}</td>
                <td>
                    <button class="btn-small" data-action="save" data-index="${idx}">Salva</button>
                    <button class="btn-small btn-danger" data-action="remove" data-index="${idx}">Rimuovi</button>
                </td>
            `;
            tr.classList.add("row-editing");
        } else {
            tr.innerHTML = `
                <td>${material}</td>
                <td>${desc}</td>
                <td>${comp.quantity} ${unitLabel}</td>
                <td>EUR ${(materialCost * comp.quantity).toFixed(3)}</td>
                <td>
                    <button class="btn-small" data-action="edit" data-index="${idx}">Modifica</button>
                    <button class="btn-small btn-danger" data-action="remove" data-index="${idx}">Rimuovi</button>
                </td>
            `;
        }
        compBody.appendChild(tr);
    });
    compCost.textContent = `Costo Materiale: EUR ${compositionCost().toFixed(2)}`;
}

function setStep(step: number) {
    currentStep = step;
    wizardSteps.forEach((el) => {
        const s = parseInt(el.getAttribute("data-step") || "1", 10);
        el.classList.toggle("active", s === currentStep);
    });
    wizardSections.forEach((el) => {
        const s = parseInt(el.getAttribute("data-step") || "1", 10);
        el.classList.toggle("hidden", s !== currentStep);
    });
    wizardPrev.disabled = currentStep === 1;
    wizardNext.classList.toggle("hidden", currentStep === 3);
    submitBtn.classList.toggle("hidden", currentStep !== 3);
    if (wizardProgress) {
        const percent = ((currentStep - 1) / 2) * 100;
        wizardProgress.style.width = `${percent}%`;
    }
}


async function loadData() {
    try {
        if (!window.api) {
            throw new Error("API non disponibile");
        }
        articles = await window.api.getArticles();
        materials = await window.api.getMaterials();
        try {
            const laborConfig = await window.api.getLaborConfig();
            hourlyRate = laborConfig.hourlyRate || 0;
        } catch {
            hourlyRate = 0;
        }
        renderMaterialOptions();

        const id = getQueryId();
        if (id) {
            const article = articles.find((a) => a.id === id);
            if (article) {
                editingId = id;
                codeInput.value = article.code;
                nameInput.value = article.name;
                laborInput.value = article.laborHoursRequired.toString();
                materialMarkupInput.value = article.materialMarkupPct.toString();
                laborMarkupInput.value = article.laborMarkupPct.toString();
                composition = [...article.composition];
                const title = document.getElementById("form-title");
                if (title) title.textContent = "Modifica Articolo";
                submitBtn.textContent = "Salva Modifiche";
            }
        }
        renderComposition();
        setStep(1);
    } catch (err) {
        console.error("[article-form] loadData failed:", err);
        const msg = err instanceof Error ? err.message : "Errore nel caricamento dei dati";
        showMessage(`Errore nel caricamento dei dati: ${msg}`, "error");
    }
}

compMaterial.addEventListener("change", () => {
    const materialId = compMaterial.value;
    const materialData = materials.find((m) => m.id === materialId);
    if (unitLabel) {
        const label = materialData?.unit === "pezzi" ? "pz" : "g";
        unitLabel.textContent = materialData ? `Unita: ${label}` : "Unita: -";
    }
});

addCompBtn.addEventListener("click", () => {
    if (!compMaterial.value || !compQty.value) {
        showMessage("Completa tutti i campi della composizione", "error");
        return;
    }
    const qty = parseFloat(compQty.value) || 0;
    if (qty <= 0) {
        showMessage("Quantita non valida", "error");
        return;
    }
    const nextComp: ArticleComposition = {
        materialId: compMaterial.value,
        description: compDesc.value.trim() || undefined,
        quantity: qty,
    };
    composition.push(nextComp);
    compMaterial.value = "";
    compDesc.value = "";
    compQty.value = "0";
    unitLabel.textContent = "Unita: -";
    renderComposition();
    showMessage("Componente aggiunto!", "success");
    clearMessage();
});

compBody.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const action = target.getAttribute("data-action");
    const indexStr = target.getAttribute("data-index");
    if (!action || indexStr === null) return;
    const index = parseInt(indexStr, 10);
    if (action === "edit") {
        editingCompIndex = index;
        renderComposition();
        return;
    }
    if (action === "save") {
        const row = target.closest("tr");
        if (!row) return;
        const matSelect = row.querySelector<HTMLSelectElement>(".inline-material");
        const descInput = row.querySelector<HTMLInputElement>(".inline-desc");
        const qtyInput = row.querySelector<HTMLInputElement>(".inline-qty");
        if (!matSelect || !qtyInput) return;
        if (!matSelect.value) {
            showMessage("Seleziona materiale", "error");
            return;
        }
        const qty = parseFloat(qtyInput.value) || 0;
        if (qty <= 0) {
            showMessage("Quantita non valida", "error");
            return;
        }
        composition = composition.map((c, i) =>
            i === index
                ? {
                      ...c,
                      materialId: matSelect.value,
                      description: descInput?.value.trim() || undefined,
                      quantity: qty,
                  }
                : c
        );
        editingCompIndex = null;
        renderComposition();
        return;
    }
    if (action === "remove") {
        composition = composition.filter((_, i) => i !== index);
        if (editingCompIndex === index) {
            editingCompIndex = null;
        }
        renderComposition();
    }
});

wizardPrev.addEventListener("click", () => {
    if (currentStep > 1) setStep(currentStep - 1);
});

wizardNext.addEventListener("click", () => {
    if (currentStep < 3) setStep(currentStep + 1);
});

wizardCancel.addEventListener("click", () => {
    if (isPopup) {
        window.close();
        return;
    }
    window.location.href = returnUrl;
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
        materialMarkupPct: parseFloat(materialMarkupInput.value) || 0,
        laborMarkupPct: parseFloat(laborMarkupInput.value) || 0,
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
        showMessage("Articolo salvato!", "success");
        clearMessage();
        if (isPopup) {
            window.close();
            return;
        }
        window.location.href = returnUrl;
    }
});

loadData();
