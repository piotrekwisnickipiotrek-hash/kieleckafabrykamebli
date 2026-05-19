const employeeKey = "team-notebook.employee";
const state = {
  employee: localStorage.getItem(employeeKey) || "",
  notes: [],
  clients: [],
  query: ""
};

const els = {
  loginView: document.querySelector("#loginView"),
  appView: document.querySelector("#appView"),
  loginForm: document.querySelector("#loginForm"),
  employeeName: document.querySelector("#employeeName"),
  currentUser: document.querySelector("#currentUser"),
  changeUserBtn: document.querySelector("#changeUserBtn"),
  refreshBtn: document.querySelector("#refreshBtn"),
  searchInput: document.querySelector("#searchInput"),
  noteForm: document.querySelector("#noteForm"),
  noteContent: document.querySelector("#noteContent"),
  noteList: document.querySelector("#noteList"),
  noteCounter: document.querySelector("#noteCounter"),
  clientForm: document.querySelector("#clientForm"),
  clientId: document.querySelector("#clientId"),
  clientName: document.querySelector("#clientName"),
  searchedFor: document.querySelector("#searchedFor"),
  contact: document.querySelector("#contact"),
  clientDate: document.querySelector("#clientDate"),
  status: document.querySelector("#status"),
  details: document.querySelector("#details"),
  saveClientBtn: document.querySelector("#saveClientBtn"),
  cancelEditBtn: document.querySelector("#cancelEditBtn"),
  clientList: document.querySelector("#clientList"),
  clientCounter: document.querySelector("#clientCounter"),
  toast: document.querySelector("#toast"),
  clientCardTemplate: document.querySelector("#clientCardTemplate"),
  noteTemplate: document.querySelector("#noteTemplate")
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined
  }).format(new Date(value));
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Wystapil blad.");
  }
  return data;
}

function requireEmployee() {
  if (!state.employee) {
    showLogin();
    throw new Error("Brakuje zalogowanego pracownika.");
  }
  return state.employee;
}

function showLogin() {
  els.loginView.classList.remove("hidden");
  els.appView.classList.add("hidden");
  els.employeeName.value = state.employee;
  els.employeeName.focus();
}

function showApp() {
  els.loginView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  els.currentUser.textContent = `Zalogowano: ${state.employee}`;
  els.clientDate.value = today();
}

async function loadData() {
  const data = await api("/api/data");
  state.notes = data.notes || [];
  state.clients = data.clients || [];
  render();
}

function matchesQuery(item) {
  const query = normalizeText(state.query);
  if (!query) return true;
  return normalizeText(Object.values(item).join(" ")).includes(query);
}

function render() {
  const clients = state.clients.filter(matchesQuery);
  const notes = state.notes.filter(matchesQuery);

  els.clientCounter.textContent = clients.length === 1 ? "1 wpis" : `${clients.length} wpisow`;
  els.noteCounter.textContent = notes.length === 1 ? "1 notatka" : `${notes.length} notatek`;
  renderClients(clients);
  renderNotes(notes);
}

function renderClients(clients) {
  els.clientList.textContent = "";
  if (!clients.length) {
    els.clientList.append(empty("Brak pasujacych danych klientow."));
    return;
  }

  for (const client of clients) {
    const card = els.clientCardTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector("h3").textContent = client.clientName;
    card.querySelector(".record-date").textContent = client.date ? `Data: ${formatDate(client.date)}` : "Bez daty";
    card.querySelector(".status-pill").textContent = client.status || "Nowe";
    card.querySelector(".searched").textContent = `Szukal: ${client.searchedFor}`;
    card.querySelector(".contact").textContent = client.contact ? `Kontakt: ${client.contact}` : "Kontakt: nie podano";
    card.querySelector(".details").textContent = client.details || "Brak dodatkowych szczegolow.";
    card.querySelector(".meta").textContent = metaText(client);
    card.querySelector(".edit-client").addEventListener("click", () => startClientEdit(client));
    card.querySelector(".delete-client").addEventListener("click", () => deleteClient(client.id));
    els.clientList.append(card);
  }
}

