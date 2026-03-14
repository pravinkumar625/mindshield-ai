
const API_BASE = "http://127.0.0.1:8000"; // IMPORTANT: For online deployment, replace this with your actual backend URL (e.g., https://api.mindshield.com)

// --- GLOBAL STATE ---
let stressHistory = [20, 25, 22, 28, 25, 24, 26]; // Initial dummy data
let stressChart = null;
let gameInterval;
let audioContext, analyser, dataArray;
let userData = { name: "John Doe", age: 25, phone: "123-456-7890", email: "dummy@example.com" };

// --- AUTH LOGIC ---
function handleLogin() {
    const termsChecked = document.getElementById("login-terms").checked;
    if (!termsChecked) {
        alert("Please accept the Terms & Conditions and location consent to continue.");
        return;
    }
    document.getElementById("login-form").style.display = "none";
    document.getElementById("otp-form").style.display = "block";
}

function handleVerifyOTP() {
    const otp = document.getElementById("login-otp").value;
    const role = document.getElementById('login-role').value;
    const email = document.getElementById('login-email').value;
    
    // Admin restriction check
    if (role === 'admin' && email !== "admin@mindshield.com") {
        alert("Access Denied: You do not have administrator privileges. Only 'admin@mindshield.com' can access this portal.");
        // Reset to home page form
        document.getElementById("otp-form").style.display = "none";
        document.getElementById("login-form").style.display = "block";
        return;
    }

    if(otp === "1234") {
        document.getElementById("auth-container").style.display = "none";
        document.getElementById("app-footer").style.display = "block";
        document.getElementById("support-btn").style.display = "flex";
        
        if (role === 'admin') {
            document.getElementById("admin-dashboard").style.display = "grid";
        } else if (role === 'psychologist') {
            document.getElementById("psychologist-dashboard").style.display = "grid";
            populatePsychologistDashboard();
        }
        
        // Fix Dashboard Greeting
        const nameInput = document.getElementById('login-name').value.split(' ')[0] || "User";
        userData.name = nameInput;
        document.getElementById('user-display-name').innerText = nameInput;

        // Show Landing View first (Full Width)
        document.getElementById("main-app").style.display = "grid";
        showView('landing-view');

        // Init apps only after login
        initChart();
        initVideo();
        initAudio();
        initFaceDetection();
    } else {
        alert("Invalid OTP. Try 1234.");
    }
}

// --- NAVIGATION LOGIC ---
function showView(viewId) {
    const appContainer = document.getElementById('main-app');
    
    // Manage Sidebar: Only show sidebar if NOT on landing-view
    if (viewId === 'landing-view') {
        appContainer.classList.remove('with-sidebar');
    } else {
        appContainer.classList.add('with-sidebar');
    }

    const views = ['landing-view', 'dashboard-view', 'chat-view', 'scanner-view', 'tools-view', 'history-view', 'support-view'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === viewId ? 'flex' : 'none';
    });
    
    // Auto-init specific views
    if (viewId === 'chat-view') {
        const chatbox = document.getElementById("chatbox");
        if (chatbox.children.length <= 1) {
            appendMessage('ai', "I'm ready to listen. How are you feeling right now?");
        }
    }
}

// --- NATURAL SPEECH LOGIC ---
function speakResponse(text, emotion) {
    if (!window.speechSynthesis) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Adjust voice parameters based on emotion for "natural speech slang/tone"
    switch(emotion) {
        case 'anger':
            utterance.pitch = 0.8;
            utterance.rate = 1.2;
            utterance.volume = 1.0;
            break;
        case 'sadness':
            utterance.pitch = 0.7;
            utterance.rate = 0.8;
            break;
        case 'joy':
            utterance.pitch = 1.3;
            utterance.rate = 1.1;
            break;
        case 'fear':
            utterance.pitch = 1.1;
            utterance.rate = 1.3;
            break;
        default:
            utterance.pitch = 1.0;
            utterance.rate = 0.95;
    }

    // Try to find a warm, natural female or male voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
}

