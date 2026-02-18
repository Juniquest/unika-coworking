const express = require('express');
const axios = require('axios');
const app = express();
const path = require('path');

app.use(express.json());

// IMPORTANTE: Faz o servidor achar os arquivos na mesma pasta
app.use(express.static(__dirname));

// IMPORTANTE: Rota que abre o site principal
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
        const response = await axios.post('https://www.asaas.com/api/v3/payments', {
            customer: 'cus_161081306', // ID do cliente que vimos na sua tela
            billingType: 'PIX',
            value: 20.00,
            dueDate: new Date().toISOString().split('T')[0]
        }, { 
            headers: { 'access_token': process.env.ASAAS_API_KEY } 
        });
        
        const qrCodeResponse = await axios.get(`https://www.asaas.com/api/v3/payments/${response.data.id}/pixQrCode`, {
            headers: { 'access_token': process.env.ASAAS_API_KEY }
        });
        
        res.json(qrCodeResponse.data);
    } catch (error) {
        console.error('Erro no Asaas:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Erro ao gerar PIX' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
