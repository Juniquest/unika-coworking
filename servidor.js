const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. CONEXÃO AO BANCO DE DADOS
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco de Dados UNIKA conectado!"))
  .catch(err => console.error("❌ Erro no banco:", err));

const reservaSchema = new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String,
    data: String, hora: String, duracao: String, status: { type: String, default: 'pendente' }
});
const Reserva = mongoose.model('Reserva', reservaSchema);

// 2. ROTA DO PAINEL DO CLIENTE (CONTROLES E TIMER)
app.get('/painel', async (req, res) => {
    const { cpf } = req.query;
    const hoje = new Date().toISOString().split('T')[0];

    const reserva = await Reserva.findOne({ doc: cpf, data: hoje, status: 'pago' });

    if (!reserva) {
        return res.send(`<body style="background:#050505;color:#d4af37;text-align:center;padding-top:100px;font-family:sans-serif;">
            <h1 style="letter-spacing:5px;">ACESSO NEGADO</h1><p>Não encontramos uma reserva paga para hoje.</p>
            <a href="/" style="color:#fff;">Voltar para Início</a></body>`);
    }

    res.send(`
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ŪNIKA | Painel</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root { --gold: #d4af37; --bg: #050505; --card: #111; --text: #ffffff; }
        body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; display: flex; flex-direction: column; align-items: center; }
        header { padding: 30px 0; text-align: center; }
        h1 { letter-spacing: 10px; font-weight: 300; font-size: 2rem; margin: 0; text-transform: uppercase; color: #fff; }
        .container { width: 92%; max-width: 500px; background: var(--card); border: 1px solid #222; padding: 25px; border-radius: 4px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); margin-bottom: 50px; }
        .timer-box { text-align: center; margin-bottom: 30px; border: 1px solid var(--gold); padding: 20px; border-radius: 2px; }
        #timer { font-size: 3.5rem; font-weight: 300; color: var(--gold); letter-spacing: 5px; }
        h2 { font-weight: 400; font-size: 0.9rem; border-left: 3px solid var(--gold); padding-left: 15px; margin: 30px 0 15px; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); }
        .control-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .btn-iot { background: transparent; border: 1px solid #333; color: #fff; padding: 20px; cursor: pointer; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 2px; transition: 0.3s; font-weight: 600; }
        .btn-iot.active { border-color: var(--gold); color: var(--gold); background: rgba(212, 175, 55, 0.15); }
        .btn-bathroom { grid-column: 1 / -1; margin-top: 10px; border-color: var(--gold); }
    </style>
</head>
<body>
    <header><h1>ŪNIKA</h1><div style="color:var(--gold);font-size:0.6rem;letter-spacing:3px;">SESSÃO EXCLUSIVA</div></header>
    <div class="container">
        <div class="timer-box">
            <div style="font-size: 0.7rem; letter-spacing: 3px; color: #666;">TEMPO RESTANTE</div>
            <div id="timer">--:--</div>
            <div style="font-size:0.8rem; color:var(--gold); margin-top:5px; font-weight:600;">${reserva.servico.toUpperCase()}</div>
        </div>
        <h2>Automação da Sala</h2>
        <div class="control-grid">
            <button class="btn-iot" onclick="toggle(this, 'LUZ')">💡 Lâmpadas</button>
            <button class="btn-iot" onclick="toggle(this, 'AR')">❄️ Ar Condicionado</button>
            <button class="btn-iot" onclick="toggle(this, 'TV')">📺 Televisão</button>
            <button class="btn-iot" onclick="toggle(this, 'TOMADA')">🔌 Tomadas</button>
        </div>
        <h2>Acessos</h2>
        <div class="control-grid">
            <button class="btn-iot btn-bathroom" onclick="abrirBanheiro()">🔓 Abrir Banheiro</button>
        </div>
        <div style="font-size: 0.6rem; color: #444; text-align: center; margin-top: 30px; letter-spacing: 1px;">CLIENTE: ${reserva.nome.toUpperCase()}</div>
    </div>
    <script>
        function startTimer(durationInMinutes, startTime) {
            const display = document.querySelector('#timer');
            const end = new Date(startTime).getTime() + (durationInMinutes * 60000);
            setInterval(() => {
                const now = new Date().getTime();
                const dist = end - now;
                if (dist < 0) { display.innerHTML = "EXPIRADO"; return; }
                const h = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((dist % (1000 * 60)) / 1000);
                display.innerHTML = (h > 0 ? h + ":" : "") + (m < 10 ? "0"+m : m) + ":" + (s < 10 ? "0"+s : s);
            }, 1000);
        }
        function toggle(btn, dispositivo) { btn.classList.toggle('active'); }
        function abrirBanheiro() { alert("Porta do Banheiro liberada!"); }
        
        const duracao = parseInt("${reserva.duracao}") || 120;
        // Ajuste de data/hora para o timer
        const [h, m] = "${reserva.hora}".split(':');
        const inicio = new Date("${reserva.data}T" + h + ":" + m + ":00");
        startTimer(duracao, inicio);
    </script>
</body>
</html>`);
});

