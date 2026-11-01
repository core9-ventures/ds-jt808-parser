import { randomBytes } from "crypto";
import type { RegistrationOutcome, RegistrationResult, TerminalRegistration } from "../types";
import type { TerminalRepository } from "../repositories/terminal.repository";



export class RegistrationService {
    constructor(
        private readonly repository: TerminalRepository
    ) {}

    async register(registration: TerminalRegistration): Promise<RegistrationOutcome> {

        //const authenticationCode = randomBytes(16).toString("hex");
        const authenticationCode = "AUTH123456"; 
        

        return this.repository.register(
            registration.terminalId,
            registration,
            authenticationCode
        );
    }
}