export class JT808FrameDecoder {
    private buffer: Buffer = Buffer.alloc(0);

    constructor(
        private readonly maxFrameLength: number = 8192
    ) {}

    push(chunk: Buffer): Buffer[] {
        if (chunk.length === 0) {
            return [];
        }

        this.buffer = Buffer.concat([
            this.buffer,
            chunk
        ]);

        const frames: Buffer[] = [];

        while (this.buffer.length > 0) {

            // Find the beginning of a JT808 frame.
            const start = this.buffer.indexOf(0x7E);

            // No starting delimiter.
            if (start === -1) {
                this.buffer = Buffer.alloc(0);
                break;
            }

            // Remove garbage before the starting delimiter.
            if (start > 0) {
                this.buffer = this.buffer.subarray(start);
            }

            // Find the ending delimiter.
            const end = this.buffer.indexOf(0x7E, 1);

            // Frame is incomplete. Wait for the next TCP chunk.
            if (end === -1) {

                if (this.buffer.length - 1 > this.maxFrameLength) {
                    this.buffer = Buffer.alloc(0);
                    throw new Error("JT808 frame exceeds maximum length");
                }

                break;
            }

            // Extract bytes between delimiters.
            const frame = this.buffer.subarray(1, end);

            // Move buffer forward.
            this.buffer = this.buffer.subarray(end + 1);

            // Ignore empty frames.
            if (frame.length === 0) {
                continue;
            }

            if (frame.length > this.maxFrameLength) {
                throw new Error("JT808 frame exceeds maximum length");
            }

            frames.push(Buffer.from(frame));
        }

        return frames;
    }

    reset(): void {
        this.buffer = Buffer.alloc(0);
    }

    get pendingBytes(): number {
        return this.buffer.length;
    }
}