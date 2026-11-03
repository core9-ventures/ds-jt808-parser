export interface TerminalAuthentication {
    authenticationCode: string;
    imei?: string;
    softwareVersion?: string;
}


interface AuthRequest {
    authCode: string;
    authCodeRaw: Buffer;
    imei?: string;
    softwareVersion?: string;
}

const gbk = new TextDecoder("gbk");

function decodeString(buf: Buffer): string {
    // strip only 0x00 padding; don't trim spaces, they may be meaningful
    return gbk.decode(buf).replace(/\0+$/g, "");
}

export class AuthenticationParser {

    parse(body: Buffer, is2019: boolean): TerminalAuthentication {

        if (body.length === 0) {
            throw new Error("Authentication code is empty");
        }

        if (!is2019) {
            return { authenticationCode: decodeString(body)};
        }

        const len = body.readUInt8(0);
        const authCodeRaw = body.subarray(1, 1 + len);
        let offset = 1 + len;

        const imei = body.subarray(offset, offset + 15).toString("ascii").replace(/\0+$/g, "");
        offset += 15;

        const softwareVersion = decodeString(body.subarray(offset, offset + 20));

        return {
            authenticationCode: decodeString(authCodeRaw),
            imei,
            softwareVersion
        };
    }
}