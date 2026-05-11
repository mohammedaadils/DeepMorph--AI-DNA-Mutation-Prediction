/* ═══════════════════════════════════════════════
   DeepMorph AI — Main Application Script
   Handles all page-specific logic, API calls,
   and shared functionality
   ═══════════════════════════════════════════════ */

// ══════════════════════════════════
// Background DNA Canvas (shared)
// ══════════════════════════════════
function initDNABackground() {
    const canvas = document.getElementById('dna-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    let angle = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 4.5);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        const centerY = canvas.height / 2;
        const width = canvas.width * 2;
        const startX = -canvas.width / 2;
        ctx.lineWidth = 1;
        angle += 0.012;

        for (let i = startX; i < width; i += 40) {
            let offset = i * 0.012;
            let sine1 = Math.sin(angle + offset);
            let sine2 = Math.sin(angle + offset + Math.PI);
            let y1 = centerY + sine1 * 120;
            let y2 = centerY + sine2 * 120;
            let alpha1 = Math.abs(Math.cos(angle + offset)) * 0.35 + 0.08;
            let alpha2 = Math.abs(Math.cos(angle + offset + Math.PI)) * 0.35 + 0.08;

            ctx.beginPath();
            ctx.moveTo(i, y1);
            ctx.lineTo(i, y2);
            ctx.strokeStyle = `rgba(14, 165, 233, ${Math.min(alpha1, alpha2) * 0.4})`;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(i, y1, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(56, 189, 248, ${alpha1})`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(i, y2, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(20, 184, 166, ${alpha2})`;
            ctx.fill();
        }

        ctx.restore();
        requestAnimationFrame(draw);
    }
    draw();
}


// ══════════════════════════════════
// Utility Functions
// ══════════════════════════════════
function getStoredUser() {
    return localStorage.getItem('dm_user') || 'Doctor';
}

function setNavUser() {
    const el = document.getElementById('nav-user');
    if (el) el.textContent = '👤 ' + getStoredUser();
    const welcomeEl = document.getElementById('welcome-user');
    if (welcomeEl) welcomeEl.textContent = getStoredUser();
}

function handleLogout() {
    const btn = document.getElementById('logout-btn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            localStorage.removeItem('dm_user');
            localStorage.removeItem('dm_logged_in');
            sessionStorage.removeItem('prediction_data');
        });
    }
}

function getPredictionData() {
    const raw = sessionStorage.getItem('prediction_data');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function savePredictionData(data) {
    sessionStorage.setItem('prediction_data', JSON.stringify(data));
}


// ══════════════════════════════════
// Page Detection & Initialization
// ══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initDNABackground();
    setNavUser();
    handleLogout();

    const path = window.location.pathname;

    if (path === '/' || path === '') {
        initLoginPage();
    } else if (path === '/dashboard') {
        initDashboardPage();
    } else if (path === '/patients-page') {
        initPatientsPage();
    } else if (path === '/submit') {
        initSubmitPage();
    } else if (path === '/mutation') {
        initMutationPage();
    } else if (path === '/clinical') {
        initClinicalPage();
    } else if (path === '/diseases') {
        initDiseasesPage();
    } else if (path === '/report') {
        initReportPage();
    } else if (path === '/history-page') {
        initHistoryPage();
    }
});


// ══════════════════════════════════
// 1. LOGIN PAGE
// ══════════════════════════════════
function initLoginPage() {
    // If already logged in, redirect
    if (localStorage.getItem('dm_logged_in')) {
        window.location.href = '/dashboard';
        return;
    }

    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            loginBtn.classList.add('loading');
            errorEl.style.display = 'none';

            try {
                const res = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem('dm_logged_in', 'true');
                    localStorage.setItem('dm_user', data.email.split('@')[0]);
                    window.location.href = '/dashboard';
                } else {
                    errorEl.style.display = 'block';
                    loginBtn.classList.remove('loading');
                }
            } catch (err) {
                console.error(err);
                errorEl.style.display = 'block';
                loginBtn.classList.remove('loading');
            }
        });
    }
}


