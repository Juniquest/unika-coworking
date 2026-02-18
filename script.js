// Variáveis Globais para controle do sistema
let userData = { nome: '', email: '', documento: '' };
let selectedService = '';
let selectedTime = 30;

// Tabela de preços para exibição visual
const precosVisual = {
    estacao: { 30: 10, 60: 18, 120: 30 },
    reuniao: { 30: 50, 60: 90, 120: 150 },
    banheiro: 5
};

/**
 * PASSO 1: Iniciar Sessão (Pré-cadastro)
 * Esta função valida os dados iniciais e libera a área de serviços.
 */
function startSession() {
    const nome = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const doc = document.getElementById('regDoc').value;

    // Validação básica de campos vazios
    if(!nome || !email || !doc) {
        alert("Por favor, preencha todos os campos (Nome, E-mail e Documento) para acessar.");
        return;
    }

    // Armazena os dados do cliente globalmente
    userData = { 
        nome: nome, 
        email: email, 
        documento: doc.replace(/\D/g, '') // Remove pontos e traços para o Asaas
    };

    // Troca as telas visualmente
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('services-screen').classList.remove('hidden');
    
    // Atualiza a saudação com o primeiro nome
    document.getElementById('user-greeting').innerText = nome.split(' ')[0];
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * PASSO 2: Seleção de Serviço
 * Abre a área de checkout para o serviço escolhido.
 */
function selectService(id, name) {
    selectedService = id;
    document.getElementById('selected-title').innerText = `Configurar: ${name}`;
    
    const checkoutArea = document.getElementById('checkout-area');
    checkoutArea.classList.remove('hidden');
    
    const timeSelection = document.getElementById('time-selection');
    
    // Se for banheiro, oculta a seleção de tempo e define preço fixo
    if(id === 'banheiro') {
        timeSelection.classList.add('hidden');
        selectedTime = 0; 
    } else {
        timeSelection.classList.remove('hidden');
        selectedTime = 30; // Reseta para 30min por padrão
    }
    
    updatePrice();
    checkoutArea.scrollIntoView({ behavior: 'smooth' });
}

/**
 * PASSO 3: Ajuste de Tempo e Preço
 */
function setTime(minutes) {
    selectedTime = minutes;
    
    // Atualiza visualmente os botões
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    updatePrice();
}

function updatePrice() {
    const valor = (selectedService === 'banheiro') 
        ? precosVisual.banheiro 
        : precosVisual[selectedService][selectedTime];
    
    document.getElementById('display-price').innerText = `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

/**
 * PASSO 4: Geração do QR Code (Integração Asaas)
 * Envia os dados coletados para o servidor gerar o PIX.
 */
async function generatePix() {
    const btn = event.target;
    btn.innerText = "Processando...";
    btn.disabled = true;

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                servico: selectedService, 
                tempo: selectedTime, 
                nome: userData.nome,
                email: userData.email,
                documento: userData.documento
            })
        });

        const data = await response.json();

        if (data.encodedImage) {
            // Sucesso: Esconde checkout e mostra o QR Code
            document.getElementById('checkout-area').classList.add('hidden');
            document.getElementById('pix-area').classList.remove('hidden');
            document.getElementById('qr-code-img').src = `data:image/png;base64,${data.encodedImage}`;
        } else {
            // Caso o Asaas retorne erro (ex: CPF inválido)
            alert("Erro: " + (data.details?.errors?.[0]?.description || "Verifique os dados digitados."));
            btn.disabled = false;
            btn.innerText = "Gerar QR Code de Acesso";
        }
    } catch (e) {
        console.error("Erro na requisição:", e);
        alert("Erro de conexão com o servidor. Tente novamente.");
        btn.disabled = false;
        btn.innerText = "Gerar QR Code de Acesso";
    }
}

/**
 * Função para reiniciar o processo
 */
function resetUI() {
    location.reload();
}