// --- 3D TILT EFFECT FOR CARDS ---
function initTiltEffect() {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (centerY - y) / 10;
            const rotateY = (x - centerX) / 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px) scale(1.02)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)`;
        });
    });
}

// --- CHART LOGIC ---
function initChart() {
    const ctx = document.getElementById('stress-chart').getContext('2d');
    stressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['', '', '', '', '', '', ''],
            datasets: [{
                label: 'Stress Level',
                data: stressHistory,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { 
                    min: 0, max: 100, 
                    grid: { color: 'rgba(255,255,255,0.05)' }, 
                    border: { display: false }, 
                    ticks: { display: true, color: '#94a3b8' },
                    title: { display: true, text: "Stress Level (%)", color: '#64748b' }
                },
                x: { 
                    display: true,
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    title: { display: true, text: "Time Points (Approx.)", color: '#64748b' }
                }
            }
        }
    });
}

function updateStressChart(newValue) {
    stressHistory.push(newValue);
    if (stressHistory.length > 20) stressHistory.shift();
    stressChart.data.datasets[0].data = stressHistory;
    stressChart.data.labels = stressHistory.map((_, i) => 'T-' + (stressHistory.length - i));
    stressChart.update('none');
}

function downloadGraph() {
    const origCanvas = document.getElementById('stress-chart');
    
    // Create a high-res clinical report canvas (A4 ratio)
    const reportCanvas = document.createElement('canvas');
    reportCanvas.width = 800;
    reportCanvas.height = 1050;
    const ctx = reportCanvas.getContext('2d');
    
    // Fill white background for clinical look
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, reportCanvas.width, reportCanvas.height);
    
    // --- HEADER ---
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MindShield Clinical Stress Report', 400, 60);
    
    ctx.font = '18px Arial';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Generated for Medical Professional Review', 400, 95);
    
    ctx.beginPath();
    ctx.moveTo(50, 120);
    ctx.lineTo(750, 120);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- PATIENT INFO & DATE ---
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Patient Name: ' + userData.name, 50, 160);
    ctx.fillText('Age/Contact: ' + userData.age + ' Yrs | ' + userData.phone, 50, 190);
    ctx.fillText('Date Issued: ' + new Date().toLocaleString(), 50, 220);
    let mood = document.getElementById('live-emotion') ? document.getElementById('live-emotion').innerText : 'Unknown';
    ctx.fillText('Current Base Emotion: ' + mood, 50, 250);
    
    // --- GRAPH SECTION ---
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Real-Time Biometric Stress Analysis', 400, 280);
    
    // We recreate the chart bounded in a dark box
    const tempChartBg = document.createElement('canvas');
    tempChartBg.width = origCanvas.width;
    tempChartBg.height = origCanvas.height;
    const tempCtx = tempChartBg.getContext('2d');
    tempCtx.fillStyle = '#0f172a'; // Dark theme for graph area
    tempCtx.fillRect(0, 0, tempChartBg.width, tempChartBg.height);
    tempCtx.drawImage(origCanvas, 0, 0);
    
    let drawWidth = 700;
    let drawHeight = (origCanvas.height / origCanvas.width) * drawWidth;
    ctx.drawImage(tempChartBg, 50, 310, drawWidth, drawHeight);

    // --- DATA SUMMARY ---
    let sum = stressHistory.reduce((a, b) => a + b, 0);
    let avg = Math.round(sum / stressHistory.length) || 0;
    let min = Math.min(...stressHistory) || 0;
    let max = Math.max(...stressHistory) || 0;
    
    let yOffset = 310 + drawHeight + 60;
    
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Clinical Data Summary', 50, yOffset);
    
    ctx.font = '16px Arial';
    ctx.fillStyle = '#334155';
    yOffset += 40;
    ctx.fillText('Average Session Stress Level: ' + avg + '%', 50, yOffset);
    yOffset += 30;
    ctx.fillText('Maximum Peak Stress Detected: ' + max + '%', 50, yOffset);
    yOffset += 30;
    ctx.fillText('Minimum Baseline Stress (Recovery): ' + min + '%', 50, yOffset);
    
    // --- RAW DATA POINTS ---
    yOffset += 40;
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('Raw Data Sequence (' + stressHistory.length + ' interval points logged):', 50, yOffset);
    
    yOffset += 25;
    ctx.font = '14px Arial';
    ctx.fillStyle = '#64748b';
    ctx.fillText(stressHistory.join('%, ') + '%', 50, yOffset);
    
    // --- MEDICAL RECOMMENDATIONS ---
    yOffset += 60;
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('Automated Medical Recommendations', 50, yOffset);
    
    ctx.font = '16px Arial';
    ctx.fillStyle = '#334155';
    yOffset += 35;
    if (avg > 70 || max > 85) {
        ctx.fillText('• SEVERE STRESS DETECTED. The patient exhibits critical signs of psychological strain.', 50, yOffset);
        yOffset += 25;
        ctx.fillText('• Prescription Profile: Recommend immediate consultation for anti-anxiety protocols.', 50, yOffset);
        yOffset += 25;
        ctx.fillText('• Therapy: Structured CBT, Deep Breathing Therapies, and high-priority monitoring.', 50, yOffset);
    } else if (avg > 40) {
        ctx.fillText('• MODERATE STRESS DETECTED. Patient is experiencing elevated nervous system response.', 50, yOffset);
        yOffset += 25;
        ctx.fillText('• Prescription Profile: Consider mild relaxants or lifestyle modification if symptoms persist.', 50, yOffset);
        yOffset += 25;
        ctx.fillText('• Therapy: Daily use of Zen Puzzle / Bubble Pop relaxations over the next 2 weeks.', 50, yOffset);
    } else {
        ctx.fillText('• STABLE BASELINE. Stress levels fall within healthy criteria.', 50, yOffset);
        yOffset += 25;
        ctx.fillText('• Prescription Profile: No pharmacological intervention required at this time.', 50, yOffset);
        yOffset += 25;
        ctx.fillText('• Therapy: Continue normal activities and regular mental check-ins.', 50, yOffset);
    }

    // --- FOOTER ---
    ctx.beginPath();
    ctx.moveTo(50, 970);
    ctx.lineTo(750, 970);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Founders: Pravin kumar | Ashwath Narayana | Tejeswini | Shashank', 400, 995);
    ctx.fillText('Webpage: www.mindshield-ai.com', 400, 1015);
    ctx.fillText('MindShield AI © 2026. Designed for Hackathon Excellence. *Automated diagnostics - Not a substitute for human diagnosis.', 400, 1035);

    // --- TRIGGER DOWNLOAD ---
    const link = document.createElement('a');
    link.download = 'MindShield_Clinical_Report.png';
    link.href = reportCanvas.toDataURL('image/png');
    link.click();
}

// --- DOWNLOAD MEDICAL HISTORY ---
function downloadMedicalHistory() {
    const reportCanvas = document.createElement('canvas');
    reportCanvas.width = 800;
    reportCanvas.height = 1150;
    const ctx = reportCanvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, reportCanvas.width, reportCanvas.height);

    // Header bar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 800, 90);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MindShield AI — Patient Medical History', 400, 45);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Confidential Clinical Document | Generated: ' + new Date().toLocaleString(), 400, 72);

    // Section: Patient Info
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Patient Information', 50, 130);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(50, 140); ctx.lineTo(750, 140); ctx.stroke();

    ctx.font = '15px Arial';
    ctx.fillStyle = '#334155';
    const fields = [
        ['Full Name', userData.name],
        ['Age', userData.age + ' years'],
        ['Phone Number', userData.phone],
        ['Email Address', userData.email],
        ['Registration Date', new Date().toLocaleDateString()],
        ['System ID', 'MS-' + Math.floor(1000 + Math.random() * 9000)]
    ];
    let y = 165;
    fields.forEach(([label, value]) => {
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 13px Arial';
        ctx.fillText(label + ':', 50, y);
        ctx.fillStyle = '#0f172a';
        ctx.font = '14px Arial';
        ctx.fillText(value, 220, y);
        y += 28;
    });

    // Section: Stress Data
    y += 20;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Bio-Stress Analysis Summary', 50, y);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(50, y + 10); ctx.lineTo(750, y + 10); ctx.stroke();
    y += 40;

    const avg = Math.round(stressHistory.reduce((a, b) => a + b, 0) / stressHistory.length) || 0;
    const min = Math.min(...stressHistory) || 0;
    const max = Math.max(...stressHistory) || 0;
    const currentMood = document.getElementById('live-emotion') ? document.getElementById('live-emotion').innerText : 'Unknown';
    const severity = avg > 70 ? 'SEVERE' : avg > 40 ? 'MODERATE' : 'STABLE';
    const severityColor = avg > 70 ? '#ef4444' : avg > 40 ? '#f59e0b' : '#10b981';

    const stressFields = [
        ['Current Detected Emotion', currentMood],
        ['Average Session Stress', avg + '%'],
        ['Peak Stress Level', max + '%'],
        ['Minimum (Baseline)', min + '%'],
        ['Overall Severity', severity],
        ['Data Points Logged', stressHistory.length + ' intervals']
    ];
    stressFields.forEach(([label, value]) => {
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 13px Arial';
        ctx.fillText(label + ':', 50, y);
        ctx.fillStyle = label === 'Overall Severity' ? severityColor : '#0f172a';
        ctx.font = label === 'Overall Severity' ? 'bold 14px Arial' : '14px Arial';
        ctx.fillText(value, 280, y);
        y += 28;
    });

    // Section: Stress Timeline
    y += 20;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Stress Timeline (Raw Data Points)', 50, y);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(50, y + 10); ctx.lineTo(750, y + 10); ctx.stroke();
    y += 30;
    ctx.font = '13px Arial';
    ctx.fillStyle = '#334155';
    const timelineText = stressHistory.map((v, i) => `T${i+1}:${v}%`).join('  ');
    // Word wrap timeline
    const words = timelineText.split('  ');
    let line = '';
    words.forEach(word => {
        const test = line + (line ? '  ' : '') + word;
        if (ctx.measureText(test).width > 680) {
            ctx.fillText(line, 50, y); y += 20; line = word;
        } else { line = test; }
    });
    if (line) { ctx.fillText(line, 50, y); y += 20; }

    // Section: Medical Recommendations
    y += 20;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Clinical Recommendations', 50, y);
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath(); ctx.moveTo(50, y + 10); ctx.lineTo(750, y + 10); ctx.stroke();
    y += 40;
    ctx.font = '14px Arial';
    ctx.fillStyle = '#334155';
    let recs = [];
    if (avg > 70 || max > 85) {
        recs = [
            '• SEVERE STRESS DETECTED — Immediate psychological intervention recommended.',
            '• Refer for structured Cognitive Behavioral Therapy (CBT) sessions.',
            '• Consider short-term pharmacological support (anti-anxiety) if symptoms persist.',
            '• Daily guided breathing exercises (4-7-8 technique) for 2+ weeks.',
            '• Follow-up assessment required within 7 days.'
        ];
    } else if (avg > 40) {
        recs = [
            '• MODERATE STRESS DETECTED — Lifestyle modification advised.',
            '• Weekly counseling sessions recommended for 4-6 weeks.',
            '• Encourage daily mindfulness and relaxation activities (Zen Puzzle, Bubble Pop).',
            '• Review sleep hygiene and dietary patterns.',
            '• Follow-up assessment in 2 weeks.'
        ];
    } else {
        recs = [
            '• STABLE BASELINE — No immediate clinical intervention required.',
            '• Continue regular mental wellness check-ins via MindShield AI.',
            '• Maintain current lifestyle and stress management practices.',
            '• Preventive mindfulness sessions: 10-15 min/day recommended.',
            '• Next scheduled review in 30 days.'
        ];
    }
    recs.forEach(r => { ctx.fillText(r, 50, y); y += 26; });

    // Session History — formatted table
    const appointments = JSON.parse(localStorage.getItem('mindshield_appointments') || '[]');

    // Expand canvas height dynamically if appointments exist
    const extraHeight = appointments.length > 0 ? 80 + (appointments.length * 50) + 80 : 0;
    const footerY = 1090 + extraHeight;

    // Re-draw with extended canvas
    reportCanvas.height = footerY + 60;
    // Re-fill background for expanded area
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 1090, 800, extraHeight + 60);

    if (appointments.length > 0) {
        y += 30;
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Appointment / Visit History', 50, y);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(50, y + 10); ctx.lineTo(750, y + 10); ctx.stroke();
        y += 30;

        // Table header
        const colX  = [50,  165, 310, 475, 610];
        const colW  = [115, 145, 165, 135, 120];
        const headers = ['Date', 'Doctor / Psychologist', 'Cause of Visit', 'Type', 'Stress & Mood'];

        // Header row background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(50, y, 700, 28);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px Arial';
        headers.forEach((h, i) => { ctx.fillText(h, colX[i] + 4, y + 18); });
        y += 28;

        // Data rows
        appointments.forEach((a, idx) => {
            const rowBg = idx % 2 === 0 ? '#f8fafc' : '#eef2ff';
            ctx.fillStyle = rowBg;
            ctx.fillRect(50, y, 700, 44);

            // Thin border
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.strokeRect(50, y, 700, 44);

            ctx.fillStyle = '#1e293b';
            ctx.font = '12px Arial';

            const date = a.date || a.time || '—';
            const doctor = a.doctorName || (a.visitType === 'Online' ? 'Tele-consultation' : '—');
            const reason = a.reason || '—';
            const type = a.visitType || 'Online';
            const stressMood = `${a.stress}% | ${a.mood}`;
            const typeColor = type === 'Online' ? '#0ea5e9' : '#10b981';

            // Clip and draw each cell
            const cells = [date, doctor, reason, type, stressMood];
            cells.forEach((cell, i) => {
                ctx.save();
                ctx.beginPath();
                ctx.rect(colX[i] + 2, y, colW[i] - 4, 44);
                ctx.clip();
                if (i === 3) { ctx.fillStyle = typeColor; ctx.font = 'bold 12px Arial'; }
                else { ctx.fillStyle = '#1e293b'; ctx.font = '12px Arial'; }
                ctx.fillText(cell, colX[i] + 4, y + 16);
                ctx.restore();
            });
            y += 44;
        });
    }

    // Footer bar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, footerY, 800, 80);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Founders: Pravin Kumar (B.Tech AI & ML) | Ashwath Narayana (B.Tech CS) | Tejaswini S (B.Tech AI & ML) | Shashank R (B.Tech CS)', 400, footerY + 20);
    ctx.fillText('Clinical Web-Portal: www.mindshield-ai.com', 400, footerY + 40);
    ctx.fillText('MindShield AI \u00a9 2026 | Engineering Mental Excellence | *Automated diagnostics', 400, footerY + 60);

    // Trigger download
    const link = document.createElement('a');
    link.download = `MindShield_Medical_History_${userData.name.replace(/\s+/g, '_')}.png`;
    link.href = reportCanvas.toDataURL('image/png');
    link.click();
}

// --- BIO-SCANNER LOGIC ---
async function initVideo() {
    const video = document.getElementById('webcam');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (err) {
        console.error("Camera access denied:", err);
    }
}

async function initFaceDetection() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('face-canvas');
    const emotionText = document.getElementById('live-emotion');

    // Model loading from CDN for face-api
    const MODEL_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';
    
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);

        setInterval(async () => {
            if (video.paused || video.ended) return;
            const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
            
            if (detections) {
                const expressions = detections.expressions;
                const dominant = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
                emotionText.innerText = dominant.charAt(0).toUpperCase() + dominant.slice(1);
                
                // Map dominant emotion to stress level contribution
                let faceStress = 20;
                if (dominant === 'angry') faceStress = 85;
                if (dominant === 'sad' || dominant === 'fearful') faceStress = 70;
                if (dominant === 'happy') faceStress = 10;
                
                updateStressChart(faceStress);
            }
        }, 1000);
    } catch (e) {
        console.warn("Face detection model failed to load, using text-only analysis.");
    }
}

// --- AUDIO LOGIC ---
async function initAudio() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        setInterval(() => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const average = sum / bufferLength;
            const stressPercent = Math.min(100, Math.floor(average * 2));
            document.getElementById('audio-stress').innerText = stressPercent + '%';
        }, 200);
    } catch (err) {
        console.error("Audio access denied.");
    }
}

// --- RELAXATION GAMES LOGIC ---
function startGame(type) {
    const overlay = document.getElementById("game-overlay");
    const content = document.getElementById("game-content");
    overlay.style.display = "flex";
    content.innerHTML = "";
    if (gameInterval) clearInterval(gameInterval);

    if (type === 'breathing') {
        renderBreathingGame(content);
    } else if (type === 'bubble') {
        renderBubble(content);
    }
}

// --- DYNAMIC BACKGROUND ORBS ---
function initBackgroundAnimation() {
    const orbs = document.querySelectorAll('.floating-orb');
    let angle = 0;
    
    function animate() {
        angle += 0.005;
        orbs.forEach((orb, i) => {
            const offsetX = Math.cos(angle + i) * 100;
            const offsetY = Math.sin(angle + i) * 100;
            orb.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });
        requestAnimationFrame(animate);
    }
    animate();
}

document.addEventListener('DOMContentLoaded', () => {
    initBackgroundAnimation();
});

function closeGame() {
    document.getElementById("game-overlay").style.display = "none";
    if (gameInterval) clearInterval(gameInterval);
}

function renderBubble(container) {
    container.innerHTML = `
        <div style="text-align: center; color: white; width: 80%; height: 80%;">
            <h2 style="margin-bottom: 1rem;">Bubble Pop</h2>
            <p style="color: #94a3b8; margin-bottom: 2rem;">Click the bubbles to pop away stress.</p>
            <canvas id="bubble-canvas" style="width: 100%; height: 70%; background: #0f172a; border-radius: 20px; border: 1px solid var(--glass-border); cursor: crosshair;"></canvas>
            <div style="margin-top: 1rem; text-align: center;">Popped: <span id="pop-score">0</span></div>
        </div>
    `;

    const canvas = document.getElementById('bubble-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    let bubbles = [];
    let score = 0;

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        for (let i = bubbles.length - 1; i >= 0; i--) {
            const b = bubbles[i];
            const dist = Math.sqrt((x - b.x)**2 + (y - b.y)**2);
            if (dist < b.radius) {
                bubbles.splice(i, 1);
                score++;
                document.getElementById('pop-score').innerText = score;
                break; // Only pop one
            }
        }
    });

    gameInterval = setInterval(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Spawn
        if(Math.random() > 0.9) {
            bubbles.push({
                x: Math.random() * canvas.width,
                y: canvas.height + 30,
                radius: 15 + Math.random() * 25,
                vy: -1 - Math.random() * 2,
                color: `hsla(${190 + Math.random() * 40}, 80%, 60%, 0.4)`
            });
        }

        for (let i = bubbles.length - 1; i >= 0; i--) {
            const b = bubbles[i];
            b.y += b.vy;
            
            // Wobble
            b.x += Math.sin(b.y / 20) * 0.5;

            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = b.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Reflection
            ctx.beginPath();
            ctx.arc(b.x - b.radius*0.3, b.y - b.radius*0.3, b.radius*0.2, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fill();

            if (b.y < -50) bubbles.splice(i, 1);
        }
    }, 30);
}

function renderBreathingGame(container) {
    container.innerHTML = `
        <div class="breathing-circle-container">
            <h2 style="margin-bottom: 0;">Lungs of Serenity</h2>
            <p style="color: var(--text-secondary);">Focus on the pulse of your breath.</p>
            <div id="breath-node" class="breathing-circle">
                <div id="breath-text" class="breathing-text">Ready</div>
            </div>
            <div class="breathing-controls">
                <button class="secondary-btn" onclick="closeGame()">Finish Session</button>
            </div>
        </div>
    `;

    const node = document.getElementById('breath-node');
    const text = document.getElementById('breath-text');
    
    // Audio Context for "Therapeutic Music" (Tonal Synthesis)
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    function playTone(freq, duration) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    let phase = 0; // 0: Inhale, 1: Hold, 2: Exhale
    
    gameInterval = setInterval(() => {
        if (phase === 0) {
            text.innerText = "Inhale";
            node.className = "breathing-circle inhale";
            playTone(432, 4); // Solfeggio frequency 432Hz
            phase = 1;
        } else if (phase === 1) {
            text.innerText = "Hold";
            playTone(528, 2); // Solfeggio frequency 528Hz (Healing)
            phase = 2;
        } else {
            text.innerText = "Exhale";
            node.className = "breathing-circle exhale";
            playTone(396, 4); // Solfeggio frequency 396Hz (Liberation)
            phase = 0;
        }
    }, 4000);
}

// --- DICTATION (VOICE TYPING) LOGIC ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isRecording = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                document.getElementById('message').value += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
    };

    recognition.onstart = () => {
        isRecording = true;
        document.getElementById('mic-btn').style.color = '#ef4444';
        document.getElementById('mic-btn').style.background = 'rgba(239, 68, 68, 0.1)';
        document.getElementById('message').placeholder = "Listening...";
    };

    recognition.onend = () => {
        isRecording = false;
        document.getElementById('mic-btn').style.color = 'var(--text-secondary)';
        document.getElementById('mic-btn').style.background = 'var(--glass-bg)';
        document.getElementById('message').placeholder = "Type or speak your thoughts...";
    };
    
    recognition.onerror = () => {
        isRecording = false;
        document.getElementById('mic-btn').style.color = 'var(--text-secondary)';
        document.getElementById('mic-btn').style.background = 'var(--glass-bg)';
        document.getElementById('message').placeholder = "Type or speak your thoughts...";
        alert("Microphone error. Ensure permissions are granted.");
    };
}

function toggleDictation() {
    if (!recognition) {
        alert("Voice typing is not supported in this browser. Try Chrome or Edge.");
        return;
    }
    if (isRecording) {
        recognition.stop();
    } else {
        recognition.lang = document.getElementById('lang-menu').value;
        recognition.start();
    }
}

// --- CHAT LOGIC ---
const EMOTION_EMOJI = { anger:'😠', fear:'😨', sadness:'😢', disgust:'🤢', surprise:'😲', neutral:'😐', joy:'😊', love:'❤️' };
const SEVERITY_COLOR = { Critical:'#ef4444', High:'#f97316', Moderate:'#f59e0b', Low:'#10b981' };

async function sendMessage() {
    const input = document.getElementById("message");
    const message = input.value.trim();
    if (!message) return;

    appendMessage('user', message);
    input.value = "";

    // Show typing indicator
    const typingId = 'typing-' + Date.now();
    appendMessageHTML('ai-typing', `<span id="${typingId}" style="display:flex;gap:4px;align-items:center;padding:4px 0;"><span style="width:8px;height:8px;background:#38bdf8;border-radius:50%;animation:pulse 1s infinite;"></span><span style="width:8px;height:8px;background:#38bdf8;border-radius:50%;animation:pulse 1s infinite 0.2s;"></span><span style="width:8px;height:8px;background:#38bdf8;border-radius:50%;animation:pulse 1s infinite 0.4s;"></span>&nbsp;Analyzing...</span>`);

    // Start Thinking Animation
    document.getElementById("ai-thinking-waves").style.display = "flex";
    document.getElementById("ai-status").innerText = "Analyzing Bio-Signals...";

    try {
        const response = await fetch(`${API_BASE}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: message })
        });
        const data = await response.json();

        // Remove typing indicator
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.closest('.message').remove();

        // Main AI text reply
        appendMessage('ai', data.response);
        
        // Natural Vocal Response
        speakResponse(data.response, data.emotion);
        
        // Stop Thinking Animation
        document.getElementById("ai-thinking-waves").style.display = "none";
        document.getElementById("ai-status").innerText = "Awaiting Bio-Input...";

        // Emotion Analysis Card
        const emoji = EMOTION_EMOJI[data.emotion] || '🧠';
        const sevColor = SEVERITY_COLOR[data.severity] || '#38bdf8';
        const stressBar = Math.min(100, data.stress_level);
        const solutions = (data.solutions || []).map(s =>
            `<li style="margin-bottom:6px;padding-left:8px;border-left:2px solid ${sevColor};">${s}</li>`
        ).join('');

        const cardHTML = `
        <div style="
            background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9));
            border: 1px solid rgba(56,189,248,0.25);
            border-radius: 14px;
            padding: 14px 16px;
            margin-top: 6px;
            font-size: 0.82rem;
            color: #cbd5e1;
        ">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                <span style="font-size:1.8rem;">${emoji}</span>
                <div>
                    <div style="font-weight:700;color:#f1f5f9;font-size:0.95rem;">
                        ${data.emotion.charAt(0).toUpperCase()+data.emotion.slice(1)} Detected
                        &nbsp;<span style="background:${sevColor}22;color:${sevColor};border:1px solid ${sevColor}55;border-radius:20px;padding:1px 8px;font-size:0.72rem;font-weight:600;">${data.severity}</span>
                    </div>
                    <div style="color:#64748b;font-size:0.75rem;">Confidence: ${Math.round(data.confidence*100)}%</div>
                </div>
            </div>

            <div style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="color:#94a3b8;font-size:0.78rem;">Bio-Stress Level</span>
                    <span style="font-weight:700;color:${sevColor};">${stressBar}%</span>
                </div>
                <div style="background:rgba(255,255,255,0.08);border-radius:99px;height:8px;overflow:hidden;">
                    <div style="width:${stressBar}%;height:100%;border-radius:99px;background:linear-gradient(90deg,${sevColor}88,${sevColor});transition:width 0.8s ease;"></div>
                </div>
            </div>

            <div>
                <div style="font-weight:600;color:#e2e8f0;margin-bottom:6px;">💡 Coping Strategies</div>
                <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px;">
                    ${solutions}
                </ul>
            </div>
        </div>`;

        appendMessageHTML('ai-card', cardHTML);

        // Update chart & status bar
        updateStressChart(data.stress_level);
        const statusEl = document.getElementById('ai-status');
        statusEl.style.color = sevColor;
        statusEl.innerText = `${emoji} ${data.severity} Stress — ${stressBar}%`;

    } catch (error) {
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.closest('.message').remove();
        appendMessage('ai', "I'm listening, but my network connection is hazy. Please make sure the backend server is running on port 8000.");
    }
}

