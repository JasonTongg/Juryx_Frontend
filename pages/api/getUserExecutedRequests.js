import fs from "fs";
import path from "path";
import { getAddress } from "viem";

const userPath = path.join(process.cwd(), "data", "user.json");
const executedPath = path.join(process.cwd(), "data", "executedRequest.json");

function readJson(filePath) {
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
        return res.status(400).json({ error: "Missing user address" });
    }

    try {
        const formattedUserAddress = getAddress(address);
        const userData = readJson(userPath);
        const allExecutedData = readJson(executedPath);

        const userProfile = userData[formattedUserAddress];
        const ownedSmartAccounts = userProfile?.ownerOf || [];

        const userHistory = {};

        ownedSmartAccounts.forEach((smartAccount) => {
            const checksummedAccount = getAddress(smartAccount);
            if (allExecutedData[checksummedAccount]) {
                userHistory[checksummedAccount] = allExecutedData[checksummedAccount];
            }
        });

        return res.status(200).json({
            success: true,
            user: formattedUserAddress,
            history: userHistory
        });
    } catch (err) {
        console.error("Fetch Execution History Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}