const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexão ao Banco
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco UNIKA Conectado"))
  .catch(err => console.error("❌ Erro Banco:", err));

const reservaSchema = new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String,
    data: String, hora: String, duracao: String, status: { type: String, default: 'pendente' }
});
const Reserva = mongoose.model('Reserva', reservaSchema);

const style = `
    :root { --gold: #d4af37; --bg: #050505; --card: #111; --text: #fff; }
    body { background: var(--bg); color: var(--text); font-family: sans-serif; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    h1 { letter-spacing: 10px; text-transform: uppercase; font-weight: 300; margin-bottom: 20px; }
    .container { width: 90%; max-width: 450px; background: var(--card); padding: 30px; border: 1px solid #222; border-radius: 4px; }
    .timer-box { border: 1px solid var(--gold); padding: 20px; margin-bottom: 20px; }
    #timer { font-size: 3rem; color: var(--gold); font-weight: bold; }
    .control-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
    .btn-iot { background: transparent; border: 1px solid #333; color: #fff; padding: 18px; cursor: pointer; text-transform: uppercase; font-size: 0.7rem; border-radius: 4px; }
    .btn-iot.active { border-color: var(--gold); color: var(--gold); background: rgba(212, 175, 55, 0.1); }
    .btn-gold { width: 100%; padding: 20px; border: 1px solid var(--gold); color: var(--gold); background: transparent; text-transform: uppercase; cursor: pointer; margin-top: 20px; display: block; text-decoration: none; font-weight: bold; }
    input { width: 100%; background: transparent; border: none; border-bottom: 2px solid #333; color: #fff; padding: 15px; text-align: center; font-size: 1.2rem; margin-bottom: 20px; outline: none; }
    h2 { color: var(--gold); font-size: 0.8rem; text-align: left; margin-top: 25px; border-left: 2px solid var(--gold); padding-left: 10px; text-transform: uppercase; }
`;

app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
    res.send('<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>' + style + '</style></head><body><h1>ŪNIKA</h1><div class="container"><form action="/painel" method="GET"><input type="text" name="cpf" placeholder="DIGITE SEU CPF" required><button type="submit" class="btn-gold">ENTRAR NO PAINEL</button></form></div></body></html>');
});

app.get('/painel', async (req, res) => {
    const { cpf } = req.query;
    const agora = new Date();
    const hojeStr = agora.toISOString().split('T')[0];
    
    const reserva = await Reserva.findOne({ doc: cpf, data: hojeStr, status: 'pago' }).sort({ _id: -1 });

    if (!reserva) {
        return res.send('<html><head><style>' + style + '</style></head><body><h1>ACESSO NEGADO</h1><p>Reserva paga não encontrada para hoje.</p><a href="/login" class="btn-gold">VOLTAR</a></body></html>');
    }

    const [h, m] = reserva.hora.split(':');
    const dataInicio = new Date(reserva.data + 'T' + h + ':' + m + ':00');
    const dataFim = new Date(dataInicio.getTime() + (parseInt(reserva.duracao) * 60000));

    if (agora < dataInicio) {
        return res.send('<html><head><style>' + style + '</style></head><body><h1>AGUARDE</h1><p>Sua reserva começa às <b>' + reserva.hora + '</b>.</p><a href="/login" class="btn-gold">VOLTAR NO HORÁRIO</a></body></html>');
    }
    if (agora > dataFim) {
        return res.send('<html><head><style>' + style + '</style></head><body><h1>SESSÃO ENCERRADA</h1><p>Seu tempo expirou.</p><a href="/login" class="btn-gold">VOLTAR</a></body></html>');
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
    ((ePremium || eMasc) ? '<button class="btn-iot" onclick="alert(\'Masc\')">🚹 Masculino</button>' : '') +
    ((ePremium || eFem) ? '<button class="btn-iot" onclick="alert(\'Fem\')">🚺 Feminino</button>' : '') +
    '</div><a href="/login" style="color:#444; text-decoration:none; font-size:0.7rem; display:block; margin-top:40px;">SAIR</a></div>' +
    '<script>const fim = ' + dataFim.getTime() + '; setInterval(() => { const dist = fim - new Date().getTime(); if(dist < 0) window.location.reload(); const mm = Math.floor((dist % 3600000) / 60000); const ss = Math.floor((dist % 60000) / 1000); document.getElementById("timer").innerHTML = mm + ":" + (ss < 10 ? "0"+ss : ss); }, 1000);</script></body></html>');
});

app.post('/webhook-asaas', async (req, res) => {
    const { event, payment } = req.body;
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        await Reserva.findOneAndUpdate({ doc: payment.externalReference, status: 'pendente' }, { status: 'pago' }, { sort: { _id: -1 } });
    }
    res.sendStatus(200);
});

app.post('/api/checkout', async (req, res) => {
    await new Reserva(req.body).save();
    const links = { "Banheiro Masc": "https://www.asaas.com/c/xx8y9j7aelqt1u1z", "Banheiro Fem": "https://www.asaas.com/c/hy4cb2sz0ya4mmrd", "120": "https://www.asaas.com/c/astpmmsj1m8b7wct" };
    const link = (links[req.body.servico] || links["120"]) + "?externalReference=" + req.body.doc;
    res.send('<script>location.href="' + link + '";</script>');
});

app.listen(process.env.PORT || 3000);