// ══════════════════════════════════
// 2. DASHBOARD PAGE
// ══════════════════════════════════
function initDashboardPage() {
    loadDashboardStats();
}

async function loadDashboardStats() {
    try {
        const res = await fetch('/dashboard-stats');
        const data = await res.json();

        document.getElementById('stat-patients').textContent = data.total_patients || 0;
        document.getElementById('stat-sequences').textContent = data.total_sequences || 0;
        document.getElementById('stat-high-risk').textContent = data.high_risk_count || 0;
        document.getElementById('stat-recent').textContent = data.recent ? data.recent.length : 0;

        // Load recent analyses table
        const tbody = document.getElementById('recent-table-body');
        if (data.recent && data.recent.length > 0) {
            tbody.innerHTML = '';
            data.recent.forEach(item => {
                const tr = document.createElement('tr');
                const riskClass = item.risk_level === 'High' ? 'badge-high' :
                    item.risk_level === 'Moderate' ? 'badge-mod' : 'badge-low';
                const mutClass = item.mutation_status === 'Mutated' ? 'badge-mutated' : 'badge-normal';
                tr.innerHTML = `
                    <td>${item.timestamp}</td>
                    <td>${item.patient_id || 'N/A'}</td>
                    <td style="font-family: monospace; letter-spacing: 1px; font-size: 0.85rem;">${item.sequence}</td>
                    <td><span class="badge ${mutClass}">${item.mutation_status}</span></td>
                    <td><span class="badge ${riskClass}">${item.risk_level}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error('Failed to load dashboard stats:', err);
    }
}


// ══════════════════════════════════
// 3. PATIENT MANAGEMENT PAGE
// ══════════════════════════════════
function initPatientsPage() {
    loadPatients();

    const form = document.getElementById('patient-form');
    const searchInput = document.getElementById('patient-search');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('edit-patient-id').value;
            const name = document.getElementById('patient-name').value;
            const age = parseInt(document.getElementById('patient-age').value);
            const gender = document.getElementById('patient-gender').value;

            try {
                if (editId) {
                    // Update patient
                    await fetch(`/patients/${editId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, age, gender })
                    });
                    cancelEdit();
                } else {
                    // Create patient
                    await fetch('/patients', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, age, gender })
                    });
                }
                form.reset();
                loadPatients();
            } catch (err) {
                console.error('Patient operation failed:', err);
                alert('Operation failed. Try again.');
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            const rows = document.querySelectorAll('#patient-table-body tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }
}

async function loadPatients() {
    try {
        const res = await fetch('/patients');
        const data = await res.json();
        const tbody = document.getElementById('patient-table-body');

        if (!data.patients || data.patients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No patients registered yet.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.patients.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family: monospace; color: var(--accent-blue);">${p.patient_id}</td>
                <td>${p.name}</td>
                <td>${p.age}</td>
                <td>${p.gender}</td>
                <td>
                    <button class="edit-btn" onclick="editPatient('${p.patient_id}', '${p.name}', ${p.age}, '${p.gender}')">✏ Edit</button>
                    <button class="danger-btn" onclick="deletePatient('${p.patient_id}')">🗑 Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load patients:', err);
    }
}

function editPatient(id, name, age, gender) {
    document.getElementById('edit-patient-id').value = id;
    document.getElementById('patient-name').value = name;
    document.getElementById('patient-age').value = age;
    document.getElementById('patient-gender').value = gender;
    document.getElementById('form-title').textContent = 'Update Patient';
    document.getElementById('patient-submit-btn').querySelector('.btn-text').textContent = 'Update Patient';
    document.getElementById('cancel-edit-btn').style.display = 'inline-block';
}

function cancelEdit() {
    document.getElementById('edit-patient-id').value = '';
    document.getElementById('patient-form').reset();
    document.getElementById('form-title').textContent = 'Register New Patient';
    document.getElementById('patient-submit-btn').querySelector('.btn-text').textContent = 'Create Patient';
    document.getElementById('cancel-edit-btn').style.display = 'none';
}

async function deletePatient(id) {
    if (!confirm('Delete this patient record?')) return;
    try {
        await fetch(`/patients/${id}`, { method: 'DELETE' });
        loadPatients();
    } catch (err) {
        console.error('Delete failed:', err);
    }
}


// ══════════════════════════════════
// 4. SEQUENCE SUBMISSION PAGE
// ══════════════════════════════════
function initSubmitPage() {
    loadPatientDropdown();

    const input = document.getElementById('dna-input');
    const counter = document.getElementById('char-counter');
    const analyzeBtn = document.getElementById('analyze-btn');
    const warningMsg = document.getElementById('validation-warning');
    const counterBadge = document.getElementById('counter-badge');

    if (input) {
        input.addEventListener('input', function () {
            let filtered = this.value.replace(/[^atcgATCG]/g, '').toUpperCase();
            if (this.value !== filtered) this.value = filtered;

            const len = filtered.length;
            counter.textContent = len;

            // Base counts
            document.getElementById('count-a').textContent = (filtered.match(/A/g) || []).length;
            document.getElementById('count-t').textContent = (filtered.match(/T/g) || []).length;
            document.getElementById('count-g').textContent = (filtered.match(/G/g) || []).length;
            document.getElementById('count-c').textContent = (filtered.match(/C/g) || []).length;

            if (len === 100) {
                counterBadge.classList.add('valid');
                warningMsg.classList.remove('show');
                analyzeBtn.disabled = false;
            } else {
                counterBadge.classList.remove('valid');
                analyzeBtn.disabled = true;
                if (len > 0 && len !== 100) warningMsg.classList.add('show');
                else warningMsg.classList.remove('show');
            }
        });
    }

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            const sequence = input.value;
            if (sequence.length !== 100) return;

            const patientId = document.getElementById('seq-patient-select').value || null;

            analyzeBtn.classList.add('loading');
            analyzeBtn.disabled = true;
            input.disabled = true;

            try {
                const res = await fetch('/predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sequence, patient_id: patientId })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Prediction failed');

                // Store prediction data and redirect
                savePredictionData(data);
                window.location.href = '/mutation';

            } catch (err) {
                alert('Analysis Error: ' + err.message);
                analyzeBtn.classList.remove('loading');
                analyzeBtn.disabled = false;
                input.disabled = false;
            }
        });
    }
}

