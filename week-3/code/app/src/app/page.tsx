"use client";

import { WalletMultiButtonDynamic } from "@/components/connect-wallet-button";
import { useWallet } from "@solana/wallet-adapter-react";
import { ReactNode } from "react";
import UserTodos from "@/components/user-todos";

export default function Home() {
  const { publicKey } = useWallet();

  let content: ReactNode;

  if (!publicKey) {
    content = (
      <div className="flex justify-center">
        <WalletMultiButtonDynamic />
      </div>
    );
  } else {
    content = <UserTodos />;
  }

  return (
    <div className="w-full min-h-screen">
      <div className="container mx-auto px-4 py-16">{content}</div>
    </div>
  );
}
