import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { purchaseTshirtAction } from "./actions/purchaseTshirt.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3001;
app.get("/api/actions/purchase-tshirt", (req, res) => {
    res.json(purchaseTshirtAction.getMetadata());
});
app.post("/api/actions/purchase-tshirt", async (req, res) => {
    const { account, size } = req.body;
    try {
        const transaction = await purchaseTshirtAction.createTransaction(account, size);
        res.json({ transaction });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