function openBookingModal() {
    document.getElementById('booking-modal').style.display = 'flex';
}

function toggleDoctorField() {
    const type = document.getElementById('visit-type').value;
    const group = document.getElementById('doctor-name-group');
    group.style.display = type === 'Offline' ? 'block' : 'none';
}

function confirmBooking() {
    const time = document.getElementById('appointment-time').value;
    if (!time) {
        alert("Please select a date and time first.");
        return;
    }
    const selectBox = document.getElementById('clinic-selection');
    const selectedText = selectBox.options[selectBox.selectedIndex].text;
    const visitReason = document.getElementById('visit-reason') ? document.getElementById('visit-reason').value || 'Not specified' : 'Not specified';
    const visitType = document.getElementById('visit-type') ? document.getElementById('visit-type').value : 'Online';
    const doctorName = document.getElementById('doctor-name') ? (document.getElementById('doctor-name').value || 'Not specified') : 'Not specified';

    // Save to local storage for Psychologist Portal
    const avgStress = stressHistory.length ? Math.round(stressHistory.reduce((a, b) => a + b, 0) / stressHistory.length) : 50;
    const mood = document.getElementById('live-emotion') ? document.getElementById('live-emotion').innerText : 'Unknown';
    
    const appointmentData = {
        name: userData.name,
        age: userData.age,
        phone: userData.phone,
        date: new Date(time).toLocaleDateString(),
        time: new Date(time).toLocaleString(),
        location: selectedText,
        stress: avgStress,
        mood: mood,
        reason: visitReason,
        visitType: visitType,
        doctorName: visitType === 'Offline' ? doctorName : 'Tele-consultation (Online)'
    };
    
    let appointments = JSON.parse(localStorage.getItem('mindshield_appointments') || '[]');
    appointments.push(appointmentData);
    localStorage.setItem('mindshield_appointments', JSON.stringify(appointments));
    
    const confirmation = document.getElementById('booking-confirmation');
    confirmation.style.display = 'block';
    confirmation.innerHTML = `<strong>Appointment Confirmed!</strong><br>Time: ${appointmentData.time}<br>Reason: ${appointmentData.reason}<br>Type: ${appointmentData.visitType}${appointmentData.visitType === 'Offline' ? ' — Dr. ' + doctorName : ''}<br><br><em>Our admin will reach out to you shortly via ${appointmentData.phone}.</em>`;
    
    setTimeout(() => {
        document.getElementById('booking-modal').style.display = 'none';
        confirmation.style.display = 'none';
    }, 6000);
}