async function loadPatientDropdown() {
    const select = document.getElementById('seq-patient-select');
    if (!select) return;
    try {
        const res = await fetch('/patients');
        const data = await res.json();
        if (data.patients && data.patients.length > 0) {
            data.patients.forEach(p => {
                const option = document.createElement('option');
                option.value = p.patient_id;
                option.textContent = `${p.patient_id} — ${p.name}`;
                select.appendChild(option);
            });
        }
    } catch (err) {
        console.error('Failed to load patients for dropdown:', err);
    }
}


// ══════════════════════════════════
// 5. MUTATION ANALYSIS PAGE
// ══════════════════════════════════
function initMutationPage() {
    const data = getPredictionData();
    const noDataMsg = document.getElementById('no-data-msg');
    const results = document.getElementById('mutation-results');

    if (!data) {
        noDataMsg.style.display = 'block';
        results.style.display = 'none';
        return;
    }

    noDataMsg.style.display = 'none';
    results.style.display = 'block';

    // Mutation status
    const statusBadge = document.getElementById('mutation-status-badge');
    const mutIcon = document.getElementById('mutation-icon');
    const mutStatus = document.getElementById('mutation-status');
    const mutConf = document.getElementById('mutation-confidence');
    const mutConfBar = document.getElementById('mutation-confidence-bar');

    mutConf.textContent = data.mutation_confidence + '%';
    setTimeout(() => { mutConfBar.style.width = data.mutation_confidence + '%'; }, 100);

    if (data.mutation_status === 'Mutated') {
        statusBadge.className = 'status-badge status-mutated';
        mutIcon.textContent = '⚠';
        mutStatus.textContent = 'Mutated Sequence Detected';
    } else {
        statusBadge.className = 'status-badge status-normal';
        mutIcon.textContent = '✓';
        mutStatus.textContent = 'Normal / Non-Mutated';
    }

    // Hotspot info — only show if mutation detected
    if (data.mutation_hotspot) {
        document.getElementById('hotspot-position').textContent = 'Position ' + data.mutation_hotspot;
        document.getElementById('hotspot-ref').textContent = data.reference_base || '—';
        document.getElementById('hotspot-obs').textContent = data.observed_base || '—';
    } else {
        document.getElementById('hotspot-position').textContent = 'No mutation detected';
        document.getElementById('hotspot-ref').textContent = '—';
        document.getElementById('hotspot-obs').textContent = '—';
    }

    // Draw helix visualization (null hotspot = no highlighting)
    if (window.drawHotspotHelix) {
        window.drawHotspotHelix('hotspot-canvas', data.mutation_hotspot || -1, 100);
    }
}


