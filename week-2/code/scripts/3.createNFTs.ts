/**
 * Demonstrates how to mint NFTs and store their metadata on chain using the Metaplex MetadataProgram
 */

import { Keypair } from "@solana/web3.js";

import { payer, connection } from "@/lib/vars";
import { explorerURL, printConsoleSeparator } from "@/lib/helpers";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createNft,
  fetchDigitalAsset,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner, keypairIdentity, percentAmount } from "@metaplex-foundation/umi";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";

(async () => {
  console.log("Payer address:", payer.publicKey.toBase58());

  /**
   * define our ship's JSON metadata
   */
  const metadata = {
    name: "Solana Bootcamp Autumn 2024",
    symbol: "SBS",
    description: "Solana Bootcamp Autumn 2024",
    image:
      "https://github.com/trankhacvy/solana-bootcamp-autumn-2024/blob/main/assets/logo.png?raw=true",
  };

  // create an instance of Umi sdk for use
  const umi = createUmi(connection)
    .use(keypairIdentity(fromWeb3JsKeypair(payer)))
    .use(mplTokenMetadata())
    .use(irysUploader());

  console.log("Uploading metadata...");

  // upload the JSON metadata
  const uri = await umi.uploader.uploadJson(metadata);

  console.log("Metadata uploaded:", uri);

  printConsoleSeparator("NFT details");

  console.log("Creating NFT using Metaplex...");

  const tokenMint = Keypair.generate();

  // create a new nft using the metaplex sdk
  const mint = generateSigner(umi);

  const response = await createNft(umi, {
    mint,
    name: "My NFT",
    uri: "https://example.com/my-nft.json",
    sellerFeeBasisPoints: percentAmount(5.5),
  }).sendAndConfirm(umi);

  const asset = await fetchDigitalAsset(umi, mint.publicKey);

  console.dir(asset);

  printConsoleSeparator("NFT created:");
  console.log(explorerURL({ txSignature: Buffer.from(response.signature).toString("base64") }));
})();

