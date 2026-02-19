const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. CONEXÃO
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
    body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    h1 { letter-spacing: 12px; font-weight: 300; text-transform: uppercase; margin-bottom: 20px; }
    .container { width: 90%; max-width: 450px; background: var(--card); padding: 30px; border: 1px solid #222; border-radius: 4px; }
    .timer-box { border: 1px solid var(--gold); padding: 20px; margin-bottom: 20px; }
    #timer { font-size: 3rem; color: var(--gold); font-weight: bold; }
    .control-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
    .btn-iot { background: transparent; border: 1px solid #333; color: #fff; padding: 18px; cursor: pointer; text-transform: uppercase; font-size: 0.7rem; border-radius: 4px; }
    .btn-iot.active { border-color: var(--gold); color: var(--gold); }
    .btn-gold { width: 100%; padding: 20px; border: 1px solid var(--gold); color: var(--gold); background: transparent; text-transform: uppercase; cursor: pointer; margin-top: 20px; display: block; text-decoration: none; font-weight: bold; }
    input { width: 100%; background: transparent; border: none; border-bottom: 2px solid #333; color: #fff; padding: 15px; text-align: center; font-size: 1.2rem; margin-bottom: 20px; outline: none; }
    h2 { color: var(--gold); font-size: 0.8rem; text-align: left; margin-top: 25px; border-left: 2px solid var(--gold); padding-left: 10px; text-transform: uppercase; letter-spacing: 1px; }
`;

app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
    res.send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${style}</style></head><body><h1>ŪNIKA</h1><div class="container"><form action="/painel" method="GET"><input type="text" name="cpf" placeholder="DIGITE SEU CPF" required><button type="submit" class="btn-gold">ACESSAR ESPAÇO</button></form></div></body></html>`);
});

app.get('/painel', async (req, res) => {
    const { cpf } = req.query;
    const agora = new Date();
    const hoje = agora.toISOString().split('T')[0];
    
    // Busca reserva paga para hoje
    const reserva = await Reserva.findOne({ doc: cpf, data: hoje, status: 'pago' }).sort({ _id: -1 });

    if (!reserva) {
        return res.send(`<html><head><style>${style}</style></head><body><h1>ACESSO NEGADO</h1><p>Não encontramos reserva paga para hoje.</p><a href="/login" class="btn-gold">VOLTAR</a></body></html>`);
    }

    // Validação de HORÁRIO (Início e Fim)
    const [h, m] = reserva.hora.split(':');
    const dataInicio = new Date(`${reserva.data}T${h}:${m}:00`);
    const dataFim = new Date(dataInicio.getTime() + (parseInt(reserva.duracao) * 60000));

    if (agora < dataInicio) {
        return res.send(`<html><head><style>${style}</style></head><body><h1>AGUARDE</h1><p>Sua reserva começa às <b>${reserva.hora}</b>.<br>O acesso será liberado no horário exato.</p><a href="/login" class="btn-gold">VOLTAR MAIS TARDE</a></body></html>`);
    }

    if (agora > dataFim) {
        return res.send(`<html><head><style>${style}</style></head><body><h1>SESSÃO ENCERRADA</h1><p>Seu tempo de reserva expirou.</p><a href="/reservar" class="btn-gold">NOVA RESERVA</a></body></html>`);
    }

    // Se chegou aqui, está PAGO e no HORÁRIO CERTO
    const ePremium = reserva.servico.includes('Estação') || reserva.servico.includes('Sala');
    const eMasc = reserva.servico.includes('Masc');
    const eFem = reserva.servico.includes('Fem');

    res.send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${style} body { justify-content: flex-start; padding-top: 5vh; }</style></head><body>
    <h1>ŪNIKA</h1>
    <div class="container">
        <div class="timer-box">
            <div id="timer">--:--</div>
            <div style="color:var(--gold); font-size:0.7rem; margin-top:10px; letter-spacing:2px;">${reserva.servico.toUpperCase()}</div>
        </div>

        ${ePremium ? `
        <h2>Automação da Sala</h2>
        <div class="control-grid">
            <button class="btn-iot" onclick="this.classList.toggle('active')">💡 Luzes</button>
            <button class="btn-iot" onclick="this.classList.toggle('active')">❄️ Ar</button>
            <button class="btn-iot" onclick="this.classList.toggle('active')">📺 TV</button>
            <button class="btn-iot" onclick="this.classList.toggle('active')">🔌 Tomadas</button>
        </div>` : ''}

        <h2>Acessos Disponíveis</h2>
        <div class="control-grid">
            ${(ePremium || eMasc) ? `<button class="btn-iot ${!ePremium?'active':''}" style="grid-column: ${ePremium?'auto':'1/-1'}" onclick="alert('Porta Masculina Aberta')">🚹 Masculino</button>` : ''}
            ${(ePremium || eFem) ? `<button class="btn-iot ${!ePremium?'active':''}" style="grid-column: ${ePremium?'auto':'1/-1'}" onclick="alert('Porta Feminina Aberta')">🚺 Feminino</button>` : ''}
        </div>
        
        <a href="/login" style="color:#444; text-decoration:none; font-size:0.7rem; display:block; margin-top:30px; letter-spacing:1px;">ENCERRAR SESSÃO</a>
    </div>

    <script>
        function updateTimer() {
            const display = document.querySelector('#timer');
            const fim = new Date(${dataFim.getTime()}).getTime();

            setInterval(() => {
                const dist = fim - new Date().getTime();
                if (dist < 0) { window.location.reload(); return; }

                const hh = Math.floor(dist / 3600000);
                const mm = Math.floor((dist % 3600000) / 60000);
                const ss = Math.floor((dist % 60000) / 1000);
                display.innerHTML = (hh > 0 ? hh + ":" : "") + (mm < 10 ? "0"+mm : mm) + ":" + (ss < 10 ? "0"+ss : ss);
            }, 1000);
        }
        updateTimer();
    </script></body></html>`);
});

// WEBHOOK E CHECKOUT
app.post('/webhook-asaas', async (req, res) => {
    const { event, payment } = req.body;
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        await Reserva.findOneAndUpdate({ doc: payment.externalReference, status: 'pendente' }, { status: 'pago' }, { sort: { _id: -1 } });
    }
    res.sendStatus(200);
});

app.post('/api/checkout', async (req, res) => {
    const { doc, servico, duracao } = req.body;
    const links = { "Banheiro Masc": "https://www.asaas.com/c/xx8y9j7aelqt1u1z", "Banheiro Fem": "https://www.asaas.com/c/hy4cb2sz0ya4mmrd", "120": "https://www.asaas.com/c/astpmmsj1m8b7wct", "diaria": "https://www.asaas.com/c/9yyhtmtds2u0je33" };
    const linkFinal = (links[servico] || links[duracao] || links["120"]) + "?externalReference=" + doc;
    await new Reserva(req.body).save();
    res.send(`<script>location.href='${linkFinal}';</script>`);
});

app.listen(process.env.PORT || 3000);
