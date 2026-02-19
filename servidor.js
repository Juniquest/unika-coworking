const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Faz o servidor ler index.html, script.js e styles.css

// 1. CONEXÃO AO BANCO
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco UNIKA Conectado"))
  .catch(err => console.error("❌ Erro Banco:", err));

const reservaSchema = new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String,
    data: String, hora: String, duracao: String, status: { type: String, default: 'pendente' }
});
const Reserva = mongoose.model('Reserva', reservaSchema);

// 2. PAINEL DO CLIENTE (Com Timer e Controles de Automação)
app.get('/painel', async (req, res) => {
    const { cpf } = req.query;
    const hoje = new Date().toISOString().split('T')[0];
    const reserva = await Reserva.findOne({ doc: cpf, data: hoje, status: 'pago' }).sort({ _id: -1 });

    if (!reserva) {
        return res.send(`<body style="background:#050505;color:#d4af37;text-align:center;padding-top:100px;font-family:sans-serif;"><h1>ACESSO NEGADO</h1><p>Reserva paga não encontrada para hoje.</p><a href="/" style="color:#fff;">Voltar</a></body>`);
    }

    res.send(`
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ŪNIKA | Painel</title>
        <style>
            :root { --gold: #d4af37; --bg: #050505; --card: #111; --text: #fff; }
            body { background: var(--bg); color: var(--text); font-family: sans-serif; display: flex; flex-direction: column; align-items: center; margin: 0; }
            .container { width: 90%; max-width: 450px; background: var(--card); padding: 25px; border: 1px solid #222; border-radius: 8px; margin-top: 5vh; text-align: center; }
            .timer-box { border: 1px solid var(--gold); padding: 20px; margin-bottom: 20px; }
            #timer { font-size: 3rem; color: var(--gold); font-weight: bold; letter-spacing: 5px; }
            h2 { color: var(--gold); font-size: 0.8rem; text-transform: uppercase; margin: 20px 0 10px; border-left: 2px solid var(--gold); padding-left: 10px; text-align: left; }
            .control-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .btn-iot { background: transparent; border: 1px solid #333; color: #fff; padding: 15px; cursor: pointer; text-transform: uppercase; font-size: 0.7rem; }
            .btn-iot.active { border-color: var(--gold); color: var(--gold); background: rgba(212,175,55,0.1); }
            .btn-exit { margin-top: 30px; display: block; color: #666; text-decoration: none; font-size: 0.8rem; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>ŪNIKA</h1>
            <div class="timer-box">
                <div id="timer">--:--</div>
                <p style="font-size:0.7rem; color:var(--gold)">${reserva.servico.toUpperCase()}</p>
            </div>
            <h2>Controles de Automação</h2>
            <div class="control-grid">
                <button class="btn-iot" onclick="this.classList.toggle('active')">💡 Luzes</button>
                <button class="btn-iot" onclick="this.classList.toggle('active')">❄️ Ar Condicionado</button>
                <button class="btn-iot" onclick="this.classList.toggle('active')">📺 Televisão</button>
                <button class="btn-iot" onclick="this.classList.toggle('active')">🔌 Tomadas</button>
            </div>
            <h2>Acessos</h2>
            <div class="control-grid">
                <button class="btn-iot" onclick="alert('Porta Masculina Liberada')">🚹 Masc</button>
                <button class="btn-iot" onclick="alert('Porta Feminina Liberada')">🚺 Fem</button>
            </div>
            <a href="/" class="btn-exit">SAIR DO PAINEL</a>
        </div>
        <script>
            function startTimer(duration, start) {
                const display = document.querySelector('#timer');
                const end = new Date(start).getTime() + (duration * 60000);
                setInterval(() => {
                    const dist = end - new Date().getTime();
                    if (dist < 0) { display.innerHTML = "EXPIRADO"; return; }
                    const m = Math.floor((dist % 3600000) / 60000);
                    const s = Math.floor((dist % 60000) / 1000);
                    display.innerHTML = m + ":" + (s < 10 ? "0"+s : s);
                }, 1000);
            }
            startTimer(parseInt("${reserva.duracao}"), new Date("${reserva.data}T${reserva.hora}:00"));
        </script>
    </body>
    </html>`);
});

// 3. API DE HORÁRIOS
app.get('/api/horarios-ocupados', async (req, res) => {
    const ocupados = await Reserva.find({ data: req.query.data, status: 'pago' }).select('hora -_id');
    res.json(ocupados.map(r => r.hora));
});

// 4. CHECKOUT (Gera link e retorna JSON para o Script)
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
