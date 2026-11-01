import { BufferReader } from "../../core/buffer-reader";
import { ADAS_STATES, ADAS_TYPES, DSM_STATES, DSM_TYPES, type AdasAlarm, type BaseStationData, type DsmAlarm, type JT808Header, type TerminalLocation } from "../../types";

function decodeBcdDateTime(buffer: Buffer): Date {
    const digits = [...buffer]
        .map(byte => {
            const high = (byte >> 4) & 0x0F;
            const low = byte & 0x0F;

            if (high > 9 || low > 9) {
                throw new Error("Invalid BCD date/time");
            }

            return `${high}${low}`;
        })
        .join("");

    if (digits.length !== 12) {
        throw new Error("Invalid JT808 date/time length");
    }

    const year = 2000 + Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const day = Number(digits.slice(4, 6));
    const hour = Number(digits.slice(6, 8));
    const minute = Number(digits.slice(8, 10));
    const second = Number(digits.slice(10, 12));

    // JT808 timestamps are generally interpreted in China Standard Time.
    // Store the instant in UTC.
    const date = new Date(Date.UTC(
        year,
        month - 1,
        day,
        hour - 8,
        minute,
        second
    ));

    if (
        month < 1 || month > 12 ||
        day < 1 || day > 31 ||
        hour > 23 || minute > 59 || second > 59
    ) {
        throw new Error("Invalid JT808 timestamp values");
    }

    return date;
}

export class LocationParser {

    // Extended section
    private totalMileage = 0;
    private mobileSignalStrength = 0;
    private baseStationDataArr: BaseStationData[] = [];
    private powerSupplyMv = 0;
    private adasAlarms: any
    private dsmAlarms: any

    get mileage() {
        return this.totalMileage;
    }

    get mobileSignal() {
        return this.mobileSignalStrength;
    }

