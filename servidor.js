const express = require('express');
const axios = require('axios');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static('public'));

// Rota para o ESP32 checar se a porta deve abrir
let doorStatus = "FECHADO";

app.get('/api/door-status', (req, res) => {
    res.send(doorStatus);
    if (doorStatus === "ABRIR") doorStatus = "FECHADO"; // Reseta após ler
});

app.post('/api/checkout', async (req, res) => {
    try {
        const response = await axios.post('https://www.asaas.com/api/v3/payments', {
            customer: 'cus_000000000000', // Você criará um cliente padrão depois
            billingType: 'PIX',
            value: 20.00,
            dueDate: new Date().toISOString().split('T')[0]
        }, { headers: { 'access_token': process.env.ASAAS_API_KEY } });
        
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar PIX' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
