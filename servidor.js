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

// 2. ROTA DE VERIFICAÇÃO (30 EM 30 MIN)
app.get('/api/horarios-ocupados', async (req, res) => {
    const { data } = req.query;
    const ocupados = await Reserva.find({ data: data, status: 'pago' }).select('hora -_id');
    res.json(ocupados.map(r => r.hora));
});

// 3. INTERFACE VISUAL (30 MIN SLOTS)
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
        h1 { letter-spacing: 15px; font-weight: 100; font-size: 2.5rem; margin: 0; text-transform: uppercase; }
        .subtitle { color: var(--gold); letter-spacing: 5px; font-size: 0.6rem; text-transform: uppercase; margin-top: 10px; opacity: 0.8; }
        .container { width: 92%; max-width: 500px; background: var(--card); border: 1px solid #222; padding: 30px; border-radius: 2px; box-shadow: 0 30px 60px rgba(0,0,0,0.9); margin-bottom: 50px; }
        h2 { font-weight: 200; font-size: 0.8rem; border-left: 2px solid var(--gold); padding-left: 15px; margin: 30px 0 15px; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); }
        
        input { width: 100%; background: transparent; border: none; border-bottom: 1px solid #333; color: #fff; padding: 10px 0; font-size: 0.9rem; outline: none; margin-bottom: 15px; }
        .service-grid, .option-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 20px; }
        .service-item, .option-item { border: 1px solid #222; padding: 12px 5px; text-align: center; cursor: pointer; font-size: 0.65rem; color: #555; transition: 0.3s; }
        .service-item.selected, .option-item.selected { border-color: var(--gold); color: var(--gold); background: rgba(197, 160, 89, 0.05); }
        .option-item.selected { background: var(--gold); color: #000; }

        /* Agenda 30 min */
        .agenda-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; max-height: 280px; overflow-y: auto; border: 1px solid #222; padding: 15px; background: #0a0a0a; }
        .hora-item { border: 1px solid #222; padding: 10px 2px; text-align: center; font-size: 0.65rem; cursor: pointer; color: #444; transition: 0.2s; position: relative; }
        
        .hora-item.ocupado { background: #151515; color: #222; cursor: not-allowed; border: 1px solid #1a1a1a; text-decoration: line-through; }
        .hora-item.ocupado::after { content: "OCUPADO"; position: absolute; bottom: 1px; left: 0; width: 100%; font-size: 0.45rem; color: #333; text-decoration: none; }

        .hora-item.selected { background: #fff; color: #000; border-color: #fff; }
        .btn-pay { width: 100%; padding: 20px; background: transparent; border: 1px solid var(--gold); color: var(--gold); cursor: pointer; letter-spacing: 4px; font-weight: 600; text-transform: uppercase; margin-top: 30px; transition: 0.5s; font-size: 0.75rem; }
        .btn-pay:hover { background: var(--gold); color: #000; }

        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: var(--gold); }
    </style>
</head>
<body>
    <header>
        <h1>ŪNIKA</h1>
        <div class="subtitle">Coworking Autônomo • Rio de Janeiro</div>
    </header>

    <div class="container">
        <form action="/api/checkout" method="POST">
            <h2>01. Serviço</h2>
            <div class="service-grid">
                <div class="service-item" onclick="selS('Estação', this)">ESTAÇÃO</div>
                <div class="service-item" onclick="selS('Sala', this)">SALA</div>
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
            <input type="date" name="data" id="data_select" required onchange="carregarHorarios()" style="border-bottom: 1px solid var(--gold); margin-bottom: 10px;">
            <div class="agenda-grid" id="ag_container">
                <p style="grid-column: 1/-1; text-align: center; color: #333; font-size: 0.6rem;">Escolha uma data...</p>
            </div>
            <input type="hidden" name="hora" id="hr_val" required>

            <button type="submit" class="btn-pay">Gerar Acesso</button>
        </form>
    </div>

    <script>
        function selS(v, e) {
            document.querySelectorAll('.service-item').forEach(i => i.classList.remove('selected'));
            e.classList.add('selected'); document.getElementById('serv_val').value = v;
        }
        function selT(v, e) {
            document.querySelectorAll('.option-item').forEach(i => i.classList.remove('selected'));
            e.classList.add('selected'); document.getElementById('dur_val').value = v;
        }

        async function carregarHorarios() {
            const data = document.getElementById('data_select').value;
            const container = document.getElementById('ag_container');
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #c5a059; font-size:0.6rem;">Buscando vagas...</p>';
            
            try {
                const response = await fetch('/api/horarios-ocupados?data=' + data);
                const ocupados = await response.json();
                
                container.innerHTML = '';
                // Loop de 24 horas x 2 (para ter os 30 min)
                for(let i=0; i<24; i++) {
                    const horas = [":00", ":30"];
                    horas.forEach(minuto => {
                        const h = (i < 10 ? '0'+i : i) + minuto;
                        const d = document.createElement('div');
                        const isOcupado = ocupados.includes(h);
                        
                        d.className = 'hora-item' + (isOcupado ? ' ocupado' : '');
                        d.innerText = h;
                        
                        if(!isOcupado) {
                            d.onclick = () => {
                                document.querySelectorAll('.hora-item').forEach(e => e.classList.remove('selected'));
                                d.classList.add('selected'); document.getElementById('hr_val').value = h;
                            };
                        }
                        container.appendChild(d);
                    });
                }
            } catch (err) {
                container.innerHTML = '<p style="color:red; font-size:0.6rem;">Erro na conexão.</p>';
            }
        }
    </script>
</body>
</html>`);
});

app.post('/api/checkout', async (req, res) => {
    const { duracao } = req.body;
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
        res.send(`<body style="background:#050505; color:#fff; text-align:center; padding-top:150px; font-family:sans-serif;">
            <h1 style="color:#c5a059; letter-spacing:10px; font-weight:100;">ŪNIKA</h1>
            <p>Gerando QR Code de acesso...</p>
            <script>setTimeout(() => { window.location.href='${linkFinal}'; }, 2000);</script>
        </body>`);
    } catch (err) { res.status(500).send("Erro."); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 UNIKA Online"));
