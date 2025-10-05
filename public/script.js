async function runCommand() {
    const command = document.getElementById('command').value;
    const outputDiv = document.getElementById('output');
    outputDiv.innerText = 'Executando...';

    try {
        const response = await fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        const result = await response.json();
        if (result.status === 'success') {
            outputDiv.innerText = result.output || 'Comando executado. Verifique o console do servidor para detalhes.';
        } else {
            outputDiv.innerText = `Erro: ${result.message}`;
        }
    } catch (error) {
        outputDiv.innerText = `Erro: ${error.message}`;
    }
}
