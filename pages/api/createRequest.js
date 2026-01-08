import fs from "fs";
import path from "path";
import { getAddress, createPublicClient, http } from "viem";
import { mainnet, sepolia } from "viem/chains";

const dataPath = path.join(process.cwd(), "data", "request.json");

const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
});

function readRequests() {
    if (!fs.existsSync(dataPath)) {
        const dir = path.dirname(dataPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        return {};
    }
    const content = fs.readFileSync(dataPath, "utf-8");
    return content ? JSON.parse(content) : {};
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { accountAddress, target, value, data, reason, note, abi } = req.body;

    if (!accountAddress || !target) {
        return res.status(400).json({ error: "Account and Target addresses are required" });
    }

    try {
        const formattedAccount = getAddress(accountAddress);
        const formattedTarget = getAddress(target);

        const threshold = await publicClient.readContract({
            address: formattedAccount,
            abi: [
                {
                    "inputs": [],
                    "name": "threshold",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ],
            functionName: "threshold",
        });

        const allRequests = readRequests();

        const newRequest = {
            targetAddress: formattedTarget,
            value: value || "0",
            data: data || "0x",
            reason: reason || "",
            note: note || "",
            status: "pending",
            threshold: Number(threshold),
            approvedBy: [],
            createdAt: new Date().toISOString(),
        };

        allRequests[formattedAccount] = newRequest;

        fs.writeFileSync(dataPath, JSON.stringify(allRequests, null, 2));

        return res.status(200).json({ success: true, request: newRequest });
    } catch (err) {
        console.error("API Error:", err);
        return res.status(500).json({ error: "Failed to save request", details: err.message });
    }
}