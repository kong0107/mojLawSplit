const fsP = require('node:fs').promises;
const zlib = require('node:zlib');

fsP.readFile('./source/ChLaw.zip')
.then(buffer => {
    const
        compressedSize = buffer.readUInt32LE(18),
        fileNameLength = buffer.readUInt16LE(26),
        extraFieldLength = buffer.readUInt16LE(28),
        start = 30 + fileNameLength + extraFieldLength
    ;
    const fileName = buffer.toString('utf8', 30, 30 + fileNameLength);
    const compressedData = buffer.subarray(start, start + compressedSize);

    const decompressedData = zlib.inflateRawSync(compressedData);
    return fsP.writeFile('./source/' + fileName, decompressedData);
});
