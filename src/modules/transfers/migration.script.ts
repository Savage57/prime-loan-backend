/**
 * Migration script: Transactions -> Transfers_v2
 * Safely copies existing transactions into the new structured transfer model.
 */

import mongoose from "mongoose";
import { Transfer, Transaction } from "./transfer.model"; // new model
import { Transaction as ITransaction, Transfer as ITransfer } from './transfer.interface';
import User from "../users/user.model";
import { DB_URL, DB_OPTIONS } from "../../config";

const BATCH_SIZE = 500;

async function migrateTransactions() {
  await mongoose.connect(DB_URL as string, DB_OPTIONS);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  const cursor = Transaction.find().cursor();

  for await (const tx of cursor) {
    const user = await User.findById(tx.user);
    if(user) {
        try {
            // Map legacy transaction -> new transfer
            const transferDoc: Partial<ITransfer> = {
                userId: tx.user,
                traceId: tx.session_id || tx._id.toString(), // fallback if no traceId
                fromAccount: user.user_metadata.accountNo, // default assumption
                toAccount: tx.account_number,
                amount: tx.amount, // convert naira → kobo
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
            const exists = await Transfer.findOne({ reference: transferDoc.reference });
            if (exists) {
                skipped++;
                continue;
            }

            await Transfer.create(transferDoc);
            migrated++;
        } catch (err) {
            console.error("Failed to migrate transaction:", tx._id, err);
            failed++;
        }
    } else {
        console.log(`User With ID: ${tx.user} Not Found.`)
    }
  }

  console.log(`✅ Migration completed`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (already exists): ${skipped}`);
  console.log(`Failed: ${failed}`);

  await mongoose.disconnect();
}

function normalizeStatus(status: string): "PENDING" | "COMPLETED" | "FAILED" {
  const s = status.toLowerCase();
  if (s.includes("pending")) return "PENDING";
  if (s.includes("success") || s.includes("complete")) return "COMPLETED";
  return "FAILED";
}

migrateTransactions().catch(err => {
  console.error("Migration script failed:", err);
  process.exit(1);
});
