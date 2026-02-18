const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const ASAAS_URL = 'https://www.asaas.com/api/v3';

app.post('/api/checkout', async (req, res) => {
    const { servico, tempo, nome } = req.body;
    const precos = {
        estacao: { '30': 10.00, '60': 18.00, '120': 30.00 },
        reuniao: { '30': 50.00, '60': 90.00, '120': 150.00 },
        banheiro: 5.00
    };

    const valorFinal = servico === 'banheiro' ? precos.banheiro : precos[servico][tempo];

    try {
        const headers = { 
            'access_token': process.env.ASAAS_API_KEY,
            'Content-Type': 'application/json'
        };

        // PASSO 1: Criar o Cliente (CPF NÃO OBRIGATÓRIO AQUI)
        const clienteResponse = await axios.post(`${ASAAS_URL}/customers`, {
            name: nome || "Cliente Unika",
        }, { headers });

        const customerId = clienteResponse.data.id;

        // PASSO 2: Criar a Cobrança PIX
        const cobrancaResponse = await axios.post(`${ASAAS_URL}/payments`, {
            customer: customerId,
            billingType: 'PIX',
            value: valorFinal,
            dueDate: new Date().toISOString().split('T')[0],
            description: `Acesso Unika: ${servico}`,
            // ESTA LINHA ABAIXO É A CHAVE:
            postalService: false 
        }, { headers });

        const qrCodeResponse = await axios.get(`${ASAAS_URL}/payments/${cobrancaResponse.data.id}/pixQrCode`, { headers });

        res.json({ 
            encodedImage: qrCodeResponse.data.encodedImage,
            payload: qrCodeResponse.data.payload 
        });

    } catch (error) {
        // Log para você ver no Render se ainda der erro
        console.error('Erro detalhado:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Falha ao gerar PIX' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
