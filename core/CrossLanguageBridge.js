// spu-universe/core/CrossLanguageBridge.js
import { promises as fs } from 'fs';
import path from 'path';

class CrossLanguageBridge {
    constructor(storagePath = './spu-bridge-storage') {
        this.registeredFunctions = new Map();
        this.storagePath = storagePath;
        this.storageFile = path.join(storagePath, 'bridge-registry.json');
        this.init();
    }

    async init() {
        try {
            await fs.mkdir(this.storagePath, { recursive: true });
            await this.loadFromStorage();
            console.log('🌉 Bridge: Sistema de persistência inicializado');
        } catch (error) {
            console.log('💡 Bridge: Criando novo armazenamento...');
        }
    }

    async loadFromStorage() {
        try {
            const data = await fs.readFile(this.storageFile, 'utf8');
            const registry = JSON.parse(data);
            
            for (const [name, funcData] of Object.entries(registry)) {
                this.registeredFunctions.set(name, {
                    ...funcData,
                    timestamp: funcData.timestamp || Date.now()
                });
            }
            
            console.log(`📂 Bridge: ${this.registeredFunctions.size} funções carregadas do armazenamento`);
        } catch (error) {
            this.registeredFunctions.clear();
        }
    }

    async saveToStorage() {
        try {
            const registry = {};
            for (const [name, funcData] of this.registeredFunctions.entries()) {
                registry[name] = {
                    ...funcData,
                    bodyActions: funcData.bodyActions || []
                };
            }
            
            await fs.writeFile(this.storageFile, JSON.stringify(registry, null, 2));
            console.log(`💾 Bridge: ${this.registeredFunctions.size} funções salvas`);
        } catch (error) {
            console.error('💥 Bridge: Erro ao salvar registro:', error.message);
        }
    }

    async registerFunction(name, funcLogic) {
        this.registeredFunctions.set(name, {
            ...funcLogic,
            timestamp: Date.now(),
            callCount: 0
        });
        
        console.log(`🌉 Bridge: Função '${name}' registrada [${funcLogic.lang}]`);
        await this.saveToStorage();
        return true;
    }

    listFunctions() {
        const list = [];
        for (const [name, data] of this.registeredFunctions.entries()) {
            list.push({ 
                name, 
                lang: data.lang, 
                params: data.params.join(', '),
                callCount: data.callCount || 0,
                lastCalled: data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'Nunca'
            });
        }
        return list;
    }

    async unregisterFunction(name) {
        if (this.registeredFunctions.has(name)) {
            this.registeredFunctions.delete(name);
            console.log(`🗑️ Bridge: Função '${name}' removida`);
            await this.saveToStorage();
            return true;
        }
        return false;
    }

    async clearRegistry() {
        const count = this.registeredFunctions.size;
        this.registeredFunctions.clear();
        await this.saveToStorage();
        console.log(`🧹 Bridge: ${count} funções removidas`);
        return count;
    }

    hasFunction(name) {
        return this.registeredFunctions.has(name);
    }

    async callFunction(name, args = []) {
        if (!this.hasFunction(name)) {
            throw new Error(`Função '${name}' não encontrada no bridge.`);
        }

        const func = this.registeredFunctions.get(name);
        
        func.callCount = (func.callCount || 0) + 1;
        func.timestamp = Date.now();
        await this.saveToStorage();

        console.log(`🚀 Chamando '${name}' (${func.lang}) com args: [${args.join(', ')}]`);
        console.log(`   📊 Estatística: ${func.callCount} chamadas`);

        const result = await this.simulateFunctionExecution(func, args);
        console.log(`   ↩️ Retorno simulado (${func.lang}):`, result);
        return result;
    }

    async simulateFunctionExecution(func, args) {
        const actions = func.bodyActions || [];
        let lastValue = null;

        console.log(`   📝 Executando ${actions.length} ações em ${func.lang}:`);
        
        for (const action of actions) {
            switch (action.type) {
                case 'assignment':
                    console.log(`     → ${action.details.variable} = ${action.details.value}`);
                    if (action.details.value.includes('+') && args.length >= 2) {
                        lastValue = parseFloat(args[0]) + parseFloat(args[1]);
                    }
                    break;
                    
                case 'call':
                    console.log(`     → ${action.details.function}(${action.details.args.join(', ')})`);
                    if (action.details.function.includes('print') || action.details.function.includes('console.log')) {
                        lastValue = `Output: ${args.join(', ')}`;
                    }
                    break;
                    
                case 'return':
                    lastValue = this.evaluateReturnValue(action.details.value, args, func.lang);
                    console.log(`     → return ${lastValue}`);
                    break;
                    
                default:
                    console.log(`     → ${action.details.code}`);
            }
        }

        return this.mockReturnValue(func.lang, lastValue, args);
    }

    evaluateReturnValue(returnExpr, args, lang) {
        if (returnExpr === 'a + b' && args.length >= 2) {
            return parseFloat(args[0]) + parseFloat(args[1]);
        }
        if (returnExpr === 'a * b' && args.length >= 2) {
            return parseFloat(args[0]) * parseFloat(args[1]);
        }
        if (returnExpr.includes('args')) {
            return args.join(', ');
        }
        return returnExpr || `result_${lang}_${Date.now()}`;
    }

    mockReturnValue(lang, lastValue, args) {
        const baseResult = {
            value: lastValue || `result_${lang}_${Date.now()}`,
            simulated: true,
            language: lang,
            timestamp: new Date().toISOString(),
            args_received: args
        };

        if (lang === 'python') {
            return {
                ...baseResult,
                type: 'python_result',
                representation: `{${args.join(' + ')}} → ${baseResult.value}`
            };
        }

        if (lang === 'javascript') {
            return {
                ...baseResult,
                type: 'js_result', 
                representation: `function(${args.join(', ')}) → ${baseResult.value}`
            };
        }

        return baseResult;
    }

    getStats() {
        const stats = {
            totalFunctions: this.registeredFunctions.size,
            byLanguage: {},
            mostCalled: [],
            recentFunctions: []
        };

        for (const [name, data] of this.registeredFunctions.entries()) {
            stats.byLanguage[data.lang] = (stats.byLanguage[data.lang] || 0) + 1;
            
            stats.mostCalled.push({
                name,
                calls: data.callCount || 0,
                lang: data.lang
            });

            stats.recentFunctions.push({
                name,
                timestamp: data.timestamp,
                lang: data.lang
            });
        }

        stats.mostCalled.sort((a, b) => b.calls - a.calls);
        stats.recentFunctions.sort((a, b) => b.timestamp - a.timestamp);
        
        return stats;
    }
}

export default CrossLanguageBridge;
