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


export interface TerminalLocation {
    alarmStatus: number;
    statusFlags: number;
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    direction: number;
    recordedAt: Date;
    adasAlarms: any;
    dsmAlarms: any;
    //baseStationDataArr: BaseStationData[];
}

export interface BaseStationData {
    MCC: number;
    MNC: number;
    CI: number;
    LAC: number;
    RSSI: number;
}

export interface AdasAlarm {
    alarmId: number;
    alarmStatus: number;
    alarmType: number;
    alarmLevel: number;
    frontVehicleSpeed: number;
    frontVehicleDistance: number;
    laneDeparture: number;
    roadSignType: number;
    roadSignValue: number;
    vehicleSpeed: number;
    altitude: number;
    latitude: number;
    longitude: number;
    timestamp: Date;
    vehicleStatus: number;
    alarmLabel: Buffer;
}

export interface DsmAlarm {
    alarmId: number;
    alarmStatus: number;
    alarmType: number;
    alarmLevel: number;
    fatigueLevel: number;
    vehicleSpeed: number;
    altitude: number;
    latitude: number;
    longitude: number;
    timestamp: Date;
    vehicleStatus: number;
    alarmLabel: Buffer;
}

export const ADAS_STATES = ["unavailable", "start", "end"];

export const ADAS_TYPES: Record<number, string> = {
    1: "forward collision",
    2: "lane departure",
    3: "following too close",
    4: "pedestrian collision",
    5: "frequent lane change",
    6: "road sign limit exceeded",
    7: "obstacle",
    16: "road sign recognition",
    17: "active capture",
};

export const DEPARTURE_TYPES: Record<number, string> = {
    1: "left",
    2: "right",
};

export const DSM_TYPES: Record<number, string> = {
    1: "fatigue driving",
    2: "phone call",
    3: "smoking",
    4: "distracted driving",
    5: "driver abnormal",
    6: "camera blocked",
    8: "overtime driving",
    10: "seatbelt not fastened",
    11: "IR-blocking sunglasses",
    12: "both hands off wheel",
    13: "playing with phone",
    16: "automatic capture",
    17: "driver change",
};

export const DSM_STATES = ["unavailable", "start", "end"];