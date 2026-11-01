

import { RegistrationResult, type ITerminalRepository, type RegistrationOutcome, type TerminalRegistration } from "../types";

interface TerminalRecord {
    terminalPhone: string;
    registration: TerminalRegistration;
    authenticationCode: string;
    isAuthenticated: boolean;
}

export class InMemoryTerminalRepository implements ITerminalRepository {

    private readonly terminals = new Map<string, TerminalRecord>();

    async register(
        terminalPhone: string,
        registration: TerminalRegistration,
        proposedAuthenticationCode: string
    ): Promise<RegistrationOutcome> {

        const existing = this.terminals.get(terminalPhone);

        if (existing) {
            return {
                result: RegistrationResult.Success,
                authenticationCode: existing.authenticationCode
            };
        }

        this.terminals.set(terminalPhone, {
            terminalPhone,
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
        terminalPhone: string
    ): Promise<string | null> {

        const terminal = this.terminals.get(terminalPhone);

        if(terminal) {
            return terminal.authenticationCode;
        }

        return null
    }
}