import type { TerminalRepository } from "../../repositories/terminal.repository";
import type { RegistrationService } from "../../services/registration-service";
import type { AdasAlarm, DsmAlarm, ITerminalRepository, JT808Header } from "../../types";
import type { LocationParser } from "../parsers/location-parser";
import type { RegistrationParser } from "../parsers/registration-parser";
import type { GeneralResponse } from "../responses/general-response";
import type { RegistrationResponse } from "../responses/registration-response";
import type { JT808ResponseEncoder } from "../responses/response-encoder";

export class LocationHandler {
    constructor(
        private readonly parser: LocationParser,
        private readonly repo: TerminalRepository,
        private readonly generalResponse: GeneralResponse,
        private readonly responseEncoder: JT808ResponseEncoder
    ) { }

    async handle(header: JT808Header, body: Buffer) {

        const location = this.parser.parse(body, header);

        if (location.dsmAlarms && location.dsmAlarms.attachment_count > 0) {

            try {
                await this.repo.create(location.device_number, location.dsmAlarms);

            } catch (error) {
                console.error("Failed to save DSM alarm:", error);
            }
        }

        if (location.adasAlarms && location.adasAlarms.attachment_count > 0) {

            try {
                await this.repo.createAdasAlarm(location.device_number, location.adasAlarms);

            } catch (error) {
                console.error("Failed to save ADAS alarm:", error);
            }
        }

        console.log("Terminal location report:", location);

        const generalResponse = this.generalResponse.success(header);

        const outgoingMessages: Buffer[] = [
            generalResponse
        ];

        // Request ADAS attachments.
        if (location.adasAlarms && location.adasAlarms.attachment_count > 0) {
            const adasRequest = this.createAttachmentRequest(
                header,
                location.adasAlarms
            );

            if (adasRequest) {
                outgoingMessages.push(adasRequest);
            }
        }

        // Request DSM attachments.
        if (location.dsmAlarms && location.dsmAlarms.attachment_count > 0) {
            const dsmRequest = this.createAttachmentRequest(
                header,
                location.dsmAlarms
            );

            if (dsmRequest) {
                outgoingMessages.push(dsmRequest);
            }
        }

        // Return both complete JT808 frames in their correct order.
        return Buffer.concat(outgoingMessages);

    }

    private build9208Body(
        alarmIdentifier: Buffer,
        alarmNumber: string
    ): Buffer {
        const serverIp = process.env.ATTACHMENT_SERVER_IP!;
        const tcpPort = Number(process.env.ATTACHMENT_TCP_PORT);
        const udpPort = Number(process.env.ATTACHMENT_UDP_PORT ?? 0);

        const ip = Buffer.from(serverIp, "ascii");
        const alarmNo = Buffer.alloc(32);

        if (alarmIdentifier.length !== 16) {
            throw new Error("Alarm identifier must be 16 bytes");
        }

        if (Buffer.byteLength(alarmNumber, "ascii") > 32) {
            throw new Error("Alarm number exceeds 32 bytes");
        }

        alarmNo.write(alarmNumber, "ascii");

        const body = Buffer.alloc(
            1 + ip.length + 2 + 2 + 16 + 32 + 16
        );

        let offset = 0;

        body.writeUInt8(ip.length, offset++);
        ip.copy(body, offset);
        offset += ip.length;

        body.writeUInt16BE(tcpPort, offset);
        offset += 2;

        body.writeUInt16BE(udpPort, offset);
        offset += 2;

        alarmIdentifier.copy(body, offset);
        offset += 16;

        alarmNo.copy(body, offset);
        offset += 32;

        // Last 16 bytes are reserved and already zero.

        return body;
    }

    private createAttachmentRequest(
        header: JT808Header,
        alarm: AdasAlarm | DsmAlarm
    ): Buffer | null {

        if (!alarm || alarm.attachment_count <= 0) {
            return null;
        }

        // Platform-generated unique alarm number (32 ASCII bytes).
        const alarmNumber = crypto
            .randomUUID()
            .replace(/-/g, "");

        const body = this.build9208Body(
            alarm.raw,
            alarmNumber
        );

        // Your existing encoder API.
        return this.responseEncoder.encode(
            0x9208,
            header,
            body
        );
    }


}