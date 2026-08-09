import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    deleteDoc, 
    doc, 
    updateDoc, 
    onSnapshot,
    getDoc 
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
        
        let beforePreviews = (job.beforePhotos || []).map(src => `<img src="${src}" class="photo-thumb" onclick="window.open('${src}')" title="Click to enlarge">`).join('');
        let afterPreviews = (job.afterPhotos || []).map(src => `<img src="${src}" class="photo-thumb" onclick="window.open('${src}')" title="Click to enlarge">`).join('');

        let photosColumn = `
            <div class="photo-section">
                <div class="photo-input-group">
                    <label class="camera-btn">
                        📷 Take Before Photo
                        <input type="file" accept="image/*" capture="environment" onchange="window.handlePhotoUpload('${job.id}', 'beforePhotos', this.files)" style="display: none;">
                    </label>
                    <div class="photo-preview-grid">${beforePreviews}</div>
                </div>
                <div class="photo-input-group">
                    <label class="camera-btn">
                        📷 Take After Photo
                        <input type="file" accept="image/*" capture="environment" onchange="window.handlePhotoUpload('${job.id}', 'afterPhotos', this.files)" style="display: none;">
                    </label>
                    <div class="photo-preview-grid">${afterPreviews}</div>
                </div>
            </div>
        `;

        let statusOptions = `
            <select class="status-dropdown" onchange="window.updateStatus('${job.id}', this.value)">
                <option value="Pending" ${job.status === 'Pending' ? 'selected' : ''}>Status: Pending</option>
                <option value="Active" ${job.status === 'Active' ? 'selected' : ''}>Status: Active</option>
                <option value="Paid" ${job.status === 'Paid' ? 'selected' : ''}>Status: Paid</option>
            </select>
        `;

        let archiveButtonClass = job.isArchived ? "unarchive-btn" : "archive-btn";
        let archiveButtonText = job.isArchived ? "Unarchive Job" : "Move to Archive";
        
        let actionButtons = `
            ${statusOptions}
            <button class="action-btn ${archiveButtonClass}" onclick="window.toggleArchive('${job.id}', ${job.isArchived || false})">${archiveButtonText}</button>
            <button class="action-btn delete-btn" onclick="window.deleteJob('${job.id}')">Delete Log</button>
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
            <td style="min-width: 160px;">${photosColumn}</td>
            <td><strong>$${Number(job.price || 0).toFixed(2)}</strong></td>
            <td style="min-width: 140px;">${actionButtons}</td>
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
        if (job.status === 'Paid') totalRev += price;
        if (!job.isArchived) {
            dashboardCount++;
            if (job.status === 'Pending') pendingCount++;
        }
    });

    totalRevenueEl.textContent = `$${totalRev.toFixed(2)}`;
    activeJobsEl.textContent = dashboardCount;
    pendingInvoicesEl.textContent = pendingCount;
}

function compressImage(file, maxWidth = 600, quality = 0.6) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        };
    });
}

window.handlePhotoUpload = async (jobId, photoType, files) => {
    if (!files || files.length === 0) return;
    try {
        const compressedBase64 = await compressImage(files[0]);
        const jobRef = doc(db, "jobs", jobId);
        const docSnap = await getDoc(jobRef);
        let existingPhotos = docSnap.exists() ? (docSnap.data()[photoType] || []) : [];
        existingPhotos.push(compressedBase64);
        await updateDoc(jobRef, { [photoType]: existingPhotos });
    } catch (error) {
        console.error("Error compressing/saving photo:", error);
    }
};

window.updateStatus = async (id, newStatus) => {
    try { await updateDoc(doc(db, "jobs", id), { status: newStatus }); } 
    catch (error) { console.error("Error updating status: ", error); }
};

window.toggleArchive = async (id, currentArchiveStatus) => {
    try { await updateDoc(doc(db, "jobs", id), { isArchived: !currentArchiveStatus }); } 
    catch (error) { console.error("Error archiving job: ", error); }
};

window.deleteJob = async (id) => {
    if (confirm("Are you sure you want to PERMANENTLY delete this log? This cannot be undone.")) {
        try { await deleteDoc(doc(db, "jobs", id)); } 
        catch (error) { console.error("Error deleting document: ", error); }
    }
};

// Panel Navigation
window.toggleView = function(view) {
    const activePanel = document.getElementById('active-panel');
    const archivePanel = document.getElementById('archive-panel');
    const refPanel = document.getElementById('ref-panel');
    
    const btnActive = document.getElementById('btn-view-active');
    const btnArchive = document.getElementById('btn-view-archive');
    const btnRef = document.getElementById('btn-view-ref');

    activePanel.style.display = 'none';
    archivePanel.style.display = 'none';
    refPanel.style.display = 'none';

    btnActive.classList.remove('active-tab');
    btnArchive.classList.remove('active-tab');
    btnRef.classList.remove('active-tab');

    if (view === 'archive') {
        archivePanel.style.display = 'block';
        btnArchive.classList.add('active-tab');
    } else if (view === 'ref') {
        refPanel.style.display = 'block';
        btnRef.classList.add('active-tab');
    } else {
        activePanel.style.display = 'block';
        btnActive.classList.add('active-tab');
    }
};

// Sub-Tab Navigation for Reference Center
window.toggleRefSubTab = function(subTab) {
    const sopsContent = document.getElementById('ref-sops-content');
    const sdsContent = document.getElementById('ref-sds-content');
    const dilutionContent = document.getElementById('ref-dilution-content');

    const subBtnSops = document.getElementById('sub-btn-sops');
    const subBtnSds = document.getElementById('sub-btn-sds');
    const subBtnDilution = document.getElementById('sub-btn-dilution');

    sopsContent.style.display = 'none';
    sdsContent.style.display = 'none';
    dilutionContent.style.display = 'none';

    subBtnSops.classList.remove('active-sub-tab');
    subBtnSds.classList.remove('active-sub-tab');
    subBtnDilution.classList.remove('active-sub-tab');

    if (subTab === 'sds') {
        sdsContent.style.display = 'block';
        subBtnSds.classList.add('active-sub-tab');
    } else if (subTab === 'dilution') {
        dilutionContent.style.display = 'block';
        subBtnDilution.classList.add('active-sub-tab');
    } else {
        sopsContent.style.display = 'block';
        subBtnSops.classList.add('active-sub-tab');
    }
    
    window.filterRefContent();
};

// Live Keyword Search
window.filterRefContent = function() {
    const query = document.getElementById('ref-search-input').value.toLowerCase();
    const items = document.querySelectorAll('.ref-card');

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const keywords = item.getAttribute('data-keywords') || '';
        if (text.includes(query) || keywords.includes(query)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
};
