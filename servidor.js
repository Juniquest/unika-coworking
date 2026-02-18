const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================================
// 1. BANCO DE DADOS E MODELO
// ======================================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado ao MongoDB UNIKA"))
  .catch(err => console.error("❌ Erro Banco:", err));

const Reserva = mongoose.model('Reserva', new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String, data: String, hora: String, status: { type: String, default: 'pendente' }
}));

// ======================================================
// 2. PÁGINA ÚNICA (CADASTRO + AGENDA 24H) - VISUAL LUXO
// ======================================================
app.get('/', async (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ŪNIKA | Coworking 24h</title>
    <style>
        :root { --gold: #c5a059; --bg: #050505; --card: #111; }
        body { background: var(--bg); color: #fff; font-family: 'Inter', sans-serif; margin: 0; display: flex; flex-direction: column; align-items: center; }
        header { padding: 60px 0; text-align: center; }
        h1 { letter-spacing: 15px; font-weight: 100; font-size: 3rem; margin: 0; }
        .gold { color: var(--gold); letter-spacing: 5px; font-size: 0.7rem; text-transform: uppercase; }
        
        .container { width: 90%; max-width: 500px; background: var(--card); border: 1px solid #222; padding: 40px; border-radius: 4px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); }
        h2 { font-weight: 200; font-size: 1.2rem; border-left: 2px solid var(--gold); padding-left: 15px; margin-bottom: 30px; letter-spacing: 2px; }
        
        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 0.6rem; color: var(--gold); letter-spacing: 2px; margin-bottom: 8px; text-transform: uppercase; }
        input, select { width: 100%; background: transparent; border: none; border-bottom: 1px solid #333; color: #fff; padding: 12px 0; font-size: 1rem; outline: none; transition: 0.3s; }
        input:focus { border-color: var(--gold); }

        .agenda-24h { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 20px; max-height: 200px; overflow-y: auto; padding-right: 10px; }
        .hora-item { border: 1px solid #222; padding: 10px; text-align: center; font-size: 0.7rem; cursor: pointer; transition: 0.3s; }
        .hora-item:hover { border-color: var(--gold); color: var(--gold); }
        .hora-item.selected { background: var(--gold); color: #000; border-color: var(--gold); }
        
        .btn-pagar { width: 100%; padding: 20px; background: transparent; border: 1px solid var(--gold); color: var(--gold); cursor: pointer; letter-spacing: 3px; font-weight: bold; text-transform: uppercase; margin-top: 30px; transition: 0.4s; }
        .btn-pagar:hover { background: var(--gold); color: #000; }
        
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: var(--gold); }
    </style>
</head>
<body>
    <header>
        <h1>ŪNIKA</h1>
        <div class="gold">Coworking Autônomo 24h</div>
    </header>

    <div class="container">
        <h2>RESERVA DE ACESSO</h2>
        <form action="/api/checkout" method="POST">
            <div class="form-group">
                <label>Nome Completo</label>
                <input type="text" name="nome" required>
            </div>
            <div class="form-group">
                <label>CPF (Sua Chave)</label>
                <input type="text" name="doc" required>
            </div>
            <div class="form-group">
                <label>Serviço</label>
                <select name="servico">
                    <option value="Estação de Trabalho">Estação de Trabalho</option>
                    <option value="Sala de Reunião">Sala de Reunião (TV 4K)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Data</label>
                <input type="date" name="data" required>
            </div>
            
            <label>Selecione o Horário (24h disponível)</label>
            <div class="agenda-24h" id="agenda">
                </div>
            <input type="hidden" name="hora" id="hora_selecionada">

            <button type="submit" class="btn-pagar">Confirmar e Pagar</button>
        </form>
    </div>

    <script>
        // Gerador de horários 24h
        const agenda = document.getElementById('agenda');
        for(let i=0; i<24; i++) {
            const h = i < 10 ? '0'+i : i;
            ['00'].forEach(min => {
                const time = \`\${h}:\${min}\`;
                const div = document.createElement('div');
                div.className = 'hora-item';
                div.innerText = time;
                div.onclick = function() {
                    document.querySelectorAll('.hora-item').forEach(el => el.classList.remove('selected'));
                    this.classList.add('selected');
                    document.getElementById('hora_selecionada').value = time;
                };
                agenda.appendChild(div);
            });
        }
    </script>
</body>
</html>
    `);
});

// ======================================================
// 3. PROCESSAR RESERVA E IR PARA ASAAS
// ======================================================
app.post('/api/checkout', async (req, res) => {
    const { nome, doc, email, servico, data, hora } = req.body;
    
    // Verifica se já existe reserva
    const ocupado = await Reserva.findOne({ data, hora, servico, status: 'pago' });
    if (ocupado) {
        return res.send("<h2>Horário já reservado por outro membro. Escolha outro.</h2>");
    }

    const novaReserva = new Reserva(req.body);
    await novaReserva.save();

    // Redireciona para o checkout (Aqui você coloca seu link do Asaas)
    res.send(\`
        <body style="background:#050505;color:#fff;text-align:center;padding-top:100px;font-family:sans-serif;">
            <h1 style="color:#c5a059;">ŪNIKA</h1>
            <p>Reserva pré-agendada. Redirecionando para o pagamento seguro Asaas...</p>
            <script>setTimeout(() => { window.location.href=' SEU_LINK_DO_ASAAS_AQUI '; }, 3000);</script>
        </body>
    \`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`🚀 ŪNIKA 24H Online na porta \${PORT}\`));
