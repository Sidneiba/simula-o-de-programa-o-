// spu-universe/engine.js
import readline from 'readline';
import { VirtualMemory } from './core/VirtualMemory.js';
import { LibraryManager } from './libs/LibraryManager.js';
import CrossLanguageBridge from './core/CrossLanguageBridge.js';
import BridgeBackupManager from './core/BridgeBackupManager.js';

class SPUEngine {
    constructor() {
        this.memory = new VirtualMemory();
        this.libraryManager = new LibraryManager();
        this.bridge = new CrossLanguageBridge();
        this.backupManager = new BridgeBackupManager(this.bridge);
        this.commands = new Map();
        this.setupBridgeCommands();
    }

    setupBridgeCommands() {
        this.commands.set('bridge-stats', this.bridgeStats.bind(this));
        this.commands.set('bridge-clear', this.bridgeClear.bind(this));
        this.commands.set('bridge-remove', this.bridgeRemove.bind(this));
        this.commands.set('bridge-save', this.bridgeSave.bind(this));
        this.commands.set('bridge-backup', this.bridgeBackup.bind(this));
        this.commands.set('bridge-restore', this.bridgeRestore.bind(this));
        this.commands.set('bridge-list-backups', this.bridgeListBackups.bind(this));
    }

    async runCommand(cmd) {
        console.log('🧠 Interpretando comando:', cmd);
        const [command, ...args] = cmd.trim().split(' ');

        try {
            switch (command) {
                case 'load':
                    const lib = args[0];
                    if (!lib) {
                        console.log('📝 Uso: load nome_da_biblioteca');
                        return;
                    }
                    await this.libraryManager.loadLibrary(lib);
                    console.log(`✅ Biblioteca '${lib}' carregada com sucesso`);
                    break;

                case 'status':
                    console.log(this.memory.status());
                    break;

                case 'simular':
                    await this.simular(args.join(' '));
                    break;

                default:
                    if (this.commands.has(command)) {
                        await this.commands.get(command)(args.join(' '));
                    } else {
                        console.log('⚙️ Comando não reconhecido:', cmd);
                    }
            }
        } catch (error) {
            console.error(`❌ Erro ao executar comando '${cmd}':`, error.message);
        }
    }

    async simular(code) {
        console.log('🔍 Simulando código:', code);
        const actions = this.parseCodeToActions(code);
        for (const action of actions) {
            await this.executeUniversalAction(action, action.lang || 'javascript');
        }
    }

    parseCodeToActions(code) {
        const lines = code.split('\n').map(line => line.trim()).filter(line => line);
        const actions = [];

        for (const line of lines) {
            if (line.startsWith('def ')) {
                const [_, name, params] = line.match(/def (\w+)\((.*?)\):/) || [];
                if (name) {
                    actions.push({
                        type: 'function_definition',
                        details: { name, params: params.split(',').map(p => p.trim()), function: name },
                        lang: 'python'
                    });
                }
            } else if (line.startsWith('return ')) {
                actions.push({
                    type: 'return',
                    details: { value: line.replace('return ', '').trim() },
                    lang: 'python'
                });
            } else if (line.includes('=')) {
                const [variable, value] = line.split('=').map(part => part.trim());
                actions.push({
                    type: 'assignment',
                    details: { variable, value },
                    lang: 'python'
                });
            } else if (line.includes('(')) {
                const [_, func, args] = line.match(/(\w+)\((.*?)\)/) || [];
                if (func) {
                    actions.push({
                        type: 'call',
                        details: { function: func, args: args.split(',').map(arg => arg.trim()) },
                        lang: 'javascript'
                    });
                }
            }
        }
        return actions;
    }

