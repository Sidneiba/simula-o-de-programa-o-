// spu-universe/core/BridgeBackupManager.js
const fs = require('fs').promises;
const path = require('path');

class BridgeBackupManager {
    constructor(bridgeInstance, backupPath = './spu-backups') {
        this.bridge = bridgeInstance;
        this.backupPath = backupPath;
    }

    async createBackup(backupName = `backup_${Date.now()}`) {
        try {
            const backupDir = path.join(this.backupPath, backupName);
            await fs.mkdir(backupDir, { recursive: true });
            
            const backupFile = path.join(backupDir, 'bridge-registry.json');
            await this.bridge.saveToStorage();
            
            await fs.copyFile(this.bridge.storageFile, backupFile);
            
            console.log(`💾 Backup criado: ${backupName}`);
            return backupFile;
        } catch (error) {
            console.error('💥 Erro no backup:', error.message);
        }
    }

    async listBackups() {
        try {
            const items = await fs.readdir(this.backupPath);
            const backups = [];
            
            for (const item of items) {
                const itemPath = path.join(this.backupPath, item);
                const stat = await fs.stat(itemPath);
                
                if (stat.isDirectory()) {
                    const backupFile = path.join(itemPath, 'bridge-registry.json');
                    try {
                        await fs.access(backupFile);
                        backups.push({
                            name: item,
                            path: itemPath,
                            created: stat.birthtime,
                            size: stat.size
                        });
                    } catch {
                        // Não é um backup válido
                    }
                }
            }
            
            return backups.sort((a, b) => b.created - a.created);
        } catch (error) {
            return [];
        }
    }

    async restoreBackup(backupName) {
        try {
            const backupFile = path.join(this.backupPath, backupName, 'bridge-registry.json');
            await fs.access(backupFile);
            
            await fs.copyFile(backupFile, this.bridge.storageFile);
            
            await this.bridge.loadFromStorage();
            
            console.log(`🔄 Backup '${backupName}' restaurado com sucesso!`);
            return true;
        } catch (error) {
            console.error('💥 Erro ao restaurar backup:', error.message);
            return false;
        }
    }
}

module.exports = BridgeBackupManager;
