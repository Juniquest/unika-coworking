// Configurações Globais
let userData = { nome: '', email: '', documento: '' };
let selectedService = '';
let selectedDate = '';
let selectedTime = 30;
let selectedStartSlot = '';

const precos = { 
    estacao: { 30: 10, 60: 18, 120: 30 }, 
    reuniao: { 30: 50, 60: 90, 120: 150 } 
};

// PASSO 1: Cadastro Inicial
function startSession() {
    const nome = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const doc = document.getElementById('regDoc').value;

    if(!nome || !email || !doc) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    userData = { nome, email, documento: doc.replace(/\D/g, '') };

    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('services-screen').classList.remove('hidden');
    document.getElementById('user-greeting').innerText = nome.split(' ')[0];
}

// PASSO 2: Seleção de Serviço
function selectService(id, name) {
    selectedService = id;
    document.getElementById('selected-title').innerText = "Reservar: " + name;
    document.getElementById('checkout-area').classList.remove('hidden');
    
    // Rola suavemente até a agenda
    document.getElementById('checkout-area').scrollIntoView({ behavior: 'smooth' });
}

// PASSO 3: Carregar Agenda (Ativado ao mudar a data)
function loadAvailableTimes() {
    selectedDate = document.getElementById('booking-date').value;
    const grid = document.getElementById('slots-grid');
    
    if (!selectedDate) return;

    grid.innerHTML = ''; // Limpa a grade anterior

    // Gera horários das 08:00 às 22:00
    for (let h = 8; h <= 22; h++) {
        for (let m of ['00', '30']) {
            const time = `${h.toString().padStart(2, '0')}:${m}`;
            const div = document.createElement('div');
            div.className = 'slot';
            div.innerText = time;
            
            div.onclick = (e) => {
                // Remove seleção visual de outros slots
                document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
                // Seleciona o atual
                e.target.classList.add('selected');
                selectedStartSlot = time;
                
                // Mostra a escolha de duração
                document.getElementById('duration-selection').classList.remove('hidden');
                updateSummary();
            };
            grid.appendChild(div);
        }
    }
}

// PASSO 4: Ajuste de Duração e Preço
function setTime(min) {
    selectedTime = min;
    // Atualiza botões de tempo
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    window.event.target.classList.add('active');
    updateSummary();
}

function updateSummary() {
    if (!selectedStartSlot) return;

    const valor = precos[selectedService][selectedTime];
    const resumo = `${selectedDate} às ${selectedStartSlot} (${selectedTime} min)`;
    
    document.getElementById('booking-summary').innerText = resumo;
    document.getElementById('display-price').innerText = `R$ ${valor.toFixed(2).replace('.', ',')}`;
    
    // Libera o botão de pagamento
    document.getElementById('btn-pay').disabled = false;
}

// PASSO 5: Envio para o Asaas
async function generatePix() {
    const btn = document.getElementById('btn-pay');
    btn.innerText = "Processando Reserva...";
    btn.disabled = true;

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                servico: selectedService,
                tempo: selectedTime,
                data: selectedDate,
                hora: selectedStartSlot,
                nome: userData.nome,
                email: userData.email,
                documento: userData.documento
            })
        });

        const data = await response.json();

        if (data.encodedImage) {
            document.getElementById('checkout-area').classList.add('hidden');
            document.getElementById('pix-area').classList.remove('hidden');
            document.getElementById('qr-code-img').src = `data:image/png;base64,${data.encodedImage}`;
        } else {
            alert("Erro ao gerar pagamento: " + (data.error || "Tente novamente."));
            btn.disabled = false;
            btn.innerText = "Gerar QR Code de Acesso";
        }
    } catch (e) {
        alert("Erro de conexão com o servidor.");
        btn.disabled = false;
    }
}

function resetUI() { location.reload(); }
