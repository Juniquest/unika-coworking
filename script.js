let selectedService = '';
let selectedTime = 30;

// Preços para exibição no front-end
const precosVisual = {
    estacao: { 30: 10, 60: 18, 120: 30 },
    reuniao: { 30: 50, 60: 90, 120: 150 },
    banheiro: 5
};

function selectService(id, name) {
    selectedService = id;
    document.getElementById('selected-title').innerText = `Reservar ${name}`;
    document.getElementById('checkout-area').classList.remove('hidden');
    
    if(id === 'banheiro') {
        document.getElementById('time-selection').classList.add('hidden');
        selectedTime = 0;
    } else {
        document.getElementById('time-selection').classList.remove('hidden');
        selectedTime = 30; // Reset padrão
    }
    updatePrice();
}

function setTime(minutes) {
    selectedTime = minutes;
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    updatePrice();
}

function updatePrice() {
    const valor = selectedService === 'banheiro' ? precosVisual.banheiro : precosVisual[selectedService][selectedTime];
    document.getElementById('display-price').innerText = `R$ ${valor.toFixed(2)}`;
}

async function generatePix() {
    const nome = document.getElementById('userName').value;
    if(!nome) return alert("Por favor, digite seu nome para a reserva.");

    const btn = event.target;
    btn.innerText = "Processando...";
    btn.disabled = true;

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ servico: selectedService, tempo: selectedTime, nome: nome })
        });

        const data = await response.json();
        if (data.encodedImage) {
            document.getElementById('checkout-area').classList.add('hidden');
            document.getElementById('pix-area').classList.remove('hidden');
            document.getElementById('qr-code-img').src = `data:image/png;base64,${data.encodedImage}`;
        }
    } catch (e) {
        alert("Erro ao conectar com o servidor.");
        btn.disabled = false;
    }
}

function resetUI() { location.reload(); }
