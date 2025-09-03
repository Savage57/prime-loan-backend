"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_VERIFICATION_CODE_EXPIRES_IN = exports.EMAIL_INTERVAL = exports.EMAIL_PORT_NUMBER = exports.EMAIL_HOST = exports.EMAIL_PASSWORD = exports.EMAIL_USERNAME = exports.LOG_DIRECTORY = exports.REFRESH_TOKEN_SECRET = exports.ACCESS_TOKEN_SECRET = exports.REDIS_CREDENTIALS = exports.CRYPTOJS_KEY = exports.DB_OPTIONS = exports.DB_URL = exports.PORT = exports.CLUB_KONNECT_API_URLs = exports.LOAN_PENALTY_PCT_PER_DAY = exports.LOAN_AUTO_APPROVAL_MAX_KOBO = exports.REFUND_TIMEOUT_MS = exports.POLL_BATCH_SIZE = exports.POLL_INTERVAL_MS = exports.FEATURE_OCR = exports.FEATURE_AUTO_APPROVAL = exports.FEATURE_LEDGER = exports.APIAUTH = exports.CLUB_KONNECT_API_URL = exports.CLUB_KONNECT_API_USER_ID = exports.CLUB_KONNECT_API_KEY = exports.authUrl = exports.baseUrl = exports.customerSecret = exports.customerKey = void 0;
require("../config/envConfig");
const PORT = process.env.PORT || 3000;
exports.PORT = PORT;
exports.customerKey = process.env.CUSTOMER_KEY;
exports.customerSecret = process.env.CUSTOMER_SECRET;
exports.baseUrl = process.env.BASE_URL;
exports.authUrl = process.env.AUTH_URL;
const CRYPTOJS_KEY = process.env.CRYPTOJS_KEY;
exports.CRYPTOJS_KEY = CRYPTOJS_KEY;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
exports.ACCESS_TOKEN_SECRET = ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
exports.REFRESH_TOKEN_SECRET = REFRESH_TOKEN_SECRET;
const EMAIL_VERIFICATION_CODE_EXPIRES_IN = process.env.EMAIL_VERIFICATION_CODE_EXPIRES_IN;
exports.EMAIL_VERIFICATION_CODE_EXPIRES_IN = EMAIL_VERIFICATION_CODE_EXPIRES_IN;
// Define specific types for the variables
const DB_URL = process.env.DB_URL;
exports.DB_URL = DB_URL;
const DB_OPTIONS = {
    autoIndex: true,
    minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '5'), // Maintain up to x socket connections
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '20'), // Maintain up to x socket connections
    connectTimeoutMS: 60000, // Give up initial connection after 60 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    // @ts-ignore
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true,
    dbName: process.env.DATABASE_NAME,
};
exports.DB_OPTIONS = DB_OPTIONS;
const LOG_DIRECTORY = process.env.LOG_DIRECTORY || '';
exports.LOG_DIRECTORY = LOG_DIRECTORY;
const REDIS_CREDENTIALS = {
    host: process.env.REDIS_HOST || '',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
};
exports.REDIS_CREDENTIALS = REDIS_CREDENTIALS;
const EMAIL_USERNAME = process.env.EMAIL_USERNAME;
exports.EMAIL_USERNAME = EMAIL_USERNAME;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
exports.EMAIL_PASSWORD = EMAIL_PASSWORD;
const EMAIL_HOST = process.env.EMAIL_HOST;
exports.EMAIL_HOST = EMAIL_HOST;
const EMAIL_PORT_NUMBER = process.env.EMAIL_PORT_NUMBER;
exports.EMAIL_PORT_NUMBER = EMAIL_PORT_NUMBER;
const EMAIL_INTERVAL = process.env.EMAIL_INTERVAL;
exports.EMAIL_INTERVAL = EMAIL_INTERVAL;
exports.CLUB_KONNECT_API_KEY = process.env.CLUB_KONNECT_API_KEY;
exports.CLUB_KONNECT_API_USER_ID = process.env.CLUB_KONNECT_API_USER_ID;
exports.CLUB_KONNECT_API_URL = process.env.CLUB_KONNECT_API_URL;
exports.APIAUTH = `?UserID=${exports.CLUB_KONNECT_API_USER_ID}&APIKey=${exports.CLUB_KONNECT_API_KEY}`;
// V2 Configuration
exports.FEATURE_LEDGER = process.env.FEATURE_LEDGER === 'true';
exports.FEATURE_AUTO_APPROVAL = process.env.FEATURE_AUTO_APPROVAL === 'true';
exports.FEATURE_OCR = process.env.FEATURE_OCR === 'true';
exports.POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '30000');
exports.POLL_BATCH_SIZE = parseInt(process.env.POLL_BATCH_SIZE || '100');
exports.REFUND_TIMEOUT_MS = parseInt(process.env.REFUND_TIMEOUT_MS || '86400000');
exports.LOAN_AUTO_APPROVAL_MAX_KOBO = parseInt(process.env.LOAN_AUTO_APPROVAL_MAX_KOBO || '5000000');
exports.LOAN_PENALTY_PCT_PER_DAY = parseFloat(process.env.LOAN_PENALTY_PCT_PER_DAY || '1');
exports.CLUB_KONNECT_API_URLs = {
    check_wallet_balance: () => `${exports.CLUB_KONNECT_API_URL}/APIWalletBalanceV1.asp${exports.APIAUTH}`,
    query_transaction: (OrderID) => `${exports.CLUB_KONNECT_API_URL}/APIQueryV1.asp${exports.APIAUTH}&OrderID=${OrderID}`,
    cancel_transaction: (OrderID) => `${exports.CLUB_KONNECT_API_URL}/APICancelV1.asp${exports.APIAUTH}&OrderID=${OrderID}`,
    buy_airtime: (Amount, MobileNumber, MobileNetwork, BOnusType) => `${exports.CLUB_KONNECT_API_URL}/APIAirtimeV1.asp${exports.APIAUTH}&Amount=${Amount}&MobileNumber=${MobileNumber}&MobileNetwork=${MobileNetwork}${BOnusType ? `&BonusType=${BOnusType}` : ''}`,
    data_plans: () => `${exports.CLUB_KONNECT_API_URL}/APIDatabundlePlansV2.asp?UserID=${exports.CLUB_KONNECT_API_USER_ID}`,
    buy_data: (DataPlan, MobileNumber, MobileNetwork) => `${exports.CLUB_KONNECT_API_URL}/APIDatabundleV1.asp${exports.APIAUTH}&DataPlan=${DataPlan}&MobileNumber=${MobileNumber}&MobileNetwork=${MobileNetwork}`,
    tv_packages: () => `${exports.CLUB_KONNECT_API_URL}/APICableTVPackagesV2.asp`,
    verify_tv_no: (CableTV, SmartCardNo) => `${exports.CLUB_KONNECT_API_URL}/APIVerifyCableTVV1.0.asp${exports.APIAUTH}&CableTV=${CableTV}&SmartCardNo=${SmartCardNo}`,
    buy_tv: (CableTV, Package, SmartCardNo, PhoneNo) => `${exports.CLUB_KONNECT_API_URL}/APICableTVV1.asp${exports.APIAUTH}&CableTV=${CableTV}&Package=${Package}&SmartCardNo=${SmartCardNo}&PhoneNo=${PhoneNo}`,
    power_subscriptions: () => `${exports.CLUB_KONNECT_API_URL}/APIElectricityDiscosV1.asp`,
    verify_power_no: (ElectricCompany, meterno) => `${exports.CLUB_KONNECT_API_URL}/APIVerifyElectricityV1.asp${exports.APIAUTH}&ElectricCompany=${ElectricCompany}&meterno=${meterno}`,
    buy_power: (ElectricCompany, MeterType, MeterNo, Amount, PhoneNo) => `${exports.CLUB_KONNECT_API_URL}/APIElectricityV1.asp${exports.APIAUTH}&ElectricCompany=${ElectricCompany}&MeterType=${MeterType}&MeterNo=${MeterNo}&Amount=${Amount}&PhoneNo=${PhoneNo}`,
    betting_platforms: () => `${exports.CLUB_KONNECT_API_URL}/APIBettingCompaniesV2.asp`,
    verify_betting_no: (BettingCompany, CustomerID) => `${exports.CLUB_KONNECT_API_URL}/APIVerifyBettingV1.asp${exports.APIAUTH}&BettingCompany=${BettingCompany}&CustomerID=${CustomerID}`,
    buy_betting: (BettingCompany, CustomerID, Amount) => `${exports.CLUB_KONNECT_API_URL}/APIBettingV1.asp${exports.APIAUTH}&BettingCompany=${BettingCompany}&CustomerID=${CustomerID}&Amount=${Amount}`,
    internet_plans: (MobileNetwork) => `${exports.CLUB_KONNECT_API_URL}/${MobileNetwork == "smile-direct" ? "APISmilePackagesV2" : "APISpectranetPackagesV2"}.asp`,
    verify_smile_no: (MobileNetwork, MobileNumber) => `${exports.CLUB_KONNECT_API_URL}/APIVerifySmileV1.asp${exports.APIAUTH}&MobileNetwork=${MobileNetwork}&MobileNumber=${MobileNumber}`,
    buy_internet: (MobileNetwork, DataPlan, MobileNumber) => `${exports.CLUB_KONNECT_API_URL}/${MobileNetwork == "smile-direct" ? "APIElectricityV1" : "APISpectranetV1"}.asp${exports.APIAUTH}&MobileNetwork=${MobileNetwork}&DataPlan=${DataPlan}&MobileNumber=${MobileNumber}`,
    waec_types: () => `${exports.CLUB_KONNECT_API_URL}/APIWAECPackagesV2.asp`,
    buy_waec: (ExamType, PhoneNo) => `${exports.CLUB_KONNECT_API_URL}/APIWAECV1.asp${exports.APIAUTH}&ExamType=${ExamType}&PhoneNo=${PhoneNo}`,
    jamb_types: () => `${exports.CLUB_KONNECT_API_URL}/APIJAMBPackagesV2.asp`,
    verify_jamb_no: (ExamType, ProfileID) => `${exports.CLUB_KONNECT_API_URL}/APIVerifyJAMBV1.asp${exports.APIAUTH}&ExamType=${ExamType}&ProfileID=${ProfileID}`,
    buy_jamb: (ExamType, PhoneNo) => `${exports.CLUB_KONNECT_API_URL}/APIJAMBV1.asp${exports.APIAUTH}&ExamType=${ExamType}&PhoneNo=${PhoneNo}`,
};
