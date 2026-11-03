import { BufferReader } from "../../core/buffer-reader";
import { decodeBCD } from "../../core/bcd";

import { parseMessageProperties } from "../message-properties";
import type { JT808Header, ParsedJT808Message } from "../../types";

export class JT808HeaderParser {

    parse(data: Buffer): ParsedJT808Message {

        const reader = new BufferReader(data);

        if (reader.remaining < 12) {
            throw new Error("JT808 message is too short");
        }

        // 1. Message ID
        const messageId = reader.readWord();

        // 2. Message Properties
        const rawProperties = reader.readWord();

        const properties = parseMessageProperties(rawProperties);

        // 3. Protocol Version
        let protocolVersion: "2013" | "2019" = "2013";

        let protocolVersionNumber: number | undefined;

        if (properties.hasVersion) {
            protocolVersion = "2019";

            protocolVersionNumber = reader.readByte();
        }

        // 4. Terminal Phone
        const phoneLength = properties.hasVersion ? 10 : 6;

        const deviceNumber = decodeBCD(reader.readBytes(phoneLength));

        // 5. Message Serial Number
        const messageSerialNumber = reader.readWord();

        // 6. Subpackage Information
        let subPackageInfo;

        if (properties.hasSubPackage) {

            const total = reader.readWord();

            const number = reader.readWord();

            if (total === 0 || number === 0 || number > total) {
                throw new Error("Invalid subpackage information");
            }

            subPackageInfo = {
                total,
                number
            };
        }

        // 7. Validate Body Length
        const headerLength = reader.position;

        if (reader.remaining !== properties.bodyLength) {
            throw new Error(
                `Body length mismatch. Expected ${properties.bodyLength}, ` +
                `received ${reader.remaining}`
            );
        }

        // 8. Extract Body
        const body = reader.readBytes(reader.remaining);

        // 9. Build Header
        const header: JT808Header = {
            messageId,
            messageProperties: rawProperties,
            bodyLength: properties.bodyLength,
            encryptionType: properties.encryptionType,
            hasSubPackage: properties.hasSubPackage,
            protocolVersion,
            protocolVersionNumber,
            device_number: deviceNumber,
            messageSerialNumber,
            subPackageInfo,
            headerLength,
            is2019: protocolVersion === "2019"
        };

        return {
            header,
            body
        };
    }
}