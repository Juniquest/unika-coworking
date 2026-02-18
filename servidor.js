const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================================
// 1. CONEXÃO COM O BANCO DE DADOS
// ======================================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco de Dados UNIKA conectado!"))
  .catch(err => console.error("❌ Erro ao conectar banco:", err));

const reservaSchema = new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String, 
    data: String, hora: String, duracao: String, status: { type: String, default: 'pendente' }
});
const Reserva = mongoose.model('Reserva', reservaSchema);

// ======================================================
// 2. PÁGINA INICIAL (VISUAL PREMIUM + AGENDA 24H)
// ======================================================
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
        input, select { width: 100%; background: transparent; border: none; border-bottom: 1px solid #333; color: #fff; padding: 12px 0; font-size: 1rem; outline: none; transition: 0.3s; border-radius: 0; }
        input:focus { border-color: var(--gold); }

        /* Estilo da Agenda 24h */
        .agenda-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px; max-height: 180px; overflow-y: auto; border: 1px solid #222; padding: 15px; }
        .hora-item { border: 1px solid #333; padding: 10px; text-align: center; font-size: 0.75rem; cursor: pointer; transition: 0.3s; color: #888; }
        .hora-item:hover { border-color: var(--gold); color: var(--gold); }
        .hora-item.selected { background: var(--gold); color: #000; border-color: var(--gold); }
        
        /* Botão de Tempo */
        .duracao-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 25px; }
        .duracao-item { border: 1px solid #333; padding: 15px; text-align: center; cursor: pointer; font-size: 0.8rem; transition: 0.3s; }
        .duracao-item:hover { border-color: var(--gold); }
        .duracao-item.selected { background: #fff; color: #000; border-color: #fff; }

        .btn-finalizar { width: 100%; padding: 20px; background: transparent; border: 1px solid var(--gold); color: var(--gold); cursor: pointer; letter-spacing: 4px; font-weight: bold; text-transform: uppercase; margin-top: 30px; transition: 0.4s; }
        .btn-finalizar:hover { background: var(--gold); color: #000; }
        
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--gold); }
    </style>
</head>
<body>
    <header>
        <h1>ŪNIKA</h1>
        <div class="tagline">Coworking Autônomo • 24 Horas</div>
    </header>

    <div class="container">
        <form action="/api/checkout" method="POST" id="reservaForm">
            <h2>01. Seus Dados</h2>
            <div class="form-group">
                <label>Nome Completo</label>
                <input type="text" name="nome" required placeholder="NOME DO MEMBRO">
            </div>
            <div style="display:flex; gap:20px;">
                <div class="form-group" style="flex:1">
                    <label>CPF (Sua Chave)</label>
                    <input type="text" name="doc" required placeholder="00000000000">
                </div>
                <div class="form-group" style="flex:1">
                    <label>E-mail</label>
                    <input type="email" name="email" required placeholder="E-MAIL">
                </div>
            </div>

            <h2>02. Tempo de Permanência</h2>
            <div class="duracao-grid">
                <div class="duracao-item" onclick="selectDuracao('120', this)">120 MIN (R$ 15)</div>
                <div class="duracao-item" onclick="selectDuracao('180', this)">180 MIN (R$ 22)</div>
                <div class="duracao-item" onclick="selectDuracao('240', this)">240 MIN (R$ 30)</div>
                <div class="duracao-item" onclick="selectDuracao('diaria', this)">DIÁRIA (R$ 50)</div>
            </div>
            <input type="hidden" name="duracao" id="duracao_input" required>

            <h2>03. Data e Início</h2>
            <div class="form-group">
                <label>Selecione o Dia</label>
                <input type="date" name="data" required>
            </div>
            <label>Horário de Entrada (Disponível 24h)</label>
            <div class="agenda-grid" id="agenda24h"></div>
            <input type="hidden" name="hora" id="hora_input" required>

            <button type="submit" class="btn-finalizar">Gerar QR Code de Acesso</button>
        </form>
    </div>

    <script>
        // Gerar Agenda 24h
        const agenda = document.getElementById('agenda24h');
        for(let i=0; i<24; i++) {
            const h = i < 10 ? '0'+i : i;
            const time = h + ':00';
            const div = document.createElement('div');
            div.className = 'hora-item';
            div.innerText = time;
            div.onclick = function() {
                document.querySelectorAll('.hora-item').forEach(el => el.classList.remove('selected'));
                this.classList.add('selected');
                document.getElementById('hora_input').value = time;
            };
            agenda.appendChild(div);
        }

        function selectDuracao(valor, el) {
            document.querySelectorAll('.duracao-item').forEach(item => item.classList.remove('selected'));
            el.classList.add('selected');
            document.getElementById('duracao_input').value = valor;
        }
    </script>
</body>
</html>
    `);
});

// ======================================================
// 3. LOGICA DE CHECKOUT E LINKS DO ASAAS
// ======================================================
app.post('/api/checkout', async (req, res) => {
    const { nome, doc, email, data, hora, duracao } = req.body;

    // Seus links reais do Asaas configurados por tempo
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
                <h1 style="letter-spacing:10px; color:#c5a059;">ŪNIKA</h1>
                <p>Processando reserva para o período de ${duracao} min às ${hora}...</p>
                <p style="font-size:0.8rem; color:#666;">Você será redirecionado para o QR Code de pagamento.</p>
                <script>
                    setTimeout(() => { window.location.href='${linkFinal}'; }, 2500);
                </script>
            </body>
        `);
    } catch (err) {
        res.send("Erro ao processar. Tente novamente.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`🚀 ŪNIKA Online na porta \${PORT}\`));
