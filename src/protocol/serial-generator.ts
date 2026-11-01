export class SerialGenerator {
    private current = 0;

    next(): number {
        this.current = (this.current + 1) & 0xFFFF;
        return this.current;
    }
}