import { BufferReader } from "../../core/buffer-reader";
import type { JT808Header, TerminalRegistration } from "../../types";

function decodeFixedText(buffer: Buffer): string {
    return buffer
        .toString("ascii")
        .replace(/\0+$/g, "")
        .trim();
}

function decodeVehicleNumber(buffer: Buffer): string {
    return new TextDecoder("gbk")
        .decode(buffer)
        .replace(/\0+$/g, "")
        .trim();
}

export class RegistrationParser {
    parse(
        header: JT808Header,
        body: Buffer
    ): TerminalRegistration {

        const is2019 = header.protocolVersion === "2019";

        const manufacturerLength = is2019 ? 11 : 5;
        const modelLength = is2019 ? 30 : 20;
        const terminalIdLength = is2019 ? 30 : 7;

        const minimumLength =
            2 + 2 +
            manufacturerLength +
            modelLength +
            terminalIdLength +
            1;

        if (body.length < minimumLength) {
            throw new Error(
                `Invalid registration body. Expected at least ${minimumLength} bytes, received ${body.length}`
            );
        }

        const reader = new BufferReader(body);

        const provinceId = reader.readWord();
        const cityId = reader.readWord();

        const manufacturerId = decodeFixedText(
            reader.readBytes(manufacturerLength)
        );

        const terminalModel = decodeFixedText(
            reader.readBytes(modelLength)
        );

        const terminalId = decodeFixedText(
            reader.readBytes(terminalIdLength)
        );

        const plateColor = reader.readByte();

        // All remaining bytes represent the vehicle number/VIN.
        const vehicleNumber = decodeVehicleNumber(
            reader.readBytes(reader.remaining)
        );

        return {
            provinceId,
            cityId,
            manufacturerId,
            terminalModel,
            terminalId,
            plateColor,
            vehicleNumber
        };
    }
}