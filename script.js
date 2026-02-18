let selectedService = '';
let selectedTime = 30;

// Dados do cliente obtidos no pré-cadastro
let userData = { nome: '', email: '', documento: '' }; 

const precosVisual = {
    estacao: { 30: 10, 60: 18, 120: 30 },
    reuniao: { 30: 50, 60: 90, 120: 150 },
    banheiro: 5
};

// Funções do fluxo de autenticação
function startSession() {
    const nome = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const doc = document.getElementById('regDoc').value;

    if(!nome || !email || !doc) {
        return alert("Por favor, preencha todos os campos para continuar.");
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return alert("Por favor, insira um e-mail válido.");
    }

    userData = { 
        nome: nome, 
        email: email, 
        documento: doc.replace(/\D/g, '') // Limpa o documento (apenas números)
    };

    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('services-screen').classList.remove('hidden');
    document.getElementById('user-greeting').innerText = nome.split(' ')[0]; // Mostra só o primeiro nome
    
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo da tela de serviços
}


// Funções do fluxo de serviços e checkout
function selectService(id, name) {
    selectedService = id;
    document.getElementById('selected-title').innerText = `Configurar: ${name}`;
    
    const checkoutArea = document.getElementById('checkout-area');
    checkoutArea.classList.remove('hidden');
    
    const timeSelection = document.getElementById('time-selection');
    if(id === 'banheiro') {
        timeSelection.classList.add('hidden');
        selectedTime = 0; // Para banheiro, não há seleção de tempo
    } else {
        timeSelection.classList.remove('hidden');
        selectedTime = 30; // Padrão inicial para outros serviços
    }
    
    updatePrice();
    checkoutArea.scrollIntoView({ behavior: 'smooth' });
}

function setTime(minutes) {
    selectedTime = minutes;
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
    // Identifica o botão clicado para adicionar a classe 'active'
    if (event.target.tagName === 'BUTTON') {
        event.target.classList.add('active');
    } else { // Caso o clique seja no span dentro do botão, por exemplo
        event.target.closest('.time-btn').classList.add('active');
    }
    updatePrice();
}

function updatePrice() {
    const valor = (selectedService === 'banheiro') 
        ? precosVisual.banheiro 
        : precosVisual[selectedService][selectedTime];
    
    document.getElementById('display-price').innerText = `R$ ${valor.toFixed(2).replace('.', ',')}`; // Formato BR
}


async function generatePix() {
    // Pegamos os dados do userData que foi preenchido no início
    if(!userData.nome || !userData.email || !userData.documento) {
        alert("Erro: Dados de cadastro ausentes. Por favor, recarregue e preencha novamente.");
        resetUI();
        return;
    }

    const btn = event.target;
    btn.innerText = "Gerando Acesso...";
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
                documento: userData.documento // Documento já limpo
            })
        });

        const data = await response.json();
        if (data.encodedImage) {
            document.getElementById('checkout-area').classList.add('hidden');
            document.getElementById('pix-area').classList.remove('hidden');
            document.getElementById('qr-code-img').src = `data:image/png;base64,${data.encodedImage}`;
        } else {
            alert("Erro ao gerar PIX. Detalhes: " + (data.details?.errors?.[0]?.description || "Verifique os dados ou o servidor."));
            btn.disabled = false;
            btn.innerText = "Gerar QR Code de Acesso";
        }
    } catch (e) {
        console.error("Erro na comunicação com o servidor:", e);
        alert("Erro de conexão com o servidor. Tente novamente.");
        btn.disabled = false;
        btn.innerText = "Gerar QR Code de Acesso";
    }
}

function resetUI() {
    location.reload(); // Recarrega a página para reiniciar o fluxo
}
