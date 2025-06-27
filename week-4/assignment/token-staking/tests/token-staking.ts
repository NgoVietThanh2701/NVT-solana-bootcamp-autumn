import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenStaking } from "../target/types/token_staking";
import {
   createAssociatedTokenAccountInstruction,
   getAssociatedTokenAddressSync,
   createInitializeMint2Instruction,
   getMinimumBalanceForRentExemptMint,
   TOKEN_PROGRAM_ID,
   MINT_SIZE,
   ASSOCIATED_TOKEN_PROGRAM_ID,
   createMintToInstruction,
   getAccount,
} from "@solana/spl-token";
import { expect } from "chai";
import { BN } from "bn.js";
import { describe } from "mocha";

describe("token-staking", () => {
   const provider = anchor.AnchorProvider.env();
   anchor.setProvider(provider);

   const program = anchor.workspace.TokenStaking as Program<TokenStaking>;

   const staker = anchor.web3.Keypair.generate();

   before(async () => {
      // airdrop SOL for staker
      const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash();
      const airdropTransactionSignature = await provider.connection.requestAirdrop(
         staker.publicKey,
         anchor.web3.LAMPORTS_PER_SOL,
      );
      await provider.connection.confirmTransaction({
         blockhash,
         lastValidBlockHeight,
         signature: airdropTransactionSignature,
      });
   });

   describe("Staking USDC", () => {
      let stakeInfoUSDC: anchor.web3.PublicKey;
      // USDC-fake mint
      let mintUSDCKp: anchor.web3.Keypair;
      let stakerUSDCTokenAccount: anchor.web3.PublicKey;
      let rewardVaultUSDC: anchor.web3.PublicKey;

      before(async () => {
         // staker USDC-fake mint
         {
            const usdc_token = await createFakeTokenAndFund({
               provider,
               staker,
               amount: 1000 * 10 ** 6,
               decimals: 6,
            });
            mintUSDCKp = usdc_token.mintKp;
            stakerUSDCTokenAccount = usdc_token.stakerTokenAccount;
         }
         rewardVaultUSDC = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("reward"), mintUSDCKp.publicKey.toBytes()],
            program.programId,
         )[0];
      });
      it("Is initialized!", async () => {
         const tx = await program.methods
            .initialize()
            .accountsPartial({
               admin: provider.publicKey,
               rewardVault: rewardVaultUSDC,
               mint: mintUSDCKp.publicKey,
               systemProgram: anchor.web3.SystemProgram.programId,
               tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();

         console.log("Your transaction signature", tx);

         const rewardVaultAccount = await getAccount(provider.connection, rewardVaultUSDC);

         expect(rewardVaultAccount.address.toBase58()).to.equal(rewardVaultUSDC.toBase58());
         expect(Number(rewardVaultAccount.amount)).to.equal(0);
      });

      it("Stake successfully", async () => {
         stakeInfoUSDC = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("stake_info"), staker.publicKey.toBytes(), mintUSDCKp.publicKey.toBytes()],
            program.programId,
         )[0];

         const vaultTokenAccount = getAssociatedTokenAddressSync(
            mintUSDCKp.publicKey,
            stakeInfoUSDC,
            true,
         );

         const stakeAmount = new BN(100 * 10 ** 6);

         const tx = await program.methods
            .stake(stakeAmount)
            .accountsPartial({
               staker: staker.publicKey,
               mint: mintUSDCKp.publicKey,
               stakeInfo: stakeInfoUSDC,
               vaultTokenAccount: vaultTokenAccount,
               stakerTokenAccount: stakerUSDCTokenAccount,
               systemProgram: anchor.web3.SystemProgram.programId,
               tokenProgram: TOKEN_PROGRAM_ID,
               associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            })
            .signers([staker])
            .rpc();

         console.log("Your transaction signature", tx);

         const stakeInfoAccount = await program.account.stakeInfo.fetch(stakeInfoUSDC);

         expect(stakeInfoAccount.staker.toBase58()).to.equal(staker.publicKey.toBase58());
         expect(stakeInfoAccount.mint.toBase58()).to.equal(mintUSDCKp.publicKey.toBase58());
         expect(stakeInfoAccount.isStaked).to.equal(true);
         expect(stakeInfoAccount.amount.toString()).to.equal(stakeAmount.toString());

         const stakerAccount = await getAccount(provider.connection, stakerUSDCTokenAccount);

         const vaultAccount = await getAccount(provider.connection, vaultTokenAccount);

         expect(stakerAccount.amount.toString()).to.equal(String(900 * 10 ** 6));
         expect(vaultAccount.amount.toString()).to.equal(String(100 * 10 ** 6));
      });

      it("Unstake successfully", async () => {
         const balanceStakerBefore = await provider.connection.getBalance(staker.publicKey);
         console.log("Balance of staker: ", balanceStakerBefore / anchor.web3.LAMPORTS_PER_SOL);

         // mint reward token to reward vault
         const mintTx = new anchor.web3.Transaction();

         const mintToRewardVaultIx = createMintToInstruction(
            mintUSDCKp.publicKey,
            rewardVaultUSDC,
            provider.publicKey,
            1000 * 10 ** 6,
            [],
         );

         mintTx.add(mintToRewardVaultIx);

         await provider.sendAndConfirm(mintTx);

         const vaultTokenAccount = getAssociatedTokenAddressSync(
            mintUSDCKp.publicKey,
            stakeInfoUSDC,
            true,
         );

         const tx = await program.methods
            .unstake()
            .accountsPartial({
               staker: staker.publicKey,
               mint: mintUSDCKp.publicKey,
               stakeInfo: stakeInfoUSDC,
               vaultTokenAccount: vaultTokenAccount,
               rewardVault: rewardVaultUSDC,
               stakerTokenAccount: stakerUSDCTokenAccount,
               systemProgram: anchor.web3.SystemProgram.programId,
               tokenProgram: TOKEN_PROGRAM_ID,
               associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            })
            .signers([staker])
            .rpc();

         console.log("Your transaction signature", tx);

         // check rent-exempt staker after unstake
         const balanceStakerAfter = await provider.connection.getBalance(staker.publicKey);
         console.log(
            "Balance of staker after unstake: ",
            balanceStakerAfter / anchor.web3.LAMPORTS_PER_SOL,
         );

         expect(balanceStakerAfter).to.be.greaterThan(balanceStakerBefore);

         try {
            await program.account.stakeInfo.fetch(stakeInfoUSDC);
            expect.fail("stakeInfo should have been closed, but still exists");
         } catch (e) {
            expect(e.message).to.include("Account does not exist");
         }

         const stakerAccount = await getAccount(provider.connection, stakerUSDCTokenAccount);

         const rewardVaultAccount = await getAccount(provider.connection, rewardVaultUSDC);

         const vaultAccount = await getAccount(provider.connection, vaultTokenAccount);

         expect(Number(stakerAccount.amount)).to.greaterThan(1000 * 10 ** 6);
         expect(Number(vaultAccount.amount)).to.equal(0);
         expect(Number(rewardVaultAccount.amount)).to.lessThan(1000 * 10 ** 6);

         console.log("USDC stacker: ", Number(stakerAccount.amount));
         console.log("USDC vault: ", Number(vaultAccount.amount));
         console.log("USDC reward", Number(rewardVaultAccount.amount));
      });
   });

   describe("Staking ETH", () => {
      let stakeInfoETH: anchor.web3.PublicKey;
      // ETH-fake mint
      let mintETHKp: anchor.web3.Keypair;
      let stakerETHTokenAccount: anchor.web3.PublicKey;
      let rewardVaultETH: anchor.web3.PublicKey;
      before(async () => {
         // staker ETH-fake mint
         {
            const eth_token = await createFakeTokenAndFund({
               provider,
               staker,
               amount: 1000 * 10 ** 9,
               decimals: 9,
            });
            mintETHKp = eth_token.mintKp;
            stakerETHTokenAccount = eth_token.stakerTokenAccount;
         }

         rewardVaultETH = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("reward"), mintETHKp.publicKey.toBytes()],
            program.programId,
         )[0];
      });
      it("Is initialized!", async () => {
         const tx = await program.methods
            .initialize()
            .accountsPartial({
               admin: provider.publicKey,
               rewardVault: rewardVaultETH,
               mint: mintETHKp.publicKey,
               systemProgram: anchor.web3.SystemProgram.programId,
               tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();

         console.log("Your transaction signature", tx);

         const rewardVaultAccount = await getAccount(provider.connection, rewardVaultETH);

         expect(rewardVaultAccount.address.toBase58()).to.equal(rewardVaultETH.toBase58());
         expect(Number(rewardVaultAccount.amount)).to.equal(0);
      });

      it("Stake successfully", async () => {
         stakeInfoETH = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("stake_info"), staker.publicKey.toBytes(), mintETHKp.publicKey.toBytes()],
            program.programId,
         )[0];

         const vaultTokenAccount = getAssociatedTokenAddressSync(
            mintETHKp.publicKey,
            stakeInfoETH,
            true,
         );

         const stakeAmount = new BN(50 * 10 ** 9);

         const tx = await program.methods
            .stake(stakeAmount)
            .accountsPartial({
               staker: staker.publicKey,
               mint: mintETHKp.publicKey,
               stakeInfo: stakeInfoETH,
               vaultTokenAccount: vaultTokenAccount,
               stakerTokenAccount: stakerETHTokenAccount,
               systemProgram: anchor.web3.SystemProgram.programId,
               tokenProgram: TOKEN_PROGRAM_ID,
               associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            })
            .signers([staker])
            .rpc();

         console.log("Your transaction signature", tx);

         const stakeInfoAccount = await program.account.stakeInfo.fetch(stakeInfoETH);

         expect(stakeInfoAccount.staker.toBase58()).to.equal(staker.publicKey.toBase58());
         expect(stakeInfoAccount.mint.toBase58()).to.equal(mintETHKp.publicKey.toBase58());
         expect(stakeInfoAccount.isStaked).to.equal(true);
         expect(stakeInfoAccount.amount.toString()).to.equal(stakeAmount.toString());

         const stakerAccount = await getAccount(provider.connection, stakerETHTokenAccount);

         const vaultAccount = await getAccount(provider.connection, vaultTokenAccount);

         expect(stakerAccount.amount.toString()).to.equal(String(950 * 10 ** 9));
         expect(vaultAccount.amount.toString()).to.equal(String(50 * 10 ** 9));
      });

      it("Unstake successfully", async () => {
         // mint reward token to reward vault
         const mintTx = new anchor.web3.Transaction();

         const mintToRewardVaultIx = createMintToInstruction(
            mintETHKp.publicKey,
            rewardVaultETH,
            provider.publicKey,
            1000 * 10 ** 9,
            [],
         );

         mintTx.add(mintToRewardVaultIx);

         await provider.sendAndConfirm(mintTx);

         const vaultTokenAccount = getAssociatedTokenAddressSync(
            mintETHKp.publicKey,
            stakeInfoETH,
            true,
         );

         const tx = await program.methods
            .unstake()
            .accountsPartial({
               staker: staker.publicKey,
               mint: mintETHKp.publicKey,
               stakeInfo: stakeInfoETH,
               vaultTokenAccount: vaultTokenAccount,
               rewardVault: rewardVaultETH,
               stakerTokenAccount: stakerETHTokenAccount,
               systemProgram: anchor.web3.SystemProgram.programId,
               tokenProgram: TOKEN_PROGRAM_ID,
               associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            })
            .signers([staker])
            .rpc();

         console.log("Your transaction signature", tx);

         try {
            await program.account.stakeInfo.fetch(stakeInfoETH);
            expect.fail("stakeInfo should have been closed, but still exists");
         } catch (e) {
            expect(e.message).to.include("Account does not exist");
         }

         const stakerAccount = await getAccount(provider.connection, stakerETHTokenAccount);

         const rewardVaultAccount = await getAccount(provider.connection, rewardVaultETH);

         const vaultAccount = await getAccount(provider.connection, vaultTokenAccount);

         expect(Number(stakerAccount.amount)).to.greaterThan(1000 * 10 ** 9);
         expect(Number(vaultAccount.amount)).to.equal(0);
         expect(Number(rewardVaultAccount.amount)).to.lessThan(1000 * 10 ** 9);

         console.log("ETH stacker: ", Number(stakerAccount.amount));
         console.log("ETH vault: ", Number(vaultAccount.amount));
         console.log("ETH reward", Number(rewardVaultAccount.amount));
      });
   });
});

