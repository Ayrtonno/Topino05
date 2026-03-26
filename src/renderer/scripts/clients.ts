import { qs, showMessage, clearMessage, openSingletonWindow } from "./shared";

type Client = {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    createdAt: string;
};

let clients: Client[] = [];
let editingId: string | null = null;
let sortMode = "name-asc";

const form = qs<HTMLFormElement>("#client-form");
const refreshBtn = qs<HTMLButtonElement>("#refresh-clients");
const newBtn = qs<HTMLButtonElement>("#new-client");
const listSection = qs<HTMLDivElement>("#clients-list-section");
const body = qs<HTMLTableSectionElement>("#clients-body");
const sortSelect = qs<HTMLSelectElement>("#sort-clients");
const firstNameInput = qs<HTMLInputElement>("#client-first-name");
const lastNameInput = qs<HTMLInputElement>("#client-last-name");
const emailInput = qs<HTMLInputElement>("#client-email");
const phoneInput = qs<HTMLInputElement>("#client-phone");
const submitBtn = qs<HTMLButtonElement>("#client-submit");

function resetForm() {
    firstNameInput.value = "";
    lastNameInput.value = "";
    emailInput.value = "";
    phoneInput.value = "";
    editingId = null;
    submitBtn.textContent = "Salva Cliente";
}

function getPopupParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        popup: params.get("popup") === "1",
        id: params.get("id"),
    };
}

function showOnly(section: "list" | "form") {
    form.classList.toggle("hidden", section !== "form");
    listSection.classList.toggle("hidden", section !== "list");
}

function renderClients() {
    body.innerHTML = "";
    const empty = document.getElementById("clients-empty");
    const sorted = [...clients];
    sorted.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.trim();
        const nameB = `${b.firstName} ${b.lastName}`.trim();
        const emailA = (a.email || "").toLowerCase();
        const emailB = (b.email || "").toLowerCase();
        const phoneA = (a.phone || "").toLowerCase();
        const phoneB = (b.phone || "").toLowerCase();
        switch (sortMode) {
            case "name-desc":
                return nameB.localeCompare(nameA);
            case "email-asc":
                return emailA.localeCompare(emailB);
            case "email-desc":
                return emailB.localeCompare(emailA);
            case "phone-asc":
                return phoneA.localeCompare(phoneB);
            case "phone-desc":
                return phoneB.localeCompare(phoneA);
            case "name-asc":
            default:
                return nameA.localeCompare(nameB);
        }
    });
    sorted.forEach((c) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${c.firstName} ${c.lastName}</td>
            <td>${c.email || "-"}</td>
            <td>${c.phone || "-"}</td>
            <td>
                <button class="btn-small" data-action="edit" data-id="${c.id}">Modifica</button>
                <button class="btn-small btn-danger" data-action="delete" data-id="${c.id}">Elimina</button>
            </td>
        `;
        body.appendChild(tr);
    });
    if (empty) empty.classList.toggle("hidden", clients.length > 0);
}

async function loadClients() {
    try {
        clients = await window.api.getClients();
        renderClients();
    } catch {
        showMessage("Errore nel caricamento clienti", "error");
    }
}

refreshBtn.addEventListener("click", loadClients);

sortSelect?.addEventListener("change", () => {
    sortMode = sortSelect.value;
    renderClients();
});

newBtn.addEventListener("click", () => {
    const { popup } = getPopupParams();
    if (popup) {
        window.close();
        return;
    }
    openSingletonWindow(
        "clients-popup",
        "clients.html?popup=1",
        "width=900,height=700",
    );
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!firstNameInput.value || !lastNameInput.value) {
        showMessage("Nome e Cognome obbligatori", "error");
        return;
    }

    let updated: Client[];
    if (editingId) {
        updated = clients.map((c) =>
            c.id === editingId
                ? {
                      ...c,
                      firstName: firstNameInput.value.trim(),
                      lastName: lastNameInput.value.trim(),
                      email: emailInput.value.trim(),
                      phone: phoneInput.value.trim(),
                  }
                : c
        );
    } else {
        const newClient: Client = {
            id: Date.now().toString(),
            firstName: firstNameInput.value.trim(),
            lastName: lastNameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            createdAt: new Date().toISOString(),
        };
        updated = [...clients, newClient];
    }

    const success = await window.api.saveClients(updated);
    if (!success) {
        showMessage("Errore salvataggio clienti", "error");
        return;
    }

    clients = updated;
    renderClients();
    resetForm();
    const { popup } = getPopupParams();
    if (popup) {
        window.close();
        return;
    }
    showMessage("Cliente salvato!", "success");
    clearMessage();
});

body.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (!action || !id) return;

    const client = clients.find((c) => c.id === id);
    if (!client) return;

    if (action === "edit") {
        openSingletonWindow(
            "clients-popup",
            `clients.html?popup=1&id=${id}`,
            "width=900,height=700",
        );
    }

    if (action === "delete") {
        if (!window.confirm("Eliminare questo cliente?")) return;
        const updated = clients.filter((c) => c.id !== id);
        const success = await window.api.saveClients(updated);
        if (!success) {
            showMessage("Errore eliminazione cliente", "error");
            return;
        }
        clients = updated;
        renderClients();
        showMessage("Cliente eliminato!", "success");
        clearMessage();
    }
});

const params = getPopupParams();
if (params.popup) {
    document.body.classList.add("popup", "popup-form");
    showOnly("form");
} else {
    showOnly("list");
}

loadClients().then(() => {
    if (params.popup && params.id) {
        const client = clients.find((c) => c.id === params.id);
        if (client) {
            editingId = client.id;
            firstNameInput.value = client.firstName;
            lastNameInput.value = client.lastName;
            emailInput.value = client.email || "";
            phoneInput.value = client.phone || "";
            submitBtn.textContent = "Salva Modifiche";
        }
    }
});