// ══════════════════════════════════
// 6. CLINICAL SIGNIFICANCE PAGE
// ══════════════════════════════════
function initClinicalPage() {
    const data = getPredictionData();
    const noDataMsg = document.getElementById('no-data-msg');
    const results = document.getElementById('clinical-results');

    if (!data) {
        noDataMsg.style.display = 'block';
        results.style.display = 'none';
        return;
    }

    noDataMsg.style.display = 'none';
    results.style.display = 'block';

    // Clinical significance
    document.getElementById('clinical-significance').textContent = data.clinical_significance;
    document.getElementById('clinical-confidence').textContent = data.clinical_confidence + '%';
    setTimeout(() => {
        document.getElementById('clinical-confidence-bar').style.width = data.clinical_confidence + '%';
    }, 100);

    // Explanation
    const explanations = {
        'Pathogenic': 'This variant is classified as pathogenic, meaning it is directly associated with disease causation. Immediate clinical follow-up is strongly recommended.',
        'Likely pathogenic': 'This variant is likely pathogenic, suggesting a high probability of disease association. Further confirmatory testing is advised.',
        'Benign': 'This variant is classified as benign, indicating it is not associated with disease. No clinical intervention is required.',
        'Likely benign': 'This variant is likely benign, suggesting minimal or no disease association. Routine monitoring may be sufficient.',
        'Uncertain significance': 'The clinical significance of this variant is uncertain. Additional functional studies or family segregation analysis may help clarify its role.'
    };
    const explEl = document.getElementById('clinical-explanation');
    explEl.textContent = explanations[data.clinical_significance] || 'Clinical interpretation based on AI model analysis.';

    // Risk level
    const riskCircle = document.getElementById('risk-circle');
    const riskLevel = document.getElementById('risk-level');
    riskLevel.textContent = data.risk_level;

    riskCircle.className = 'risk-circle';
    if (data.risk_level === 'High') {
        riskCircle.classList.add('risk-high');
    } else if (data.risk_level === 'Moderate') {
        riskCircle.classList.add('risk-mod');
    } else {
        riskCircle.classList.add('risk-low');
    }

    const riskDescs = {
        'High': 'High risk — the mutation is pathogenic and is strongly associated with disease. Urgent clinical evaluation recommended.',
        'Moderate': 'Moderate risk — the mutation is likely pathogenic. Further diagnostic testing and regular monitoring advised.',
        'Low': 'Low risk — no significant pathogenic variants detected. Standard health screening sufficient.'
    };
    document.getElementById('risk-description').textContent = riskDescs[data.risk_level] || '';

    // Gene prediction
    document.getElementById('predicted-gene').textContent = data.gene;
    document.getElementById('predicted-disease').textContent =
        data.mutation_status === 'Non-Mutated' ? 'No disease associated' : data.disease;
    document.getElementById('gene-confidence').textContent = data.gene_confidence + '%';
    setTimeout(() => {
        document.getElementById('gene-confidence-bar').style.width = data.gene_confidence + '%';
    }, 100);
}


