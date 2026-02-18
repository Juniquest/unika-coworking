const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. CONEXÃO AO BANCO DE DADOS
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Banco de Dados UNIKA conectado!"))
  .catch(err => console.error("❌ Erro no banco:", err));

const reservaSchema = new mongoose.Schema({
    nome: String, email: String, doc: String, servico: String,
    data: String, hora: String, duracao: String, status: { type: String, default: 'pago' }
});
const Reserva = mongoose.model('Reserva', reservaSchema);

// CONFIGURAÇÃO DE E-MAIL (Use sua Senha de App de 16 dígitos aqui)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: 'riostoragecube@gmail.com', 
        pass: 'imzsysjsuihjdyay' 
    }
});

// 2. MONITORAMENTO DE TEMPO (CRON JOB)
cron.schedule('* * * * *', async () => {
    const agora = new Date();
    const hoje = agora.toISOString().split('T')[0];
    const reservas = await Reserva.find({ data: hoje, status: 'pago' });

    // AQUI ESTAVA O ERRO: Adicionamos 'async' antes de (res)
    reservas.forEach(async (res) => { 
        const [h, m] = res.hora.split(':');
        const dataInicio = new Date(`${res.data}T${h}:${m}:00`);
        const dataFim = new Date(dataInicio.getTime() + (parseInt(res.duracao) * 60000));
        const tempoRestanteMin = Math.ceil((dataFim - agora) / 60000);

        if (tempoRestanteMin === 10) {
            enviarEmail(res.email, res.nome, "Informamos que sua sessão na ŪNIKA encerra em 10 minutos. Sinta-se à vontade para organizar seus pertences.");
        }

        if (tempoRestanteMin <= 0 && tempoRestanteMin > -2) {
            console.log(`[SHUTDOWN] ${res.servico} - ${res.nome}`);
            enviarEmail(res.email, res.nome, "Sua sessão foi encerrada e os equipamentos foram desligados. Agradecemos por escolher a ŪNIKA.");
            await Reserva.findByIdAndUpdate(res._id, { status: 'finalizado' });
        }
    });
});

function enviarEmail(email, nome, mensagem) {
    const mailOptions = {
        from: 'ŪNIKA | Experiência Digital <riostoragecube@gmail.com>',
        to: email,
        subject: 'ŪNIKA | Informação importante sobre sua sessão',
        text: `Olá, ${nome}.\n\n${mensagem}\n\nAtenciosamente,\nEquipe ŪNIKA`
    };
    transporter.sendMail(mailOptions).catch(err => console.log("Erro e-mail:", err));
}

// 3. ROTA DE TESTE (Acesse /testar-email para validar)
app.get('/testar-email', (req, res) => {
    // Troque pelo seu email real abaixo para testar
    enviarEmail("riostoragecube@gmail.com", "Teste ŪNIKA", "Se você recebeu isso, a configuração de e-mail está funcionando!");
    res.send("<h1>Comando de teste enviado!</h1><p>Verifique sua caixa de entrada e o spam.</p>");
});

// --- MANTENHA AS OUTRAS ROTAS (/, /login, /painel, etc) IGUAIS ABAIXO ---
// [O restante do seu código de layout e rotas deve vir aqui]

app.listen(process.env.PORT || 3000);
