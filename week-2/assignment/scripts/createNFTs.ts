/**
 * Demonstrates how to mint NFTs and store their metadata on chain using the Metaplex MetadataProgram
 * CORE ASSETS
 */

import { create, mplCore } from "@metaplex-foundation/mpl-core";
import { createGenericFile, generateSigner, keypairIdentity } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { base58 } from "@metaplex-foundation/umi/serializers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { readFile } from "fs/promises";
dotenv.config();

(async () => {
    const umi = createUmi("https://api.devnet.solana.com")
        .use(mplCore())
        .use(
            irysUploader({
                address: "https://devnet.irys.xyz",
            }),
        );

    const walletPath = process.env.LOCAL_PAYER_JSON_ABSPATH ?? "";
    const walletFile = fs.readFileSync(walletPath, "utf8");
    let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(JSON.parse(walletFile)));

    // Load the keypair into umi.
    umi.use(keypairIdentity(keypair));

    // load image
    const imagePath = path.join(__dirname, "..", "/assets/logo.jpg");
    const imageBuffer = await readFile(imagePath);

    const umiImageFile = createGenericFile(new Uint8Array(imageBuffer), "logo.jpeg", {
        contentType: "image/jpeg",
    });

    console.log("Uploading Image...");
    const imageUri = await umi.uploader.upload([umiImageFile]).catch(err => {
        throw new Error(err);
    });

    console.log("imageUri: " + imageUri[0]);

    /*
     * Upload Metadata to Arweave **
     */

    const metadata = {
        name: "NFT NVT",
        symbol: "NVT",
        description: "This is an NFT on Solana of NGO VIET THANH",
        image: imageUri[0],
        attributes: [
            {
                trait_type: "boy",
                value: "8",
            },
            {
                trait_type: "girl",
                value: "30",
            },
        ],
        properties: {
            files: [
                {
                    uri: imageUri[0],
                    type: "image/jpeg",
                },
            ],
            category: "image",
            share: 100,
        },
        creators: [
            {
                address: keypair.publicKey,
                share: 100,
            },
        ],
        sellerFeeBasisPoints: 1000,
    };

    // Call upon umi's `uploadJson` function to upload our metadata to Arweave via Irys.

    console.log("Uploading Metadata...");
    const metadataUri = await umi.uploader.uploadJson(metadata).catch(err => {
        throw new Error(err);
    });
    console.log("Metadata: ", metadataUri);

    /*
     * Creating the NFT
     */

    // // We generate a signer for the NFT
    const asset = generateSigner(umi);
    console.log("Creating NFT...");
    const tx = await create(umi, {
        asset,
        name: metadata.name,
        uri: metadataUri,
    }).sendAndConfirm(umi);

    console.log("NFT address: ", asset.publicKey);

    // // Finally we can deserialize the signature that we can check on chain.
    const signature = base58.deserialize(tx.signature)[0];

    // Log out the signature and the links to the transaction and the NFT.
    console.log("\nNFT Created");
    console.log("View Transaction on Solana Explorer");
    console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log("\n");
    console.log("View NFT on Metaplex Explorer");
    console.log(`https://core.metaplex.com/explorer/${asset.publicKey}?env=devnet`);
})();