function renderNotes(notes) {
  els.noteList.textContent = "";
  if (!notes.length) {
    els.noteList.append(empty("Brak pasujacych notatek."));
    return;
  }

  for (const note of notes) {
    const card = els.noteTemplate.content.firstElementChild.cloneNode(true);
    const textarea = card.querySelector("textarea");
    textarea.value = note.content;
    card.querySelector(".meta").textContent = metaText(note);
    card.querySelector(".save-note").addEventListener("click", () => saveNote(note.id, textarea.value));
    card.querySelector(".delete-note").addEventListener("click", () => deleteNote(note.id));
    els.noteList.append(card);
  }
}

function empty(message) {
  const div = document.createElement("div");
  div.className = "empty";
  div.textContent = message;
  return div;
}

function metaText(record) {
  const created = `Dodane przez ${record.createdBy || "nieznana osoba"}: ${formatDate(record.createdAt)}`;
  const updated = `Ostatnia edycja ${record.updatedBy || "nieznana osoba"}: ${formatDate(record.updatedAt)}`;
  return `${created}. ${updated}.`;
}

function startClientEdit(client) {
  els.clientId.value = client.id;
  els.clientName.value = client.clientName || "";
  els.searchedFor.value = client.searchedFor || "";
  els.contact.value = client.contact || "";
  els.clientDate.value = client.date || today();
  els.status.value = client.status || "Nowe";
  els.details.value = client.details || "";
  els.saveClientBtn.textContent = "Zapisz zmiany";
  els.cancelEditBtn.classList.remove("hidden");
  els.clientName.focus();
}

function resetClientForm() {
  els.clientForm.reset();
  els.clientId.value = "";
  els.clientDate.value = today();
  els.status.value = "Nowe";
  els.saveClientBtn.textContent = "Dodaj klienta";
  els.cancelEditBtn.classList.add("hidden");
}

async function saveClient(event) {
  event.preventDefault();
  const employee = requireEmployee();
  const payload = {
    author: employee,
    clientName: els.clientName.value,
    searchedFor: els.searchedFor.value,
    contact: els.contact.value,
    date: els.clientDate.value,
    status: els.status.value,
    details: els.details.value
  };
  const id = els.clientId.value;
  await api(id ? `/api/clients/${id}` : "/api/clients", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(payload)
  });
  resetClientForm();
  await loadData();
  toast(id ? "Zapisano zmiany klienta." : "Dodano klienta.");
}

async function deleteClient(id) {
  if (!confirm("Usunac ten wpis klienta?")) return;
  await api(`/api/clients/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ author: requireEmployee() })
  });
  await loadData();
  toast("Usunieto wpis klienta.");
}

async function addNote(event) {
  event.preventDefault();
  await api("/api/notes", {
    method: "POST",
    body: JSON.stringify({
      author: requireEmployee(),
      content: els.noteContent.value
    })
  });
  els.noteContent.value = "";
  await loadData();
  toast("Dodano notatke.");
}

async function saveNote(id, content) {
  await api(`/api/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      author: requireEmployee(),
      content
    })
  });
  await loadData();
  toast("Zapisano notatke.");
}

async function deleteNote(id) {
  if (!confirm("Usunac te notatke?")) return;
  await api(`/api/notes/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ author: requireEmployee() })
  });
  await loadData();
  toast("Usunieto notatke.");
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const employee = els.employeeName.value.trim();
  if (!employee) return;
  state.employee = employee;
  localStorage.setItem(employeeKey, employee);
  showApp();
  await loadData();
});

els.changeUserBtn.addEventListener("click", () => {
  state.employee = "";
  localStorage.removeItem(employeeKey);
  showLogin();
});

els.refreshBtn.addEventListener("click", async () => {
  await loadData();
  toast("Dane odswiezone.");
});

els.searchInput.addEventListener("input", () => {
  state.query = els.searchInput.value;
  render();
});

els.noteForm.addEventListener("submit", addNote);
els.clientForm.addEventListener("submit", saveClient);
els.cancelEditBtn.addEventListener("click", resetClientForm);

if (state.employee) {
  showApp();
  loadData().catch((error) => toast(error.message));
} else {
  showLogin();
}
