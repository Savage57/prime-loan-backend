"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBearerToken = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const generateBearerToken = (consumerKey, consumerSecret) => __awaiter(void 0, void 0, void 0, function* () {
    if (!consumerKey || !consumerSecret) {
        throw new Error("Consumer Key or Consumer Secret is missing.");
    }
    const requestBody = {
        consumerKey,
        consumerSecret,
        validityTime: "-1",
    };
    console.log({ authUrl: config_1.authUrl });
    try {
        const response = yield axios_1.default.post(config_1.authUrl, requestBody, {
            headers: { "Content-Type": "application/json" },
        });
        console.log({ auth: "passed" });
        if (response.status !== 200) {
            throw new Error(`Failed to generate access token: ${response.data.message}`);
        }
        return response.data.data.access_token;
    }
    catch (error) {
        console.error("Error generating token:", error.response.data.message || error.message || error);
        throw new Error("Failed to generate bearer token.");
    }
});
exports.generateBearerToken = generateBearerToken;
