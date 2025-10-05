module.exports = {
    get: function(url) {
        console.log(`Simulação de GET para: ${url}`);
        return Promise.resolve({ status: 200, data: "Resposta simulada" });
    }
};
