import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    deleteDoc, 
    doc, 
    updateDoc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC7yxoY9MS3KDP7uyhW7gH6WTnIxxCEXF4",
    authDomain: "revive-and-ride.firebaseapp.com",
    projectId: "revive-and-ride",
    storageBucket: "revive-and-ride.firebasestorage.app",
    messagingSenderId: "917014700622",
    appId: "1:917014700622:web:8d1bae84de9569075b191f",
    measurementId: "G-4X3CD95RC8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const jobsTableBody = document.getElementById('jobs-table-body');
const totalRevenueEl = document.getElementById('total-revenue');
const activeJobsEl = document.getElementById('active-jobs-count');
const pendingInvoicesEl = document.getElementById('pending-invoices-count');

// Initialize app directly without waiting for login
initApp();

function initApp() {
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

    // Sort jobs so newest bookings appear at the top
    jobs.sort((a, b) => {
        const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
        const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
        return timeB - timeA;
    });

    jobs.forEach((job) => {
        const row = document.createElement('tr');
        const badgeClass = job.status === 'Paid' ? 'paid' : 'pending';

        let actionButtons = `
            <button class="action-btn toggle-btn" onclick="window.toggleStatus('${job.id}', '${job.status}')">Toggle Status</button>
            <br>
            <button class="action-btn delete-btn" onclick="window.deleteJob('${job.id}')">Delete</button>
        `;

        row.innerHTML = `
            <td>
                <strong>${job.clientName || 'Unknown'}</strong><br>
                <span style="color: #58a6ff; font-size: 0.85rem;">${job.vehicle || ''}</span><br>
                <span style="color: #8b949e; font-size: 0.75rem;">📞 ${job.clientPhone || 'N/A'}</span><br>
                <span style="color: #8b949e; font-size: 0.75rem;">📍 ${job.colorPlate || 'N/A'}</span>
            </td>
            <td>
                <strong>${job.packageService || ''}</strong><br>
                <span style="color: #c9d1d9; font-size: 0.8rem; display: block; margin-top: 4px; max-width: 250px; white-space: pre-wrap;">${job.inspectionNotes || 'None'}</span><br>
                <span style="color: #58a6ff; font-size: 0.7rem;">Source: ${job.loggedBy || 'Admin'}</span>
            </td>
            <td>$${Number(job.price || 0).toFixed(2)}</td>
            <td><span class="status-badge ${badgeClass}">${job.status}</span></td>
            <td>${actionButtons}</td>
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
