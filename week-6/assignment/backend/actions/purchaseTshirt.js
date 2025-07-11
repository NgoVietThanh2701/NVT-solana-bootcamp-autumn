import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import dotenv from "dotenv";

dotenv.config();
const NETWORK = process.env.SOLANA_NETWORK || "devnet";
const CONNECTION = new Connection(`https://api.${NETWORK}.solana.com`);
const STORE_PUBKEY = new PublicKey(process.env.STORE_PUBKEY);
export const purchaseTshirtAction = {
    getMetadata: () => ({
        icon: "https://your-domain.com/tshirt-icon.png",
        title: "T-Shirt Store",
        description: "Purchase a cool Solana t-shirt",
        label: "Buy T-Shirt",
        links: {
            actions: [
                { label: "Buy Small", href: "/api/actions/purchase-tshirt?size=small" },
                { label: "Buy Medium", href: "/api/actions/purchase-tshirt?size=medium" },
                { label: "Buy Large", href: "/api/actions/purchase-tshirt?size=large" },
                {
                    label: "Custom Size",
                    href: "/api/actions/purchase-tshirt?size={size}",
                    parameters: [{ name: "size", label: "Enter size" }],
                },
            ],
        },
    }),
    createTransaction: async (account, size) => {
        const buyerPubkey = new PublicKey(account);
        const price = 0.1 * 1e9; // 0.1 SOL in lamports
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: buyerPubkey,
                toPubkey: STORE_PUBKEY,
                lamports: price,
            }),
        );
        transaction.feePayer = buyerPubkey;
        transaction.recentBlockhash = (await CONNECTION.getLatestBlockhash()).blockhash;
        return transaction.serialize({ requireAllSignatures: false }).toString("base64");
    },
};