// ══════════════════════════════════
// 7. DISEASE KNOWLEDGE PAGE
// ══════════════════════════════════
function initDiseasesPage() {
    const data = getPredictionData();
    const container = document.getElementById('disease-content');
    const noDataMsg = document.getElementById('no-data-msg');

    if (!data || !data.gene) {
        noDataMsg.style.display = 'block';
        container.style.display = 'none';
        return;
    }

    // Non-mutated: show "no disease" message instead of disease details
    if (data.mutation_status === 'Non-Mutated') {
        noDataMsg.style.display = 'none';
        container.style.display = 'block';
        container.innerHTML = `
            <div class="glass-card empty-card">
                <div class="empty-icon">✅</div>
                <h3>There is no disease associated with this sequence.</h3>
                <p style="color: var(--text-secondary); margin-top: 0.5rem;">The predicted gene is <strong style="color: var(--accent-blue);">${data.gene}</strong>, but no mutation was detected.</p>
            </div>`;
        return;
    }

    noDataMsg.style.display = 'none';
    container.style.display = 'block';

    // Fill predicted gene's disease information from prediction data
    document.getElementById('disease-gene').textContent = data.gene;
    document.getElementById('disease-name').textContent = data.disease || 'Unknown';
    document.getElementById('disease-desc').textContent = data.disease_description || 'No description available.';

    // Symptoms
    const sympList = document.getElementById('disease-symptoms');
    if (data.symptoms && data.symptoms.length > 0) {
        sympList.innerHTML = data.symptoms.map(s => `<li>${s}</li>`).join('');
        document.getElementById('symptoms-section').style.display = 'block';
    } else {
        document.getElementById('symptoms-section').style.display = 'none';
    }

    // Treatments
    const treatList = document.getElementById('disease-treatments');
    if (data.treatments && data.treatments.length > 0) {
        treatList.innerHTML = data.treatments.map(t => `<li>${t}</li>`).join('');
        document.getElementById('treatments-section').style.display = 'block';
    } else {
        document.getElementById('treatments-section').style.display = 'none';
    }

    // Surgery
    const surgList = document.getElementById('disease-surgery');
    if (data.surgery && data.surgery.length > 0) {
        surgList.innerHTML = data.surgery.map(s => `<li>${s}</li>`).join('');
        document.getElementById('surgery-section').style.display = 'block';
    } else {
        document.getElementById('surgery-section').style.display = 'none';
    }

    // Mortality stats
    document.getElementById('disease-death-rate').textContent = data.global_death_rate || 'N/A';
    document.getElementById('disease-yearly-deaths').textContent = data.yearly_deaths || 'N/A';
}


// ══════════════════════════════════
// 8. REPORT GENERATION PAGE
// ══════════════════════════════════
function initReportPage() {
    const data = getPredictionData();
    const noDataMsg = document.getElementById('no-data-msg');
    const reportContent = document.getElementById('report-content');

    if (!data) {
        noDataMsg.style.display = 'block';
        reportContent.style.display = 'none';
        return;
    }

    noDataMsg.style.display = 'none';
    reportContent.style.display = 'block';

    // Fill preview with patient info (try to get from stored patients)
    fillReportPreview(data);

    const generateBtn = document.getElementById('generate-pdf-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            generateBtn.classList.add('loading');
            generateBtn.disabled = true;

            try {
                // Get patient info if available
                let patientInfo = { name: 'N/A', age: null, gender: 'N/A' };
                if (data.patient_id && data.patient_id !== 'N/A') {
                    try {
                        const pRes = await fetch('/patients');
                        const pData = await pRes.json();
                        const patient = pData.patients.find(p => p.patient_id === data.patient_id);
                        if (patient) patientInfo = patient;
                    } catch (e) { /* ignore */ }
                }

                const reportPayload = {
                    patient_id: data.patient_id || 'N/A',
                    patient_name: patientInfo.name,
                    patient_age: patientInfo.age,
                    patient_gender: patientInfo.gender,
                    mutation_status: data.mutation_status,
                    mutation_confidence: data.mutation_confidence,
                    mutation_hotspot: data.mutation_hotspot,
                    reference_base: data.reference_base,
                    observed_base: data.observed_base,
                    clinical_significance: data.clinical_significance,
                    clinical_confidence: data.clinical_confidence,
                    risk_level: data.risk_level,
                    gene: data.gene,
                    gene_confidence: data.gene_confidence,
                    disease: data.disease,
                    disease_description: data.disease_description,
                    symptoms: data.symptoms || [],
                    treatments: data.treatments || [],
                    surgery: data.surgery || [],
                    global_death_rate: data.global_death_rate,
                    yearly_deaths: data.yearly_deaths,
                    timestamp: data.timestamp
                };

                const res = await fetch('/generate-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reportPayload)
                });

                if (!res.ok) throw new Error('PDF generation failed');

                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'DeepMorph_Clinical_Report.pdf';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);

                document.getElementById('generate-success').style.display = 'block';
            } catch (err) {
                console.error(err);
                alert('Failed to generate PDF report.');
            } finally {
                generateBtn.classList.remove('loading');
                generateBtn.disabled = false;
            }
        });
    }
}

