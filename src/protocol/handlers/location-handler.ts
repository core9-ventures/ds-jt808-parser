import type { RegistrationService } from "../../services/registration-service";
import type { ITerminalRepository, JT808Header } from "../../types";
import type { LocationParser } from "../parsers/location-parser";
import type { RegistrationParser } from "../parsers/registration-parser";
import type { GeneralResponse } from "../responses/general-response";
import type { RegistrationResponse } from "../responses/registration-response";

export class LocationHandler {
    constructor(
        private readonly parser: LocationParser,
        private readonly repo: ITerminalRepository,
        private readonly response: GeneralResponse
    ) {}

    async handle(header: JT808Header, body: Buffer) {
        
       const location = this.parser.parse(body, header);

        if(location.dsmAlarms && location.dsmAlarms.attachmentCount > 0){
            console.log("DSM Alarms:", location.dsmAlarms);
            
            await this.repo.create(
                location.deviceNumber,
                location.dsmAlarms.alarmType,
                location.dsmAlarms.attachmentCount,
             );
        }
       
        console.log("Terminal location report:", location);

        return this.response.success(header);
        
    }
}