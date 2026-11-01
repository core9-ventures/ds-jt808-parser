import { JT808ResponseEncoder } from "./response-encoder";
import type { JT808Header } from "../../types";

export enum RegistrationResult {
    Success = 0,
    VehicleAlreadyRegistered = 1,
    VehicleNotFound = 2,
    TerminalAlreadyRegistered = 3,
    TerminalNotFound = 4
}

export class RegistrationResponse {
    constructor(
        private readonly encoder: JT808ResponseEncoder
    ) {}

    create(
        requestHeader: JT808Header,
        result: RegistrationResult,
        authenticationCode?: string
    ): Buffer {

        const authBuffer =
            result === RegistrationResult.Success &&
            authenticationCode
                ? Buffer.from(authenticationCode, "ascii")
                : Buffer.alloc(0);

        const body = Buffer.alloc(3 + authBuffer.length);

        // Original 0x0100 message serial number
        body.writeUInt16BE(requestHeader.messageSerialNumber,0);

        // Registration result
        body.writeUInt8(result, 2);

        // Authentication code, if successful
        authBuffer.copy(body, 3);

        return this.encoder.encode(
            0x8100,
            requestHeader,
            body
        );
    }
}