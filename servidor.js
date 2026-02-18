const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================================
// 1. LAYOUT PREMIUM ŪNIKA (HTML + CSS INTEGRADO)
// ======================================================
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ŪNIKA | Coworking Autônomo</title>
    <style>
        :root { --gold: #c5a059; --dark: #0a0a0a; --gray: #1a1a1a; --text: #e0e0e0; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: var(--dark); color: var(--text); margin: 0; line-height: 1.6; }
        
        /* Header Minimalista */
        header { padding: 60px 20px; text-align: center; border-bottom: 1px solid #333; }
        .logo { letter-spacing: 12px; font-size: 3rem; font-weight: 200; color: #fff; margin: 0; }
        .sub-logo { font-size: 0.7rem; color: var(--gold); letter-spacing: 4px; margin-top: 10px; text-transform: uppercase; }

        .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }

        /* Sistema de Abas/Cards para Serviços */
        .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; margin-bottom: 50px; }
        .card { background: var(--gray); border: 1px solid #333; padding: 30px; border-radius: 4px; transition: all 0.4s; position: relative; overflow: hidden; }
        .card:hover { border-color: var(--gold); transform: translateY(-5px); }
        .card h3 { color: var(--gold); margin-top: 0; font-weight: 400; letter-spacing: 1px; }
        .card p { font-size: 0.9rem; color: #999; }
        .price { font-size: 1.2rem; color: #fff; margin: 15px 0; }

        /* Formulário Elegante */
        .booking-box { background: #111; border: 1px solid #222; padding: 40px; border-radius: 8px; }
        h2 { font-weight: 300; letter-spacing: 2px; margin-bottom: 30px; border-left: 3px solid var(--gold); padding-left: 15px; }
        
        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--gold); margin-bottom: 8px; }
        input, select { width: 100%; padding: 15px; background: #000; border: 1px solid #333; color: #fff; border-radius: 4px; box-sizing: border-box; }
        input:focus { border-color: var(--gold); outline: none; }

        .btn-confirm { width: 100%; padding: 20px; background: var(--gold); color: #000; border: none; font-weight: bold; 
                         text-transform: uppercase; letter-spacing: 2px; cursor: pointer; transition: 0.3s; margin-top: 20px; }
        .btn-confirm:hover { background: #fff; }

        /* Agenda/Status */
        .info-bar { display: flex; justify-content: space-around; background: #000; padding: 20px; border: 1px solid #333; margin-top: 40px; font-size: 0.8rem; }
        .status-dot { height: 8px; width: 8px; background: #00ff00; border-radius: 50%; display: inline-block; margin-right: 5px; }
    </style>
</head>
<body>
    <header>
        <h1 class="logo">ŪNIKA</h1>
        <div class="sub-logo">Autônomo & Inteligente • Rio de Janeiro</div>
    </header>

    <div class="container">
        <div class="services-grid">
            <div class="card">
                <h3>Estação Individual</h3>
                <p>Foco total em ambiente climatizado e silencioso.</p>
                <div class="price">R$ 50,00 / Período</div>
            </div>
            <div class="card">
                <h3>Sala de Reunião</h3>
                <p>TV 4K, quadro branco e total privacidade.</p>
                <div class="price">R$ 90,00 / Hora</div>
            </div>
            <div class="card">
                <h3>Escritório Privado</h3>
                <p>Para quem precisa de um QG próprio no Centro.</p>
                <div class="price">R$ 180,00 / Diária</div>
            </div>
        </div>

        <div class="booking-box">
            <h2>Solicitar Acesso</h2>
            <form action="/api/solicitar-reserva" method="POST">
                <div class="form-group">
                    <label>Nome Completo</label>
                    <input type="text" name="nome" placeholder="Como devemos te chamar?" required>
                </div>
                
                <div style="display: flex; gap: 20px;">
                    <div class="form-group" style="flex: 1;">
                        <label>CPF (Sua Chave de Entrada)</label>
                        <input type="text" name="doc" placeholder="Apenas números" required>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>E-mail Corporativo</label>
                        <input type="email" name="email" placeholder="Para envio da chave digital" required>
                    </div>
                </div>

                <div class="form-group">
                    <label>Selecione o Serviço</label>
                    <select name="servico">
                        <option value="Estação Individual">Estação Individual</option>
                        <option value="Sala de Reunião">Sala de Reunião (Smart TV)</option>
                        <option value="Escritório Privado">Escritório Privado</option>
                    </select>
                </div>

                <div style="display: flex; gap: 20px;">
                    <div class="form-group" style="flex: 1;">
                        <label>Data</label>
                        <input type="date" name="data" required>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>Horário de Início</label>
                        <input type="time" name="hora" required>
                    </div>
                </div>

                <button type="submit" class="btn-confirm">Verificar Disponibilidade & Pagar</button>
            </form>
        </div>

        <div class="info-bar">
            <span><span class="status-dot"></span> Ar-Condicionado: Ativo</span>
            <span><span class="status-dot"></span> Wi-Fi 6: 500Mbps</span>
            <span><span class="status-dot"></span> Acesso: 24/7 p/ Reservas</span>
        </div>
    </div>
</body>
</html>
    `);
});

// ======================================================
// 2. CONEXÃO COM O BANCO DE DADOS (MONGODB)
// ======================================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco de Dados UNIKA conectado!"))
  .catch(err => console.error("❌ Erro no banco:", err));

const Reserva = mongoose.model('Reserva', new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String, data: String, hora: String, status: { type: String, default: 'pendente' }
}));

// ======================================================
// 3. LOGICA DE RESERVA E ASAAS
// ======================================================
app.post('/api/solicitar-reserva', async (req, res) => {
    try {
        const novaReserva = new Reserva(req.body);
        await novaReserva.save();
        
        // Aqui simulamos a ida para o Asaas. 
        // Na vida real, redirecionamos para o link de pagamento gerado.
        res.send(`
            <body style="background:#0a0a0a; color:#fff; text-align:center; padding-top:100px; font-family:sans-serif;">
                <h1 style="color:#c5a059;">ŪNIKA</h1>
                <p>Solicitação enviada! Verifique seu e-mail ou aguarde o redirecionamento para o pagamento.</p>
                <progress style="width:200px;"></progress>
            </body>
        `);
    } catch (err) {
        res.status(500).send("Erro no sistema.");
    }
});

// ... (Aqui entra o Webhook e a API da Porta que já configuramos)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Sistema ŪNIKA Online na porta ${PORT}`));
