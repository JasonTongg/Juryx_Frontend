import fs from "fs";
import path from "path";
import { getAddress } from "viem";

const dataPath = path.join(process.cwd(), "data", "request.json");

function readRequests() {
    if (!fs.existsSync(dataPath)) return {};
    const content = fs.readFileSync(dataPath, "utf-8");
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
        const allRequests = readRequests();

        // Check if the request exists for this account
        if (!allRequests[formattedAccount]) {
            return res.status(404).json({ error: "Request not found for this account" });
        }

        // Update only the status field
        allRequests[formattedAccount].status = newStatus;

        // Save updated data back to file
        fs.writeFileSync(dataPath, JSON.stringify(allRequests, null, 2));

        return res.status(200).json({
            success: true,
            account: formattedAccount,
            status: newStatus
        });
    } catch (err) {
        console.error("Update Status Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}