//import sql from "mssql";
import { pool } from "../config/database";
import { RegistrationResult, type RegistrationOutcome, type ITerminalRepository, type TerminalRegistration, type AlarmDto, type DsmAlarm, type AdasAlarm } from "../types";
import pg from 'pg'
const { Pool, Client } = pg

export class TerminalRepository implements ITerminalRepository {

    // constructor(u
    //     private readonly pool: sql.ConnectionPool
    // ) {}


    async create(device_number: string, alarm: DsmAlarm): Promise<any> {
        const alarmNumber = crypto.randomUUID().replace(/-/g, "");
        const query = `
        INSERT INTO alarms_dsm (
            device_number,
            alarm_id,
            alarm_type,
            alarm_number,
            latitude,
            longitude,
            attachment_count,
            alarm_speed,
            alarm_time
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    `;

        const values = [
            device_number,
            alarm.alarm_id ?? null,
            alarm.alarm_type ?? null,
            alarmNumber,
            alarm.latitude ?? null,
            alarm.longitude ?? null,
            alarm.attachment_count ?? 0,
            alarm.vehicle_speed ?? null,
            alarm.alarm_time ?? null
        ];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error("Database query error dsm:", error);
            throw error;
        }
    }

    async createAdasAlarm(device_number: string, alarm: AdasAlarm): Promise<any> {
        const alarmNumber = crypto.randomUUID().replace(/-/g, "");
        const query = `
        INSERT INTO alarms_adas (
            device_number,
            alarm_id,
            alarm_type,
            alarm_number,
            latitude,
            longitude,
            attachment_count,
            alarm_speed,
            alarm_time
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    `;

        const values = [
            device_number,
            alarm.alarm_id ?? null,
            alarm.alarm_type ?? null,
            alarmNumber,
            alarm.latitude ?? null,
            alarm.longitude ?? null,
            alarm.attachment_count ?? 0,
            alarm.vehicle_speed ?? null,
            alarm.alarm_time ?? null
        ];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error("Database query error adas:", error);
            throw error;
        }
    }

    async register(

        deviceNumber: string,
        registration: TerminalRegistration,
        proposedAuthenticationCode: string

    ): Promise<RegistrationOutcome> {

        // const request = this.pool.request();

        // request.input("deviceNumber", sql.VarChar(20), deviceNumber);
        // request.input("TerminalId", sql.VarChar(50), registration.terminalId);
        // request.input("VehicleNumber", sql.VarChar(30), registration.vehicleNumber);
        // request.input("ProvinceId", sql.Int, registration.provinceId);
        // request.input("CityId", sql.Int, registration.cityId);
        // request.input("ManufacturerId", sql.VarChar(30), registration.manufacturerId);
        // request.input("TerminalModel", sql.VarChar(50), registration.terminalModel);
        // request.input("PlateColor", sql.TinyInt, registration.plateColor);
        // request.input("AuthenticationCode", sql.VarChar(64), proposedAuthenticationCode);

        // const result = await request.execute("dbo.RegisterJt808Terminal");

        // const row = result.recordset[0];

        return {
            result: RegistrationResult.Success,
            authenticationCode: "AUTH123456"
        };

    }

    async findAuthenticationCode(
        deviceNumber: string
    ): Promise<string | null> {



        return null
    }


}