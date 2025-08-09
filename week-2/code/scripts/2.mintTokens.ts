/**
 * Demonstrates how to create new SPL tokens (aka "minting tokens") into an existing SPL Token Mint
 */

import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToCheckedInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import { payer, connection } from "@/lib/vars";
import {
  buildTransaction,
  explorerURL,
  loadPublicKeysFromFile,
  printConsoleSeparator,
} from "@/lib/helpers";

(async () => {
  console.log("Payer address:", payer.publicKey.toBase58());

  // load the stored PublicKeys for ease of use
  const localKeys = loadPublicKeysFromFile();

  // ensure the desired script was already run
  if (!localKeys?.tokenMint)
    return console.warn("No local keys were found. Please run '3.createTokenWithMetadata.ts'");

  const tokenMint: PublicKey = localKeys.tokenMint;

  console.log("==== Local PublicKeys loaded ====");
  console.log("Token's mint address:", tokenMint.toBase58());
  console.log(explorerURL({ address: tokenMint.toBase58() }));

  /**
   * SPL tokens are owned using a special relationship where the actual tokens
   * are stored/owned by a different account, which is then owned by the user's
   * wallet/account
   * This special account is called "associated token account" (or "ata" for short)
   * ---
   * think of it like this: tokens are stored in the ata for each "tokenMint",
   * the ata is then owned by the user's wallet
   */

  const associatedTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    payer.publicKey,
    false, // allowOwnerOffCurve
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const createAssociatedTokenAccountIx = createAssociatedTokenAccountInstruction(
    payer.publicKey,
    associatedTokenAccount,
    payer.publicKey, // owner
    tokenMint, // mint
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const tx = await buildTransaction({
    connection,
    payer: payer.publicKey,
    signers: [payer],
    instructions: [createAssociatedTokenAccountIx],
  });

  const sig = await connection.sendTransaction(tx);

  console.log("Transaction completed.");
  console.log(explorerURL({ txSignature: sig }));

  printConsoleSeparator();

  await new Promise(resolve => setTimeout(resolve, 1000));

  /*
    note: when creating an ata, the instruction will allocate space on chain
    if you attempt to allocate space at an existing address on chain, the transaction will fail.
    ---
    sometimes, it may be useful to directly create the ata when you know it has not already been created on chain
    you can see how to do that below
  */

  // directly create the ata
  // const tokenAccount = await createAccount(connection, payer, tokenMint, payer.publicKey);

  console.log("Token account address:", associatedTokenAccount.toBase58());

  /**
   * The number of tokens to mint takes into account the `decimal` places set on your `tokenMint`.
   * So ensure you are minting the correct, desired number of tokens.
   * ---
   * examples:
   * - if decimals=6, amount=1_000_000 => actual tokens minted == 1
   * - if decimals=6, amount=10_000_000 => actual tokens minted == 10
   * - if decimals=6, amount=100_000 => actual tokens minted == 0.10
   */

  // mint some token to the "ata"

  const amountOfTokensToMint = 1_000_000; // 1 * 10**6

  const mintToIx = createMintToCheckedInstruction(
    tokenMint,
    associatedTokenAccount,
    payer.publicKey, // mint authority
    amountOfTokensToMint, // amount
    6, // decimals
    [], // multiSigners
    TOKEN_2022_PROGRAM_ID, // programId
  );

<<<<<<< HEAD
  console.log(explorerURL({ txSignature: mintSig }));
=======
  const mintToTx = await buildTransaction({
    connection,
    payer: payer.publicKey,
    signers: [payer],
    instructions: [mintToIx],
  });

  const mintToSig = await connection.sendTransaction(mintToTx);

  console.log(explorerURL({ txSignature: mintToSig }));
>>>>>>> newUpstream/main
})();
