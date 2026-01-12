import fs from "fs";
import path from "path";
import { getAddress } from "viem";

const requestPath = path.join(process.cwd(), "data", "request.json");
const executedPath = path.join(process.cwd(), "data", "executedRequest.json");

// Helper to read JSON files safely
function readJson(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, "utf-8");
    return content ? JSON.parse(content) : {};
}

export default function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { accountAddress, newStatus } = req.body;

    if (!accountAddress || !newStatus) {
        return res.status(400).json({ error: "Missing accountAddress or newStatus" });
    }

    try {
        const formattedAccount = getAddress(accountAddress);
        const allPending = readJson(requestPath);

        // Check if the pending request exists
        if (!allPending[formattedAccount]) {
            return res.status(404).json({ error: "Request not found for this account" });
        }

        if (newStatus.toLowerCase() === "executed") {
            // 1. Prepare the data to be moved
            const requestToMove = {
                ...allPending[formattedAccount],
                status: "Executed",
                executedAt: new Date().toISOString()
            };

            // 2. Read current execution history
            const allExecuted = readJson(executedPath);

            // 3. Initialize array for this account if it doesn't exist
            if (!Array.isArray(allExecuted[formattedAccount])) {
                allExecuted[formattedAccount] = [];
            }

            // 4. Add the new record to the history array
            allExecuted[formattedAccount].push(requestToMove);

            // 5. Remove from pending requests
            delete allPending[formattedAccount];

            // 6. Write both files back to disk
            fs.writeFileSync(executedPath, JSON.stringify(allExecuted, null, 2));
            fs.writeFileSync(requestPath, JSON.stringify(allPending, null, 2));

            return res.status(200).json({
                success: true,
                message: "Transaction moved to execution history",
                account: formattedAccount
            });
        } else {
            // Standard update (e.g., Pending -> Ready)
            allPending[formattedAccount].status = newStatus;
            fs.writeFileSync(requestPath, JSON.stringify(allPending, null, 2));

            return res.status(200).json({
                success: true,
                account: formattedAccount,
                status: newStatus
            });
        }
    } catch (err) {
        console.error("File Update Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}