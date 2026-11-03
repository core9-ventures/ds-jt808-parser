import type { TerminalRepository } from "../../repositories/terminal.repository";
import type { RegistrationService } from "../../services/registration-service";
import type { ITerminalRepository, JT808Header } from "../../types";
import type { LocationParser } from "../parsers/location-parser";
import type { RegistrationParser } from "../parsers/registration-parser";
import type { GeneralResponse } from "../responses/general-response";
import type { RegistrationResponse } from "../responses/registration-response";

export class LocationHandler {
    constructor(
        private readonly parser: LocationParser,
        private readonly repo: TerminalRepository,
        private readonly response: GeneralResponse
    ) {}

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

        return this.response.success(header);
        
    }
}