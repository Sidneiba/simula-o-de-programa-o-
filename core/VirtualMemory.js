// spu-universe/core/VirtualMemory.js
class VirtualMemory {
    constructor() {
        this.memory = new Map();
    }

    status() {
        // Retorna o estado atual da memória virtual
        return {
            totalVariables: this.memory.size,
            variables: Array.from(this.memory.entries()).map(([key, value]) => ({ key, value }))
        };
    }

    setVariable(key, value) {
        this.memory.set(key, value);
    }

    getVariable(key) {
        return this.memory.get(key);
    }
}

export { VirtualMemory }; // Named export para compatibilidade com o import
