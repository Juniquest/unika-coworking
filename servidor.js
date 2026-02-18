const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const ASAAS_URL = 'https://www.asaas.com/api/v3';

// Rota de Checkout corrigida
app.post('/api/checkout', async (req, res) => {
    const { servico, tempo, nome } = req.body;
    
    // Tabela de preços interna para segurança
    const precos = {
        estacao: { '30': 10.00, '60': 18.00, '120': 30.00 },
        reuniao: { '30': 50.00, '60': 90.00, '120': 150.00 },
        banheiro: 5.00
    };

    let valor = servico === 'banheiro' ? precos.banheiro : precos[servico][tempo];

    try {
        const headers = { 'access_token': process.env.ASAAS_API_KEY };

        // PASSO 1: Criar um cliente temporário para esta venda
        const clienteResponse = await axios.post(`${ASAAS_URL}/customers`, {
            name: nome || "Cliente Unika",
            notificationDisabled: true
        }, { headers });

        const customerId = clienteResponse.data.id;

        // PASSO 2: Gerar a cobrança PIX
        const cobrancaResponse = await axios.post(`${ASAAS_URL}/payments`, {
            customer: customerId,
            billingType: 'PIX',
            value: valor,
            dueDate: new Date().toISOString().split('T')[0],
            description: `UNIKA: ${servico}`
        }, { headers });

        // PASSO 3: Pegar a imagem do QR Code
        const qrCodeResponse = await axios.get(`${ASAAS_URL}/payments/${cobrancaResponse.data.id}/pixQrCode`, { headers });

        res.json({ encodedImage: qrCodeResponse.data.encodedImage });
    } catch (error) {
        console.error('Erro Detalhado:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Erro ao processar pagamento' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
