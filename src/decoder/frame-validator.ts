import { unescapeData } from "../core/escape";
import { calculateChecksum } from "../core/checksum";

export interface ValidatedFrame {
    raw: Buffer;
    data: Buffer;
    checksum: number;
}

export function validateFrame(rawFrame: Buffer): ValidatedFrame {

    // Step 1: Unescape the frame.
    const data = unescapeData(rawFrame);

    if (data.length < 2) {
        throw new Error("JT808 frame is too short");
    }

    // Step 2: Last byte is the received checksum.
    const receivedChecksum = data[data.length - 1];

    // Step 3: Everything before the checksum.
    const messageData = data.subarray(0, data.length - 1);

    // Step 4: Calculate checksum.
    const calculatedChecksum = calculateChecksum(messageData);

    // Step 5: Compare checksums.
    if (receivedChecksum !== calculatedChecksum) {
        throw new Error(
            `Invalid checksum. Received: ${receivedChecksum && receivedChecksum.toString(16)}, ` +
            `Calculated: ${calculatedChecksum.toString(16)}`
        );
    }

    return {
        raw: rawFrame,
        data: messageData,
        checksum: receivedChecksum
    };
}