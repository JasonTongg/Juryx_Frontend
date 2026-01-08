import fs from "fs";
import path from "path";
import { getAddress } from "viem";

const dataPath = path.join(process.cwd(), "data", "user.json");

export default function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { address } = req.query;

    if (!address) {
        return res.status(400).json({ error: "Address query parameter is required" });
    }

    try {
        const formattedAddress = getAddress(address);

        if (!fs.existsSync(dataPath)) {
            return res.status(404).json({ error: "Database file not found" });
        }

        const fileContent = fs.readFileSync(dataPath, "utf-8");
        const data = JSON.parse(fileContent);

        const userData = data[formattedAddress];

        if (!userData) {
            return res.status(404).json({
                error: "User not found",
                exists: false,
            });
        }

        return res.status(200).json({
            success: true,
            address: formattedAddress,
            factory: userData.factory,
            ownerOf: userData.ownerOf || [],
            deployedAccounts: userData.deployedAccounts || "",
        });

    } catch (err) {
        console.error("API Error:", err);
        return res.status(500).json({
            error: "Invalid address format or server error",
            details: err.message
        });
    }
}