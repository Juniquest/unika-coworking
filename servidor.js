const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. CONEXÃO COM O BANCO DE DADOS
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco de Dados UNIKA conectado!"))
  .catch(err => console.error("❌ Erro no banco:", err));

const reservaSchema = new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String,
    data: String, hora: String, duracao: String, status: { type: String, default: 'pendente' }
});
const Reserva = mongoose.model('Reserva', reservaSchema);

// 2. INTERFACE VISUAL PREMIUM COM ESTAÇÃO, SALA E BANHEIRO
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ŪNIKA | Coworking Autônomo</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;300;400;600&display=swap" rel="stylesheet">
    <style>
        :root { --gold: #c5a059; --bg: #050505; --card: #111; }
        body { background: var(--bg); color: #fff; font-family: 'Inter', sans-serif; margin: 0; display: flex; flex-direction: column; align-items: center; }
        header { padding: 60px 0; text-align: center; }
        h1 { letter-spacing: 15px; font-weight: 100; font-size: 3rem; margin: 0; color: #fff; text-transform: uppercase; }
        .subtitle { color: var(--gold); letter-spacing: 5px; font-size: 0.7rem; text-transform: uppercase; margin-top: 10px; opacity: 0.8; }
        
        .container { width: 90%; max-width: 550px; background: var(--card); border: 1px solid #222; padding: 40px; border-radius: 2px; box-shadow: 0 30px 60px rgba(0,0,0,0.9); margin-bottom: 50px; animation: fadeIn 1s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        h2 { font-weight: 200; font-size: 0.9rem; border-left: 2px solid var(--gold); padding-left: 15px; margin: 40px 0 20px; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); }
        h2:first-of-type { margin-top: 0; }

        .form-group { margin-bottom: 25px; }
        label { display: block; font-size: 0.65rem; color: #666; letter-spacing: 2px; margin-bottom: 10px; text-transform: uppercase; }
        input { width: 100%; background: transparent; border: none; border-bottom: 1px solid #333; color: #fff; padding: 12px 0; font-size: 1rem; outline: none; }
        input:focus { border-color: var(--gold); }

        /* Escolha de Serviço */
        .service-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 30px; }
        .service-item { border: 1px solid #222; padding: 15px 5px; text-align: center; cursor: pointer; font-size: 0.65rem; color: #555; letter-spacing: 1px; transition: 0.3s; }
        .service-item:hover { border-color: var(--gold); color: #fff; }
        .service-item.selected { border-color: var(--gold); color: var(--gold); background: rgba(197, 160, 89, 0.05); }

        /* Tempo e Agenda */
        .option-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 25px; }
        .option-item { border: 1px solid #222; padding: 18px; text-align: center; cursor: pointer; font-size: 0.75rem; color: #888; transition: 0.3s; }
        .option-item.selected { background: var(--gold); color: #000; font-weight: 600; }

        .agenda-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; max-height: 160px; overflow-y: auto; border: 1px solid #222; padding: 15px; background: #0a0a0a; }
        .hora-item { border: 1px solid #222; padding: 12px; text-align: center; font-size: 0.7rem; cursor: pointer; color: #444; }
        .hora-item.selected { background: #fff; color: #000; }

        .btn-pay { width: 100%; padding: 22px; background: transparent; border: 1px solid var(--gold); color: var(--gold); cursor: pointer; letter-spacing: 5px; font-weight: 600; text-transform: uppercase; margin-top: 40px; transition: 0.5s; }
        .btn-pay:hover { background: var(--gold); color: #000; }
        
        .badge-info { background: #1a1a1a; padding: 15px; border-radius: 4px; font-size: 0.7rem; color: #888; margin-top: 20px; line-height: 1.5; border-left: 2px solid #333; }
    </style>
</head>
<body>
    <header>
        <h1>ŪNIKA</h1>
        <div class="subtitle">Coworking Autônomo • Rio de Janeiro</div>
    </header>

    <div class="container">
        <form action="/api/checkout" method="POST">
            <h2>01. Serviço Desejado</h2>
            <div class="service-grid">
                <div class="service-item" onclick="selS('Estação Individual', this)">ESTAÇÃO INDIVIDUAL</div>
                <div class="service-item" onclick="selS('Sala de Reunião', this)">SALA DE REUNIÃO</div>
                <div class="service-item" onclick="selS('Acesso Banheiro', this)">BANHEIRO (AVULSO)</div>
            </div>
            <input type="hidden" name="servico" id="serv_val" required>

            <h2>02. Identificação</h2>
            <div class="form-group"><label>Nome Completo</label><input type="text" name="nome" required></div>
            <div style="display:flex; gap:20px;">
                <div class="form-group" style="flex:1"><label>CPF (Sua Chave)</label><input type="text" name="doc" required placeholder="00000000000"></div>
                <div class="form-group" style="flex:1"><label>E-mail</label><input type="email" name="email" required></div>
            </div>

            <h2>03. Tempo de Permanência</h2>
            <div class="option-grid">
                <div class="option-item" onclick="selT('120', this)">120 MIN • R$ 15</div>
                <div class="option-item" onclick="selT('180', this)">180 MIN • R$ 22</div>
                <div class="option-item" onclick="selT('240', this)">240 MIN • R$ 30</div>
                <div class="option-item" onclick="selT('diaria', this)">DAY PASS • R$ 50</div>
            </div>
            <input type="hidden" name="duracao" id="dur_val" required>

            <h2>04. Data e Horário</h2>
            <div class="form-group"><input type="date" name="data" required style="border-bottom: 1px solid #c5a059; width:100%;"></div>
            <div class="agenda-grid" id="ag_container"></div>
            <input type="hidden" name="hora" id="hr_val" required>

            <button type="submit" class="btn-pay">Reservar e Pagar</button>
            
            <div class="badge-info">
                ● <b>Estação/Sala:</b> Inclui Wi-Fi High Speed e acesso ao Banheiro.<br>
                ● <b>Banheiro:</b> Opção para uso rápido das instalações sem reserva de mesa.
            </div>
        </form>
    </div>

    <script>
        // Agenda 24h
        const ag = document.getElementById('ag_container');
        for(let i=0; i<24; i++) {
            const h = (i < 10 ? '0'+i : i) + ':00';
            const d = document.createElement('div');
            d.className = 'hora-item'; d.innerText = h;
            d.onclick = () => {
                document.querySelectorAll('.hora-item').forEach(e => e.classList.remove('selected'));
                d.classList.add('selected'); document.getElementById('hr_val').value = h;
            };
            ag.appendChild(d);
        }
        function selS(v, e) {
            document.querySelectorAll('.service-item').forEach(i => i.classList.remove('selected'));
            e.classList.add('selected'); document.getElementById('serv_val').value = v;
        }
        function selT(v, e) {
            document.querySelectorAll('.option-item').forEach(i => i.classList.remove('selected'));
            e.classList.add('selected'); document.getElementById('dur_val').value = v;
        }
    </script>
</body>
</html>`);
});

// 3. LOGICA DE CHECKOUT COM LINKS DO ASAAS
app.post('/api/checkout', async (req, res) => {
    const { nome, doc, email, servico, data, hora, duracao } = req.body;
    const linksAsaas = {
        "120": "https://www.asaas.com/c/astpmmsj1m8b7wct",
        "180": "https://www.asaas.com/c/vvznh9nehwe4emft",
        "240": "https://www.asaas.com/c/1nedgjc1pqqkeu18",
        "diaria": "https://www.asaas.com/c/9yyhtmtds2u0je33"
    };
    const linkFinal = linksAsaas[duracao] || linksAsaas["120"];

    try {
        const novaReserva = new Reserva(req.body);
        await novaReserva.save();
        res.send(`
            <body style="background:#050505; color:#fff; text-align:center; padding-top:150px; font-family:sans-serif;">
                <h1 style="color:#c5a059; letter-spacing:10px;">ŪNIKA</h1>
                <p>Processando acesso para ${servico}...</p>
                <script>setTimeout(() => { window.location.href='${linkFinal}'; }, 2000);</script>
            </body>`);
    } catch (err) { res.status(500).send("Erro ao salvar."); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 UNIKA Online na porta " + PORT));
