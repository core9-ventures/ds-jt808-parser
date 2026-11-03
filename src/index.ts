import * as net from "node:net";

import { JT808FrameDecoder } from "./decoder/frame-decoder";
import { validateFrame } from "./decoder/frame-validator";

import { JT808HeaderParser } from "./protocol/parsers/header-parser";
import { SerialGenerator } from "./protocol/serial-generator";
import { JT808ResponseEncoder } from "./protocol/responses/response-encoder";
import { GeneralResponse } from "./protocol/responses/general-response";
import { JT808MessageHandler } from "./protocol/handlers/message-handler";
import { RegistrationParser } from "./protocol/parsers/registration-parser";
import { RegistrationResponse } from "./protocol/responses/registration-response";
import { RegistrationService } from "./services/registration-service";
import { InMemoryTerminalRepository } from "./repositories/in-memory-terminal.repository";
import { AuthenticationParser } from "./protocol/parsers/authentication-parser";
import { AuthenticationService } from "./services/authentication.service";
import { LocationParser } from "./protocol/parsers/location-parser";
import { RegistrationHandler } from "./protocol/handlers/registration-handler";
import { AuthenticationHandler } from "./protocol/handlers/authentication-handler";
import { LocationHandler } from "./protocol/handlers/location-handler";
import { TerminalRepository } from "./repositories/terminal.repository";


const PORT = 7618;
//const PORT = 20021;

const server = net.createServer((socket) => {

    console.log("Device connected:", socket.remoteAddress);

    const decoder = new JT808FrameDecoder(8192);

    //const pool = await sql.connect(dbConfig);
    const sqlRepository = new TerminalRepository();

    const headerParser = new JT808HeaderParser();
    const registrationParser = new RegistrationParser();
    const authenticationParser = new AuthenticationParser();
    const locationParser = new LocationParser();
    
    const serialGenerator = new SerialGenerator();
    
    //const registrationRepository = new InMemoryTerminalRepository(); 

    const responseEncoder = new JT808ResponseEncoder(serialGenerator);
    
    const generalResponse = new GeneralResponse(responseEncoder);
    const registrationResponse = new RegistrationResponse(responseEncoder);
    
    const registrationService = new RegistrationService(sqlRepository);
    const authenticationService = new AuthenticationService(sqlRepository);

    const registrationHandler = new RegistrationHandler(
        registrationParser,
        registrationService,
        registrationResponse
    );

     const authenticationHandler = new AuthenticationHandler(
        authenticationParser,
        authenticationService,
        generalResponse
    );

    const locationHandler = new LocationHandler(
        locationParser,
        registrationService,
        generalResponse
    );

    const messageHandler = new JT808MessageHandler(
        generalResponse,
        registrationHandler,
        locationHandler,
        authenticationHandler,
    );



    
    socket.on("data", async(chunk: Buffer) => {

        try {
            // Step 0: Handling incoming TCP chunk in multiple frames.
            const frames = decoder.push(chunk);

            for (const rawFrame of frames) {

                try {

                    // Step 1: Validate frame.
                    const validated = validateFrame(rawFrame);

                    // Step 2: Parse header.
                    const parsed = headerParser.parse(validated.data);

                    // Step 3: Display metadata.
                    console.log("Received message:", {
                        messageId: `0x${parsed.header.messageId
                            .toString(16)
                            .padStart(4, "0")}`,
                        deviceNumber: parsed.header.deviceNumber,
                        serialNumber: parsed.header.messageSerialNumber
                    });

                    const response = await messageHandler.handle(
                        parsed.header,
                        parsed.body,
                        validated.raw
                    );

                    if (response) {
                        socket.write(response);
                    }

                
                } catch (error) {

                    console.error(
                        "JT808 parsing error:",
                        error instanceof Error
                            ? error.message
                            : error
                    );
                }
            }

        } catch (error) {
            console.error("Frame decoding error:", error);
            decoder.reset();
        }
    });

    socket.on("close", () => {
        decoder.reset();
    });

});

server.listen(PORT, () => {
    console.log(`JT808 server running on port ${PORT}`);
});