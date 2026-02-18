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

// 2. ROTA DE VERIFICAÇÃO (OCUPADOS)
app.get('/api/horarios-ocupados', async (req, res) => {
    const { data } = req.query;
    const ocupados = await Reserva.find({ data: data, status: 'pago' }).select('hora -_id');
    res.json(ocupados.map(r => r.hora));
});

// 3. INTERFACE VISUAL (COM BANHEIRO + FONTES GRANDES + ALTO CONTRASTE)
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ŪNIKA | Coworking Autônomo</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root { --gold: #d4af37; --bg: #050505; --card: #111; --text: #ffffff; --text-dim: #e0e0e0; }
        body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; display: flex; flex-direction: column; align-items: center; -webkit-font-smoothing: antialiased; }
        
        header { padding: 40px 0; text-align: center; }
        h1 { letter-spacing: 12px; font-weight: 300; font-size: 2.8rem; margin: 0; text-transform: uppercase; color: #fff; }
        .subtitle { color: var(--gold); letter-spacing: 4px; font-size: 0.8rem; text-transform: uppercase; margin-top: 10px; font-weight: 400; }
        
        .container { width: 92%; max-width: 500px; background: var(--card); border: 1px solid #222; padding: 30px; border-radius: 4px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); margin-bottom: 50px; }
        
        h2 { font-weight: 400; font-size: 1.1rem; border-left: 3px solid var(--gold); padding-left: 15px; margin: 30px 0 15px; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); }
        
        input { width: 100%; background: transparent; border: none; border-bottom: 2px solid #333; color: #fff; padding: 12px 0; font-size: 1.1rem; outline: none; margin-bottom: 20px; transition: 0.3s; font-weight: 400; }
        input:focus { border-color: var(--gold); }
        input::placeholder { color: #666; }

        /* Grid de 3 colunas para incluir o Banheiro */
        .service-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 25px; }
        .option-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 25px; }
        
        .service-item, .option-item { border: 1px solid #333; padding: 18px 5px; text-align: center; cursor: pointer; font-size: 0.8rem; color: var(--text-dim); transition: 0.3s; font-weight: 600; letter-spacing: 1px; }
        .service-item.selected, .option-item.selected { border-color: var(--gold); color: #fff; background: rgba(212, 175, 55, 0.2); border-width: 2px; }
        .option-item.selected { background: var(--gold); color: #000; }

        .agenda-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; max-height: 300px; overflow-y: auto; border: 1px solid #222; padding: 15px; background: #000; }
        .hora-item { border: 1px solid #222; padding: 15px 2px; text-align: center; font-size: 1rem; cursor: pointer; color: var(--text-dim); transition: 0.2s; font-weight: 600; }
        
        .hora-item.ocupado { background: #1a1a1a; color: #444; cursor: not-allowed; border: 1px solid #222; text-decoration: line-through; }
        .hora-item.selected { background: #fff; color: #000; border-color: #fff; }

        .btn-pay { width: 100%; padding: 22px; background: transparent; border: 1px solid var(--gold); color: var(--gold); cursor: pointer; letter-spacing: 4px; font-weight: 600; text-transform: uppercase; margin-top: 35px; transition: 0.5s; font-size: 1.1rem; }
        .btn-pay:hover { background: var(--gold); color: #000; box-shadow: 0 0 20px rgba(212, 175, 55, 0.3); }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: var(--gold); border-radius: 10px; }
    </style>
</head>
<body>
    <header>
        <h1>ŪNIKA</h1>
        <div class="subtitle">Coworking Autônomo • Rio</div>
    </header>

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
            <input type="date" name="data" id="data_select" required onchange="carregarHorarios()" style="border-bottom: 2px solid var(--gold); cursor: pointer; color:#fff;">
            <div class="agenda-grid" id="ag_container">
                <p style="grid-column: 1/-1; text-align: center; color: #777; font-size: 1rem; padding: 20px;">Escolha a data acima...</p>
            </div>
            <input type="hidden" name="hora" id="hr_val" required>

            <button type="submit" class="btn-pay">Reservar Agora</button>
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
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gold); font-size:1rem; padding: 20px;">Verificando vagas...</p>';
            
            try {
                const response = await fetch('/api/horarios-ocupados?data=' + data);
                const ocupados = await response.json();
                
                container.innerHTML = '';
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
                container.innerHTML = '<p style="color:red; font-size:0.9rem;">Erro na conexão.</p>';
            }
        }
    </script>
</body>
</html>`);
});

// 4. CHECKOUT
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
            <h1 style="color:#d4af37; letter-spacing:10px; font-weight:100; font-size:3.5rem;">ŪNIKA</h1>
            <p style="font-size:1.4rem;">Abrindo checkout seguro...</p>
            <script>setTimeout(() => { window.location.href='${linkFinal}'; }, 2000);</script>
        </body>`);
    } catch (err) { res.status(500).send("Erro."); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 UNIKA Online"));
