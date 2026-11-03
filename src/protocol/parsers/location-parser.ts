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

  const ADAS_MIN_LENGTH = 47;
  const DSM_MIN_LENGTH = 47;

export class LocationParser {

    // Extended section
    private totalMileage = 0;
    private mobileSignalStrength = 0;
    private baseStationDataArr: BaseStationData[] = [];
    private powerSupplyMv = 0;
    private adasAlarms: any;
    private dsmAlarms!: DsmAlarm 

    get mileage() {
        return this.totalMileage;
    }

    get mobileSignal() {
        return this.mobileSignalStrength;
    }

  

    // Alarm identification number: 16 bytes
    //   terminal ID   BYTE[7]
    //   time          BCD[6]
    //   serial no.    BYTE
    //   attachments   BYTE
    //   reserved      BYTE
    readAlarmLabel(r: BufferReader) {
        const raw = r.readBytes(16);
        const label = new BufferReader(raw);
        
        const alarmLabel = {
            terminalId: label.readBytes(7).toString("ascii").replace(/\0+$/, ""),
            time: decodeBcdDateTime(label.readBytes(6)),
            serialNumber: label.readByte(),
            attachmentCount: label.readByte(),
            reserved: label.readByte(),
            raw: Buffer.from(raw), // copy, so it doesn't reference the packet buffer
        };
        console.log('alarm-label', alarmLabel)
        return alarmLabel
    }

    // Shared tail: altitude, lat, lon, time, vehicle status
    readAlarmPosition(r: BufferReader) {
        return {
            altitude: r.readWord(),
            latitude: r.readDWord() / 1e6,
            longitude: r.readDWord() / 1e6,
            timestamp: decodeBcdDateTime(r.readBytes(6)),
            vehicleStatus: r.readWord(),
        };
    }

    parse(body: Buffer, header: JT808Header): TerminalLocation {
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
            const id = reader.readByte();
            const length = reader.readByte();

            // Malformed or truncated packet: stop instead of throwing
            if (length > reader.remaining) {
                console.warn(`Extra item 0x${id.toString(16)} claims ${length} bytes, only ${reader.remaining} left`);
                break;
            }

            // This advances `reader` past the item. Nothing else should touch `reader` for this item.
            const extra = new BufferReader(reader.readBytes(length));

            switch (id) {
                case 0x01:
                    // Mileage: DWORD, unit 1/10 km -> divide by 10 for km
                    if (length >= 4) this.totalMileage = extra.readDWord() / 10;
                    break;

                case 0x30:
                    // Mobile signal strength: BYTE
                    if (length >= 1) this.mobileSignalStrength = extra.readByte();
                    break;

                case 0xF0:
                    this.baseStationDataArr = [];
                    while (extra.remaining >= 13) {
                        this.baseStationDataArr.push({
                            MCC: extra.readWord(),
                            MNC: extra.readWord(),
                            CI: extra.readDWord(),
                            LAC: extra.readDWord(),
                            RSSI: extra.readByte(),
                        });
                    }
                    break;

                case 0xF1:
                    if (length >= 4) this.powerSupplyMv = extra.readDWord();
                    break;

                case 0x64: {
                    // ADAS (Advanced Driver Assistance) alarm
                    if (length < ADAS_MIN_LENGTH) {
                        console.warn(`ADAS item too short: ${length} bytes`);
                        break;
                    }

                    const alarmId = extra.readDWord();
                    const statusByte = extra.readByte();
                    const typeByte = extra.readByte();
                    const alarmLevel = extra.readByte();
                    const frontVehicleSpeed = extra.readByte();      // km/h
                    const frontVehicleDistance = extra.readByte();   // 100 ms units
                    const laneDeparture = extra.readByte();          // 1 = left, 2 = right
                    const roadSignType = extra.readByte();
                    const roadSignValue = extra.readByte();
                    const vehicleSpeed = extra.readByte();           // km/h

                    const position = this.readAlarmPosition(extra);
                    const alarmLabel = this.readAlarmLabel(extra);

                    this.adasAlarms = {
                        alarmId,
                        alarmStatus: ADAS_STATES[statusByte] ?? statusByte,
                        alarmType: ADAS_TYPES[typeByte] ?? `user-defined (${typeByte})`,
                        alarmLevel,
                        frontVehicleSpeed,
                        frontVehicleDistance,
                        laneDeparture,
                        roadSignType,
                        roadSignValue,
                        vehicleSpeed,
                        ...position,
                        ...alarmLabel,
                    };
                    break;
                }
                case 0x65: {
                    // DSM (Driver Status Monitoring) alarm
                    if (length < DSM_MIN_LENGTH) {
                        console.warn(`DSM item too short: ${length} bytes`);
                        break;
                    }

                    const alarmId = extra.readDWord();
                    const statusByte = extra.readByte();
                    const typeByte = extra.readByte();
                    const alarmLevel = extra.readByte();
                    const fatigueLevel = extra.readByte();

                    extra.skip(4); // reserved

                    const vehicleSpeed = extra.readByte();           // km/h

                    const position =   this.readAlarmPosition(extra);
                    const alarmLabel = this.readAlarmLabel(extra);

                    this.dsmAlarms = {
                        alarmId,
                        alarmStatus: DSM_STATES[statusByte] ?? `Unknown (${statusByte})`,
                        alarmType: DSM_TYPES[typeByte] ?? `Unknown (${typeByte})`,
                        alarmLevel,
                        fatigueLevel,
                        vehicleSpeed,
                        ...position,
                        ...alarmLabel,
                    };
                    break;
                }

                default:
                    //console.warn(`Unknown extra item 0x${id.toString(16)} with length ${length}`);
                    break;
            }
        }

