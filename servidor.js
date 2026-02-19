const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 

// CONEXÃO MONGO (Usando sua variável do Render)
mongoose.connect(process.env.MONGO_URI);

const Reserva = mongoose.model('Reserva', {
    nome: String, email: String, doc: String, servico: String,
    data: String, hora: String, duracao: String, status: { type: String, default: 'pendente' }
});

// PAINEL DE CONTROLE (O que o cliente vê após o login)
app.get('/painel', async (req, res) => {
    const { cpf } = req.query;
    const hoje = new Date().toISOString().split('T')[0];
    const reserva = await Reserva.findOne({ doc: cpf, data: hoje, status: 'pago' }).sort({ _id: -1 });

    if (!reserva) {
        return res.send(`<body style="background:#000;color:#d4af37;text-align:center;padding-top:100px;font-family:sans-serif;"><h1>ACESSO NEGADO</h1><p>Nenhuma reserva ativa encontrada.</p><a href="/" style="color:#fff;">VOLTAR</a></body>`);
    }

    res.send(`
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ŪNIKA | Painel</title>
        <style>
            body { background: #050505; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; }
            h1 { letter-spacing: 12px; font-weight: 300; margin-top: 40px; text-transform: uppercase; }
            .timer-box { border: 1px solid #d4af37; padding: 30px; text-align: center; width: 100%; max-width: 380px; margin: 30px 0; }
            #timer { font-size: 4rem; color: #d4af37; font-weight: bold; letter-spacing: 5px; }
            h2 { color: #d4af37; font-size: 1rem; text-transform: uppercase; border-left: 4px solid #d4af37; padding-left: 15px; align-self: flex-start; max-width: 380px; margin: 30px auto 15px; width: 100%; letter-spacing: 2px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; max-width: 380px; }
            .btn-iot { background: transparent; border: 1px solid #333; color: #fff; padding: 20px; font-size: 0.8rem; font-weight: bold; cursor: pointer; text-transform: uppercase; transition: 0.3s; }
            .btn-iot.active { border-color: #d4af37; color: #d4af37; background: rgba(212,175,55,0.1); }
            .footer-info { font-size: 0.7rem; color: #444; margin-top: 40px; letter-spacing: 2px; }
        </style>
    </head>
    <body>
        <h1>ŪNIKA</h1>
        <div class="timer-box">
            <div style="font-size: 0.7rem; color: #666; margin-bottom: 10px; letter-spacing: 2px;">TEMPO RESTANTE</div>
            <div id="timer">--:--</div>
            <div style="color:#d4af37; font-size:0.9rem; margin-top:10px; font-weight: bold;">${reserva.servico.toUpperCase()}</div>
        </div>

        <h2>AUTOMAÇÃO DA SALA</h2>
        <div class="grid">
            <button class="btn-iot" onclick="this.classList.toggle('active')">💡 LUZES</button>
            <button class="btn-iot" onclick="this.classList.toggle('active')">❄️ AR CONDICIONADO</button>
            <button class="btn-iot" onclick="this.classList.toggle('active')">📺 TELEVISÃO</button>
            <button class="btn-iot" onclick="this.classList.toggle('active')">🔌 TOMADAS</button>
        </div>

        <h2>ACESSOS BANHEIRO</h2>
        <div class="grid">
            <button class="btn-iot" onclick="alert('Porta Masculina Destrancada')">🚹 MASCULINO</button>
            <button class="btn-iot" onclick="alert('Porta Feminina Destrancada')">🚺 FEMININO</button>
        </div>
        <div class="footer-info">CLIENTE: ${reserva.nome.toUpperCase()}</div>

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
            startTimer(parseInt("${reserva.duracao}"), new Date("${reserva.data}T${reserva.hora}:00"));
        </script>
    </body>
    </html>`);
});

// APIs DE APOIO
app.get('/api/horarios-ocupados', async (req, res) => {
    const ocupados = await Reserva.find({ data: req.query.data, status: 'pago' }).select('hora -_id');
    res.json(ocupados.map(r => r.hora));
});

app.post('/api/checkout', async (req, res) => {
    const links = {
        "Banheiro Masc": "https://www.asaas.com/c/xx8y9j7aelqt1u1z",
        "Banheiro Fem": "https://www.asaas.com/c/hy4cb2sz0ya4mmrd",
        "120": "https://www.asaas.com/c/astpmmsj1m8b7wct",
        "180": "https://www.asaas.com/c/vvznh9nehwe4emft",
        "240": "https://www.asaas.com/c/1nedgjc1pqqkeu18",
        "diaria": "https://www.asaas.com/c/9yyhtmtds2u0je33"
    };
    const linkFinal = (links[req.body.servico] || links[req.body.duracao] || links["120"]) + "?externalReference=" + req.body.doc;
    try {
        await new Reserva(req.body).save();
        res.json({ invoiceUrl: linkFinal });
    } catch (e) { res.status(500).json({ error: "Erro" }); }
});

app.listen(process.env.PORT || 3000);
