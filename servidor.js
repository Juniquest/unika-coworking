const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 

// 1. CONEXÃO AO BANCO
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco UNIKA Conectado"))
  .catch(err => console.error("❌ Erro Banco:", err));

const reservaSchema = new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String,
    data: String, hora: String, duracao: String, status: { type: String, default: 'pendente' }
});
const Reserva = mongoose.model('Reserva', reservaSchema);

// 2. PAINEL DE AUTOMAÇÃO (Visual idêntico ao das suas fotos)
app.get('/painel', async (req, res) => {
    const { cpf } = req.query;
    const hoje = new Date().toISOString().split('T')[0];
    const reserva = await Reserva.findOne({ doc: cpf, data: hoje, status: 'pago' }).sort({ _id: -1 });

    if (!reserva) {
        return res.send(`<body style="background:#050505;color:#d4af37;text-align:center;padding-top:100px;font-family:sans-serif;"><h1>ACESSO NEGADO</h1><p>Reserva ativa não encontrada para hoje.</p><a href="/" style="color:#fff;text-decoration:none;">VOLTAR</a></body>`);
    }

    res.send(`
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ŪNIKA | Painel de Controle</title>
        <style>
            :root { --gold: #d4af37; --bg: #050505; --card: #111; }
            body { background: var(--bg); color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; margin: 0; padding: 20px; }
            h1 { letter-spacing: 10px; font-weight: 300; margin-top: 40px; }
            .panel-card { background: var(--card); border: 1px solid #222; padding: 30px; border-radius: 4px; width: 100%; max-width: 400px; text-align: center; }
            .timer-box { border: 1px solid var(--gold); padding: 20px; margin: 20px 0; }
            #timer { font-size: 3.5rem; color: var(--gold); font-weight: bold; }
            h2 { color: var(--gold); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; text-align: left; border-left: 3px solid var(--gold); padding-left: 10px; margin: 30px 0 15px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .btn-iot { background: transparent; border: 1px solid #333; color: #fff; padding: 18px; cursor: pointer; font-size: 0.7rem; text-transform: uppercase; font-weight: bold; transition: 0.3s; }
            .btn-iot.active { border-color: var(--gold); color: var(--gold); background: rgba(212,175,55,0.1); }
            .info-user { font-size: 0.6rem; color: #444; margin-top: 20px; letter-spacing: 1px; }
        </style>
    </head>
    <body>
        <h1>ŪNIKA</h1>
        <div class="panel-card">
            <div class="timer-box">
                <div style="font-size:0.6rem; color:#666; margin-bottom:5px;">TEMPO RESTANTE</div>
                <div id="timer">--:--</div>
                <div style="color:var(--gold); font-size:0.8rem; margin-top:5px;">${reserva.servico.toUpperCase()}</div>
            </div>

            <h2>01. Automação</h2>
            <div class="grid">
                <button class="btn-iot" onclick="this.classList.toggle('active')">💡 Lâmpadas</button>
                <button class="btn-iot" onclick="this.classList.toggle('active')">❄️ Ar Condicionado</button>
                <button class="btn-iot" onclick="this.classList.toggle('active')">📺 Televisão</button>
                <button class="btn-iot" onclick="this.classList.toggle('active')">🔌 Tomadas</button>
            </div>

            <h2>02. Acessos Banheiro</h2>
            <div class="grid">
                <button class="btn-iot" onclick="alert('Porta Masculina Destrancada')">🚹 Masculino</button>
                <button class="btn-iot" onclick="alert('Porta Feminina Destrancada')">🚺 Feminino</button>
            </div>
            <div class="info-user">CLIENTE: ${reserva.nome.toUpperCase()}</div>
        </div>

        <script>
            function startTimer(duration, start) {
                const display = document.querySelector('#timer');
                const end = new Date(start).getTime() + (duration * 60000);
                setInterval(() => {
                    const dist = end - new Date().getTime();
                    if (dist < 0) { display.innerHTML = "EXPIRADO"; return; }
                    const h = Math.floor(dist / 3600000);
                    const m = Math.floor((dist % 3600000) / 60000);
                    const s = Math.floor((dist % 60000) / 1000);
                    display.innerHTML = (h > 0 ? h + ":" : "") + (m < 10 ? "0"+m : m) + ":" + (s < 10 ? "0"+s : s);
                }, 1000);
            }
            startTimer(parseInt("${reserva.duracao}") || 60, new Date("${reserva.data}T${reserva.hora}:00"));
        </script>
    </body>
    </html>`);
});

// 3. API DE HORÁRIOS E CHECKOUT
app.get('/api/horarios-ocupados', async (req, res) => {
    const ocupados = await Reserva.find({ data: req.query.data, status: 'pago' }).select('hora -_id');
    res.json(ocupados.map(r => r.hora));
});

app.post('/api/checkout', async (req, res) => {
    const { doc, servico, duracao } = req.body;
    const links = {
        "Banheiro Masc": "https://www.asaas.com/c/xx8y9j7aelqt1u1z",
        "Banheiro Fem": "https://www.asaas.com/c/hy4cb2sz0ya4mmrd",
        "120": "https://www.asaas.com/c/astpmmsj1m8b7wct",
        "180": "https://www.asaas.com/c/vvznh9nehwe4emft",
        "240": "https://www.asaas.com/c/1nedgjc1pqqkeu18",
        "diaria": "https://www.asaas.com/c/9yyhtmtds2u0je33"
    };
    const linkFinal = (links[servico] || links[duracao] || links["120"]) + "?externalReference=" + doc;
    try {
        await new Reserva(req.body).save();
        res.json({ invoiceUrl: linkFinal });
    } catch (e) { res.status(500).json({ error: "Erro" }); }
});

app.listen(process.env.PORT || 3000);