        // while (reader.remaining >= 2) {
        //     const header = reader.readByte();
        //     const extraLength = reader.readByte();

        //     //const extraReader = new BufferReader(reader.readBytes(extraLength));
        //     const extraReader = new BufferReader(reader.readBytes(extraLength));

        //     switch (header) {
        //         case 0x01:
        //             // milleage: 4 bytes *single
        //             // byte 0-3: total mileage
        //             // TODO what is 1/10 km
        //             this.totalMileage = extraReader.readDWord() / 10;
        //             break;

        //         case 0x30:
        //             // mobile signal strength: 1 byte
        //             // byte 0: signal strength
        //             this.mobileSignalStrength = extraReader.readByte();
        //             break;
        //         case 0xF0:
        //             // Base station information: 13 bytes per station
        //             this.baseStationDataArr = [];

        //             while (extraReader.remaining >= 13) {
        //                 const stationData: BaseStationData = {
        //                     MCC: extraReader.readWord(),
        //                     MNC: extraReader.readWord(),
        //                     CI: extraReader.readDWord(),
        //                     LAC: extraReader.readDWord(),
        //                     RSSI: extraReader.readByte()
        //                 };
        //                 this.baseStationDataArr.push(stationData);
        //             }
        //             break;
        //         case 0xF1:
        //             // Power supply: 4 bytes, millivolts
        //             this.powerSupplyMv = extraReader.readDWord();
        //         break;

        //         // case 0x64: {
        //         //     this.adasAlarms = {
        //         //         alarmId: extraReader.readDWord(),
        //         //         //alarmStatus: extraReader.readByte(),
        //         //         alarmStatus: ADAS_STATES[extraReader.readByte()] ?? extraReader.readByte(),
        //         //         //alarmType: extraReader.readByte(),
        //         //         alarmType: ADAS_TYPES[extraReader.readByte()] ?? `user-defined (${extraReader.readByte()})`,
        //         //         alarmLevel: extraReader.readByte(),
        //         //         frontVehicleSpeed: extraReader.readByte(),
        //         //         frontVehicleDistance: extraReader.readByte(),
        //         //         laneDeparture: extraReader.readByte(),
        //         //         roadSignType: extraReader.readByte(),
        //         //         roadSignValue: extraReader.readByte(),
        //         //         vehicleSpeed: extraReader.readByte(),
        //         //         altitude: extraReader.readWord(),
        //         //         latitude: extraReader.readDWord() / 10e5,
        //         //         longitude: extraReader.readDWord() / 10e5,
        //         //         timestamp: decodeBcdDateTime(extraReader.readBytes(6)),
        //         //         vehicleStatus: extraReader.readWord(),
        //         //         alarmLabel: Buffer.from(extraReader.readBytes(16))
        //         //     };

        //         // break;
        //         // }

        //         // case 0x65: {

        //         //     const alarmId = extraReader.readDWord();
        //         //     const alarmStatus = DSM_STATES[extraReader.readByte()] ?? extraReader.readByte();
        //         //     const alarmType = DSM_TYPES[extraReader.readByte()] ?? `user-defined (${extraReader.readByte()})`;
        //         //     const alarmLevel = extraReader.readByte();
        //         //     const fatigueLevel = extraReader.readByte();

        //         //     // Reserved bytes
        //         //     extraReader.skip(4);

        //         //     this.dsmAlarms = {
        //         //         alarmId,
        //         //         alarmStatus,
        //         //         alarmType,
        //         //         alarmLevel,
        //         //         fatigueLevel,
        //         //         vehicleSpeed: extraReader.readByte(),
        //         //         altitude: extraReader.readWord(),
        //         //         latitude: extraReader.readDWord() / 10e5,
        //         //         longitude: extraReader.readDWord() / 10e5,
        //         //         timestamp: decodeBcdDateTime(extraReader.readBytes(6)),
        //         //         vehicleStatus: extraReader.readWord(),
        //         //         alarmLabel: Buffer.from(extraReader.readBytes(16))
        //         //     };

        //         // break;
        //         // }



        //         default:
        //             reader.skip(extraLength);
        //             break;
        //     }
        // }



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