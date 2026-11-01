import type { RegistrationService } from "../../services/registration-service";
import type { JT808Header } from "../../types";
import type { LocationParser } from "../parsers/location-parser";
import type { RegistrationParser } from "../parsers/registration-parser";
import type { GeneralResponse } from "../responses/general-response";
import type { RegistrationResponse } from "../responses/registration-response";

export class LocationHandler {
    constructor(
        private readonly parser: LocationParser,
        private readonly service: RegistrationService,
        private readonly response: GeneralResponse
    ) {}

    async handle(header: JT808Header, body: Buffer) {
        
       const location = this.parser.parse(body, header);

        // await this.terminalRepository.saveLocation(
        //     header.deviceNumber,
        //     location
        // );

        console.log("Terminal location report:", {
            deviceNumber: header.deviceNumber,
            location
        });

        return this.response.success(header);
        
    }
}