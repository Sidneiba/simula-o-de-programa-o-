const SimulatedProgrammingUniverse = require('./engine');

async function main() {
    try {
        const spu = new SimulatedProgrammingUniverse();
        await spu.init();
    } catch (error) {
        console.error('💥 FALHA CRÍTICA NO UNIVERSO:', error);
        process.exit(1);
    }
}

main();
