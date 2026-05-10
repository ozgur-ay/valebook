const { exec } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * GitHub üzerinden güncelleme kontrolü ve yükleme modülü.
 */

const REPO = 'ozgur-ay/valebook'; // Kullanıcının reposu buraya gelecek

async function checkUpdate(currentVersion) {
    return new Promise((resolve, reject) => {
        // GitHub API ile raw package.json çekerek versiyon kontrolü
        https.get(`https://raw.githubusercontent.com/${REPO}/main/package.json`, (res) => {
            let data = '';

            if (res.statusCode !== 200) {
                return reject(new Error('Güncelleme kontrolü başarısız: HTTP ' + res.statusCode));
            }

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const remotePkg = JSON.parse(data);
                    const isNewer = compareVersions(remotePkg.version, currentVersion);
                    resolve({
                        hasUpdate: isNewer,
                        latestVersion: remotePkg.version,
                        notes: 'Yeni sürüm mevcut. Daha fazla özellik ve kararlılık iyileştirmesi içeriyor.'
                    });
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

function compareVersions(remote, local) {
    const rParts = remote.split('.').map(Number);
    const lParts = local.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
        if (rParts[i] > lParts[i]) return true;
        if (rParts[i] < lParts[i]) return false;
    }
    return false;
}

async function installUpdate() {
    return new Promise((resolve, reject) => {
        // Git pull ve npm install çalıştır
        exec('git pull && npm install', (error, stdout, stderr) => {
            if (error) {
                console.error(`Update error: ${error}`);
                return reject(error);
            }
            resolve({ stdout, stderr });
        });
    });
}

module.exports = { checkUpdate, installUpdate };
