const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const ASAAS_URL = 'https://www.asaas.com/api/v3';

// Simulação de banco de dados
let reservasConfirmadas = [];

// ROTA DE CHECKOUT
app.post('/api/checkout', async (req, res) => {
    const { servico, tempo, data, hora, nome, email, documento } = req.body;

    const conflito = reservasConfirmadas.find(r => r.data === data && r.hora === hora && r.servico === servico);
    if(conflito) return res.status(400).json({ error: "Horário já ocupado!" });

    const precos = { estacao: { '30': 10, '60': 18, '120': 30 }, reuniao: { '30': 50, '60': 90, '120': 150 } };
    const valor = precos[servico][tempo];

    try {
        const headers = { 'access_token': process.env.ASAAS_API_KEY, 'Content-Type': 'application/json' };

        const cli = await axios.post(`${ASAAS_URL}/customers`, { name: nome, email, cpfCnpj: documento }, { headers });

        const pag = await axios.post(`${ASAAS_URL}/payments`, {
            customer: cli.data.id,
            billingType: 'PIX',
            value: valor,
            dueDate: new Date().toISOString().split('T')[0],
            description: `ŪNIKA: ${servico} (${data} ${hora})`,
            externalReference: `${servico}|${data}|${hora}`, // Referência para o WebHook
            postalService: false
        }, { headers });

        const qr = await axios.get(`${ASAAS_URL}/payments/${pag.data.id}/pixQrCode`, { headers });

        res.json({ encodedImage: qr.data.encodedImage });

    } catch (e) {
        res.status(500).json({ error: "Erro no Asaas" });
    }
});

// ROTA DE WEBHOOK (Recebe o aviso de pagamento do Asaas)
app.post('/api/webhook', (req, res) => {
    const event = req.body;
    
    if (event.event === 'PAYMENT_RECEIVED' || event.event === 'PAYMENT_CONFIRMED') {
        const [servico, data, hora] = event.payment.externalReference.split('|');
        
        // Aqui a reserva é oficialmente validada
        reservasConfirmadas.push({ servico, data, hora, status: 'pago' });
        console.log(`✅ Pagamento confirmado para: ${servico} em ${data} às ${hora}`);
    }
    
    res.status(200).send('OK');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`ŪNIKA ONLINE PORTA ${PORT}`));
