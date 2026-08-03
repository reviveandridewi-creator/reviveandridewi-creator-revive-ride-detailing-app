/* ==========================================
   Revive & Ride OS Professional 4.0 - Firebase Cloud Edition
========================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    deleteDoc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC7yxoYMS3KDP7uyhW7gH6WTnIxxCEXF4",
  authDomain: "revive-and-ride.firebaseapp.com",
  projectId: "revive-and-ride",
  storageBucket: "revive-and-ride.firebasestorage.app",
  messagingSenderId: "917014700622",
  appId: "1:917014700622:web:8d1bae84de9569075b191f",
  measurementId: "G-4X3CD95RC8"
};

const app = initializeApp(firebaseConfig);
const dbStore = getFirestore(app);

let db = { clients: [], jobs: [], invoices: [], activity: [] };
let editingClientId = null;
let activeJobId = null;

function initRealtimeSync() {
    onSnapshot(collection(dbStore, "clients"), (snapshot) => {
        db.clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        refreshApp();
    });

    onSnapshot(collection(dbStore, "jobs"), (snapshot) => {
        db.jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        refreshApp();
    });

    onSnapshot(collection(dbStore, "invoices"), (snapshot) => {
        db.invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        refreshApp();
    });

    onSnapshot(collection(dbStore, "activity"), (snapshot) => {
        db.activity = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderActivity();
    });
}

const findClient = (id) => db.clients.find(client => client.id === id);
const findJob = (id) => db.jobs.find(job => job.id === id);
const formatMoney = (amount) => "$" + Number(amount || 0).toFixed(2);

function hidePages() {
    document.querySelectorAll(".page").forEach(page => page.classList.add("hidden"));
}

function showPage(id) {
    hidePages();
    document.getElementById(id).classList.remove("hidden");
}

function openClientSheet() { 
    closeSheets();
    document.getElementById("clientSheet").classList.remove("hidden"); 
}

function openJobSheet() { 
    closeSheets();
    populateJobClients();
    document.getElementById("jobSheet").classList.remove("hidden"); 
}

function closeSheets() {
    document.getElementById("clientSheet").classList.add("hidden");
    document.getElementById("jobSheet").classList.add("hidden");
}

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
    const greetingEl = document.getElementById("greeting");
    if (greetingEl) greetingEl.textContent = `${greeting}, Dalton 👋`;
}

function updateDate() {
    const options = { weekday: "long", month: "long", day: "numeric" };
    const dateEl = document.getElementById("todayDate");
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString("en-US", options);
}

function updateDashboard() {
    const jobsTodayEl = document.getElementById("jobsToday");
    const openInvoicesEl = document.getElementById("openInvoices");
    const completedJobsEl = document.getElementById("completedJobs");
    const revenueTodayEl = document.getElementById("revenueToday");

    const today = new Date().toISOString().split("T")[0];
    const todaysJobs = db.jobs.filter(j => j.date === today);

    if (jobsTodayEl) jobsTodayEl.textContent = todaysJobs.length;
    
    const openInvoices = db.invoices.filter(inv => inv.status === "Unpaid");
    if (openInvoicesEl) openInvoicesEl.textContent = openInvoices.length;

    const completed = db.jobs.filter(j => j.status === "Completed");
    if (completedJobsEl) completedJobsEl.textContent = completed.length;
    
    const todaysRevenue = todaysJobs
        .filter(j => j.status === "Completed")
        .reduce((sum, job) => sum + Number(job.total || 0), 0);
    
    if (revenueTodayEl) revenueTodayEl.textContent = formatMoney(todaysRevenue);
}

async function addActivity(text) {
    const activityId = crypto.randomUUID();
    const item = { id: activityId, text, date: new Date().toLocaleString() };
    await setDoc(doc(dbStore, "activity", activityId), item);
}

function renderActivity() {
    const feed = document.getElementById("activityFeed");
    if (!feed) return;
    
    if (db.activity.length === 0) {
        feed.innerHTML = `<div class="card">No activity yet.</div>`;
        return;
    }
    
    feed.innerHTML = db.activity.map(item => `
        <div class="card">
            <strong>${item.text}</strong><br><br>
            <small>${item.date}</small>
        </div>
    `).join("");
}

async function saveClient() {
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();

    if (!firstName || !lastName) return alert("Please enter a first and last name.");

    const clientId = editingClientId || crypto.randomUUID();
    
    const vehicleObj = {
        year: document.getElementById("vehYear").value.trim(),
        make: document.getElementById("vehMake").value.trim(),
        model: document.getElementById("vehModel").value.trim(),
        color: document.getElementById("vehColor").value.trim(),
        plate: document.getElementById("vehPlate").value.trim(),
        vin: document.getElementById("vehVin").value.trim()
    };

    const existingClient = editingClientId ? findClient(editingClientId) : null;
    let vehicles = existingClient ? (existingClient.vehicles || []) : [];
    
    if (vehicleObj.make && vehicleObj.model) {
        vehicles.push(vehicleObj);
    }

    const client = {
        id: clientId,
        firstName, lastName,
        company: document.getElementById("company").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        email: document.getElementById("email").value.trim(),
        address: document.getElementById("address").value.trim(),
        notes: document.getElementById("notes").value.trim(),
        vehicles: vehicles,
        created: new Date().toLocaleDateString()
    };

    await setDoc(doc(dbStore, "clients", clientId), client);

    if (editingClientId) {
        addActivity(`Updated client profile for ${client.firstName}.`);
    } else {
        addActivity(`${client.firstName} ${client.lastName} added as a client.`);
    }

    clearClientForm();
    closeSheets();
    editingClientId = null;
    showPage("clientsPage");
}

function renderClients() {
    const list = document.getElementById("clientList");
    if (!list) return;

    const searchInput = document.getElementById("clientSearch");
    const search = searchInput ? searchInput.value.toLowerCase() : "";
    const filtered = db.clients.filter(c => 
        c.firstName.toLowerCase().includes(search) || 
        c.lastName.toLowerCase().includes(search) || 
        (c.company && c.company.toLowerCase().includes(search))
    );

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="card emptyCard">
                <i class="fa-solid fa-users"></i>
                <h3>No Clients Found</h3>
                <p>Add your first client.</p>
            </div>`;
        return;
    }

    list.innerHTML = filtered.map(client => `
        <div class="card" onclick="openClient('${client.id}')">
            <h3>${client.firstName} ${client.lastName}</h3>
            <p>${client.phone || "No Phone"}</p>
            <p>${client.company || ""}</p>
        </div>
    `).join("");
}

window.openClient = function(id) {
    const client = findClient(id);
    if (!client) return;

    editingClientId = id;
    document.getElementById("clientProfileName").textContent = `${client.firstName} ${client.lastName}`;
    document.getElementById("profilePhone").textContent = client.phone || "-";
    document.getElementById("profileEmail").textContent = client.email || "-";
    document.getElementById("profileCompany").textContent = client.company || "-";
    document.getElementById("profileAddress").textContent = client.address || "-";
    document.getElementById("profileNotes").textContent = client.notes || "No notes.";

    const vehicleBox = document.getElementById("clientVehicles");
    if (!client.vehicles || client.vehicles.length === 0) {
        vehicleBox.innerHTML = "<p>No vehicles added.</p>";
    } else {
        vehicleBox.innerHTML = client.vehicles.map(v => `
            <div class="card">
                <h3>${v.year || ""} ${v.make || ""} ${v.model || ""}</h3>
                <p>Color: ${v.color || "-"}</p>
                <p>Plate: ${v.plate || "-"}</p>
                <p>VIN: ${v.vin || "-"}</p>
            </div>
        `).join("");
    }
    showPage("clientProfilePage");
};

window.editClient = function() {
    const client = findClient(editingClientId);
    if (!client) return;
    
    ["firstName", "lastName", "company", "phone", "email", "address", "notes"].forEach(field => {
        const el = document.getElementById(field);
        if (el) el.value = client[field];
    });
    openClientSheet();
};

function clearClientForm() {
    ["firstName", "lastName", "company", "phone", "email", "address", "notes", "vehYear", "vehMake", "vehModel", "vehColor", "vehPlate", "vehVin"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    editingClientId = null;
}

window.deleteClient = async function(clientId) {
    if (!confirm("Delete this client?")) return;
    await deleteDoc(doc(dbStore, "clients", clientId));
    addActivity("Client deleted.");
    showPage("clientsPage");
};

async function saveJob() {
    const clientSelect = document.getElementById("jobClientSelect");
    const clientId = clientSelect ? clientSelect.value : "";
    if (!clientId) return alert("Please select a client.");

    const client = findClient(clientId);
    const jobId = crypto.randomUUID();
    const invoiceId = crypto.randomUUID();
    const jobTotal = Number(document.getElementById("jobPrice").value || 150);

    const job = {
        id: jobId,
        clientId: clientId,
        clientName: `${client.firstName} ${client.lastName}`,
        vehicle: document.getElementById("jobVehicle").value.trim(),
        service: document.getElementById("jobService").value,
        date: document.getElementById("jobDate").value,
        time: document.getElementById("jobTime").value,
        status: "Scheduled",
        total: jobTotal,
        invoiceId: invoiceId
    };

    const invoice = {
        id: invoiceId,
        jobId: jobId,
        clientName: `${client.firstName} ${client.lastName}`,
        total: jobTotal,
        status: "Unpaid",
        date: new Date().toLocaleDateString()
    };

    await setDoc(doc(dbStore, "jobs", jobId), job);
    await setDoc(doc(dbStore, "invoices", invoiceId), invoice);
    
    addActivity(`${job.clientName} scheduled for ${job.service}.`);
    
    clearJobForm();
    closeSheets();
    showPage("jobsPage");
}

function renderJobs() {
    const list = document.getElementById("jobList");
    if (!list) return;

    if (db.jobs.length === 0) {
        list.innerHTML = `
            <div class="card emptyCard">
                <i class="fa-solid fa-clipboard-list"></i>
                <h3>No Jobs Yet</h3>
                <p>Create your first job.</p>
            </div>`;
        return;
    }

    list.innerHTML = db.jobs.map(job => `
        <div class="card" onclick="openJob('${job.id}')">
            <h3>${job.clientName}</h3>
            <p><strong>Service:</strong> ${job.service}</p>
            <p><strong>Date:</strong> ${job.date} at ${job.time}</p>
            <p><strong>Status:</strong> ${job.status}</p>
            <p><strong>Total:</strong> ${formatMoney(job.total)}</p>
        </div>
    `).join("");
}

function renderTodaySchedule() {
    const schedule = document.getElementById("todaySchedule");
    if (!schedule) return;

    const today = new Date().toISOString().split("T")[0];
    const todaysJobs = db.jobs.filter(job => job.date === today).sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    if (todaysJobs.length === 0) {
        schedule.innerHTML = `<div class="card">No jobs scheduled today.</div>`;
        return;
    }

    schedule.innerHTML = todaysJobs.map(job => {
        const client = findClient(job.clientId);
        return `
            <div class="scheduleItem" onclick="openJob('${job.id}')" style="cursor:pointer;">
                <div>
                    <h3>${job.time}</h3>
                    <p>${client ? client.firstName + " " + client.lastName : "Unknown Client"}</p>
                </div>
                <div><p>${job.service}</p></div>
            </div>`;
    }).join("");
}

window.openJob = function(id) {
    const job = findJob(id);
    if (!job) return;

    activeJobId = id;
    document.getElementById("jobTitle").textContent = job.clientName;
    document.getElementById("jobStatus").textContent = job.status;
    document.getElementById("jobClient").textContent = job.clientName;
    document.getElementById("jobProfileVehicle").textContent = job.vehicle || "-";
    document.getElementById("jobProfileService").textContent = job.service;
    document.getElementById("jobProfileTotal").textContent = formatMoney(job.total);
    
    const actionContainer = document.getElementById("jobActionContainer");
    if (job.status === "Scheduled") {
        actionContainer.innerHTML = `<button class="primaryBtn" onclick="completeJob('${job.id}')">Mark as Completed & Paid</button>`;
    } else {
        actionContainer.innerHTML = `<p style="color:var(--primary); font-weight:bold; margin-top:15px;">✓ Job Completed</p>`;
    }

    showPage("jobProfilePage");
};

window.completeJob = async function(id) {
    const job = findJob(id);
    if (!job) return;

    job.status = "Completed";
    await setDoc(doc(dbStore, "jobs", id), job);

    if (job.invoiceId) {
        const invRef = doc(dbStore, "invoices", job.invoiceId);
        await setDoc(invRef, { status: "Paid" }, { merge: true });
    }

    addActivity(`Completed job for ${job.clientName} (${formatMoney(job.total)}).`);
    openJob(id);
};

function clearJobForm() {
    ["jobVehicle", "jobDate", "jobTime", "jobPrice"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    const clientSelect = document.getElementById("jobClientSelect");
    if (clientSelect) clientSelect.value = "";
    const serviceSelect = document.getElementById("jobService");
    if (serviceSelect) serviceSelect.selectedIndex = 0;
}

function populateJobClients() {
    const select = document.getElementById("jobClientSelect");
    if (!select) return;
    select.innerHTML = '<option value="">Select Client</option>' + 
        db.clients.map(c => `<option value="${c.id}">${c.firstName} ${c.lastName}</option>`).join("");
}

function refreshApp() {
    populateJobClients();
    renderClients();
    renderJobs();
    renderTodaySchedule();
    updateDashboard();
}

window.showPage = showPage;
window.openClientSheet = openClientSheet;
window.openJobSheet = openJobSheet;
window.closeSheets = closeSheets;
window.saveClient = saveClient;
window.saveJob = saveJob;

document.addEventListener("input", e => { if (e.target.id === "clientSearch") renderClients(); });
document.addEventListener("click", e => { if (e.target.id === "clientSheet" || e.target.id === "jobSheet") closeSheets(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheets(); });

window.onload = () => {
    updateGreeting();
    updateDate();
    initRealtimeSync();
    showPage("homePage");
};
