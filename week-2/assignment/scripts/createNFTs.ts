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
dotenv.config();

(async () => {
    //
    // ** Setting Up Umi **
    //
    const umi = createUmi("https://api.devnet.solana.com")
        .use(mplCore())
        .use(
            irysUploader({
                address: "https://devnet.irys.xyz",
            }),
        );
    // You will need to us fs and navigate the filesystem to
    // load the wallet you wish to use via relative pathing.
    const walletPath = process.env.LOCAL_PAYER_JSON_ABSPATH ?? "";
    const walletFile = fs.readFileSync(walletPath, "utf8"); // đọc file dưới dạng text
    let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(JSON.parse(walletFile))); // chuyển sang Uint8Array chuẩn
    umi.use(keypairIdentity(keypair));

    const imagePath = path.join(__dirname, "..", "/assets/logo.jpg");
    const imageFile = new Uint8Array(fs.readFileSync(imagePath));

    const umiImageFile = createGenericFile(imageFile, "logo.jpeg", {
        tags: [{ name: "Content-Type", value: "image/jpeg" }],
    });

    console.log("Uploading Image...");
    const imageUri = await umi.uploader.upload([umiImageFile]).catch(err => {
        throw new Error(err);
    });

    console.log("imageUri: " + imageUri[0]);

    //
    // ** Upload Metadata to Arweave **
    //
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
        seller_fee_basis_points: 1000,
    };

    // // Call upon umi's `uploadJson` function to upload our metadata to Arweave via Irys.

    console.log("Uploading Metadata...");
    const metadataUri = await umi.uploader.uploadJson(metadata).catch(err => {
        throw new Error(err);
    });

    //
    // ** Creating the NFT **
    //

    // We generate a signer for the NFT
    const asset = generateSigner(umi);
    console.log("Creating NFT...");
    const tx = await create(umi, {
        asset,
        name: metadata.name,
        uri: metadataUri,
    }).sendAndConfirm(umi);

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
