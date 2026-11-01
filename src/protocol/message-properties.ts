export interface MessageProperties {
    raw: number;
    bodyLength: number;
    encryptionType: number;
    hasSubPackage: boolean;
    hasVersion: boolean;
}

export function parseMessageProperties(properties: number): MessageProperties {

    return {
        raw: properties,

        // Bits 0-9
        bodyLength: properties & 0x03FF,

        // Bits 10-12
        encryptionType: (properties >> 10) & 0x07,

        // Bit 13
        hasSubPackage: ((properties >> 13) & 0x01) === 1,

        // Bit 14
        hasVersion: ((properties >> 14) & 0x01) === 1
    };
}