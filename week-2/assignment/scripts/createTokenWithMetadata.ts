/**
 * Demonstrates how to create a SPL token and store it's metadata on chain (using the Metaplex MetaData program)
 */

import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    createInitializeMint2Instruction,
    getOrCreateAssociatedTokenAccount,
    createMintToInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

import {
    PROGRAM_ID as METADATA_PROGRAM_ID,
    createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

import { payer, connection, STATIC_PUBLICKEY } from "@/lib/vars";

import {
    buildTransaction,
    explorerURL,
    extractSignatureFromFailedTransaction,
    printConsoleSeparator,
    savePublicKeyToFile,
} from "@/lib/helpers";

(async () => {
    console.log("Payer address:", payer.publicKey.toBase58());
    const currentBalance = await connection.getBalance(payer.publicKey);
    console.log("Current balance of 'payer' (in SOL):", currentBalance / LAMPORTS_PER_SOL);

    // airdrop on low balance
    if (currentBalance <= LAMPORTS_PER_SOL) {
        console.log("Low balance, requesting an airdrop...");
        await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
    }

    // generate a new keypair to be used for our mint
    const mintKeypair = Keypair.generate();

    console.log("Mint address:", mintKeypair.publicKey.toBase58());

    // define the assorted token config settings
    const tokenConfig = {
        // define how many decimals we want our tokens to have
        decimals: 6,
        //
        name: "NgoVietThanh",
        //
        symbol: "NVT",
        //
        uri: "https://raw.githubusercontent.com/NgoVietThanh2701/NVT-solana-bootcamp-autumn/refs/heads/main/week-2/assignment/metadata/token.json",
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
        lamports: (await connection.getMinimumBalanceForRentExemption(MINT_SIZE)) + 3_000_000,
        // tokens are owned by the "token program"
        programId: TOKEN_PROGRAM_ID,
    });

    // Initialize that account as a Mint
    const initializeMintInstruction = createInitializeMint2Instruction(
        mintKeypair.publicKey,
        tokenConfig.decimals,
        payer.publicKey, // mintAuthority: ai có quyền "mint" thêm token
        payer.publicKey, // freezeAuthority: ai có quyền đóng băng tài khoản token
    );

    // Derive the pda address for the Metadata account
    const metadataAccount = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
        METADATA_PROGRAM_ID,
    )[0];

    console.log("Metadata address:", metadataAccount.toBase58());

    // Create the Metadata account for the Mint
    const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
        {
            metadata: metadataAccount, // Address PDA metadata
            mint: mintKeypair.publicKey,
            mintAuthority: payer.publicKey,
            payer: payer.publicKey, // payer pay fee gas
            updateAuthority: payer.publicKey,
        },
        {
            createMetadataAccountArgsV3: {
                data: {
                    creators: null,
                    name: tokenConfig.name,
                    symbol: tokenConfig.symbol,
                    uri: tokenConfig.uri,
                    sellerFeeBasisPoints: 0,
                    collection: null,
                    uses: null,
                },
                // `collectionDetails` - for non-nft type tokens, normally set to `null` to not have a value set
                collectionDetails: null,
                // should the metadata be updatable?
                isMutable: true,
            },
        },
    );

    /*
     * Mint 100 Token for yourself
     */

    // derive ATA address
    const tokenAccountForYourself = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        payer.publicKey,
    );

    // create ATA instruction
    const createATAForYourself = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        tokenAccountForYourself,
        payer.publicKey,
        mintKeypair.publicKey,
    );

    // mint 100 tokens to yourself
    const amountOfTokensToMintForYourself = 100_000_000; // 100 token
    const mintInstructionYourSelf = createMintToInstruction(
        mintKeypair.publicKey,
        tokenAccountForYourself,
        payer.publicKey,
        amountOfTokensToMintForYourself,
    );

    /*
     * Mint 10 Token for Static account
     */

    const tokenAccountForStaticAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        STATIC_PUBLICKEY,
    );

    const createATAForStaticAccount = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        tokenAccountForStaticAccount,
        STATIC_PUBLICKEY,
        mintKeypair.publicKey,
    );

    // mint 10 tokens to static account
    const mintInstructionStaticAccount = createMintToInstruction(
        mintKeypair.publicKey,
        tokenAccountForStaticAccount,
        payer.publicKey,
        10_000_000, // 10 token
    );

    /**
     * Build the transaction to send to the blockchain
     */

    const tx = await buildTransaction({
        connection,
        payer: payer.publicKey,
        signers: [payer, mintKeypair],
        instructions: [
            createMintAccountInstruction,
            initializeMintInstruction,
            createMetadataInstruction,
            createATAForYourself,
            createATAForStaticAccount,
            mintInstructionYourSelf,
            mintInstructionStaticAccount,
        ],
    });

    printConsoleSeparator();

    try {
        // actually send the transaction
        const sig = await connection.sendTransaction(tx, {
            skipPreflight: false,
            preflightCommitment: "confirmed",
        });

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
