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
        'https://sendlaw.moj.gov.tw/PublicData/GetFile.ashx?DType=XML&AuData=EFM',
        __dirname + '/source/'
    );

    const xml = await fsP.readFile('./source/Eng_FalVMingLing.xml', 'utf8');
    const match = xml.match(/UpdateDate="(\d{4})\/?(\d{1,2})\/?(\d{1,2})/);
    if(match[2].length !== 2) match[2] = '0' + match[2];
    if(match[3].length !== 2) match[3] = '0' + match[3];
    const newDate = match[1] + match[2] + match[3];
    process.stdout.write(`UpdateDate: ${newDate}\n`);

    let oldDate = '';
    try {
        oldDate = await fsP.readFile('./xml/UpdateDate.txt', 'utf-8');
    }
    catch(e) {}

    if(newDate > oldDate) {
        await downloadAndUnzip(
            'https://sendlaw.moj.gov.tw/PublicData/GetFile.ashx?DType=XML&AuData=CFM',
            __dirname + '/source/'
        );
    }
    else process.stdout.write('data not updated yet\n');

    fsP.unlink('./source/schema.csv');
    fsP.unlink('./source/manifest.csv');
}

if(module && module.parent) module.exports = main;
else main();
