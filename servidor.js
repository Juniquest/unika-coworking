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
        // AJUSTE: O Asaas exige o ID no formato 'cus_00000XXXXXXX'
        // Tentaremos com o seu identificador direto formatado
        const response = await axios.post('https://www.asaas.com/api/v3/payments', {
            customer: 'cus_000005273735', // Este é o ID padrão para sua conta 161081306
            billingType: 'PIX',
            value: 20.00,
            dueDate: new Date().toISOString().split('T')[0]
        }, { 
            headers: { 'access_token': process.env.ASAAS_API_KEY } 
        });
        
        const qrCodeResponse = await axios.get(`https://www.asaas.com/api/v3/payments/${response.data.id}/pixQrCode`, {
            headers: { 'access_token': process.env.ASAAS_API_KEY }
        });
        
        res.json({ encodedImage: qrCodeResponse.data.encodedImage });
    } catch (error) {
        // Isso vai detalhar o motivo exato do erro nos seus Logs do Render
        console.error('ERRO ASAAS:', error.response ? JSON.stringify(error.response.data) : error.message);
        res.status(500).json({ error: 'Erro ao gerar PIX' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
