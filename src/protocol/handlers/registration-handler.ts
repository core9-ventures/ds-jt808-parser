import type { RegistrationService } from "../../services/registration-service";
import type { JT808Header } from "../../types";
import type { RegistrationParser } from "../parsers/registration-parser";
import type { RegistrationResponse } from "../responses/registration-response";

export class RegistrationHandler {
    constructor(
        private readonly parser: RegistrationParser,
        private readonly service: RegistrationService,
        private readonly response: RegistrationResponse
    ) {}

    async handle(header: JT808Header, body: Buffer) {
        
        const registration = this.parser.parse(
            header,
            body
        );

        console.log("Terminal registration:", registration);

        const outcome = await this.service.register(
            registration
        );

        return this.response.create(
            header,
            outcome.result,
            outcome.authenticationCode
        );
        
    }
}