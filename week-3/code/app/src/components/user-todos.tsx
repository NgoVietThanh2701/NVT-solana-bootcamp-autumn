"use client";

import { WalletMultiButtonDynamic } from "@/components/connect-wallet-button";
import NewProfile from "@/components/new-profile";
import NewTodo from "@/components/new-todo";
import useAnchorProvider from "@/hooks/use-anchor-provider";
import TodoProgram from "@/lib/todo-program";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import TodoList from "./todo-list";

export default function UserTodos() {
  const { publicKey } = useWallet();
  const provider = useAnchorProvider();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", publicKey?.toBase58()],
    enabled: !!publicKey,
    queryFn: () => new TodoProgram(provider).fetchProfile(),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-muted-foreground">Please wait...</p>
      </div>
    );
  }

  if (!profile) {
    return <NewProfile />;
  }

  console.log("profile", profile.todoCount);

  return (
    <div className="flex flex-col gap-8">
      <WalletMultiButtonDynamic />
      <h1 className="text-2xl font-bold">
        {profile?.name}
      </h1>
      <TodoList profile={profile} />
      <NewTodo profile={profile} />
    </div>
  );
}