    parse(body: Buffer, header: JT808Header): any {
        if (body.length < 28) {
            throw new Error("Location report body must contain at least 28 bytes");
        }

        const reader = new BufferReader(body);
        // Alarm status (13, 4 bytes)
        // bit 1: Overspeed alarm
        // bit 4: GNSS fault
        // bit 7: Device main power under voltage
        // bit 8: Device main power off
        // bit 15: Remove alarm
        // bit 16: Vibration alarm
        // bit 28: Illegal displacement of the vehicle
        // bit 31: Reserved
        const alarmStatus = reader.readDWord();
        const isOverspeed = !!(alarmStatus & 0x00000002);
        const isGNSSFault = !!(alarmStatus & 0x00000010);
        const isUnderVoltage = !!(alarmStatus & 0x00000080);
        const isPowerOff = !!(alarmStatus & 0x00000100);
        const isRemoveAlarm = !!(alarmStatus & 0x00008000);
        const isVibrationAlarm = !!(alarmStatus & 0x00010000);
        const isIllegalDisplacement = !!(alarmStatus & 0x10000000);

        // GPS status (17, 4 bytes)
        // Bit 6-9 Bit11-26: Reserved default is 0
        // bit 0: 0-ACC off  1-ACC on
        // bit 1: 0-GNSS position unfix  1-GNSS position fix
        // bit 2: 0-north latitude 1-south latitude
        // bit 3: 0-east longitude 1-west longitude
        // bit 4: 0-real time data flag 1-blind data flag（Only for VG300 flag bits)
        // bit 5: 0-Non idle speed  1-dle speed
        // bit 10: 0-fuel connect 1-fuel disconnect
        // bit 27-29: network modes; 000-UNREGISTERED; 001-GSM; 010-LTE; 011-CATM; 100-NBIOT
        // bit 30: 0-normal data 1-TOW data
        // bit 31: 0-real time data 1-buffer data

        const statusFlags = reader.readDWord();
        const isACCOn = !!(statusFlags & 0x00000001);
        const isGNSSPositionFixed = !!(statusFlags & 0x00000002);
        const isSouthern = !!(statusFlags & 0x00000004);
        const isWestern = !!(statusFlags & 0x00000008);
        const isVG300BlindDataMode = !!(statusFlags & 0x00000010);
        const isIdleSpeed = !!(statusFlags & 0x00000020);
        const isFuelDisconnected = !!(statusFlags & 0x00000400);

        const networkType = (statusFlags >>> 27) & 0b111;

        const NETWORK_TYPES: Record<number, string> = {
            0b000: "Unregistered",
            0b001: "GSM",
            0b010: "LTE",
            0b011: "CATM",
            0b100: "NBIOT",
        };

        const networkTypeName = NETWORK_TYPES[networkType] ?? "Invalid";

        const isTOWData = !!(statusFlags & 0x40000000);
        const isBufferedData = !!(statusFlags & 0x80000000);

        // Latitude data (21, 4 bytes)
        const latitudeRaw = reader.readDWord();
        // Longitude data (25, 4 bytes)
        const longitudeRaw = reader.readDWord();

        // Altitude data (29, 2 bytes)
        const altitude = reader.readWord();

        // TODO what is 1/10 km/hr
        // Speed data (31, 2 bytes)
        const speedRaw = reader.readWord();

        // Direction data (33, 2 bytes)
        const direction = reader.readWord();

        // Time data (35, 6 bytes) bcd;
        // YY-MM-DD-hh-mm-ss UTC
        const recordedAt = decodeBcdDateTime(reader.readBytes(6));

        const latitude = latitudeRaw / 10e5;
        const longitude = longitudeRaw / 10e5;
        const speed = speedRaw / 10;

        if (latitude > 90 || longitude > 180) {
            throw new Error("Invalid GPS coordinates");
        }

        // extended data
        // start from byte 41 to n - 3

        while (reader.remaining >= 2) {
            const header = reader.readByte();
            const extraLength = reader.readByte();

            //const extraReader = new BufferReader(reader.readBytes(extraLength));
            const extraReader = new BufferReader(reader.readBytes(extraLength));

            switch (header) {
                case 0x01:
                    // milleage: 4 bytes *single
                    // byte 0-3: total mileage
                    // TODO what is 1/10 km
                    this.totalMileage = extraReader.readDWord() / 10;
                    break;

                case 0x30:
                    // mobile signal strength: 1 byte
                    // byte 0: signal strength
                    this.mobileSignalStrength = extraReader.readByte();
                    break;
                case 0xF0:
                    // Base station information: 13 bytes per station
                    this.baseStationDataArr = [];

                    while (extraReader.remaining >= 13) {
                        const stationData: BaseStationData = {
                            MCC: extraReader.readWord(),
                            MNC: extraReader.readWord(),
                            CI: extraReader.readDWord(),
                            LAC: extraReader.readDWord(),
                            RSSI: extraReader.readByte()
                        };
                        this.baseStationDataArr.push(stationData);
                    }
                    break;
                case 0xF1:
                    // Power supply: 4 bytes, millivolts
                    this.powerSupplyMv = extraReader.readDWord();
                break;

                // case 0x64: {
                //     this.adasAlarms = {
                //         alarmId: extraReader.readDWord(),
                //         //alarmStatus: extraReader.readByte(),
                //         alarmStatus: ADAS_STATES[extraReader.readByte()] ?? extraReader.readByte(),
                //         //alarmType: extraReader.readByte(),
                //         alarmType: ADAS_TYPES[extraReader.readByte()] ?? `user-defined (${extraReader.readByte()})`,
                //         alarmLevel: extraReader.readByte(),
                //         frontVehicleSpeed: extraReader.readByte(),
                //         frontVehicleDistance: extraReader.readByte(),
                //         laneDeparture: extraReader.readByte(),
                //         roadSignType: extraReader.readByte(),
                //         roadSignValue: extraReader.readByte(),
                //         vehicleSpeed: extraReader.readByte(),
                //         altitude: extraReader.readWord(),
                //         latitude: extraReader.readDWord() / 10e5,
                //         longitude: extraReader.readDWord() / 10e5,
                //         timestamp: decodeBcdDateTime(extraReader.readBytes(6)),
                //         vehicleStatus: extraReader.readWord(),
                //         alarmLabel: Buffer.from(extraReader.readBytes(16))
                //     };

                // break;
                // }

                // case 0x65: {

                //     const alarmId = extraReader.readDWord();
                //     const alarmStatus = DSM_STATES[extraReader.readByte()] ?? extraReader.readByte();
                //     const alarmType = DSM_TYPES[extraReader.readByte()] ?? `user-defined (${extraReader.readByte()})`;
                //     const alarmLevel = extraReader.readByte();
                //     const fatigueLevel = extraReader.readByte();

                //     // Reserved bytes
                //     extraReader.skip(4);

                //     this.dsmAlarms = {
                //         alarmId,
                //         alarmStatus,
                //         alarmType,
                //         alarmLevel,
                //         fatigueLevel,
                //         vehicleSpeed: extraReader.readByte(),
                //         altitude: extraReader.readWord(),
                //         latitude: extraReader.readDWord() / 10e5,
                //         longitude: extraReader.readDWord() / 10e5,
                //         timestamp: decodeBcdDateTime(extraReader.readBytes(6)),
                //         vehicleStatus: extraReader.readWord(),
                //         alarmLabel: Buffer.from(extraReader.readBytes(16))
                //     };

                // break;
                // }



                default:
                    reader.skip(extraLength);
                    break;
            }
        }

       

        return {
            ...header,
            alarmStatus,
            statusFlags,
            latitude,
            longitude,
            altitude,
            speed,
            direction,
            recordedAt,
            mileage: this.mileage,
            mobileSignal: this.mobileSignalStrength,
            adasAlarms: this.adasAlarms,
            dsmAlarms: this.dsmAlarms,
            //baseStationDataArr: this.baseStationDataArr,
        };
    }
}