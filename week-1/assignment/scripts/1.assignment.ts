/*
 * This scripts demonstrates how to create new solana account with some SOL
 * Transfer from newly account to another account
 * Close the newly created account
 */

import {
    Keypair,
    LAMPORTS_PER_SOL,
    SystemProgram,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";

import { payer, connection, STATIC_PUBLICKEY } from "@/lib/vars";
import { explorerURL, printConsoleSeparator } from "@/lib/helpers";

(async () => {
    console.log("Payer address:", payer.publicKey.toBase58());

    // get the current balance of the `payer` account on chain
    const currentBalance = await connection.getBalance(payer.publicKey);
    console.log("Current balance of 'payer' (in lamports):", currentBalance);
    console.log("Current balance of 'payer' (in SOL):", currentBalance / LAMPORTS_PER_SOL);

    // airdrop on low balance
    if (currentBalance <= LAMPORTS_PER_SOL) {
        console.log("Low balance, requesting an airdrop...");
        await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
    }

    // generate a new, random address to create on chain
    const keypair = Keypair.generate(); // public key, private key

    console.log("New keypair generated:", keypair.publicKey.toBase58());

    /**
     * create a simple instruction (using web3.js) to create an account
     */

    // on-chain space to allocated (in number of bytes)
    const space = 0;

    // request the cost (in lamports) to allocate `space` number of bytes on chain
    const lamportsNewAccount =
        (await connection.getMinimumBalanceForRentExemption(space)) + 3_000_000_000;

    console.log("lamport for rent", await connection.getMinimumBalanceForRentExemption(space));

    // create this simple instruction using web3.js helper function
    const createAccountIx = SystemProgram.createAccount({
        // `fromPubkey` - this account will need to sign the transaction
        fromPubkey: payer.publicKey,
        // `newAccountPubkey` - the account address to create on chain
        newAccountPubkey: keypair.publicKey,
        // lamports to store in this account
        lamports: lamportsNewAccount,
        // total space to allocate
        space,
        // the owning program for this account
        programId: SystemProgram.programId,
    });

    // create an instruction to transfer lamport from newly account to static account
    const AMOUNT_TRANSFER = 100_000_000;
    const transferToStaticWalletIx = SystemProgram.transfer({
        lamports: AMOUNT_TRANSFER,
        fromPubkey: keypair.publicKey,
        toPubkey: STATIC_PUBLICKEY,
        programId: SystemProgram.programId,
    });

    // close newly created account: transfer balance to payer and assign to system program
    const closeNewlyCreatedAccountIx = SystemProgram.transfer({
        lamports: lamportsNewAccount - AMOUNT_TRANSFER,
        fromPubkey: keypair.publicKey,
        toPubkey: payer.publicKey,
        programId: SystemProgram.programId,
    });

    // assign owner of newly created account
    const assignAccountIx = SystemProgram.assign({
        accountPubkey: keypair.publicKey,
        programId: SystemProgram.programId,
    });

    /**
     * build the transaction to send to the blockchain
     */

    // get the latest recent blockhash
    const recentBlockhash = await connection.getLatestBlockhash().then(res => res.blockhash);

    // create a message (v0)
    const message = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash,
        instructions: [
            // create account with balance 3 sol + estimate lamport for rent
            createAccountIx,
            // transfer 0.1 sol to static account
            transferToStaticWalletIx,
            // close and assign newly created account
            closeNewlyCreatedAccountIx,
            assignAccountIx,
        ],
    }).compileToV0Message();

    // create a versioned transaction using the message
    const tx = new VersionedTransaction(message);

    // sign the transaction with our needed Signers (e.g. `payer` and `keypair`)
    tx.sign([payer, keypair]);

    console.log("tx after signing:", tx);

    // actually send the transaction
    const signature = await connection.sendTransaction(tx, {
        preflightCommitment: "confirmed",
    });

    /**
     * display some helper text
     */
    printConsoleSeparator();

    console.log("Transaction completed.");
    console.log(explorerURL({ txSignature: signature }));
})();
