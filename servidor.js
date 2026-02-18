const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());

// 1. CONEXÃO COM O BANCO DE DADOS (MONGODB)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco de Dados UNIKA conectado!"))
  .catch(err => console.error("❌ Erro ao conectar banco:", err));

const reservaSchema = new mongoose.Schema({
    nome: String,
    email: String,
    doc: String,
    servico: String,
    data: String,
    hora: String,
    status: { type: String, default: 'pendente' }
});

const Reserva = mongoose.model('Reserva', reservaSchema);

// 2. CONFIGURAÇÃO DO E-MAIL (NODEMAILER)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// FUNÇÃO DO E-MAIL PROFISSIONAL DA ŪNIKA
async function enviarEmailConfirmacao(reserva) {
    const isSalaReuniao = reserva.servico.toLowerCase().includes('reunião');
    
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; color: #333;">
            <div style="background-color: #000; padding: 30px; text-align: center;">
                <h1 style="color: #fff; margin: 0; letter-spacing: 4px;">ŪNIKA</h1>
                <p style="color: #888; font-size: 12px; text-transform: uppercase;">Coworking Autônomo • Rio de Janeiro</p>
            </div>
            <div style="padding: 30px;">
                <p>Olá, <strong>${reserva.nome}</strong>!</p>
                <p>Sua reserva foi confirmada. O seu espaço de produtividade no Rio já está garantido.</p>
                
                <div style="background-color: #f8f9fa; border-left: 4px solid #000; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>🏢 Endereço:</strong> Av. Rio Branco, 185 (Ed. Marquês do Herval)</p>
                    <p style="margin: 0 0 10px 0;"><strong>📅 Data:</strong> ${reserva.data}</p>
                    <p style="margin: 0;"><strong>🕒 Horário:</strong> ${reserva.hora}</p>
                </div>

                <h3>🔑 Acesso e Climatização</h3>
                <ul style="line-height: 1.6;">
                    <li><strong>Sua Chave:</strong> Digite seu <strong>CPF (apenas números)</strong> no teclado da porta.</li>
                    <li><strong>Ar-Condicionado:</strong> Você tem total controle da temperatura durante sua permanência.</li>
                    ${isSalaReuniao ? '<li><strong>TV:</strong> Disponível na sala para apresentações e chamadas.</li>' : ''}
                </ul>

                <h3>✨ Serviços Inteligentes (Pagos à Parte)</h3>
                <p>Ative via QR Code no local: Guarda-volumes inteligentes e Market 24h (cafés e bebidas).</p>

                <h3>🤝 Colaboração</h3>
                <p>Contamos com você para manter o espaço limpo para o próximo profissional. Temos lixeiras distribuídas em todo o coworking.</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://share.google/Z0QXBy4MO7JGUAd07" style="background-color: #000; color: #fff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">📍 VER NO GOOGLE MAPS</a>
                </div>
            </div>
        </div>
    `;

    await transporter.sendMail({
        from: `"ŪNIKA Coworking" <${process.env.EMAIL_USER}>`,
        to: reserva.email,
        subject: `Tudo pronto para sua reserva na ŪNIKA, ${reserva.nome}! 🚀`,
        html: htmlContent
    });
}

// 3. WEBHOOK DO ASAAS (RECEBE O PAGAMENTO)
app.post('/api/webhook', async (req, res) => {
    const event = req.body;
    if (event.event === 'PAYMENT_RECEIVED' || event.event === 'PAYMENT_CONFIRMED') {
        const [doc, servico, data, hora] = event.payment.externalReference.split('|');
        
        const reserva = await Reserva.findOneAndUpdate(
            { doc, data, hora },
            { status: 'pago' },
            { new: true }
        );

        if (reserva) {
            console.log("✅ Pagamento confirmado. Enviando e-mail...");
            await enviarEmailConfirmacao(reserva);
        }
    }
    res.status(200).send('OK');
});

// 4. API PARA O ESP32 (ABRE A PORTA)
app.get('/api/verificar-acesso', async (req, res) => {
    const { cpf } = req.query;
    const hoje = new Date().toLocaleDateString('pt-BR');
    
    const acesso = await Reserva.findOne({ doc: cpf, data: hoje, status: 'pago' });
    
    if (acesso) {
        res.json({ autorizado: true, nome: acesso.nome });
    } else {
        res.json({ autorizado: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