    async executeUniversalAction(action, lang) {
        try {
            switch (action.type) {
                case 'function_definition':
                    await this.bridge.registerFunction(action.details.name, {
                        lang,
                        params: action.details.params,
                        bodyActions: []
                    });
                    console.log(`✅ Função '${action.details.name}' registrada (${lang})`);
                    break;

                case 'assignment':
                    console.log(`   🔸 ATRIBUINDO: ${action.details.variable} = ${action.details.value}`);
                    this.memory.setVariable(action.details.variable, action.details.value);
                    break;

                case 'call':
                    console.log(`   🔸 EXECUTANDO: ${action.details.function}(${action.details.args.join(', ')})`);
                    const libName = action.details.function.split('.')[0];
                    const imports = this.libraryManager.getLoadedLibraries() || [];
                    
                    if (imports.includes(libName)) {
                        const lib = this.libraryManager.getLibrary(lang, libName);
                        const method = action.details.function.split('.')[1];
                        
                        if (lib && lib[method]) {
                            const result = await lib[method](...action.details.args);
                            console.log(`      📊 Resultado: ${JSON.stringify(result).slice(0, 100)}`);
                        }
                    } else if (this.bridge.hasFunction(action.details.function)) {
                        try {
                            const result = await this.bridge.callFunction(action.details.function, action.details.args);
                            console.log(`      🌉 Resultado Cross-Language: ${JSON.stringify(result)}`);
                        } catch (error) {
                            console.log(`      ⚠️ Erro no bridge: ${error.message}`);
                        }
                    } else if (action.details.function === 'print' || action.details.function === 'console.log') {
                        console.log(`      🖨️ SAÍDA: ${action.details.args[0]}`);
                    } else {
                        console.log(`      ⚠️ Função '${action.details.function}' não encontrada`);
                    }
                    break;

                case 'return':
                    console.log(`   🔸 RETORNANDO: ${action.details.value}`);
                    break;

                default:
                    console.log(`   🔸 Ação desconhecida: ${JSON.stringify(action)}`);
            }
        } catch (error) {
            console.error(`❌ Erro ao executar ação: ${error.message}`);
        }
    }

    async bridgeStats() {
        const stats = this.bridge.getStats();
        
        console.log('\n📊 ESTATÍSTICAS DO BRIDGE CROSS-LANGUAGE');
        console.log('='.repeat(50));
        console.log(`📚 Total de Funções: ${stats.totalFunctions}`);
        
        console.log('\n🌐 Por Linguagem:');
        for (const [lang, count] of Object.entries(stats.byLanguage)) {
            console.log(`   ${lang}: ${count} funções`);
        }
        
        console.log('\n🏆 Funções Mais Chamadas:');
        stats.mostCalled.slice(0, 5).forEach((func, index) => {
            console.log(`   ${index + 1}. ${func.name} (${func.lang}): ${func.calls} chamadas`);
        });
    }

    async bridgeClear() {
        console.log('⚠️ Tem certeza que deseja limpar TODAS as funções do bridge?');
        console.log('   Digite "CONFIRMAR" para prosseguir:');
        
        return new Promise((resolve) => {
            rl.question('> ', async (answer) => {
                if (answer === 'CONFIRMAR') {
                    try {
                        const count = await this.bridge.clearRegistry();
                        console.log(`✅ ${count} funções removidas do bridge`);
                    } catch (error) {
                        console.error('❌ Erro ao limpar o bridge:', error.message);
                    }
                } else {
                    console.log('❌ Operação cancelada');
                }
                resolve();
            });
        });
    }

    async bridgeRemove(funcName) {
        if (!funcName) {
            console.log('📝 Uso: bridge-remove nome_da_funcao');
            return;
        }
        
        const removed = await this.bridge.unregisterFunction(funcName);
        if (removed) {
            console.log(`✅ Função '${funcName}' removida do bridge`);
        } else {
            console.log(`❌ Função '${funcName}' não encontrada`);
        }
    }

    async bridgeSave() {
        await this.bridge.saveToStorage();
        console.log('✅ Estado do bridge salvo persistentemente');
    }

    async bridgeBackup(backupName) {
        const name = backupName || `manual_${Date.now()}`;
        await this.backupManager.createBackup(name);
    }

    async bridgeRestore(backupName) {
        if (!backupName) {
            console.log('📝 Uso: bridge-restore nome_do_backup');
            return;
        }
        
        await this.backupManager.restoreBackup(backupName);
    }

    async bridgeListBackups() {
        const backups = await this.backupManager.listBackups();
        
        console.log('\n💾 BACKUPS DISPONÍVEIS:');
        console.log('='.repeat(50));
        
        if (backups.length === 0) {
            console.log('   Nenhum backup encontrado');
            return;
        }
        
        backups.forEach((backup, index) => {
            console.log(`${index + 1}. ${backup.name}`);
            console.log(`   📅 ${backup.created.toLocaleString()}`);
            console.log(`   📊 ${Math.round(backup.size / 1024)} KB\n`);
        });
    }
}

// engine.js
import readline from 'readline';

// --- Classe principal ---
class SPUEngine {
    constructor() {
        console.log('🧠 SPUEngine inicializado');
        // ... (resto do construtor e métodos)
    }

    async runCommand(cmd) {
        console.log(`🔧 Executando comando: ${cmd}`);
        // ... (código do método)
    }
}

// --- Exportação da classe ---
export { SPUEngine };

// --- Interface de linha de comando (CLI) ---
const SPU = new SPUEngine();
console.log('🚀 SPU iniciado. Digite comandos para simular programação.');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function prompt() {
    rl.question('SPU> ', async (input) => {
        await SPU.runCommand(input);
        prompt();
    });
}

prompt();
