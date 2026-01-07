import fs from "fs";
import path from "path";
import { getAddress } from "viem";

const USER_PATH = path.join(process.cwd(), "data", "user.json");
const SIGNATURE_PATH = path.join(process.cwd(), "data", "signature.json");

/* ---------- helpers ---------- */

function readJson(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/* ---------- API ---------- */

export default function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { account, owner, signature } = req.body;

        if (!account || !owner || !signature) {
            return res.status(400).json({
                error: "account, owner, and signature are required",
            });
        }

        const accountAddr = getAddress(account);
        const ownerAddr = getAddress(owner);

        const userData = readJson(USER_PATH);

        /* ---------- rule 1: account must exist ---------- */

        const accountExists = Object.values(userData).some((u) =>
            u.ownerOf.some((a) => getAddress(a) === accountAddr)
        );

        if (!accountExists) {
            return res.status(200).json({
                success: false,
                reason: "Account address not found",
            });
        }

        /* ---------- rule 2: owner must own account ---------- */

        let ownerRecord = null;

        for (const key of Object.keys(userData)) {
            if (getAddress(key) === ownerAddr) {
                ownerRecord = userData[key];
                break;
            }
        }

        if (
            !ownerRecord ||
            !ownerRecord.ownerOf.some((a) => getAddress(a) === accountAddr)
        ) {
            return res.status(200).json({
                success: false,
                reason: "Owner does not own this account",
            });
        }

        /* ---------- rule 3: signature must NOT already exist ---------- */

        const signatureData = readJson(SIGNATURE_PATH);

        if (
            signatureData[accountAddr] &&
            signatureData[accountAddr][ownerAddr]
        ) {
            return res.status(200).json({
                success: false,
                reason: "Signature already exists",
                account: accountAddr,
                owner: ownerAddr,
            });
        }

        /* ---------- write signature ---------- */

        if (!signatureData[accountAddr]) {
            signatureData[accountAddr] = {};
        }

        signatureData[accountAddr][ownerAddr] = signature;

        writeJson(SIGNATURE_PATH, signatureData);

        return res.status(200).json({
            success: true,
            account: accountAddr,
            owner: ownerAddr,
        });
    } catch (err) {
        console.error("addSignature error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
