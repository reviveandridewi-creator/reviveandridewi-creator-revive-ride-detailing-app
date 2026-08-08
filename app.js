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
const archiveTableBody = document.getElementById('archive-table-body');
const totalRevenueEl = document.getElementById('total-revenue');
const activeJobsEl = document.getElementById('active-jobs-count');
const pendingInvoicesEl = document.getElementById('pending-invoices-count');

initApp();

function initApp() {
    onSnapshot(collection(db, "jobs"), (snapshot) => {
        let jobs = [];
        snapshot.forEach((docSnap) => {
            jobs.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort so newest appear at the top
        jobs.sort((a, b) => {
            const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
            const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
            return timeB - timeA;
        });

        renderJobs(jobs);
        updateMetrics(jobs);
    });
}

function renderJobs(jobs) {
    jobsTableBody.innerHTML = "";
    archiveTableBody.innerHTML = "";

    let activeCount = 0;
    let archiveCount = 0;

    jobs.forEach((job) => {
        const row = document.createElement('tr');
        
        // Status Dropdown Menu
        let statusOptions = `
            <select class="status-dropdown" onchange="window.updateStatus('${job.id}', this.value)">
                <option value="Pending" ${job.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Active" ${job.status === 'Active' ? 'selected' : ''}>Active</option>
                <option value="Paid" ${job.status === 'Paid' ? 'selected' : ''}>Paid</option>
            </select>
        `;

        // Archive / Delete Buttons
        let archiveButtonClass = job.isArchived ? "unarchive-btn" : "archive-btn";
        let archiveButtonText = job.isArchived ? "Unarchive Job" : "Move to Archive";
        
        let actionButtons = `
            <button class="action-btn ${archiveButtonClass}" onclick="window.toggleArchive('${job.id}', ${job.isArchived || false})">${archiveButtonText}</button>
            <button class="action-btn delete-btn" onclick="window.deleteJob('${job.id}')">Permanent Delete</button>
        `;

        row.innerHTML = `
            <td>
                <strong>${job.clientName || 'Unknown'}</strong><br>
                <span style="color: #58a6ff; font-size: 0.85rem;">${job.vehicle || ''}</span><br>
                <span style="color: #8b949e; font-size: 0.75rem;">📞 ${job.clientPhone || 'N/A'}</span>
            </td>
            <td>
                <strong>${job.packageService || ''}</strong><br>
                <span style="color: #c9d1d9; font-size: 0.8rem;">${job.inspectionNotes || 'None'}</span>
            </td>
            <td>$${Number(job.price || 0).toFixed(2)}</td>
            <td>${statusOptions}</td>
            <td>${actionButtons}</td>
        `;

        if (job.isArchived) {
            archiveTableBody.appendChild(row);
            archiveCount++;
        } else {
            jobsTableBody.appendChild(row);
            activeCount++;
        }
    });

    if (activeCount === 0) {
        jobsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #8b949e;">No active jobs right now.</td></tr>`;
    }
    if (archiveCount === 0) {
        archiveTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #8b949e;">No archived customers yet.</td></tr>`;
    }
}

function updateMetrics(jobs) {
    let totalRev = 0;
    let dashboardCount = 0;
    let pendingCount = 0;

    jobs.forEach(job => {
        const price = Number(job.price || 0);
        
        // Total Revenue tracks ALL paid jobs, even if they are archived
        if (job.status === 'Paid') {
            totalRev += price;
        }

        // Only count active (unarchived) jobs for the dashboard metrics
        if (!job.isArchived) {
            dashboardCount++;
            if (job.status === 'Pending') {
                pendingCount++;
            }
        }
    });

    totalRevenueEl.textContent = `$${totalRev.toFixed(2)}`;
    activeJobsEl.textContent = dashboardCount;
    pendingInvoicesEl.textContent = pendingCount;
}

// Global functions for inline HTML calling
window.updateStatus = async (id, newStatus) => {
    try {
        await updateDoc(doc(db, "jobs", id), { status: newStatus });
    } catch (error) {
        console.error("Error updating status: ", error);
    }
};

window.toggleArchive = async (id, currentArchiveStatus) => {
    try {
        // Flips it: if it was archived, it becomes unarchived, and vice versa
        await updateDoc(doc(db, "jobs", id), { isArchived: !currentArchiveStatus });
    } catch (error) {
        console.error("Error archiving job: ", error);
    }
};

window.deleteJob = async (id) => {
    if (confirm("Are you sure you want to PERMANENTLY delete this log? This cannot be undone.")) {
        try {
            await deleteDoc(doc(db, "jobs", id));
        } catch (error) {
            console.error("Error deleting document: ", error);
        }
    }
};

// UI View Toggle
window.toggleView = (view) => {
    const activePanel = document.getElementById('active-panel');
    const archivePanel = document.getElementById('archive-panel');
    const btnActive = document.getElementById('btn-view-active');
    const btnArchive = document.getElementById('btn-view-archive');

    if (view === 'archive') {
        activePanel.style.display = 'none';
        archivePanel.style.display = 'block';
        btnActive.classList.remove('active-tab');
        btnArchive.classList.add('active-tab');
    } else {
        activePanel.style.display = 'block';
        archivePanel.style.display = 'none';
        btnActive.classList.add('active-tab');
        btnArchive.classList.remove('active-tab');
    }
};
