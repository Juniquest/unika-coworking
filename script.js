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
    if(!nome || !email || !doc) return alert("Preencha tudo!");

    userData = { nome, email, documento: doc.replace(/\D/g, '') };
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('services-screen').classList.remove('hidden');
    document.getElementById('user-greeting').innerText = nome.split(' ')[0];
}

function selectService(id, name) {
    selectedService = id;
    document.getElementById('selected-title').innerText = name;
    document.getElementById('checkout-area').classList.remove('hidden');
}

async function loadAvailableTimes() {
    selectedDate = document.getElementById('booking-date').value;
    const grid = document.getElementById('slots-grid');
    const response = await fetch(`/api/horarios-ocupados?data=${selectedDate}`);
    const ocupados = await response.json();

    grid.innerHTML = '';
    for (let h = 8; h <= 22; h++) {
        const time = `${h.toString().padStart(2, '0')}:00`;
        const div = document.createElement('div');
        div.className = ocupados.includes(time) ? 'slot ocupado' : 'slot';
        div.innerText = time;
        if (!ocupados.includes(time)) {
            div.onclick = function() {
                document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
                this.classList.add('selected');
                selectedStartSlot = time;
                document.getElementById('duration-selection').classList.remove('hidden');
                updateSummary();
            };
        }
        grid.appendChild(div);
    }
}

function setTime(min) {
    selectedTime = min;
    updateSummary();
}

function updateSummary() {
    const valor = precos[selectedService][selectedTime];
    document.getElementById('display-price').innerText = `R$ ${valor.toFixed(2)}`;
    document.getElementById('btn-pay').disabled = false;
}

async function generatePix() {
    const servicoFinal = selectedService === 'estacao' ? 'Estação Individual' : 'Sala de Reunião';
    const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nome: userData.nome, email: userData.email, doc: userData.documento,
            servico: servicoFinal, data: selectedDate, hora: selectedStartSlot, duracao: selectedTime.toString()
        })
    });
    const data = await response.json();
    if(data.invoiceUrl) location.href = data.invoiceUrl;
}
