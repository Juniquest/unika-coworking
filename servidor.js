const express = require('express');
const mongoose = require('mongoose');
const path = require('path'); // Adicionado
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve sua pasta com index.html, script.js e style.css

// Conexão ao Banco
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco UNIKA Conectado"))
  .catch(err => console.error("❌ Erro Banco:", err));

const reservaSchema = new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String,
    data: String, hora: String, duracao: String, status: { type: String, default: 'pendente' }
});
const Reserva = mongoose.model('Reserva', reservaSchema);

// --- ESTILOS DO PAINEL (MANTIDOS) ---
const style = `...`; // Seu estilo aqui (igual ao que você enviou)

// 1. ROTA PARA VERIFICAR DISPONIBILIDADE (O Script.js precisa disso)
app.get('/api/horarios-ocupados', async (req, res) => {
    const { data } = req.query;
    const ocupados = await Reserva.find({ data, status: 'pago' }).select('hora -_id');
    res.json(ocupados.map(r => r.hora));
});

// 2. ROTA PRINCIPAL (Entrega seu index.html com as abas)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. ROTA DO PAINEL DE CONTROLE (Onde o CPF é validado)
app.get('/painel', async (req, res) => {
    const { cpf } = req.query;
    const agora = new Date();
    // Ajuste de fuso horário simples (Brasil)
    const hojeStr = new Date(agora.getTime() - (3 * 3600000)).toISOString().split('T')[0];
    
    const reserva = await Reserva.findOne({ doc: cpf, data: hojeStr, status: 'pago' }).sort({ _id: -1 });

    if (!reserva) {
        return res.send('<html><head><style>' + style + '</style></head><body><h1>ACESSO NEGADO</h1><p>Não encontramos reserva paga para hoje.</p><a href="/" class="btn-gold">VOLTAR</a></body></html>');
    }

    const [h, m] = reserva.hora.split(':');
    const dataInicio = new Date(reserva.data + 'T' + h + ':' + m + ':00');
    const dataFim = new Date(dataInicio.getTime() + (parseInt(reserva.duracao) * 60000));

    if (agora < dataInicio) {
        return res.send('<html><head><style>' + style + '</style></head><body><h1>AGUARDE</h1><p>Sua reserva começa às <b>' + reserva.hora + '</b>.</p><a href="/" class="btn-gold">VOLTAR</a></body></html>');
    }
    if (agora > dataFim) {
        return res.send('<html><head><style>' + style + '</style></head><body><h1>SESSÃO ENCERRADA</h1><p>Seu tempo expirou.</p><a href="/" class="btn-gold">NOVA RESERVA</a></body></html>');
    }

    const ePremium = reserva.servico.includes('Estação') || reserva.servico.includes('Sala');
    const eMasc = reserva.servico.includes('Masc');
    const eFem = reserva.servico.includes('Fem');

    let htmlControles = '';
    if (ePremium) {
        htmlControles = '<h2>Automação do Espaço</h2><div class="control-grid">' +
            '<button class="btn-iot" onclick="alert(\'Luzes\')">💡 Luzes</button>' +
            '<button class="btn-iot" onclick="alert(\'Ar\')">❄️ Ar</button>' +
            '<button class="btn-iot" onclick="alert(\'TV\')">📺 TV</button>' +
            '<button class="btn-iot" onclick="alert(\'Tomada\')">🔌 Tomadas</button></div>';
    }

    res.send('<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>' + style + ' body { justify-content: flex-start; padding-top: 5vh; }</style></head><body>' +
    '<h1>ŪNIKA</h1><div class="container"><div class="timer-box"><div id="timer">--:--</div><div style="color:var(--gold); font-size:0.7rem; margin-top:10px;">' + reserva.servico.toUpperCase() + '</div></div>' +
    htmlControles +
    '<h2>Portas</h2><div class="control-grid">' +
    ((ePremium || eMasc) ? '<button class="btn-iot" onclick="alert(\'Porta Masculina Liberada\')">🚹 Masculino</button>' : '') +
    ((ePremium || eFem) ? '<button class="btn-iot" onclick="alert(\'Porta Feminina Liberada\')">🚺 Feminino</button>' : '') +
    '</div><a href="/" style="color:#444; text-decoration:none; font-size:0.7rem; display:block; margin-top:40px;">SAIR DO PAINEL</a></div>' +
    '<script>const fim = ' + dataFim.getTime() + '; setInterval(() => { const dist = fim - new Date().getTime(); if(dist < 0) window.location.reload(); const mm = Math.floor((dist % 3600000) / 60000); const ss = Math.floor((dist % 60000) / 1000); document.getElementById("timer").innerHTML = (mm < 10 ? "0"+mm : mm) + ":" + (ss < 10 ? "0"+ss : ss); }, 1000);</script></body></html>');
});

// WEBHOOK E CHECKOUT (IGUAIS AOS SEUS)
app.post('/webhook-asaas', async (req, res) => {
    const { event, payment } = req.body;
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        await Reserva.findOneAndUpdate({ doc: payment.externalReference, status: 'pendente' }, { status: 'pago' }, { sort: { _id: -1 } });
    }
    res.sendStatus(200);
});

app.post('/api/checkout', async (req, res) => {
    try {
        await new Reserva(req.body).save();
        // Aqui você pode integrar com a API do Asaas para gerar o QR Code real via JSON
        // Por enquanto, mantendo sua lógica de links:
        const links = { "Estação Individual": "...", "Sala de Reunião": "...", "120": "..." };
        const link = (links[req.body.servico] || "https://www.asaas.com/c/astpmmsj1m8b7wct") + "?externalReference=" + req.body.doc;
        res.json({ invoiceUrl: link }); // Retorna JSON para o Script.js
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(process.env.PORT || 3000);
