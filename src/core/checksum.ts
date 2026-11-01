export function calculateChecksum(buffer: Buffer): number {
    let checksum = 0;

    for (const byte of buffer) {
        checksum ^= byte;
    }

    return checksum;
}