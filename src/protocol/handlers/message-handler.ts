import { GeneralResponse, GeneralResponseResult } from "../responses/general-response";
import type { JT808Header } from "../../types";
import type { RegistrationResponse } from "../responses/registration-response";
import type { RegistrationService } from "../../services/registration-service";
import type { RegistrationParser } from "../parsers/registration-parser";
import type { AuthenticationService } from "../../services/authentication.service";
import type { AuthenticationParser } from "../parsers/authentication-parser";
import type { LocationParser } from "../parsers/location-parser";

export class JT808MessageHandler {
    constructor(
        //private readonly encoder: JT808ResponseEncoder,
        private readonly generalResponse: GeneralResponse,
        private readonly registrationParser: RegistrationParser,
        private readonly registrationService: RegistrationService,
        private readonly registrationResponse: RegistrationResponse,
        private readonly authenticationParser: AuthenticationParser,
        private readonly authenticationService: AuthenticationService,
        private readonly locationParser: LocationParser,
        //private readonly terminalRepository: any
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

            // Terminal location report
            case 0x0200:
                return this.generalResponse.success(header);

            // Terminal registration
            case 0x0100:
                return this.handleRegistration(header, body);

            // Terminal authentication
            case 0x0102:
                return this.handleAuthentication(header, body);
            
            case 0x0200:
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

        const registration = this.registrationParser.parse(
            header,
            body
        );

        console.log("Terminal registration:", registration);

        const outcome = await this.registrationService.register(
            registration
        );

        return this.registrationResponse.create(
            header,
            outcome.result,
            outcome.authenticationCode
        );

    }

    private async handleAuthentication(
        header: JT808Header,
        body: Buffer
    ): Promise<Buffer | null> {

        // We'll implement authentication validation
        // in the next step.
        const authentication = this.authenticationParser.parse(body);

        const isAuthenticated =
            await this.authenticationService.authenticate(
                header.terminalPhone,
                authentication.authenticationCode
            );

        console.log("Terminal authentication:", {
            terminalPhone: header.terminalPhone,
            authenticated: isAuthenticated
        });

        return this.generalResponse.create(
            header,
            0
            //isAuthenticated ? GeneralResponseResult.Success: GeneralResponseResult.Failure
        );

    }

    private async handleLocation(
        header: JT808Header,
        body: Buffer
    ): Promise<Buffer | null> {
        
        const location = this.locationParser.parse(body);

        // await this.terminalRepository.saveLocation(
        //     header.terminalPhone,
        //     location
        // );

        console.log("Terminal location report:", {
            terminalPhone: header.terminalPhone,
            location
        });

        return this.generalResponse.success(header);
    }


}