async function createFakeTokenAndFund({
   provider,
   staker,
   amount,
   decimals,
}: {
   provider: anchor.AnchorProvider;
   staker: anchor.web3.Keypair;
   amount?: number;
   decimals?: number;
}) {
   const mintKp = anchor.web3.Keypair.generate();
   const lamports = await getMinimumBalanceForRentExemptMint(provider.connection);

   const createMintIx = anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.publicKey,
      newAccountPubkey: mintKp.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
   });

   const initMintIx = createInitializeMint2Instruction(
      mintKp.publicKey,
      decimals,
      provider.publicKey,
      provider.publicKey,
   );

   const stakerTokenAccount = getAssociatedTokenAddressSync(mintKp.publicKey, staker.publicKey);

   const createATAIx = createAssociatedTokenAccountInstruction(
      staker.publicKey,
      stakerTokenAccount,
      staker.publicKey,
      mintKp.publicKey,
   );

   const mintToIx = createMintToInstruction(
      mintKp.publicKey,
      stakerTokenAccount,
      provider.publicKey,
      amount,
   );

   const tx = new anchor.web3.Transaction().add(createMintIx, initMintIx, createATAIx, mintToIx);

   await provider.sendAndConfirm(tx, [mintKp, staker]);

   return {
      mintKp,
      stakerTokenAccount,
      decimals,
   };
}
