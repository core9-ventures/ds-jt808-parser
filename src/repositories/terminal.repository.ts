//import sql from "mssql";
import { RegistrationResult, type RegistrationOutcome, type ITerminalRepository, type TerminalRegistration } from "../types";

export class TerminalRepository implements ITerminalRepository {

    // constructor(u
    //     private readonly pool: sql.ConnectionPool
    // ) {}

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
}