function populatePsychologistDashboard() {
    const appointments = JSON.parse(localStorage.getItem('mindshield_appointments') || '[]');
    const list = document.getElementById('psych-patient-list');
    
    if (appointments.length === 0) {
        list.innerHTML = `<li style="padding: 1rem; color: #94a3b8; text-align: center;">No upcoming appointments yet.</li>`;
        return;
    }
    
    list.innerHTML = "";
    appointments.forEach(a => {
        const severity = a.stress > 70 ? 'Severe' : (a.stress > 40 ? 'Moderate' : 'Stable');
        const color = a.stress > 70 ? '#ef4444' : (a.stress > 40 ? '#f59e0b' : '#10b981');
        
        const idx = appointments.indexOf(a);
        list.innerHTML += `
            <li style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer; border-left: 3px solid ${color};" onclick="viewPatientDetails(${idx})">
                <strong>${a.name}</strong> (Age ${a.age})<br>
                <span style="font-size: 0.8rem; color: #94a3b8;">Phone: ${a.phone}</span><br>
                <span style="font-size: 0.8rem; color: var(--accent-primary);">${a.time}</span><br>
                <span style="font-size: 0.8rem; color: ${color};">Avg Stress: ${a.stress}% (${severity}) | Base Mood: ${a.mood}</span>
            </li>
        `;
    });
}

