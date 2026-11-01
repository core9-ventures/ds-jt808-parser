import type { AuthenticationService } from "../../services/authentication.service";
import type { JT808Header } from "../../types";
import type { AuthenticationParser } from "../parsers/authentication-parser";
import type { GeneralResponse } from "../responses/general-response";

export class AuthenticationHandler {
    constructor(
        private readonly parser: AuthenticationParser,
        private readonly service: AuthenticationService,
        private readonly generalResponse: GeneralResponse
    ) {}

    async handle(header: JT808Header, body: Buffer) {
        
        const authentication = this.parser.parse(body);

        const isAuthenticated =
            await this.service.authenticate(
                header.deviceNumber,
                authentication.authenticationCode
            );

        console.log("Terminal authentication:", {
            deviceNumber: header.deviceNumber,
            authenticated: isAuthenticated
        });

        return this.generalResponse.create(
            header,
            0
            //isAuthenticated ? GeneralResponseResult.Success: GeneralResponseResult.Failure
        );
    }
}