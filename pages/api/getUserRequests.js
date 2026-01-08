import fs from "fs";
import path from "path";
import { getAddress } from "viem";

const userPath = path.join(process.cwd(), "data", "user.json");
const requestPath = path.join(process.cwd(), "data", "request.json");
const sigPath = path.join(process.cwd(), "data", "signature.json");

function readJsonFile(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, "utf-8");
    return content ? JSON.parse(content) : {};
}

export default function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { address } = req.query;

    if (!address) {
        return res.status(400).json({ error: "User address is required" });
    }

    try {
        const userAddress = getAddress(address);
        const userDataStore = readJsonFile(userPath);
        const userProfile = userDataStore[userAddress];

        if (!userProfile || !userProfile.ownerOf) {
            return res.status(200).json({ success: true, requests: [] });
        }

        const accessibleAccounts = userProfile.ownerOf.map(acc => getAddress(acc));
        const allRequestsStore = readJsonFile(requestPath);
        const allSignaturesStore = readJsonFile(sigPath);
        const filteredRequests = [];

        Object.keys(allRequestsStore).forEach((accountAddr) => {
            const formattedAccAddr = getAddress(accountAddr);

            if (accessibleAccounts.includes(formattedAccAddr)) {
                // Get the signature object for this specific account
                // Format: { "0xSigner1": "0xsig...", "0xSigner2": "0xsig..." }
                const accountSigs = allSignaturesStore[formattedAccAddr] || {};

                // Create a detailed list of signers and their actual signatures
                const signatureDetails = Object.entries(accountSigs).map(([signer, sig]) => ({
                    signerAddress: signer,
                    signature: sig
                }));

                const signedBy = Object.keys(accountSigs);

                filteredRequests.push({
                    account: formattedAccAddr,
                    ...allRequestsStore[accountAddr],
                    currentSignatures: signedBy.length,
                    approvedBy: signedBy, // Just the addresses
                    signatures: signatureDetails // Addresses + Signature Data
                });
            }
        });

        return res.status(200).json({
            success: true,
            requests: filteredRequests
        });

    } catch (err) {
        console.error("getUserRequests Error:", err);
        return res.status(500).json({ error: "Server error", details: err.message });
    }
}