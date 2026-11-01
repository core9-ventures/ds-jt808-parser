import type { JT808Header } from "../../types";
import type { JT808ResponseEncoder } from "./response-encoder";

export enum GeneralResponseResult {
    Success = 0,
    Failure = 1,
    MessageError = 2,
    UnsupportedMessage = 3,
    AlarmConfirmation = 4
}

export class GeneralResponse {

    constructor(
        private readonly encoder: JT808ResponseEncoder
    ) {}

    create(
        requestHeader: JT808Header,
        result: GeneralResponseResult
    ): Buffer {

        const body = Buffer.alloc(5);

        // Original terminal message serial number
        body.writeUInt16BE(
            requestHeader.messageSerialNumber,
            0
        );

        // Original terminal message ID
        body.writeUInt16BE(
            requestHeader.messageId,
            2
        );

        // Response result
        body.writeUInt8(result, 4);

        return this.encoder.encode(
            0x8001,
            requestHeader,
            body
        );
    }

    success(requestHeader: JT808Header): Buffer {
        return this.create(
            requestHeader,
            GeneralResponseResult.Success
        );
    }
}