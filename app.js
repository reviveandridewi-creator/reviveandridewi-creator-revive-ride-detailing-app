// Import Firebase SDK modules (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addFirestoreData, // fallback reference
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    updateDoc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- REPLACE WITH YOUR ACTUAL FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "revive-and-ride",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const jobForm = document.getElementById('job-intake-form');
const jobsTableBody = document.getElementById('jobs-table-body');
const totalRevenueEl = document.getElementById('total-revenue');
const activeJobsEl = document.getElementById('active-jobs-count');
const pendingInvoicesEl = document.getElementById('pending-invoices-count');

// Real-time listener for Jobs collection
export function initApp() {
    if (!jobForm) return;

    // Handle Form Submission
    jobForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const clientName = document.getElementById('client-name').value;
        const year = document.getElementById('car-year').value;
        const make = document.getElementById('car-make').value;
        const model = document.getElementById('car-model').value;
        const packageService = document.getElementById('service-package').value;
        const price = parseFloat(document.getElementById('job-price').value) || 0;
        const status = document.getElementById('invoice-status').value;

        try {
            await addDoc(collection(db, "jobs"), {
                clientName,
                vehicle: `${year} ${make} ${model}`,
                packageService,
                price,
                status,
                createdAt: new Date()
            });

            jobForm.reset();
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("Error saving job. Check console configuration.");
        }
    });

    // Real-time Data Sync with Firestore
    onSnapshot(collection(db, "jobs"), (snapshot) => {
        let jobs = [];
        snapshot.forEach((docSnap) => {
            jobs.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderJobs(jobs);
        updateMetrics(jobs);
    });
}

// Render Jobs Table
function renderJobs(jobs) {
    jobsTableBody.innerHTML = "";

    if (jobs.length === 0) {
        jobsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #8b949e;">No active jobs logged yet.</td></tr>`;
        return;
    }

    jobs.forEach((job) => {
        const row = document.createElement('tr');
        
        const badgeClass = job.status === 'Paid' ? 'paid' : 'pending';

        row.innerHTML = `
            <td>
                <strong>${job.clientName || 'Unknown Client'}</strong><br>
                <span style="color: #8b949e; font-size: 0.85rem;">${job.vehicle || ''}</span>
            </td>
            <td>${job.packageService || ''}</td>
            <td>$${Number(job.price || 0).toFixed(2)}</td>
            <td><span class="status-badge ${badgeClass}">${job.status}</span></td>
            <td>
                <button class="action-btn toggle-btn" onclick="window.toggleStatus('${job.id}', '${job.status}')">Toggle Status</button>
                <button class="action-btn delete-btn" onclick="window.deleteJob('${job.id}')">Delete</button>
            </td>
        `;
        jobsTableBody.appendChild(row);
    });
}

// Update Dashboard Metrics
function updateMetrics(jobs) {
    let totalRev = 0;
    let activeCount = 0;
    let pendingCount = 0;

    jobs.forEach(job => {
        const price = Number(job.price || 0);
        if (job.status === 'Paid') {
            totalRev += price;
        } else {
            pendingCount++;
        }
        activeCount++;
    });

    totalRevenueEl.textContent = `$${totalRev.toFixed(2)}`;
    activeJobsEl.textContent = activeCount;
    pendingInvoicesEl.textContent = pendingCount;
}

// Global actions for table buttons
window.toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Pending' ? 'Paid' : 'Pending';
    try {
        const jobRef = doc(db, "jobs", id);
        await updateDoc(jobRef, { status: newStatus });
    } catch (error) {
        console.error("Error updating status: ", error);
    }
};

window.deleteJob = async (id) => {
    if (confirm("Are you sure you want to delete this job log?")) {
        try {
            await deleteDoc(doc(db, "jobs", id));
        } catch (error) {
            console.error("Error deleting document: ", error);
        }
    }
};

// Initialize on load
initApp();
