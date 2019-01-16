/**
 * 將小的 JSON 再合成巨大的檔案，就像最初的巨大 XML 檔一樣。
 * 不使用 Promise ，而改用原始的同步函式。
 */
const fs = require('fs');
const path = require('path');

const compressJsonFile = path =>
    JSON.stringify(JSON.parse(fs.readFileSync(path, 'utf8')))
;

const main = () =>
    ['json', 'json_arrange'].forEach(type => {
        ['FalVMingLing', 'Eng_FalVMingLing'].forEach(category => {
            const target = `${type}/${category}`;
            console.log(`Processing ${target}`);
            const fd = fs.openSync(`./${target}.json`, 'w');
            fs.writeSync(fd, '[');
            fs.readdirSync(`./${target}`).forEach((file, index) => {
                if(!(index % 100)) process.stdout.write('.');
                if(path.extname(file) !== '.json') return;
                if(index) fs.writeSync(fd, ',');
                fs.writeSync(fd, '\n');
                fs.writeSync(fd, compressJsonFile(`./${target}/${file}`));
            });
            fs.writeSync(fd, '\n]\n');
            fs.closeSync(fd);
            process.stdout.write('\n');
        });

        const target = `${type}/HisMingLing`;
        console.log(`Processing ${target}`);
        const files = fs
            .readdirSync(`./${target}`, {withFileTypes: true})
            .filter(dirent => dirent.isDirectory())
            .map(dirent => {
                const pcode = dirent.name;
                return fs
                    .readdirSync(`./${target}/${pcode}`)
                    .filter(file => path.extname(file) === '.json')
                    .map(file => `./${target}/${pcode}/${file}`)
                ;
            })
            .reduce((acc, cur) => acc.concat(cur), [])
        ;
        const fd = fs.openSync(`./${target}.json`, 'w');
        fs.writeSync(fd, '[');
        files.forEach((filePath, index) => {
            if(!(index % 100)) process.stdout.write('.');
            if(index) fs.writeSync(fd, ',');
            fs.writeSync(fd, '\n');
            fs.writeSync(fd, compressJsonFile(filePath));
        });
        fs.writeSync(fd, '\n]\n');
        fs.closeSync(fd);
        process.stdout.write('\n');
    })
;

if(module && module.parent) module.exports = main;
else main();