async function fillReportPreview(data) {
    document.getElementById('rpt-patient-id').textContent = data.patient_id || 'N/A';
    document.getElementById('rpt-timestamp').textContent = data.timestamp;
    document.getElementById('rpt-mutation-status').textContent = data.mutation_status;
    document.getElementById('rpt-mutation-conf').textContent = data.mutation_confidence + '%';
    document.getElementById('rpt-hotspot').textContent = data.mutation_hotspot
        ? `Position ${data.mutation_hotspot} (${data.reference_base} → ${data.observed_base})`
        : 'No hotspot detected';
    document.getElementById('rpt-clinical-sig').textContent = data.clinical_significance;
    document.getElementById('rpt-risk-level').textContent = data.risk_level;
    document.getElementById('rpt-gene').textContent = data.gene;
    document.getElementById('rpt-gene-conf').textContent = data.gene_confidence + '%';
    document.getElementById('rpt-disease').textContent = data.disease;
    document.getElementById('rpt-disease-desc').textContent = data.disease_description;

    // Try to get patient details
    if (data.patient_id && data.patient_id !== 'N/A') {
        try {
            const res = await fetch('/patients');
            const pData = await res.json();
            const patient = pData.patients.find(p => p.patient_id === data.patient_id);
            if (patient) {
                document.getElementById('rpt-patient-name').textContent = patient.name;
                document.getElementById('rpt-patient-age').textContent = patient.age;
                document.getElementById('rpt-patient-gender').textContent = patient.gender;
            }
        } catch (e) { /* ignore */ }
    }
}


// ══════════════════════════════════
// 9. ASSESSMENT HISTORY PAGE
// ══════════════════════════════════
function initHistoryPage() {
    loadHistory();
}

async function loadHistory() {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;

    try {
        const res = await fetch('/history');
        const data = await res.json();

        if (!data.history || data.history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No assessment history found. Submit a DNA sequence to begin.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.history.forEach((item, index) => {
            const riskClass = item.risk_level === 'High' ? 'badge-high' :
                item.risk_level === 'Moderate' ? 'badge-mod' : 'badge-low';
            const mutClass = item.mutation_status === 'Mutated' ? 'badge-mutated' : 'badge-normal';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.timestamp}</td>
                <td style="font-family: monospace;">${item.patient_id || 'N/A'}</td>
                <td style="font-family: monospace; font-size: 0.85rem; letter-spacing: 1px;">${item.sequence}</td>
                <td><span class="badge ${mutClass}">${item.mutation_status}</span></td>
                <td><span class="badge ${riskClass}">${item.risk_level}</span></td>
                <td><button class="view-btn" onclick="viewHistoryItem(${index})">View</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load history:', err);
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="color: #ef4444;">Failed to load history.</td></tr>';
    }
}

async function viewHistoryItem(index) {
    try {
        const res = await fetch('/history');
        const data = await res.json();
        if (data.history && data.history[index]) {
            savePredictionData(data.history[index]);
            window.location.href = '/mutation';
        }
    } catch (err) {
        console.error('Failed to load history item:', err);
    }
}
