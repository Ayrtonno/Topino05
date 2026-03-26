import { qs, showMessage } from "./shared";

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

const COLOR_SURCHARGE = 0.1;

const detailTitle = qs<HTMLDivElement>("#detail-title");
const detailCode = qs<HTMLDivElement>("#detail-code");
const detailName = qs<HTMLDivElement>("#detail-name");
const detailHours = qs<HTMLDivElement>("#detail-hours");
const detailMatMarkup = qs<HTMLDivElement>("#detail-mat-markup");
const detailLabMarkup = qs<HTMLDivElement>("#detail-lab-markup");
const editLink = qs<HTMLAnchorElement>("#edit-link");

const compBody = qs<HTMLTableSectionElement>("#detail-composition");
const previewMaterialCost = qs<HTMLDivElement>("#preview-material-cost");
const previewMaterialSell = qs<HTMLDivElement>("#preview-material-sell");
const previewLaborCost = qs<HTMLDivElement>("#preview-labor-cost");
const previewLaborSell = qs<HTMLDivElement>("#preview-labor-sell");
const previewColorSurcharge = qs<HTMLDivElement>("#preview-color-surcharge");
const previewMaterialFinal = qs<HTMLDivElement>("#preview-material-final");
const previewTotalSell = qs<HTMLDivElement>("#preview-total-sell");
const previewTotalRounded = qs<HTMLDivElement>("#preview-total-rounded");
const previewMaterialMargin = qs<HTMLDivElement>("#preview-material-margin");
const previewTotalGain = qs<HTMLDivElement>("#preview-total-gain");

function getQueryId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

async function loadData() {
    try {
        const id = getQueryId();
        if (!id) {
            showMessage("Articolo non trovato", "error");
            return;
        }
        const articles = await window.api.getArticles();
        const materials = await window.api.getMaterials();
        const laborConfig = await window.api.getLaborConfig();
        const hourlyRate = laborConfig.hourlyRate || 0;

        const article = articles.find((a) => a.id === id);
        if (!article) {
            showMessage("Articolo non trovato", "error");
            return;
        }

        detailTitle.textContent = `Dettaglio Articolo: ${article.name}`;
        detailCode.textContent = article.code;
        detailName.textContent = article.name;
        detailHours.textContent = `${article.laborHoursRequired}h`;
        detailMatMarkup.textContent = `${article.materialMarkupPct}%`;
        detailLabMarkup.textContent = `${article.laborMarkupPct}%`;
        const returnUrl = encodeURIComponent(`article-detail.html?id=${article.id}`);
        editLink.href = `article-form.html?id=${article.id}&return=${returnUrl}&popup=1`;
        editLink.target = "_blank";
        editLink.rel = "noopener";

        // composition table
        compBody.innerHTML = "";
        let materialCost = 0;
        let materialSellBase = 0;
        article.composition.forEach((comp) => {
            const material = materials.find((m) => m.id === comp.materialId);
            const unitLabel = material?.unit === "pezzi" ? "pz" : "g";
            const costUnit = material?.costPerUnit || 0;
            const sellUnit = material?.sellingPricePerUnit || costUnit;
            const rowCost = costUnit * comp.quantity;
            materialCost += rowCost;
            materialSellBase += sellUnit * comp.quantity;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${material?.name || "-"}</td>
                <td>${comp.description || "-"}</td>
                <td>${comp.quantity} ${unitLabel}</td>
                <td>EUR ${rowCost.toFixed(2)}</td>
            `;
            compBody.appendChild(tr);
        });

        const colorSurcharge = article.composition.length * COLOR_SURCHARGE;
        const materialFinalBase = materialSellBase + colorSurcharge;
        const materialSell = materialFinalBase * (1 + article.materialMarkupPct / 100);
        const laborCost = article.laborHoursRequired * hourlyRate;
        const laborSell = laborCost * (1 + article.laborMarkupPct / 100);
        const materialMargin = materialSell - materialCost + colorSurcharge;
        const totalSell = materialSell + laborSell;
        const totalRounded = Math.round(totalSell * 2) / 2;
        const totalGain = totalRounded - materialCost;

        previewMaterialCost.textContent = `EUR ${materialCost.toFixed(2)}`;
        previewMaterialSell.textContent = `EUR ${materialSell.toFixed(2)}`;
        previewLaborCost.textContent = `EUR ${laborCost.toFixed(2)}`;
        previewLaborSell.textContent = `EUR ${laborSell.toFixed(2)}`;
        previewColorSurcharge.textContent = `EUR ${colorSurcharge.toFixed(2)}`;
        previewMaterialFinal.textContent = `EUR ${materialFinalBase.toFixed(2)}`;
        previewTotalSell.textContent = `EUR ${totalSell.toFixed(2)}`;
        previewTotalRounded.textContent = `EUR ${totalRounded.toFixed(2)}`;
        previewMaterialMargin.textContent = `EUR ${materialMargin.toFixed(2)}`;
        previewMaterialMargin.classList.remove("text-success", "text-danger");
        previewMaterialMargin.classList.add(materialMargin >= 0 ? "text-success" : "text-danger");
        previewTotalGain.textContent = `EUR ${totalGain.toFixed(2)}`;
        previewTotalGain.classList.remove("text-success", "text-danger");
        previewTotalGain.classList.add(totalGain >= 0 ? "text-success" : "text-danger");
    } catch {
        showMessage("Errore nel caricamento dati", "error");
    }
}

loadData();
