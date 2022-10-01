const https = require('https');
const unzipper = require('unzipper');

module.exports = function(url, path) {
    return new Promise((resolve, reject) => {
        const extractor = unzipper.Extract({path});
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
