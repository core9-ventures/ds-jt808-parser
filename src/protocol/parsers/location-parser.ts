import { BufferReader } from "../../core/buffer-reader";
import type { TerminalLocation } from "../../types";

function decodeBcdDateTime(buffer: Buffer): Date {
    const digits = [...buffer]
        .map(byte => {
            const high = (byte >> 4) & 0x0F;
            const low = byte & 0x0F;

            if (high > 9 || low > 9) {
                throw new Error("Invalid BCD date/time");
            }

            return `${high}${low}`;
        })
        .join("");

    if (digits.length !== 12) {
        throw new Error("Invalid JT808 date/time length");
    }

    const year = 2000 + Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const day = Number(digits.slice(4, 6));
    const hour = Number(digits.slice(6, 8));
    const minute = Number(digits.slice(8, 10));
    const second = Number(digits.slice(10, 12));

    // JT808 timestamps are generally interpreted in China Standard Time.
    // Store the instant in UTC.
    const date = new Date(Date.UTC(
        year,
        month - 1,
        day,
        hour - 8,
        minute,
        second
    ));

    if (
        month < 1 || month > 12 ||
        day < 1 || day > 31 ||
        hour > 23 || minute > 59 || second > 59
    ) {
        throw new Error("Invalid JT808 timestamp values");
    }

    return date;
}

export class LocationParser {
    parse(body: Buffer): TerminalLocation {
        if (body.length < 28) {
            throw new Error("Location report body must contain at least 28 bytes");
        }

        const reader = new BufferReader(body);

        const alarmFlags = reader.readDWord();
        const statusFlags = reader.readDWord();

        const latitudeRaw = reader.readDWord();
        const longitudeRaw = reader.readDWord();

        const altitude = reader.readWord();
        const speedRaw = reader.readWord();
        const direction = reader.readWord();

        const recordedAt = decodeBcdDateTime(reader.readBytes(6));

        const latitude = latitudeRaw / 1_000_000;
        const longitude = longitudeRaw / 1_000_000;
        const speed = speedRaw / 10;

        if (latitude > 90 || longitude > 180) {
            throw new Error("Invalid GPS coordinates");
        }

        // Any remaining bytes are optional location additional information.
        // We will parse these in a later step.

        return {
            alarmFlags,
            statusFlags,
            latitude,
            longitude,
            altitude,
            speed,
            direction,
            recordedAt
        };
    }
}