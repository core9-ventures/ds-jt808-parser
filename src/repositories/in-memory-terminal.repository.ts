

import { RegistrationResult, type ITerminalRepository, type RegistrationOutcome, type TerminalRegistration } from "../types";

interface TerminalRecord {
    deviceNumber: string;
    registration: TerminalRegistration;
    authenticationCode: string;
    isAuthenticated: boolean;
}

export class InMemoryTerminalRepository implements ITerminalRepository {

    private readonly terminals = new Map<string, TerminalRecord>();

    async register(
        deviceNumber: string,
        registration: TerminalRegistration,
        proposedAuthenticationCode: string
    ): Promise<RegistrationOutcome> {

        const existing = this.terminals.get(deviceNumber);

        if (existing) {
            return {
                result: RegistrationResult.Success,
                authenticationCode: existing.authenticationCode
            };
        }

        this.terminals.set(deviceNumber, {
            deviceNumber,
            registration,
            authenticationCode: proposedAuthenticationCode,
            isAuthenticated: false
        });

        return {
            result: RegistrationResult.Success,
            authenticationCode: proposedAuthenticationCode
        };
    }

    async findAuthenticationCode(
        deviceNumber: string
    ): Promise<string | null> {

        const terminal = this.terminals.get(deviceNumber);

        if(terminal) {
            return terminal.authenticationCode;
        }

        return null
    }
}