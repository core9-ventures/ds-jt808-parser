import { GeneralResponse, GeneralResponseResult } from "../responses/general-response";
import type { JT808Header } from "../../types";
import type { RegistrationResponse } from "../responses/registration-response";
import type { RegistrationService } from "../../services/registration-service";
import type { RegistrationParser } from "../parsers/registration-parser";
import type { AuthenticationService } from "../../services/authentication.service";
import type { AuthenticationParser } from "../parsers/authentication-parser";
import type { LocationParser } from "../parsers/location-parser";
import type { RegistrationHandler } from "./registration-handler";
import type { AuthenticationHandler } from "./authentication-handler";
import type { LocationHandler } from "./location-handler";

export class JT808MessageHandler {
    constructor(
        //private readonly encoder: JT808ResponseEncoder,
        private readonly generalResponse: GeneralResponse,
        private readonly registrationHandler: RegistrationHandler,
        //private readonly registrationService: RegistrationService,
        //private readonly registrationResponse: RegistrationResponse,
        //private readonly authenticationParser: AuthenticationParser,
        //private readonly authenticationService: AuthenticationService,
        //private readonly locationParser: LocationParser,
        private readonly locationHandler: LocationHandler,
        private readonly authenticationHandler: AuthenticationHandler,
    ) {}

    async handle(
        header: JT808Header,
        body: Buffer,
        raw: Buffer
    ): Promise<Buffer | null> {

        switch (header.messageId) {

            // Terminal heartbeat
            case 0x0002:
                return this.generalResponse.success(header);

            // Terminal registration
            case 0x0100:
                return this.handleRegistration(header, body);

            // Terminal authentication
            case 0x0102:
                return this.handleAuthentication(header, body);
            
            case 0x0200:
                console.log("Location report received raw:", raw.toString("hex"));
                return this.handleLocation(header, body);

            default:
                console.log(
                    `Unsupported message: 0x${header.messageId
                        .toString(16)
                        .padStart(4, "0")}`
                );

                return null;
        }
    }

    private async handleRegistration(
        header: JT808Header,
        body: Buffer
    ): Promise<Buffer | null> {

    
        return this.registrationHandler.handle(
            header,
            body
        );

    }

    private async handleAuthentication(
        header: JT808Header,
        body: Buffer
    ): Promise<Buffer | null> {

        return this.authenticationHandler.handle(
            header,
            body
        );

    }

    private async handleLocation(
        header: JT808Header,
        body: Buffer
    ): Promise<Buffer | null> {
        
        return this.locationHandler.handle(
            header,
            body
        );
    }


}