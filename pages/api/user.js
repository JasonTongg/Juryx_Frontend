import fs from "fs";
import path from "path";
import { getAddress } from "viem";

const DATA_PATH = path.join(process.cwd(), "data", "user.json");

/* ---------------- Utilities ---------------- */

function readData() {
    if (!fs.existsSync(DATA_PATH)) {
        fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
        fs.writeFileSync(DATA_PATH, JSON.stringify({}, null, 2));
    }

    return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
}

function writeData(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

/* ---------------- API Handler ---------------- */

export default function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { owner, factory, account } = req.body;

        if (!owner || !factory || !account) {
            return res.status(400).json({
                error: "owner, factory, and account are required",
            });
        }

        const ownerAddr = getAddress(owner);
        const factoryAddr = getAddress(factory);
        const accountAddr = getAddress(account);

        const data = readData();

        if (data[ownerAddr]?.factory === undefined || data[ownerAddr]?.factory === "") {
            data[ownerAddr] = {
                factory: factoryAddr,
                ownerOf: [],
            };
        } else {
            return res.status(409).json({
                error: "Owner already linked to a different factory",
            });
        }

        if (!data[ownerAddr].ownerOf.includes(accountAddr)) {
            data[ownerAddr].ownerOf.push(accountAddr);
            data[ownerAddr].deployedAccounts = accountAddr;
        }

        writeData(data);

        return res.status(200).json({
            success: true,
            owner: ownerAddr,
            factory: factoryAddr,
            accounts: data[ownerAddr].ownerOf,
        });
    } catch (err) {
        console.error("API error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
