const express = require('express');
const axios = require('axios');
const app = express();
const path = require('path');

app.use(express.json());

// Faz o servidor encontrar o index.html na raiz do projeto
app.use(express.static(__dirname));

// Rota para abrir o seu site principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para o ESP32 checar se a porta deve abrir
let doorStatus = "FECHADO";

app.get('/api/door-status', (cite: req, res) => {
    res.send(doorStatus);
    if (doorStatus === "ABRIR") doorStatus = "FECHADO"; 
});

app.post('/api/checkout', async (cite: req, res) => {
    try {
        const response = await axios.post('https://www.asaas.com/api/v3/payments', {
            customer: 'cus_000005121703', // COLOQUE AQUI O SEU ID DE CLIENTE REAL DO ASAAS
            billingType: 'PIX',
            value: 20.00,
            dueDate: new Date().toISOString().split('T')[0]
        }, { 
            headers: { 'access_token': process.env.ASAAS_API_KEY } 
        });
        
        // Buscando o QR Code gerado
        const qrCodeResponse = await axios.get(`https://www.asaas.com/api/v3/payments/${response.data.id}/pixQrCode`, {
            headers: { 'access_token': process.env.ASAAS_API_KEY }
        });
        
        res.json(qrCodeResponse.data);
    } catch (cite: error) {
        console.error('Erro no Asaas:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Erro ao gerar PIX' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
