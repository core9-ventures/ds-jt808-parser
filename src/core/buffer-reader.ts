export class BufferReader {
    private offset = 0;

    constructor(
        private readonly buffer: Buffer
    ) {}

    readByte(): number {
        this.ensureAvailable(1);

        const value = this.buffer.readUInt8(this.offset);

        this.offset += 1;

        return value;
    }

    readWord(): number {
        this.ensureAvailable(2);

        const value = this.buffer.readUInt16BE(this.offset);

        this.offset += 2;

        return value;
    }

    readDWord(): number {
        this.ensureAvailable(4);

        const value = this.buffer.readUInt32BE(this.offset);

        this.offset += 4;

        return value;
    }

    readBytes(length: number): Buffer {
        if (!Number.isInteger(length) || length < 0) {
            throw new Error("Invalid read length");
        }

        this.ensureAvailable(length);

        const value = this.buffer.subarray(
            this.offset,
            this.offset + length
        );

        this.offset += length;

        return value;
    }

    skip(length: number): void {
        this.ensureAvailable(length);
        this.offset += length;
    }

    get remaining(): number {
        //console.log("BufferReader remaining:", this.buffer.length - this.offset);
        return this.buffer.length - this.offset;
    }

    get position(): number {
        //console.log("BufferReader position:", this.offset);
        return this.offset;
    }

    private ensureAvailable(length: number): void {
        if (this.offset + length > this.buffer.length) {
            throw new Error(
                `Buffer underflow: need ${length} bytes, ` +
                `${this.remaining} available`
            );
        }
    }
}