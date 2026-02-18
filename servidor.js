const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const ASAAS_URL = 'https://www.asaas.com/api/v3';

// Simulação de banco de dados (Para real, use MongoDB)
let reservasConfirmadas = [];

app.post('/api/checkout', async (req, res) => {
    const { servico, tempo, data, hora, nome, email, documento } = req.body;

    // 1. Verificar Conflito (Simples)
    const conflito = reservasConfirmadas.find(r => r.data === data && r.hora === hora && r.servico === servico);
    if(conflito) return res.status(400).json({ error: "Horário já ocupado!" });

    const precos = { estacao: { '30': 10, '60': 18, '120': 30 }, reuniao: { '30': 50, '60': 90, '120': 150 } };
    const valor = precos[servico][tempo];

    try {
        const headers = { 'access_token': process.env.ASAAS_API_KEY, 'Content-Type': 'application/json' };

        // PASSO 1: Criar Cliente
        const cli = await axios.post(`${ASAAS_URL}/customers`, { name: nome, email, cpfCnpj: documento }, { headers });

        // PASSO 2: Criar Cobrança
        const pag = await axios.post(`${ASAAS_URL}/payments`, {
            customer: cli.data.id,
            billingType: 'PIX',
            value: valor,
            dueDate: new Date().toISOString().split('T')[0],
            description: `ŪNIKA: ${servico} (${data} ${hora})`,
            postalService: false
        }, { headers });

        // PASSO 3: QR Code
        const qr = await axios.get(`${ASAAS_URL}/payments/${pag.data.id}/pixQrCode`, { headers });

        // Salva na lista temporária (No MongoDB isso seria persistente)
        reservasConfirmadas.push({ servico, data, hora });

        res.json({ encodedImage: qr.data.encodedImage });

    } catch (e) {
        res.status(500).json({ error: "Erro no Asaas" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`ŪNIKA ONLINE PORTA ${PORT}`));
