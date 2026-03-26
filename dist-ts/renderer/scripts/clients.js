"use strict";
(() => {
  // src/renderer/scripts/shared.ts
  function qs(selector, parent = document) {
    return parent.querySelector(selector);
  }
  function qsa(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }
  function setActiveNav() {
    const page = document.body.getAttribute("data-page");
    qsa(".nav a").forEach((link) => {
      if (link.dataset.page === page) {
        link.classList.add("active");
      }
    });
  }
  function showMessage(text, type = "success") {
    const msg = document.getElementById("message");
    if (!msg) return;
    msg.className = `message ${type}`;
    msg.textContent = text;
  }
  function clearMessage(delayMs = 2e3) {
    const msg = document.getElementById("message");
    if (!msg) return;
    setTimeout(() => {
      msg.className = "message";
      msg.textContent = "";
    }, delayMs);
  }
  setActiveNav();

  // src/renderer/scripts/clients.ts
  var clients = [];
  var editingId = null;
  var form = qs("#client-form");
  var refreshBtn = qs("#refresh-clients");
  var newBtn = qs("#new-client");
  var listSection = qs("#clients-list-section");
  var body = qs("#clients-body");
  var firstNameInput = qs("#client-first-name");
  var lastNameInput = qs("#client-last-name");
  var emailInput = qs("#client-email");
  var phoneInput = qs("#client-phone");
  var submitBtn = qs("#client-submit");
  function resetForm() {
    firstNameInput.value = "";
    lastNameInput.value = "";
    emailInput.value = "";
    phoneInput.value = "";
    editingId = null;
    submitBtn.textContent = "Salva Cliente";
  }
  function getPopupParams() {
    const params2 = new URLSearchParams(window.location.search);
    return {
      popup: params2.get("popup") === "1",
      id: params2.get("id")
    };
  }
  function showOnly(section) {
    form.classList.toggle("hidden", section !== "form");
    listSection.classList.toggle("hidden", section !== "list");
  }
  function renderClients() {
    body.innerHTML = "";
    const empty = document.getElementById("clients-empty");
    clients.forEach((c) => {
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
  newBtn.addEventListener("click", () => {
    const { popup } = getPopupParams();
    if (popup) {
      window.close();
      return;
    }
    window.open("clients.html?popup=1", "_blank", "width=900,height=700");
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!firstNameInput.value || !lastNameInput.value) {
      showMessage("Nome e Cognome obbligatori", "error");
      return;
    }
    let updated;
    if (editingId) {
      updated = clients.map(
        (c) => c.id === editingId ? {
          ...c,
          firstName: firstNameInput.value.trim(),
          lastName: lastNameInput.value.trim(),
          email: emailInput.value.trim(),
          phone: phoneInput.value.trim()
        } : c
      );
    } else {
      const newClient = {
        id: Date.now().toString(),
        firstName: firstNameInput.value.trim(),
        lastName: lastNameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
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
    const target = e.target;
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (!action || !id) return;
    const client = clients.find((c) => c.id === id);
    if (!client) return;
    if (action === "edit") {
      window.open(`clients.html?popup=1&id=${id}`, "_blank", "width=900,height=700");
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
  var params = getPopupParams();
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
})();
//# sourceMappingURL=clients.js.map
