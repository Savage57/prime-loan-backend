"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusDescriptions = exports.StatusCode = void 0;
// Enum for all possible status codes
var StatusCode;
(function (StatusCode) {
    StatusCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    StatusCode["INVALID_CREDENTIALS3"] = "INVALID_CREDENTIALS3";
    StatusCode["MISSING_CREDENTIALS"] = "MISSING_CREDENTIALS";
    StatusCode["MISSING_USERID"] = "MISSING_USERID";
    StatusCode["MISSING_APIKEY"] = "MISSING_APIKEY";
    StatusCode["MISSING_MOBILENETWORK"] = "MISSING_MOBILENETWORK";
    StatusCode["INVALID_MOBILENETWORK"] = "INVALID_MOBILENETWORK";
    StatusCode["MISSING_AMOUNT"] = "MISSING_AMOUNT";
    StatusCode["INVALID_AMOUNT"] = "INVALID_AMOUNT";
    StatusCode["MINIMUM_50"] = "MINIMUM_50";
    StatusCode["MINIMUM_200000"] = "MINIMUM_200000";
    StatusCode["INVALID_RECIPIENT"] = "INVALID_RECIPIENT";
    StatusCode["ORDER_RECEIVED"] = "ORDER_RECEIVED";
})(StatusCode || (exports.StatusCode = StatusCode = {}));
// Optional: A map of status codes to their human-readable descriptions
exports.StatusDescriptions = {
    [StatusCode.INVALID_CREDENTIALS]: "The UserID and API key combination is not correct.",
    [StatusCode.INVALID_CREDENTIALS3]: "The UserID and API key combination is not correct.",
    [StatusCode.MISSING_CREDENTIALS]: "The URL format is not valid.",
    [StatusCode.MISSING_USERID]: "Username field is empty.",
    [StatusCode.MISSING_APIKEY]: "API Key field is empty.",
    [StatusCode.MISSING_MOBILENETWORK]: "Mobile network is empty.",
    [StatusCode.INVALID_MOBILENETWORK]: "Mobile network is invalid.",
    [StatusCode.MISSING_AMOUNT]: "Amount is empty.",
    [StatusCode.INVALID_AMOUNT]: "Amount is not valid.",
    [StatusCode.MINIMUM_50]: "Minimum amount is 50.",
    [StatusCode.MINIMUM_200000]: "Maximum amount is 200,000.",
    [StatusCode.INVALID_RECIPIENT]: "An invalid mobile phone number was entered.",
    [StatusCode.ORDER_RECEIVED]: "Your order has been received.",
};
;
;
;
;
;
;
