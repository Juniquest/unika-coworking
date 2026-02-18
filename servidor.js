const express = require('express');
const axios = require('axios');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let doorStatus = "FECHADO";
app.get('/api/door-status', (req, res) => {
    res.send(doorStatus);
    if (doorStatus === "ABRIR") doorStatus = "FECHADO"; 
});

app.post('/api/checkout', async (req, res) => {
    try {
        // 1. Criar a cobrança
        const response = await axios.post('https://www.asaas.com/api/v3/payments', {
            customer: '161081306', // ID do seu cliente conforme image_cbcdb4.png
            billingType: 'PIX',
            value: 20.00,
            dueDate: new Date().toISOString().split('T')[0]
        }, { 
            headers: { 'access_token': process.env.ASAAS_API_KEY } 
        });
        
        // 2. Buscar o QR Code (Essencial para o index.html funcionar)
        const qrCodeResponse = await axios.get(`https://www.asaas.com/api/v3/payments/${response.data.id}/pixQrCode`, {
            headers: { 'access_token': process.env.ASAAS_API_KEY }
        });
        
        // CORREÇÃO: Envia exatamente o que o seu script no index.html procura
        res.json({ encodedImage: qrCodeResponse.data.encodedImage });

    } catch (error) {
        // Log para você ver o erro real no painel do Render (aba Logs)
        console.error('Erro na API Asaas:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Erro ao gerar PIX' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
