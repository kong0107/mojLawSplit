const fs = require('fs');
const https = require('https');
const zlib = require('node:zlib');

module.exports = function(url, path) {
    return (new Promise((resolve, reject) => {
        const file = fs.createWriteStream(path);
        const request = https.get(url, res => {
            if(res.statusCode != 200) reject(res.statusMessage);
            process.stdout.write(`Downloading ${url}\n`);

            let counter = 0;
            res.on('data', () => {
                if(++counter % 256 === 0) process.stdout.write('.');
            });
            res.on('close', () => {
                process.stdout.write('\n');
                resolve(path);
            });
            res.pipe(file);
        });
        request.on('error', reject);
        request.end();
    })).then(fs.promises.readFile)
    .then(zipContent => {
        const
            compressedSize = zipContent.readUInt32LE(18),
            fileNameLength = zipContent.readUInt16LE(26),
            extraFieldLength = zipContent.readUInt16LE(28),
            start = 30 + fileNameLength + extraFieldLength,
            fileName = zipContent.toString('utf8', 30, 30 + fileNameLength),
            deflated = zipContent.subarray(start, start + compressedSize),
            inflated = zlib.inflateRawSync(deflated)
        ;
        return fs.promises.writeFile('./source/' + fileName, inflated);
    });
}
