import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const privateKey: string = process.env.PRIVATE_KEY || "";
if (!privateKey) {
    console.error("Private key is null");
    process.exit(1);
}

const privateKeyBuffer = bs58.decode(privateKey); // convert private key from base58 -> buffer
const keypair = Keypair.fromSecretKey(privateKeyBuffer); // generate keypair from private key buffer

// Convert keypair -> Uint8Array
const secretKeyArrayWrite = Array.from(keypair.secretKey);
// write secret keypair to json file
fs.writeFileSync("my-keypair.json", JSON.stringify(secretKeyArrayWrite));
console.log("✅ Keypair is stored in my-keypair.json");

// Read file
const secretKeyArrayRead = Uint8Array.from(JSON.parse(fs.readFileSync("my-keypair.json", "utf8")));
const keypairRead = Keypair.fromSecretKey(secretKeyArrayRead);
console.log("Public key: ", keypairRead.publicKey.toBase58());
