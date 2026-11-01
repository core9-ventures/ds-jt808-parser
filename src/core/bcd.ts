export function decodeBCD(buffer: Buffer): string {
    let result = "";

    for (const byte of buffer) {
        const high = (byte >> 4) & 0x0F;
        const low = byte & 0x0F;

        if (high > 9 || low > 9) {
            throw new Error("Invalid BCD digit");
        }

        result += high.toString();
        result += low.toString();
    }

    return result;
}

export function encodeBCD(value: string, byteLength: number): Buffer {
    if (!/^\d+$/.test(value)) {
        throw new Error("BCD value must contain only digits");
    }

    const digitLength = byteLength * 2;

    if (value.length > digitLength) {
        throw new Error(`BCD value exceeds ${digitLength} digits`);
    }

    const padded = value.padStart(digitLength, "0");
    const result = Buffer.alloc(byteLength);

    for (let i = 0; i < byteLength; i++) {
        const high = Number(padded[i * 2]);
        const low = Number(padded[i * 2 + 1]);

        result[i] = (high << 4) | low;
    }

    return result;
}