'use strict';
const fsP = require('fs').promises;
const https = require('https');
const unzipper = require('unzipper');

async function downloadAndUnzip(url) {
    return new Promise((resolve, reject) => {
        const extractor = unzipper.Extract({path: __dirname + '/source/'});
        extractor.on('close', resolve);

        const request = https.get(url, res => {
            if(res.statusCode != 200) reject(res.statusMessage);
            process.stdout.write(`Downloading ${url}\n`);

            let counter = 0;
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
    const sendlaw = downloadAndUnzip(
        'https://sendlaw.moj.gov.tw/PublicData/GetFile.ashx?DType=XML&AuData=EFM'
    ).then(async () => {
        const xml = (await fsP.readFile('./source/Eng_FalVMingLing.xml', 'utf8')).substring(0, 127);
        const match = xml.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
        if(match[2].length !== 2) match[2] = '0' + match[2];
        if(match[3].length !== 2) match[3] = '0' + match[3];
        const newDate = match[1] + match[2] + match[3];
        console.log(`UpdateDate: ${newDate}`);

        let oldDate = '';
        try {
            oldDate = await fsP.readFile('./xml/UpdateDate.txt', 'utf-8');
        }
        catch(e) {}

        let runBat = await fsP.readFile('./run.bat', 'utf8');
        if(newDate > oldDate) {
            await downloadAndUnzip(
                'https://sendlaw.moj.gov.tw/PublicData/GetFile.ashx?DType=XML&AuData=CFM'
            );
            runBat = runBat.replace(/\d{8}/g, newDate).replace(/^exit\r?\n?\r?/, '');
            await fsP.writeFile('./run.bat', runBat, 'utf8');
        }
        else {
            if(!runBat.startsWith('exit')) {
                runBat = "exit\n" + runBat;
                await fsP.writeFile('./run.bat', runBat, 'utf8');
            }
            console.log('sendlaw data not updated yet');
        }
    });

    const swagger = downloadAndUnzip('https://law.moj.gov.tw/api/Ch/Law/JSON')
    .then(async () => {
        const json = (await fsP.readFile('./source/ChLaw.json', 'utf8')).substring(0, 63);
        const match = json.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
        if(match[2].length !== 2) match[2] = '0' + match[2];
        if(match[3].length !== 2) match[3] = '0' + match[3];
        const newDate = match[1] + match[2] + match[3];
        console.log(`UpdateDate: ${newDate}`);

        let oldDate = '';
        try {
            oldDate = await fsP.readFile('./json_split/UpdateDate.txt', 'utf-8');
        }
        catch(e) {}

        if(newDate > oldDate) {
            await downloadAndUnzip('https://law.moj.gov.tw/api/Ch/Order/JSON');
            await downloadAndUnzip('https://law.moj.gov.tw/api/En/Law/JSON');
            await downloadAndUnzip('https://law.moj.gov.tw/api/En/Order/JSON');
        }
        else console.log('swagger data not updated yet');
    });

    await Promise.allSettled([sendlaw, swagger]);
    fsP.unlink('./source/schema.csv');
    fsP.unlink('./source/manifest.csv');
}

if(module && module.parent) module.exports = main;
else main();
