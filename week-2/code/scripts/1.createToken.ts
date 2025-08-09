/**
 * Demonstrates how to create a SPL token and store it's metadata on chain (using the Metaplex MetaData program)
 */

import { Keypair, SystemProgram } from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
} from "@solana/spl-token";

import { payer, testWallet, connection } from "@/lib/vars";

import {
  buildTransaction,
  explorerURL,
  extractSignatureFromFailedTransaction,
  printConsoleSeparator,
  savePublicKeyToFile,
} from "@/lib/helpers";

(async () => {
  console.log("Payer address:", payer.publicKey.toBase58());
  console.log("Test wallet address:", testWallet.publicKey.toBase58());

  // generate a new keypair to be used for our mint
  const mintKeypair = Keypair.generate();

  console.log("Mint address:", mintKeypair.publicKey.toBase58());

  // define the assorted token config settings
  const tokenConfig = {
    // define how many decimals we want our tokens to have
    decimals: 6,
    // the name of the token
    name: "Solana Bootcamp Autumn 2024",
    // the symbol of the token
    symbol: "SBS",
    // the URI pointing to the token's metadata
    uri: "https://raw.githubusercontent.com/trankhacvy/solana-bootcamp-autumn-2024/main/assets/sbs-token.json",
  };

  /**
   * Build the 2 instructions required to create the token mint:
   * - standard "create account" to allocate space on chain
   * - initialize the token mint
   */

  // create instruction for the token mint account
  const createMintAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    // the `space` required for a token mint is accessible in the `@solana/spl-token` sdk
    space: MINT_SIZE,
    // store enough lamports needed for our `space` to be rent exempt
    lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
    // tokens are owned by the "token program"
    programId: TOKEN_2022_PROGRAM_ID,
  });

  // Initialize that account as a Mint
  const initializeMintInstruction = createInitializeMintInstruction(
    mintKeypair.publicKey,
    tokenConfig.decimals,
    payer.publicKey,
    payer.publicKey,
    TOKEN_2022_PROGRAM_ID,
  );

  /**
   * Alternatively, you could also use the helper function from the
   * `@solana/spl-token` sdk to create and initialize the token's mint
   * ---
   * NOTE: this method is normally efficient since the payer would need to
   * sign and pay for multiple transactions to perform all the actions. It
   * would also require more "round trips" to the blockchain as well.
   * But this option is available, should it fit your use case :)
   * */

  /*
  console.log("Creating a token mint...");
  const mint = await createMint(
    connection,
    payer,
    // mint authority
    payer.publicKey,
    // freeze authority
    payer.publicKey,
    // decimals - use any number you desire
    tokenConfig.decimals,
    // manually define our token mint address
    mintKeypair,
  );
  console.log("Token's mint address:", mint.toBase58());
  */

  /**
   * Build the transaction to send to the blockchain
   */

  const tx = await buildTransaction({
    connection,
    payer: payer.publicKey,
    signers: [payer, mintKeypair],
    instructions: [createMintAccountInstruction, initializeMintInstruction],
  });

  try {
    // actually send the transaction
    const sig = await connection.sendTransaction(tx);

    // print the explorer url
    console.log("Transaction completed.");
    console.log(explorerURL({ txSignature: sig }));

    // locally save our addresses for the demo
    savePublicKeyToFile("tokenMint", mintKeypair.publicKey);
  } catch (err) {
    console.error("Failed to send transaction:");
    console.log(tx);

    // attempt to extract the signature from the failed transaction
    const failedSig = await extractSignatureFromFailedTransaction(connection, err);
    if (failedSig) console.log("Failed signature:", explorerURL({ txSignature: failedSig }));

    throw err;
  }
})();
