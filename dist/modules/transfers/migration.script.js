"use strict";
/**
 * Migration script: Transactions -> Transfers_v2
 * Safely copies existing transactions into the new structured transfer model.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const transfer_model_1 = require("./transfer.model"); // new model
const user_model_1 = __importDefault(require("../users/user.model"));
const config_1 = require("../../config");
const BATCH_SIZE = 500;
function migrateTransactions() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        yield mongoose_1.default.connect(config_1.DB_URL, config_1.DB_OPTIONS);
        let migrated = 0;
        let skipped = 0;
        let failed = 0;
        const cursor = transfer_model_1.Transaction.find().cursor();
        try {
            for (var _d = true, cursor_1 = __asyncValues(cursor), cursor_1_1; cursor_1_1 = yield cursor_1.next(), _a = cursor_1_1.done, !_a; _d = true) {
                _c = cursor_1_1.value;
                _d = false;
                const tx = _c;
                const user = yield user_model_1.default.findById(tx.user);
                if (user) {
                    try {
                        // Map legacy transaction -> new transfer
                        const transferDoc = {
                            userId: tx.user,
                            traceId: tx.session_id || tx._id.toString(), // fallback if no traceId
                            fromAccount: user.user_metadata.accountNo, // default assumption
                            toAccount: tx.account_number,
                            amount: tx.amount * 100, // convert naira → kobo
                            transferType: "inter", // legacy didn’t distinguish intra/inter
                            status: normalizeStatus(tx.status),
                            reference: tx.transaction_number,
                            beneficiaryName: tx.receiver,
                            bankCode: tx.bank,
                            remark: tx.details,
                            processedAt: new Date(tx.updatedAt),
                            meta: {
                                legacyId: tx._id,
                                legacyActivity: tx.activity,
                                legacyOutstanding: tx.outstanding,
                                legacyMessage: tx.message
                            }
                        };
                        // Check if already exists in transfers_v2
                        const exists = yield transfer_model_1.Transfer.findOne({ reference: transferDoc.reference });
                        if (exists) {
                            skipped++;
                            continue;
                        }
                        yield transfer_model_1.Transfer.create(transferDoc);
                        migrated++;
                    }
                    catch (err) {
                        console.error("Failed to migrate transaction:", tx._id, err);
                        failed++;
                    }
                }
                else {
                    console.log(`User With ID: ${tx.user} Not Found.`);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = cursor_1.return)) yield _b.call(cursor_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        console.log(`✅ Migration completed`);
        console.log(`Migrated: ${migrated}`);
        console.log(`Skipped (already exists): ${skipped}`);
        console.log(`Failed: ${failed}`);
        yield mongoose_1.default.disconnect();
    });
}
function normalizeStatus(status) {
    const s = status.toLowerCase();
    if (s.includes("pending"))
        return "PENDING";
    if (s.includes("success") || s.includes("complete"))
        return "COMPLETED";
    return "FAILED";
}
migrateTransactions().catch(err => {
    console.error("Migration script failed:", err);
    process.exit(1);
});
