import { calculateChecksum } from "../../core/checksum";
import { encodeBCD } from "../../core/bcd";
import { SerialGenerator } from "../serial-generator";
import type { JT808Header } from "../../types";
import { escapeData } from "../../core/escape";

export class JT808ResponseEncoder {
    constructor(
        private readonly serialGenerator: SerialGenerator
    ) {}

    encode(
        messageId: number,
        requestHeader: JT808Header,
        body: Buffer
    ): Buffer {
        if (messageId < 0 || messageId > 0xFFFF) {
            throw new Error("Invalid JT808 message ID");
        }

        if (body.length > 0x03FF) {
            throw new Error("JT808 body exceeds 1023 bytes");
        }

        const is2019 = requestHeader.protocolVersion === "2019";
        const phoneLength = is2019 ? 10 : 6;

        const messageProperties = body.length | (is2019 ? 0x4000 : 0);

        const serialNumber = this.serialGenerator.next();

        const header = Buffer.alloc(2 + 2 + (is2019 ? 1 : 0) + phoneLength + 2);

        let offset = 0;

        header.writeUInt16BE(messageId, offset);
        offset += 2;

        header.writeUInt16BE(messageProperties, offset);
        offset += 2;

        if (is2019) {
            header.writeUInt8(
                requestHeader.protocolVersionNumber ?? 1,
                offset
            );
            offset += 1;
        }

        encodeBCD(requestHeader.device_number, phoneLength).copy(header, offset);

        offset += phoneLength;

        header.writeUInt16BE(serialNumber, offset);

        const message = Buffer.concat([header, body]);

        const checksum = calculateChecksum(message);

        const messageWithChecksum = Buffer.concat([
            message,
            Buffer.from([checksum])
        ]);

        const escaped = escapeData(messageWithChecksum);

        return Buffer.concat([
            Buffer.from([0x7E]),
            escaped,
            Buffer.from([0x7E])
        ]);
    }
}