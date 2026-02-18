let userData = { nome: '', email: '', documento: '' };
let selectedService = '';
let selectedDate = '';
let selectedTime = 30;
let selectedStartSlot = '';

const precos = { 
    estacao: { 30: 10, 60: 18, 120: 30 }, 
    reuniao: { 30: 50, 60: 90, 120: 150 } 
};

function startSession() {
    const nome = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const doc = document.getElementById('regDoc').value;

    if(!nome || !email || !doc) {
        alert("Preencha todos os campos.");
        return;
    }

    userData = { nome, email, documento: doc.replace(/\D/g, '') };

    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('services-screen').classList.remove('hidden');
    document.getElementById('user-greeting').innerText = nome.split(' ')[0];
}

function selectService(id, name) {
    selectedService = id;
    document.getElementById('selected-title').innerText = "Reservar: " + name;
    document.getElementById('checkout-area').classList.remove('hidden');
    document.getElementById('checkout-area').scrollIntoView({ behavior: 'smooth' });
}

function loadAvailableTimes() {
    selectedDate = document.getElementById('booking-date').value;
    const grid = document.getElementById('slots-grid');
    if (!selectedDate) return;

    grid.innerHTML = '';
    // Horários das 08h às 22h
    for (let h = 8; h <= 22; h++) {
        for (let m of ['00', '30']) {
            const time = `${h.toString().padStart(2, '0')}:${m}`;
            const div = document.createElement('div');
            div.className = 'slot';
            div.innerText = time;
            div.onclick = function() {
                document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
                this.classList.add('selected');
                selectedStartSlot = time;
                document.getElementById('duration-selection').classList.remove('hidden');
                updateSummary();
            };
            grid.appendChild(div);
        }
    }
}

function setTime(min) {
    selectedTime = min;
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    if(min === 30) document.getElementById('btn-30').classList.add('active');
    if(min === 60) document.getElementById('btn-60').classList.add('active');
    if(min === 120) document.getElementById('btn-120').classList.add('active');
    updateSummary();
}

function updateSummary() {
    if (!selectedStartSlot) return;
    const valor = precos[selectedService][selectedTime];
    document.getElementById('booking-summary').innerText = `${selectedDate} às ${selectedStartSlot} (${selectedTime} min)`;
    document.getElementById('display-price').innerText = `R$ ${valor.toFixed(2).replace('.', ',')}`;
    document.getElementById('btn-pay').disabled = false;
}

async function generatePix() {
    const btn = document.getElementById('btn-pay');
    btn.innerText = "Processando...";
    btn.disabled = true;

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                servico: selectedService, tempo: selectedTime,
                data: selectedDate, hora: selectedStartSlot,
                nome: userData.nome, email: userData.email, documento: userData.documento
            })
        });
        const data = await response.json();
        if (data.encodedImage) {
            document.getElementById('checkout-area').classList.add('hidden');
            document.getElementById('pix-area').classList.remove('hidden');
            document.getElementById('qr-code-img').src = `data:image/png;base64,${data.encodedImage}`;
        } else {
            alert("Erro: " + data.error);
            btn.disabled = false;
        }
    } catch (e) { alert("Erro de conexão."); btn.disabled = false; }
}

function resetUI() { location.reload(); }
