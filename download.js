'use strict';
const fsP = require('fs').promises;
const https = require('https');
const unzipper = require('unzipper');

async function downloadAndUnzip(url, absPath) {
    return new Promise((resolve, reject) => {
        const extractor = unzipper.Extract({path: absPath});
        extractor.on('close', resolve);

        let counter = 0;
        const request = https.get(url, res => {
            if(res.statusCode != 200) reject(res.statusMessage);
            process.stdout.write('File downloading');
            res.on('data', () => {
                if(++counter % 512 === 0) process.stdout.write('.');
            });
            res.on('close', () => process.stdout.write('\n'));
            res.pipe(extractor);
        });
        request.on('error', reject);
        request.end();
    });
}

async function main() {
    await downloadAndUnzip(
        'https://sendlaw.moj.gov.tw/PublicData/GetFile.ashx?DType=XML&AuData=CFM',
        __dirname + '/source/'
    );
    await downloadAndUnzip(
        'https://sendlaw.moj.gov.tw/PublicData/GetFile.ashx?DType=XML&AuData=EFM',
        __dirname + '/source/'
    );
    await fsP.unlink('./source/schema.csv');
    await fsP.unlink('./source/manifest.csv');
}

main();
