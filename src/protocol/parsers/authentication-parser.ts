export interface TerminalAuthentication {
    authenticationCode: string;
}

export class AuthenticationParser {

    parse(body: Buffer): TerminalAuthentication {

        if (body.length === 0) {
            throw new Error("Authentication code is empty");
        }

        // Authentication code is transmitted as ASCII text.
        for (const byte of body) {
            if (byte < 0x20 || byte > 0x7E) {
                throw new Error(
                    "Authentication code contains invalid characters"
                );
            }
        }

        const authenticationCode = body.toString("ascii");

        return {
            authenticationCode
        };
    }
}