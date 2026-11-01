import { timingSafeEqual } from "crypto";
import type { InMemoryTerminalRepository } from "../repositories/in-memory-terminal.repository";



export class AuthenticationService {

    constructor(
        private readonly repository: InMemoryTerminalRepository
    ) {}

    async authenticate(
        deviceNumber: string,
        receivedCode: string
    ): Promise<boolean> {

        const storedCode =
            await this.repository.findAuthenticationCode(
                deviceNumber
            );

        // Terminal is not registered.
        if (!storedCode) {
            return false;
        }

        const receivedBuffer = Buffer.from(
            receivedCode,
            "utf8"
        );

        const storedBuffer = Buffer.from(
            storedCode,
            "utf8"
        );

        // timingSafeEqual requires buffers of equal length.
        if (receivedBuffer.length !== storedBuffer.length) {
            return false;
        }

        return timingSafeEqual(receivedBuffer, storedBuffer);
    }
}