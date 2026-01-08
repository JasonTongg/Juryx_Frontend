import fs from "fs";
import path from "path";
import { getAddress } from "viem";

const userPath = path.join(process.cwd(), "data", "user.json");
const requestPath = path.join(process.cwd(), "data", "request.json");
const sigPath = path.join(process.cwd(), "data", "signature.json"); // New path

// Helper to safely read JSON files
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

        // 1. Get the user's data to find which accounts they sign for
        const userDataStore = readJsonFile(userPath);
        const userProfile = userDataStore[userAddress];

        if (!userProfile || !userProfile.ownerOf) {
            return res.status(200).json({ success: true, requests: [] });
        }

        const accessibleAccounts = userProfile.ownerOf.map(acc => getAddress(acc));

        // 2. Load requests and signatures
        const allRequestsStore = readJsonFile(requestPath);
        const allSignaturesStore = readJsonFile(sigPath); // Read signature data
        const filteredRequests = [];

        Object.keys(allRequestsStore).forEach((accountAddr) => {
            const formattedAccAddr = getAddress(accountAddr);

            if (accessibleAccounts.includes(formattedAccAddr)) {
                // Get signatures specifically for this Smart Account
                const accountSigs = allSignaturesStore[formattedAccAddr] || {};
                const signedBy = Object.keys(accountSigs);
                const currentSignatures = signedBy.length;

                filteredRequests.push({
                    account: formattedAccAddr,
                    ...allRequestsStore[accountAddr],
                    // Attach real-time signature data
                    currentSignatures,
                    approvedBy: signedBy
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