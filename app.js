import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    updateDoc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "revive-and-ride",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const jobForm = document.getElementById('job-intake-form');
const jobsTableBody = document.getElementById('jobs-table-body');
const totalRevenueEl = document.getElementById('total-revenue');
const activeJobsEl = document.getElementById('active-jobs-count');
const pendingInvoicesEl = document.getElementById('pending-invoices-count');

export function initApp() {
    if (!jobForm) return;

    jobForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const clientName = document.getElementById('client-name').value;
        const clientPhone = document.getElementById('client-phone').value;
        const year = document.getElementById('car-year').value;
        const make = document.getElementById('car-make').value;
        const model = document.getElementById('car-model').value;
        const colorPlate = document.getElementById('car-color').value;
        const packageService = document.getElementById('service-package').value;
        const inspectionNotes = document.getElementById('inspection-notes').value;
        const price = parseFloat(document.getElementById('job-price').value) || 0;
        const status = document.getElementById('invoice-status').value;

        try {
            await addDoc(collection(db, "jobs"), {
                clientName,
                clientPhone,
                vehicle: `${year} ${make} ${model}`,
                colorPlate,
                packageService,
                inspectionNotes,
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

    onSnapshot(collection(db, "jobs"), (snapshot) => {
        let jobs = [];
        snapshot.forEach((docSnap) => {
            jobs.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderJobs(jobs);
        updateMetrics(jobs);
    });
}

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
                <strong>${job.clientName || 'Unknown'}</strong><br>
                <span style="color: #58a6ff; font-size: 0.85rem;">${job.vehicle || ''}</span><br>
                <span style="color: #8b949e; font-size: 0.75rem;">📞 ${job.clientPhone || 'N/A'} | 🚗 ${job.colorPlate || 'N/A'}</span>
            </td>
            <td>
                <strong>${job.packageService || ''}</strong><br>
                <span style="color: #8b949e; font-size: 0.8rem; display: block; margin-top: 4px; max-width: 250px; white-space: pre-wrap;">Notes: ${job.inspectionNotes || 'None'}</span>
            </td>
            <td>$${Number(job.price || 0).toFixed(2)}</td>
            <td><span class="status-badge ${badgeClass}">${job.status}</span></td>
            <td>
                <button class="action-btn toggle-btn" onclick="window.toggleStatus('${job.id}', '${job.status}')">Toggle Status</button><br>
                <button class="action-btn delete-btn" onclick="window.deleteJob('${job.id}')">Delete</button>
            </td>
        `;
        jobsTableBody.appendChild(row);
    });
}

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

initApp();
