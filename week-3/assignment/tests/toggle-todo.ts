import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TodoApp } from "../target/types/todo_app";
import { assert, expect } from "chai";
import { withErrorTest } from "./utils";

describe("todo-app", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TodoApp as Program<TodoApp>;
  const name = "Ngo Viet Thanh";

  const content = "Do Solana bootcamp homework";

  let profile: anchor.web3.PublicKey;
  let todo: anchor.web3.PublicKey;

  before(async () => {
    [profile] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), provider.publicKey.toBytes()],
      program.programId
    );

    const tx_create_profile = await program.methods
      .createProfile(name)
      .accountsPartial({
        creator: provider.publicKey,
        profile,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create profile success", tx_create_profile);

    let profileAccount = await program.account.profile.fetch(profile);
    const currentTodoCount = profileAccount.todoCount;

    [todo] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("todo"), profile.toBytes(), Buffer.from([currentTodoCount])],
      program.programId
    );

    const tx_create_todo = await program.methods
      .createTodo(content)
      .accountsPartial({
        creator: provider.publicKey,
        profile,
        todo,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Your transaction signature todo", tx_create_todo);
  });

  it("update toggle todo", async () => {
    withErrorTest(async () => {
      try {
        const tx = await program.methods
          .toggleTodo()
          .accountsPartial({
            creator: provider.publicKey,
            profile,
            todo,
          })
          .rpc();

        console.log("Your transaction signature", tx);

        const todoAccount = await program.account.todo.fetch(todo);
        expect(todoAccount.completed).to.equal(true);
        console.log("------------Info todo-------------");
        console.log(todoAccount);
      } catch (_err) {
        assert.isTrue(_err instanceof anchor.AnchorError);
        const err: anchor.AnchorError = _err;
        assert.strictEqual(err.error.errorMessage, "Invalid authority");
        assert.strictEqual(err.error.errorCode.number, 6002);
        assert.strictEqual(err.error.errorCode.code, "InvalidAuthority");
        assert.strictEqual(
          err.program.toString(),
          program.programId.toString()
        );
      }
    });
  });
});
