const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. CONEXÃO COM O BANCO DE DADOS
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco de Dados UNIKA conectado!"))
  .catch(err => console.error("❌ Erro ao conectar banco:", err));

const reservaSchema = new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String, 
    data: String, hora: String, duracao: String, status: { type: String, default: 'pendente' }
});
const Reserva = mongoose.model('Reserva', reservaSchema);

// 2. PÁGINA INICIAL (VISUAL PREMIUM 24H)
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
        header { padding: 50px 0; text-align: center; }
        h1 { letter-spacing: 15px; font-weight: 100; font-size: 3rem; margin: 0; color: #fff; }
        .tagline { color: var(--gold); letter-spacing: 5px; font-size: 0.7rem; text-transform: uppercase; margin-top: 10px; }
        .container { width: 90%; max-width: 550px; background: var(--card); border: 1px solid #222; padding: 40px; border-radius: 4px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); margin-bottom: 50px; }
        h2 { font-weight: 200; font-size: 1.2rem; border-left: 2px solid var(--gold); padding-left: 15px; margin-bottom: 30px; letter-spacing: 2px; text-transform: uppercase; }
        .form-group { margin-bottom: 25px; }
        label { display: block; font-size: 0.6rem; color: var(--gold); letter-spacing: 2px; margin-bottom: 8px; text-transform: uppercase; }
        input { width: 100%; background: transparent; border: none; border-bottom: 1px solid #333; color: #fff; padding: 12px 0; font-size: 1rem; outline: none; box-sizing: border-box; }
        .agenda-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px; max-height: 180px; overflow-y: auto; border: 1px solid #222; padding: 15px; }
        .hora-item { border: 1px solid #333; padding: 10px; text-align: center; font-size: 0.75rem; cursor: pointer; color: #888; }
        .hora-item.selected { background: var(--gold); color: #000; border-color: var(--gold); }
        .duracao-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 25px; }
        .duracao-item { border: 1px solid #333; padding: 15px; text-align: center; cursor: pointer; font-size: 0.8rem; }
        .duracao-item.selected { background: #fff; color: #000; border-color: #fff; }
        .btn-finalizar { width: 100%; padding: 20px; background: transparent; border: 1px solid var(--gold); color: var(--gold); cursor: pointer; letter-spacing: 4px; font-weight: bold; text-transform: uppercase; margin-top: 30px; }
        .btn-finalizar:hover { background: var(--gold); color: #000; }
    </style>
</head>
<body>
    <header>
        <h1>ŪNIKA</h1>
        <div class="tagline">Coworking Autônomo • 24 Horas</div>
    </header>
    <div class="container">
        <form action="/api/checkout" method="POST">
            <h2>01. Seus Dados</h2>
            <div class="form-group"><label>Nome Completo</label><input type="text" name="nome" required></div>
            <div style="display:flex; gap:20px;">
                <div class="form-group" style="flex:1"><label>CPF</label><input type="text" name="doc" required></div>
                <div class="form-group" style="flex:1"><label>E-mail</label><input type="email" name="email" required></div>
            </div>
            <h2>02. Tempo de Permanência</h2>
            <div class="duracao-grid">
                <div class="duracao-item" onclick="selD('120', this)">120 MIN (R$ 15)</div>
                <div class="duracao-item" onclick="selD('180', this)">180 MIN (R$ 22)</div>
                <div class="duracao-item" onclick="selD('240', this)">240 MIN (R$ 30)</div>
                <div class="duracao-item" onclick="selD('diaria', this)">DIÁRIA (R$ 50)</div>
            </div>
            <input type="hidden" name="duracao" id="dur_in" required>
            <h2>03. Data e Início</h2>
            <div class="form-group"><label>Dia</label><input type="date" name="data" required></div>
            <div class="agenda-grid" id="ag"></div>
            <input type="hidden" name="hora" id="hr_in" required>
            <button type="submit" class="btn-finalizar">Ir para Pagamento</button>
        </form>
    </div>
    <script>
        const ag = document.getElementById('ag');
        for(let i=0; i<24; i++) {
            const h = (i < 10 ? '0'+i : i) + ':00';
            const d = document.createElement('div');
            d.className = 'hora-item'; d.innerText = h;
            d.onclick = () => {
                document.querySelectorAll('.hora-item').forEach(e => e.classList.remove('selected'));
                d.classList.add('selected'); document.getElementById('hr_in').value = h;
            };
            ag.appendChild(d);
        }
        function selD(v, e) {
            document.querySelectorAll('.duracao-item').forEach(i => i.classList.remove('selected'));
            e.classList.add('selected'); document.getElementById('dur_in').value = v;
        }
    </script>
</body>
</html>`);
});

// 3. LOGICA DE CHECKOUT COM SEUS LINKS ASAAS
app.post('/api/checkout', async (req, res) => {
    const { nome, doc, email, data, hora, duracao } = req.body;
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
            <body style="background:#050505; color:#fff; text-align:center; padding-top:100px; font-family:sans-serif;">
                <h1 style="color:#c5a059;">ŪNIKA</h1>
                <p>Redirecionando para o pagamento seguro...</p>
                <script>setTimeout(() => { window.location.href='${linkFinal}'; }, 2000);</script>
            </body>`);
    } catch (err) { res.send("Erro ao processar reserva."); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Servidor Online na porta " + PORT));
