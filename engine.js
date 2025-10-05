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
        this.output = []; // Para capturar saídas
        this.setupBridgeCommands();
    }

    // Método para adicionar saída
    log(message) {
        this.output.push(message);
    }

    // Método para obter e limpar saídas
    getOutput() {
        const output = this.output.join('\n');
        this.output = [];
        return output;
    }

    setupBridgeCommands() {
        this.commands.set('bridge-stats', this.bridgeStats.bind(this));
        this.commands.set('bridge-clear', this.bridgeClear.bind(this));
        this.commands.set('bridge-remove', this.bridgeRemove.bind(this));
        this.commands.set('bridge-save', this.bridgeSave.bind(this));
        this.commands.set('bridge-backup', this.bridgeBackup.bind(this));
        this.commands.set('bridge-restore', this.bridgeRestore.bind(this));
        this.commands.set('bridge-list-backups', this.bridgeListBackups.bind(this));
        this.commands.set('help', this.showHelp.bind(this)); // Adicionando comando help
    }

    async runCommand(cmd) {
        this.log('🧠 Interpretando comando: ' + cmd);
        const [command, ...args] = cmd.trim().split(' ');

        try {
            switch (command) {
                case 'load':
                    const lib = args[0];
                    if (!lib) {
                        this.log('📝 Uso: load nome_da_biblioteca');
                        return;
                    }
                    await this.libraryManager.loadLibrary(lib);
                    this.log(`✅ Biblioteca '${lib}' carregada com sucesso`);
                    break;

                case 'status':
                    this.log(this.memory.status());
                    break;

                case 'simular':
                    await this.simular(args.join(' '));
                    break;

                case 'run-file':
                    if (!args[0]) {
                        this.log('📝 Uso: run-file <caminho_do_arquivo>');
                        return;
                    }
                    const fs = await import('fs/promises');
                    const code = await fs.readFile(args[0], 'utf-8');
                    await this.simular(code);
                    this.log(`✅ Arquivo '${args[0]}' simulado com sucesso`);
                    break;

                case 'help':
                    this.showHelp();
                    break;

                default:
                    if (this.commands.has(command)) {
                        await this.commands.get(command)(args.join(' '));
                    } else {
                        this.log('⚙️ Comando não reconhecido: ' + cmd);
                        this.log('Digite "help" para ver os comandos disponíveis.');
                    }
            }
        } catch (error) {
            this.log(`❌ Erro ao executar comando '${cmd}': ${error.message}`);
        }
    }

    async simular(code) {
        this.log('🔍 Simulando código: ' + code);
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
                    this.log(`✅ Função '${action.details.name}' registrada (${lang})`);
                    break;

                case 'assignment':
                    this.log(`   🔸 ATRIBUINDO: ${action.details.variable} = ${action.details.value}`);
                    this.memory.setVariable(action.details.variable, action.details.value);
                    break;

                case 'call':
                    this.log(`   🔸 EXECUTANDO: ${action.details.function}(${action.details.args.join(', ')})`);
                    const libName = action.details.function.split('.')[0];
                    const imports = this.libraryManager.getLoadedLibraries() || [];
                    
                    if (imports.includes(libName)) {
                        const lib = this.libraryManager.getLibrary(lang, libName);
                        const method = action.details.function.split('.')[1];
                        
                        if (lib && lib[method]) {
                            const result = await lib[method](...action.details.args);
                            this.log(`      📊 Resultado: ${JSON.stringify(result).slice(0, 100)}`);
                        }
                    } else if (this.bridge.hasFunction(action.details.function)) {
                        try {
                            const result = await this.bridge.callFunction(action.details.function, action.details.args);
                            this.log(`      🌉 Resultado Cross-Language: ${JSON.stringify(result)}`);
                        } catch (error) {
                            this.log(`      ⚠️ Erro no bridge: ${error.message}`);
                        }
                    } else if (action.details.function === 'print' || action.details.function === 'console.log') {
                        this.log(`      🖨️ SAÍDA: ${action.details.args[0]}`);
                    } else {
                        this.log(`      ⚠️ Função '${action.details.function}' não encontrada`);
                    }
                    break;

                case 'return':
                    this.log(`   🔸 RETORNANDO: ${action.details.value}`);
                    break;

                default:
                    this.log(`   🔸 Ação desconhecida: ${JSON.stringify(action)}`);
            }
        } catch (error) {
            this.log(`❌ Erro ao executar ação: ${error.message}`);
        }
    }

    async bridgeStats() {
        const stats = this.bridge.getStats();
        this.log('\n📊 ESTATÍSTICAS DO BRIDGE CROSS-LANGUAGE');
        this.log('='.repeat(50));
        this.log(`📚 Total de Funções: ${stats.totalFunctions}`);
        this.log('\n🌐 Por Linguagem:');
        for (const [lang, count] of Object.entries(stats.byLanguage)) {
            this.log(`   ${lang}: ${count} funções`);
        }
        this.log('\n🏆 Funções Mais Chamadas:');
        stats.mostCalled.slice(0, 5).forEach((func, index) => {
            this.log(`   ${index + 1}. ${func.name} (${func.lang}): ${func.calls} chamadas`);
        });
    }

    async bridgeClear() {
        this.log('⚠️ Tem certeza que deseja limpar TODAS as funções do bridge?');
        this.log('   Digite "CONFIRMAR" para prosseguir:');
        
        return new Promise((resolve) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.question('> ', async (answer) => {
                if (answer === 'CONFIRMAR') {
                    try {
                        const count = await this.bridge.clearRegistry();
                        this.log(`✅ ${count} funções removidas do bridge`);
                    } catch (error) {
                        this.log('❌ Erro ao limpar o bridge: ' + error.message);
                    }
                } else {
                    this.log('❌ Operação cancelada');
                }
                rl.close();
                resolve();
            });
        });
    }

    async bridgeRemove(funcName) {
        if (!funcName) {
            this.log('📝 Uso: bridge-remove nome_da_funcao');
            return;
        }
        
        const removed = await this.bridge.unregisterFunction(funcName);
        if (removed) {
            this.log(`✅ Função '${funcName}' removida do bridge`);
        } else {
            this.log(`❌ Função '${funcName}' não encontrada`);
        }
    }

    async bridgeSave() {
        await this.bridge.saveToStorage();
        this.log('✅ Estado do bridge salvo persistentemente');
    }

    async bridgeBackup(backupName) {
        const name = backupName || `manual_${Date.now()}`;
        await this.backupManager.createBackup(name);
        this.log(`✅ Backup '${name}' criado com sucesso`);
    }

    async bridgeRestore(backupName) {
        if (!backupName) {
            this.log('📝 Uso: bridge-restore nome_do_backup');
            return;
        }
        
        await this.backupManager.restoreBackup(backupName);
        this.log(`✅ Backup '${backupName}' restaurado com sucesso`);
    }

    async bridgeListBackups() {
        const backups = await this.backupManager.listBackups();
        this.log('\n💾 BACKUPS DISPONÍVEIS:');
        this.log('='.repeat(50));
        
        if (backups.length === 0) {
            this.log('   Nenhum backup encontrado');
            return;
        }
        
        backups.forEach((backup, index) => {
            this.log(`${index + 1}. ${backup.name}`);
            this.log(`   📅 ${backup.created.toLocaleString()}`);
            this.log(`   📊 ${Math.round(backup.size / 1024)} KB\n`);
        });
    }

    showHelp() {
        this.log(`
📖 Comandos disponíveis no SPU:
==============================
load <biblioteca>         - Carrega uma biblioteca para uso no simulador
status                   - Exibe o estado da memória virtual
simular <código>         - Simula a execução de um trecho de código
run-file <arquivo>       - Simula um arquivo de código
bridge-stats             - Mostra estatísticas do CrossLanguageBridge
bridge-clear             - Limpa todas as funções do bridge (requer confirmação)
bridge-remove <função>   - Remove uma função específica do bridge
bridge-save              - Salva o estado do bridge
bridge-backup [nome]     - Cria um backup do estado do bridge
bridge-restore <nome>    - Restaura um backup do bridge
bridge-list-backups      - Lista todos os backups disponíveis
help                     - Mostra esta ajuda
==============================
        `);
    }
}

export { SPUEngine };
