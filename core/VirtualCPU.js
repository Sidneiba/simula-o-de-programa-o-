class VirtualCPU {
    constructor() {
        this.cycles = 0;
    }

    executeCycle(op) {
        this.cycles++;
        console.log(`⚙️ Executando operação ${op} | Ciclo #${this.cycles}`);
    }
}

module.exports = VirtualCPU;
