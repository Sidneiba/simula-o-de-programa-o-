import express from 'express';
import { SPUEngine } from './engine.js';
import bodyParser from 'body-parser';

const app = express();
const port = 3000;
const spu = new SPUEngine();

app.use(express.static('public')); // Servir arquivos HTML/CSS/JS
app.use(bodyParser.json());

// Endpoint para executar comandos
app.post('/api/run', async (req, res) => {
    const { command } = req.body;
    try {
        await spu.runCommand(command);
        res.json({ status: 'success', output: 'Comando executado. Verifique o console do servidor para detalhes.' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.listen(port, () => {
    console.log(`🌐 Servidor web rodando em http://localhost:${port}`);
});
