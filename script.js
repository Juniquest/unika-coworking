let userData = { nome: '', email: '', documento: '' };
let selectedService = '';
let selectedTime = 30;

function startSession() {
    console.log("Botão clicar ok"); // Teste de clique
    const nome = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const doc = document.getElementById('regDoc').value;

    if(!nome || !email || !doc) {
        alert("Preencha todos os campos!");
        return;
    }

    userData = { nome, email, documento: doc.replace(/\D/g, '') };

    // Esconde cadastro, mostra serviços
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('services-screen').classList.remove('hidden');
    document.getElementById('user-greeting').innerText = nome;
}

function selectService(id, name) {
    selectedService = id;
    document.getElementById('selected-title').innerText = "Reservar " + name;
    document.getElementById('checkout-area').classList.remove('hidden');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function resetUI() {
    location.reload();
}

async function generatePix() {
    // Código de envio para o servidor (mantenha o anterior)
}
