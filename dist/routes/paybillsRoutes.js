"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paybillsController_1 = require("../controllers/paybillsController");
const middlewares_1 = require("../middlewares");
const paybillsReqBodyValidationSchema_1 = require("../validations/paybillsReqBodyValidationSchema");
const router = express_1.default.Router();
// POST routes
router.post("/airtime", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(paybillsReqBodyValidationSchema_1.airtimeSchema), paybillsController_1.buyAirtime);
router.post("/data", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(paybillsReqBodyValidationSchema_1.dataSchema), paybillsController_1.buyData);
router.post("/waec", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(paybillsReqBodyValidationSchema_1.waecSchema), paybillsController_1.buyWaec);
router.post("/tv", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(paybillsReqBodyValidationSchema_1.tvSchema), paybillsController_1.buyTv);
router.post("/power", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(paybillsReqBodyValidationSchema_1.powerSchema), paybillsController_1.buyPower);
router.post("/betting", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(paybillsReqBodyValidationSchema_1.bettingSchema), paybillsController_1.buyBetting);
router.post("/internet", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(paybillsReqBodyValidationSchema_1.internetSchema), paybillsController_1.buyInternet);
router.post("/jamb", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(paybillsReqBodyValidationSchema_1.jambSchema), paybillsController_1.buyJamb);
// GET routes (Verifications)
router.get("/verify/tv", (0, middlewares_1.verifyJwtRest)(), paybillsController_1.verifyTvNumber);
router.get("/verify/power", (0, middlewares_1.verifyJwtRest)(), paybillsController_1.verifyPowerNumber);
router.get("/verify/betting", (0, middlewares_1.verifyJwtRest)(), paybillsController_1.verifyBettingNumber);
router.get("/verify/smile", (0, middlewares_1.verifyJwtRest)(), paybillsController_1.verifySmileNumber);
router.get("/verify/jamb", (0, middlewares_1.verifyJwtRest)(), paybillsController_1.verifyJambNumber);
// Transaction operations
router.get("/transaction/:orderId", (0, middlewares_1.verifyJwtRest)(), paybillsController_1.queryTransaction);
router.delete("/transaction/:orderId", (0, middlewares_1.verifyJwtRest)(), paybillsController_1.cancelTransaction);
// GET options
router.get("/packages/tv", (0, middlewares_1.verifyJwtRest)(), paybillsController_1.getTvPackages);
router.get("/packages/data", (0, middlewares_1.verifyJwtRest)(), paybillsController_1.getDataPlans);
router.get("/packages/internet", (0, middlewares_1.verifyJwtRest)(), paybillsController_1.getInternetPlans);
router.get("/packages/waec", (0, middlewares_1.verifyJwtRest)(), paybillsController_1.getWaecTypes);
router.get("/packages/jamb", (0, middlewares_1.verifyJwtRest)(), paybillsController_1.getJambTypes);
router.get("/platforms/betting", (0, middlewares_1.verifyJwtRest)(), paybillsController_1.getBettingPlatforms);
router.get("/platforms/power", (0, middlewares_1.verifyJwtRest)(), paybillsController_1.getPowerSubscriptions);
exports.default = router;
