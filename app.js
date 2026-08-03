// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyC7yxoYMS3KDP7uyhW7gH6WTnIxxCE",
    authDomain: "revive-and-ride.firebaseapp.com",
    projectId: "revive-and-ride",
    storageBucket: "revive-and-ride.firebasestorage.app",
    messagingSenderId: "917014700622",
    appId: "1:917014700622:web:8d1bae84de9569075b191f",
    measurementId: "G-4X3CD95RC8"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// --- DOM ELEMENTS ---
const jobForm = document.getElementById('job-intake-form');
const jobsTableBody = document.getElementById('jobs-table-body');
const totalRevenueEl = document.getElementById('total-revenue');
const activeJobsCountEl = document.getElementById('active-jobs-count');
const pendingInvoicesCountEl = document.getElementById('pending-invoices-count');

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    loadJobs();
});

jobForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addNewJob();
});

// --- CORE FUNCTIONS ---

// 1. Add a New Job & Vehicle Record to Firestore
async function addNewJob() {
    const clientName = document.getElementById('client-name').value.trim();
    const vehicleYear = document.getElementById('vehicle-year').value.trim();
    const vehicleMake = document.getElementById('vehicle-make').value.trim();
    const vehicleModel = document.getElementById('vehicle-model').value.trim();
    const servicePackage = document.getElementById('service-package').value.trim();
    const price = parseFloat(document.getElementById('job-price').value) || 0;
    const invoiceStatus = document.getElementById('invoice-status').value;

    const vehicleString = `${vehicleYear} ${vehicleMake} ${vehicleModel}`.trim() || 'Custom Vehicle';

    const jobData = {
        clientName,
        vehicle: vehicleString,
        service: servicePackage || 'Standard Detail',
        price,
        status: invoiceStatus,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('jobs').add(jobData);
        jobForm.reset();
        loadJobs();
    } catch (error) {
        console.error("Error adding job: ", error);
        alert("Error saving job. Check your Firebase credentials.");
    }
}

// 2. Real-Time Data Sync & Metric Calculations
function loadJobs() {
    db.collection('jobs').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        let jobs = [];
        let totalRevenue = 0;
        let activeJobsCount = 0;
        let pendingInvoicesCount = 0;

        jobsTableBody.innerHTML = '';

        snapshot.forEach((doc) => {
            const job = { id: doc.id, ...doc.data() };
            jobs.push(job);

            // Calculate Metrics
            if (job.status === 'Paid') {
                totalRevenue += Number(job.price || 0);
            } else {
                pendingInvoicesCount++;
            }
            activeJobsCount++;

            // Render Table Row
            renderJobRow(job);
        });

        // Update Dashboard Cards
        totalRevenueEl.textContent = `$${totalRevenue.toFixed(2)}`;
        activeJobsCountEl.textContent = activeJobsCount;
        pendingInvoicesCountEl.textContent = pendingInvoicesCount;
    }, (error) => {
        console.error("Error loading jobs: ", error);
    });
}

// 3. Render Individual Row in Operations Table
function renderJobRow(job) {
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
        <td><strong>${escapeHtml(job.clientName)}</strong></td>
        <td>${escapeHtml(job.vehicle)}</td>
        <td>${escapeHtml(job.service)}</td>
        <td>$${Number(job.price).toFixed(2)}</td>
        <td>
            <span class="status-badge ${job.status.toLowerCase()}">
                ${escapeHtml(job.status)}
            </span>
        </td>
        <td>
            <button onclick="toggleStatus('${job.id}', '${job.status}')" class="action-btn toggle-btn">Toggle Status</button>
            <button onclick="deleteJob('${job.id}')" class="action-btn delete-btn">Delete</button>
        </td>
    `;
    jobsTableBody.appendChild(tr);
}

// 4. Update Invoice Status (Paid <-> Pending)
async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'Paid' ? 'Pending' : 'Paid';
    try {
        await db.collection('jobs').doc(id).update({ status: newStatus });
    } catch (error) {
        console.error("Error updating status: ", error);
    }
}

// 5. Delete Job Record
async function deleteJob(id) {
    if (confirm("Are you sure you want to delete this job record?")) {
        try {
            await db.collection('jobs').doc(id).delete();
        } catch (error) {
            console.error("Error deleting job: ", error);
        }
    }
}

// Security helper to prevent HTML injection
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
