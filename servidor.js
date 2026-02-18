const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================================
// 1. LAYOUT DA PÁGINA INICIAL E RESERVA (O SEU SITE)
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
                body { font-family: 'Helvetica', sans-serif; margin: 0; background: #f4f4f4; color: #000; }
                header { background: #000; color: #fff; padding: 40px 20px; text-align: center; }
                h1 { letter-spacing: 10px; margin: 0; font-size: 2.5rem; }
                .container { max-width: 800px; margin: 40px auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                .grid-servicos { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; }
                .card { border: 2px solid #000; padding: 20px; text-align: center; cursor: pointer; transition: 0.3s; }
                .card:hover { background: #000; color: #fff; }
                form { display: flex; flex-direction: column; gap: 15px; margin-top: 30px; }
                input, select, button { padding: 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; }
                button { background: #000; color: #fff; border: none; cursor: pointer; font-weight: bold; text-transform: uppercase; }
                button:hover { background: #333; }
                .status-badge { background: #e7f5e7; color: green; padding: 5px 10px; border-radius: 20px; font-size: 0.8rem; display: inline-block; margin-top: 10px; }
            </style>
        </head>
        <body>
            <header>
                <h1>ŪNIKA</h1>
                <p>CENTRO | RIO DE JANEIRO</p>
                <div class="status-badge">● SISTEMA OPERACIONAL</div>
            </header>
            <div class="container">
                <h2>Reserve seu Espaço</h2>
                <p>Escolha o serviço e o horário para receber seu acesso via CPF.</p>
                
                <form action="/api/solicitar-reserva" method="POST">
                    <label>Seu Nome Completo:</label>
                    <input type="text" name="nome" required placeholder="Ex: João Silva">
                    
                    <label>Seu CPF (Apenas números - será sua chave de acesso):</label>
                    <input type="text" name="doc" required placeholder="000.000.000-00">
                    
                    <label>E-mail (Para receber as instruções):</label>
                    <input type="email" name="email" required placeholder="seu@email.com">

                    <label>Serviço:</label>
                    <select name="servico" required>
                        <option value="Estação de Trabalho">Estação de Trabalho (Avulso)</option>
                        <option value="Sala de Reunião">Sala de Reunião (Hora)</option>
                        <option value="Escritório Privado">Escritório Privado (Diária)</option>
                    </select>

                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label>Data:</label>
                            <input type="date" name="data" required>
                        </div>
                        <div style="flex: 1;">
                            <label>Horário:</label>
                            <input type="time" name="hora" required>
                        </div>
                    </div>

                    <button type="submit">Prosseguir para Pagamento</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

// ======================================================
// 2. LOGICA DE BACKEND (MONGODB + ASAAS + EMAIL)
// ======================================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco de Dados conectado!"))
  .catch(err => console.error("❌ Erro no banco:", err));

const Reserva = mongoose.model('Reserva', new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String, data: String, hora: String, status: { type: String, default: 'pendente' }
}));

const transporter = nodemailer.createTransport({
    service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Rota para processar o formulário acima
app.post('/api/solicitar-reserva', async (req, res) => {
    try {
        const novaReserva = new Reserva(req.body);
        await novaReserva.save();
        // Aqui você redirecionaria para o link de checkout do Asaas
        res.send(`<h1>Reserva Registrada!</h1><p>Estamos te enviando para o pagamento... (Integração com Checkout Asaas)</p>`);
    } catch (err) {
        res.status(500).send("Erro ao processar reserva.");
    }
});

// WEBHOOK DO ASAAS
app.post('/api/webhook', async (req, res) => {
    const event = req.body;
    if (event.event === 'PAYMENT_RECEIVED' || event.event === 'PAYMENT_CONFIRMED') {
        const [doc, servico, data, hora] = event.payment.externalReference.split('|');
        const reserva = await Reserva.findOneAndUpdate({ doc, data, hora }, { status: 'pago' }, { new: true });
        if (reserva) await enviarEmailConfirmacao(reserva);
    }
    res.status(200).send('OK');
});

// API DA PORTA (ESP32)
app.get('/api/verificar-acesso', async (req, res) => {
    const { cpf } = req.query;
    const hoje = new Date().toLocaleDateString('pt-BR');
    const acesso = await Reserva.findOne({ doc: cpf, data: hoje, status: 'pago' });
    res.json(acesso ? { autorizado: true, nome: acesso.nome } : { autorizado: false });
});

async function enviarEmailConfirmacao(reserva) {
    const htmlContent = `<div style="background:#000;color:#fff;padding:20px;"><h1>ŪNIKA</h1><p>Confirmado! Use seu CPF para entrar.</p></div>`;
    await transporter.sendMail({
        from: `"ŪNIKA" <${process.env.EMAIL_USER}>`,
        to: reserva.email,
        subject: `Reserva Confirmada!`,
        html: htmlContent
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
