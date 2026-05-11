// Background DNA Canvas Animation
function initDNA() {
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
        angle += 0.015;

        for (let i = startX; i < width; i += 35) {
            let offset = i * 0.015;
            let sine1 = Math.sin(angle + offset);
            let sine2 = Math.sin(angle + offset + Math.PI);

            let y1 = centerY + sine1 * 120;
            let y2 = centerY + sine2 * 120;

            let alpha1 = Math.abs(Math.cos(angle + offset)) * 0.4 + 0.1;
            let alpha2 = Math.abs(Math.cos(angle + offset + Math.PI)) * 0.4 + 0.1;

            ctx.beginPath();
            ctx.moveTo(i, y1);
            ctx.lineTo(i, y2);
            ctx.strokeStyle = `rgba(14, 165, 233, ${Math.min(alpha1, alpha2) * 0.5})`;
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

document.addEventListener('DOMContentLoaded', () => {
    initDNA();

    // -- App State & Navigation --
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    // Check auth status
    if (localStorage.getItem('logged_in')) {
        loginView.classList.add('hidden');
        loginView.classList.remove('active');
        appView.classList.remove('hidden');
        appView.classList.add('active');
        document.getElementById('logged-user').textContent = localStorage.getItem('username');
    }

    // Login logic
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;
            try {
                const res = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u, password: p })
                });
                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem('logged_in', 'true');
                    localStorage.setItem('username', data.username);
                    document.getElementById('logged-user').textContent = data.username;
                    loginView.classList.add('hidden');
                    loginView.classList.remove('active');
                    appView.classList.remove('hidden');
                    appView.classList.add('active');
                    loginError.style.display = 'none';
                } else {
                    loginError.style.display = 'block';
                }
            } catch (error) {
                console.error(error);
                loginError.style.display = 'block';
            }
        });
    }

    // Logout logic
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('logged_in');
            localStorage.removeItem('username');
            appView.classList.add('hidden');
            appView.classList.remove('active');
            loginView.classList.remove('hidden');
            loginView.classList.add('active');
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        });
    }

    // Sidebar navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.content-section');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const target = link.getAttribute('data-target');
            sections.forEach(sec => {
                if (sec.id === target) {
                    sec.classList.remove('hidden');
                    sec.classList.add('active');
                } else {
                    sec.classList.add('hidden');
                    sec.classList.remove('active');
                }
            });

            if (target === 'history-section') {
                loadHistory();
            }
        });
    });

    // -- Sequence Analysis Logic --
    const input = document.getElementById('dna-input');
    const counter = document.getElementById('char-counter');
    const analyzeBtn = document.getElementById('analyze-btn');
    const warningMsg = document.getElementById('validation-warning');
    const counterBadge = document.querySelector('.counter-badge');
    const downloadBar = document.getElementById('download-bar');
    const resultsPanel = document.getElementById('results-panel');
    let currentPredictionData = null;

    if (input) {
        input.addEventListener('input', function () {
            let filteredVal = this.value.replace(/[^atcgATCG]/g, '').toUpperCase();

            if (this.value !== filteredVal) {
                this.value = filteredVal;
            }

            const len = filteredVal.length;
            counter.textContent = len;

            if (len === 100) {
                counterBadge.classList.add('valid');
                warningMsg.classList.remove('show');
                analyzeBtn.disabled = false;
            } else {
                counterBadge.classList.remove('valid');
                analyzeBtn.disabled = true;
                if (len > 0 && len !== 100) {
                    warningMsg.classList.add('show');
                } else {
                    warningMsg.classList.remove('show');
                }
            }
        });
    }

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            const sequence = input.value;
            if (sequence.length !== 100) return;

            analyzeBtn.classList.add('loading');
            analyzeBtn.disabled = true;
            input.disabled = true;

            resultsPanel.classList.add('hidden');
            downloadBar.classList.add('hidden');

            try {
                const response = await fetch("/predict", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sequence: sequence })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Prediction failed");
                }

                currentPredictionData = data;
                displayResults(data);

            } catch (error) {
                alert("Backend Error: " + error.message);
            }

            analyzeBtn.classList.remove('loading');
            analyzeBtn.disabled = false;
            input.disabled = false;
        });
    }

    // Generate PDF using backend reportlab
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', async () => {
            if (!currentPredictionData) return;

            const originalText = downloadPdfBtn.innerHTML;
            downloadPdfBtn.disabled = true;
            downloadPdfBtn.innerHTML = "Generating PDF...";

            try {
                const response = await fetch('/generate-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(currentPredictionData)
                });

                if (!response.ok) throw new Error("PDF generation failed");

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `DeepMorph_Clinical_Report.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            } catch (err) {
                console.error(err);
                alert("Could not generate PDF");
            } finally {
                downloadPdfBtn.disabled = false;
                downloadPdfBtn.innerHTML = originalText;
            }
        });
    }

    function displayResults(data) {
        resultsPanel.classList.remove('hidden');
        downloadBar.classList.remove('hidden');

        document.querySelectorAll('.result-card').forEach(c => {
            c.classList.remove('fade-in', 'slide-in-right');
            c.style.opacity = '';
        });

        const mutStatusBadge = document.getElementById('mutation-status-badge');
        const mutIcon = document.getElementById('mutation-icon');
        const mutText = document.getElementById('mutation-status');
        const mutConf = document.getElementById('mutation-confidence');
        const mutConfBar = document.getElementById('mutation-confidence-bar');

        mutConf.textContent = data.mutation_confidence + '%';
        mutConfBar.style.width = data.mutation_confidence + '%';

        if (data.mutation_status === 'Mutated') {
            mutStatusBadge.className = 'status-badge status-mutated';
            mutIcon.innerHTML = '⚠';
            mutText.textContent = 'Mutated Sequence Detected';
        } else {
            mutStatusBadge.className = 'status-badge status-normal';
            mutIcon.innerHTML = '✓';
            mutText.textContent = 'Normal / Non-Mutated';
        }

        document.getElementById('clinical-significance').textContent = data.clinical_significance;

        const riskEl = document.getElementById('risk-level');
        riskEl.textContent = data.risk_level;
        riskEl.className = 'data-value';

        if (data.risk_level === 'High') riskEl.classList.add('badge-high');
        else if (data.risk_level === 'Moderate') riskEl.classList.add('badge-mod');
        else riskEl.classList.add('badge-low');

        document.getElementById('clinical-confidence').textContent = data.clinical_confidence + '%';
        document.getElementById('clinical-confidence-bar').style.width = data.clinical_confidence + '%';

        const cardGene = document.getElementById('card-gene');
        const cardDisease = document.getElementById('card-disease');

        if (data.mutation_status === 'Mutated') {
            cardGene.classList.remove('hidden');
            cardDisease.classList.remove('hidden');
            document.getElementById('predicted-gene').textContent = data.gene;
            document.getElementById('predicted-disease').textContent = data.disease;
            document.getElementById('gene-confidence').textContent = data.gene_confidence + '%';
            document.getElementById('gene-confidence-bar').style.width = data.gene_confidence + '%';
        } else {
            cardGene.classList.add('hidden');
            cardDisease.classList.add('hidden');
        }

        document.getElementById('disease-name').textContent = data.disease;
        document.getElementById('disease-desc').textContent = data.disease_description;

        const symptomList = document.getElementById('symptoms-list');
        symptomList.innerHTML = '';

        data.symptoms.forEach((sym) => {
            const li = document.createElement('li');
            li.textContent = sym;
            li.classList.add('symptom-item-animate');
            symptomList.appendChild(li);
        });

        setTimeout(() => {
            document.getElementById('card-mutation').classList.add('fade-in');
            document.getElementById('card-clinical').classList.add('fade-in');
            document.getElementById('card-disease').classList.add('fade-in');

            if (data.mutation_status === 'Mutated') {
                document.getElementById('card-gene').classList.add('slide-in-right');
            }
        }, 50);
    }

    async function loadHistory() {
        const tbody = document.getElementById('history-table-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem;">Loading history...</td></tr>';
        try {
            const res = await fetch('/history');
            const data = await res.json();

            if (!data.history || data.history.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color: #9ca3af;">No assessment history found. Analysis runs empty.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            data.history.forEach(item => {
                let badgeClass = '';
                if (item.risk_level === 'High') badgeClass = 'badge-high';
                else if (item.risk_level === 'Moderate') badgeClass = 'badge-mod';
                else badgeClass = 'badge-low';

                let mutClass = item.mutation_status === 'Mutated' ? 'text-mutated' : 'text-normal';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.timestamp}</td>
                    <td style="font-family: monospace; letter-spacing: 1px; color:#f3f4f6;">${item.sequence}</td>
                    <td class="${mutClass}" style="font-weight: 600;">${item.mutation_status}</td>
                    <td>${item.gene}</td>
                    <td class="${badgeClass}" style="font-weight:bold;">${item.risk_level}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color: #ef4444;">Failed to load history from server.</td></tr>';
        }
    }

});