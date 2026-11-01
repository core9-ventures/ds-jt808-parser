export type JT808ProtocolVersion = "2013" | "2019";

export interface SubPackageInfo {
    total: number;
    number: number;
}

export interface JT808Header {
    messageId: number;

    messageProperties: number;

    bodyLength: number;

    encryptionType: number;

    hasSubPackage: boolean;

    protocolVersion: JT808ProtocolVersion;

    protocolVersionNumber: number | undefined;

    terminalPhone: string;

    messageSerialNumber: number;

    subPackageInfo: SubPackageInfo | undefined;

    headerLength: number;
}

export interface ParsedJT808Message {
    header: JT808Header;
    body: Buffer;
}

export interface TerminalRegistration {
    provinceId: number;
    cityId: number;
    manufacturerId: string;
    terminalModel: string;
    terminalId: string;
    plateColor: number;
    vehicleNumber: string;
}

export enum RegistrationResult {
    Success = 0,
    VehicleAlreadyRegistered = 1,
    VehicleNotFound = 2,
    TerminalAlreadyRegistered = 3,
    TerminalNotFound = 4
}

export interface RegistrationOutcome {
    result: RegistrationResult;
    authenticationCode?: string;
}

export interface ITerminalRepository {
    register(
        terminalPhone: string,
        registration: TerminalRegistration,
        proposedAuthenticationCode: string
    ): Promise<RegistrationOutcome>;
}