// 3. WEBHOOK ASAAS (AUTOMAÇÃO DE PAGAMENTO)
app.post('/webhook-asaas', async (req, res) => {
    const { event, payment } = req.body;
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        const cpfCliente = payment.externalReference;
        try {
            await Reserva.findOneAndUpdate(
                { doc: cpfCliente, status: 'pendente' },
                { status: 'pago' },
                { sort: { _id: -1 } }
            );
        } catch (err) { console.error("Erro webhook:", err); }
    }
    res.sendStatus(200);
});

// 4. API HORÁRIOS OCUPADOS
app.get('/api/horarios-ocupados', async (req, res) => {
    const { data } = req.query;
    const ocupados = await Reserva.find({ data: data, status: 'pago' }).select('hora -_id');
    res.json(ocupados.map(r => r.hora));
});

// 5. PÁGINA INICIAL (AGENDA E RESERVA)
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ŪNIKA | Coworking</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root { --gold: #d4af37; --bg: #050505; --card: #111; --text: #ffffff; --text-dim: #e0e0e0; }
        body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; display: flex; flex-direction: column; align-items: center; }
        header { padding: 40px 0; text-align: center; }
        h1 { letter-spacing: 12px; font-weight: 300; font-size: 2.8rem; margin: 0; text-transform: uppercase; color: #fff; }
        .subtitle { color: var(--gold); letter-spacing: 4px; font-size: 0.8rem; text-transform: uppercase; margin-top: 10px; }
        .container { width: 92%; max-width: 500px; background: var(--card); border: 1px solid #222; padding: 30px; border-radius: 4px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); margin-bottom: 50px; }
        h2 { font-weight: 400; font-size: 1.1rem; border-left: 3px solid var(--gold); padding-left: 15px; margin: 30px 0 15px; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); }
        input { width: 100%; background: transparent; border: none; border-bottom: 2px solid #333; color: #fff; padding: 12px 0; font-size: 1.1rem; outline: none; margin-bottom: 20px; }
        .service-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 25px; }
        .option-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 25px; }
        .service-item, .option-item { border: 1px solid #333; padding: 18px 5px; text-align: center; cursor: pointer; font-size: 0.8rem; color: var(--text-dim); font-weight: 600; }
        .service-item.selected, .option-item.selected { border-color: var(--gold); color: #fff; background: rgba(212, 175, 55, 0.2); }
        .option-item.selected { background: var(--gold); color: #000; }
        .agenda-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; max-height: 300px; overflow-y: auto; border: 1px solid #222; padding: 15px; background: #000; }
        .hora-item { border: 1px solid #222; padding: 15px 2px; text-align: center; font-size: 1rem; cursor: pointer; color: var(--text-dim); font-weight: 600; }
        .hora-item.ocupado { background: #1a1a1a; color: #444; cursor: not-allowed; text-decoration: line-through; }
        .hora-item.selected { background: #fff; color: #000; }
        .btn-pay { width: 100%; padding: 22px; background: transparent; border: 1px solid var(--gold); color: var(--gold); cursor: pointer; letter-spacing: 4px; font-weight: 600; text-transform: uppercase; margin-top: 35px; font-size: 1.1rem; }
    </style>
</head>
<body>
    <header><h1>ŪNIKA</h1><div class="subtitle">Coworking Autônomo</div></header>
    <div class="container">
        <form action="/api/checkout" method="POST">
            <h2>01. Serviço</h2>
            <div class="service-grid">
                <div class="service-item" onclick="selS('Estação', this)">ESTAÇÃO</div>
                <div class="service-item" onclick="selS('Sala', this)">SALA</div>
                <div class="service-item" onclick="selS('Banheiro', this)">BANHEIRO</div>
            </div>
            <input type="hidden" name="servico" id="serv_val" required>
            <h2>02. Identificação</h2>
            <input type="text" name="nome" placeholder="NOME COMPLETO" required>
            <div style="display:flex; gap:15px;">
                <input type="text" name="doc" placeholder="CPF" required style="flex:1">
                <input type="email" name="email" placeholder="E-MAIL" required style="flex:1">
            </div>
            <h2>03. Tempo Estimado</h2>
            <div class="option-grid">
                <div class="option-item" onclick="selT('120', this)">120 MIN</div>
                <div class="option-item" onclick="selT('180', this)">180 MIN</div>
                <div class="option-item" onclick="selT('240', this)">240 MIN</div>
                <div class="option-item" onclick="selT('diaria', this)">DIÁRIA</div>
            </div>
            <input type="hidden" name="duracao" id="dur_val" required>
            <h2>04. Início (30 em 30 min)</h2>
            <input type="date" name="data" id="data_select" required onchange="carregarHorarios()" style="border-bottom: 2px solid var(--gold); color:#fff; background:transparent;">
            <div class="agenda-grid" id="ag_container"><p style="grid-column: 1/-1; text-align: center; color: #777;">Escolha a data...</p></div>
            <input type="hidden" name="hora" id="hr_val" required>
            <button type="submit" class="btn-pay">Reservar Agora</button>
        </form>
    </div>
    <script>
        function selS(v, e) { document.querySelectorAll('.service-item').forEach(i => i.classList.remove('selected')); e.classList.add('selected'); document.getElementById('serv_val').value = v; }
        function selT(v, e) { document.querySelectorAll('.option-item').forEach(i => i.classList.remove('selected')); e.classList.add('selected'); document.getElementById('dur_val').value = v; }
        async function carregarHorarios() {
            const data = document.getElementById('data_select').value;
            const container = document.getElementById('ag_container');
            container.innerHTML = 'Carregando...';
            const response = await fetch('/api/horarios-ocupados?data=' + data);
            const ocupados = await response.json();
            container.innerHTML = '';
            for(let i=0; i<24; i++) {
                [":00", ":30"].forEach(m => {
                    const h = (i < 10 ? '0'+i : i) + m;
                    const d = document.createElement('div');
                    d.className = 'hora-item' + (ocupados.includes(h) ? ' ocupado' : '');
                    d.innerText = h;
                    if(!ocupados.includes(h)) {
                        d.onclick = () => {
                            document.querySelectorAll('.hora-item').forEach(e => e.classList.remove('selected'));
                            d.classList.add('selected'); document.getElementById('hr_val').value = h;
                        };
                    }
                    container.appendChild(d);
                });
            }
        }
    </script>
</body>
</html>`);
});

// 6. ROTA DE CHECKOUT
app.post('/api/checkout', async (req, res) => {
    const { doc, duracao } = req.body;
    const linksAsaas = {
        "120": "https://www.asaas.com/c/astpmmsj1m8b7wct",
        "180": "https://www.asaas.com/c/vvznh9nehwe4emft",
        "240": "https://www.asaas.com/c/1nedgjc1pqqkeu18",
        "diaria": "https://www.asaas.com/c/9yyhtmtds2u0je33"
    };
    const linkFinal = (linksAsaas[duracao] || linksAsaas["120"]) + "?externalReference=" + doc;
    try {
        const novaReserva = new Reserva(req.body);
        await novaReserva.save();
        res.send(`<body style="background:#050505; color:#fff; text-align:center; padding-top:150px; font-family:sans-serif;">
            <h1 style="color:#d4af37; letter-spacing:10px; font-size:3rem;">ŪNIKA</h1>
            <p>Redirecionando para pagamento...</p>
            <script>setTimeout(() => { window.location.href='${linkFinal}'; }, 2000);</script>
        </body>`);
    } catch (err) { res.status(500).send("Erro ao processar."); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 UNIKA Online"));
