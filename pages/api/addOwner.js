import fs from "fs";
import path from "path";
import { getAddress } from "viem";

const dataPath = path.join(process.cwd(), "data", "user.json");

function readData() {
    if (!fs.existsSync(dataPath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
}

function writeData(data) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

export default function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { account, owners } = req.body;

    if (!account || !Array.isArray(owners) || owners.length === 0) {
        return res.status(400).json({
            error: "Require account and owners[]",
        });
    }

    let data = readData();

    const accountAddr = getAddress(account);
    const addedTo = [];

    owners.forEach((owner) => {
        const ownerAddr = getAddress(owner);

        // Create owner if missing
        if (!data[ownerAddr]) {
            data[ownerAddr] = {
                factory: "",
                ownerOf: [],
            };
        }

        if (!data[ownerAddr].ownerOf.includes(accountAddr)) {
            data[ownerAddr].ownerOf.push(accountAddr);
            addedTo.push(ownerAddr);
        }
    });

    writeData(data);

    return res.status(200).json({
        success: true,
        account: accountAddr,
        addedTo,
    });
}