function viewPatientDetails(index) {
    const appointments = JSON.parse(localStorage.getItem('mindshield_appointments') || '[]');
    const a = appointments[index];
    if (!a) return;
    
    const detailsDiv = document.getElementById('psych-patient-details');
    detailsDiv.innerHTML = `
        <h3 style="color: white; margin-bottom: 1rem; font-size: 1.5rem;">Clinical Report: ${a.name}</h3>
        <p style="color: var(--text-secondary); margin-bottom: 0.5rem;"><i class="fas fa-calendar"></i> Scheduled: ${a.time}</p>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;"><i class="fas fa-phone"></i> Direct Contact: ${a.phone}</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%; max-width: 500px; margin-bottom: 2rem;">
            <div class="stat-card" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);">
                <span class="stat-label">Initial Logged Stress</span>
                <div class="stat-value" style="color: #ef4444;">${a.stress}%</div>
            </div>
            <div class="stat-card" style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3);">
                <span class="stat-label">Initial Primary Mood</span>
                <div class="stat-value" style="font-size: 1.2rem; color: var(--accent-primary);">${a.mood}</div>
            </div>
        </div>
        
        <div style="display: flex; gap: 1rem;">
            <button class="primary-btn" onclick="alert('Initiating securing tele-consultation room for ${a.name}...')"><i class="fas fa-video"></i> Start Video Session</button>
            <button class="primary-btn" style="background: rgba(255,255,255,0.1); color: white;" onclick="alert('Downloading past history logs...')"><i class="fas fa-download"></i> Download History</button>
        </div>
    `;
}

function handleKeyPress(e) { if (e.key === 'Enter') sendMessage(); }

function appendMessage(sender, text) {
    const chatbox = document.getElementById("chatbox");
    const div = document.createElement("div");
    div.className = `message ${sender}`;
    div.innerText = text;
    chatbox.appendChild(div);
    chatbox.scrollTop = chatbox.scrollHeight;
}

function appendMessageHTML(cls, html) {
    const chatbox = document.getElementById("chatbox");
    const div = document.createElement("div");
    div.className = `message ${cls}`;
    div.innerHTML = html;
    chatbox.appendChild(div);
    chatbox.scrollTop = chatbox.scrollHeight;
}