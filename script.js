let userData = { nome: '', email: '', documento: '' };
let selectedService = '';
let selectedDate = '';
let selectedTime = 30;
let selectedStartSlot = '';

const precos = { 
    estacao: { 30: 10, 60: 18, 120: 30 }, 
    reuniao: { 30: 50, 60: 90, 120: 150 } 
};

// 1. INICIAR SESSÃO E IDENTIFICAR USUÁRIO
function startSession() {
    const nome = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const doc = document.getElementById('regDoc').value;

    if(!nome || !email || !doc) {
        alert("Por favor, preencha todos os campos para continuar.");
        return;
    }

    // Limpa o CPF para salvar apenas números
    userData = { nome, email, documento: doc.replace(/\D/g, '') };
    
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('services-screen').classList.remove('hidden');
    document.getElementById('user-greeting').innerText = nome.split(' ')[0];
}

// 2. SELECIONAR O TIPO DE ESPAÇO
function selectService(id, name) {
    selectedService = id;
    document.getElementById('selected-title').innerText = "Reservar: " + name;
    document.getElementById('checkout-area').classList.remove('hidden');
    document.getElementById('checkout-area').scrollIntoView({ behavior: 'smooth' });
}

// 3. CARREGAR HORÁRIOS E FILTRAR OS JÁ OCUPADOS/PAGOS
async function loadAvailableTimes() {
    selectedDate = document.getElementById('booking-date').value;
    const grid = document.getElementById('slots-grid');
    if (!selectedDate) return;

    grid.innerHTML = '<p style="color: #d4af37;">Consultando disponibilidade...</p>';

    try {
        // Consulta o servidor para saber quais horários já foram pagos
        const response = await fetch(`/api/horarios-ocupados?data=${selectedDate}`);
        const ocupados = await response.json();

        grid.innerHTML = '';
        for (let h = 8; h <= 22; h++) {
            for (let m of ['00', '30']) {
                const time = `${h.toString().padStart(2, '0')}:${m}`;
                const div = document.createElement('div');
                
                if (ocupados.includes(time)) {
                    // Estiliza slots que já estão reservados
                    div.className = 'slot ocupado';
                    div.innerText = time;
                    div.style.opacity = "0.2";
                    div.style.cursor = "not-allowed";
                    div.title = "Horário já reservado";
                } else {
                    div.className = 'slot';
                    div.innerText = time;
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
    } catch (e) {
        grid.innerHTML = '<p style="color: red;">Erro ao carregar horários. Tente novamente.</p>';
    }
}

// 4. DEFINIR DURAÇÃO
function setTime(min) {
    selectedTime = min;
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${min}`).classList.add('active');
    updateSummary();
}

// 5. ATUALIZAR RESUMO E PREÇO
function updateSummary() {
    if (!selectedStartSlot) return;
    const valor = precos[selectedService][selectedTime];
    document.getElementById('booking-summary').innerText = `${selectedDate} às ${selectedStartSlot} (${selectedTime} min)`;
    document.getElementById('display-price').innerText = `R$ ${valor.toFixed(2).replace('.', ',')}`;
    document.getElementById('btn-pay').disabled = false;
}

// 6. GERAR PAGAMENTO E SALVAR RESERVA
async function generatePix() {
    const btn = document.getElementById('btn-pay');
    const originalText = btn.innerText;
    btn.innerText = "Gerando acesso...";
    btn.disabled = true;

    // Tradução dos IDs para os nomes que o painel de automação reconhece
    const servicoFinal = selectedService === 'estacao' ? 'Estação Individual' : 'Sala de Reunião';

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: userData.nome,
                email: userData.email,
                doc: userData.documento, // 'doc' bate com o servidor
                servico: servicoFinal,     // 'servico' bate com o servidor
                data: selectedDate,
                hora: selectedStartSlot,
                duracao: selectedTime.toString() // 'duracao' bate com o servidor
            })
        });

        const data = await response.json();

        // Se o servidor retornar o QR Code do Asaas
        if (data.encodedImage) {
            document.getElementById('checkout-area').classList.add('hidden');
            document.getElementById('pix-area').classList.remove('hidden');
            document.getElementById('qr-code-img').src = `data:image/png;base64,${data.encodedImage}`;
            
            // Dica: Opcionalmente você pode mostrar o "Payload" para Copia e Cola aqui
        } else if (data.invoiceUrl) {
            // Se o servidor retornar o link direto da fatura
            location.href = data.invoiceUrl;
        } else {
            alert("Ocorreu um erro ao gerar o Pix. Tente novamente.");
            btn.innerText = originalText;
            btn.disabled = false;
        }
    } catch (e) {
        alert("Erro de conexão com o servidor ŪNIKA.");
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function resetUI() {
    location.reload();
}
