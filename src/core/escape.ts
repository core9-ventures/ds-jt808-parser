export function unescapeData(buffer: Buffer): Buffer {
    const result: number[] = [];

    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];

        if (byte === 0x7D) {

            if (i + 1 >= buffer.length) {
                throw new Error("Incomplete escape sequence");
            }

            const next = buffer[++i];

            if (next === 0x01) {
                result.push(0x7D);
            } else if (next === 0x02) {
                result.push(0x7E);
            } else {
                throw new Error("Invalid escape sequence");
            }
        
        } else {
            if(byte !== undefined){
                result.push(byte);
            }
            
        }
    }

    return Buffer.from(result);
}


export function escapeData(data: Buffer): Buffer {
    const result: number[] = [];

    for (const byte of data) {
        if (byte === 0x7E) {
            // 7E -> 7D 02
            result.push(0x7D, 0x02);
        } else if (byte === 0x7D) {
            // 7D -> 7D 01
            result.push(0x7D, 0x01);
        } else {
            result.push(byte);
        }
    }

    return Buffer.from(result);
}