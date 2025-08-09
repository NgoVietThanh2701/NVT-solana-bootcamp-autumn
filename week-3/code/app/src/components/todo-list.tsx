"use client";

import useAnchorProvider from "@/hooks/use-anchor-provider";
import TodoProgram from "@/lib/todo-program";
import { IdlAccounts } from "@coral-xyz/anchor";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { TodoApp } from "../../../target/types/todo_app";
import TodoItem from "./todo-item";

export default function TodoList({
  profile,
}: {
  profile: IdlAccounts<TodoApp>["profile"];
}) {
  const provider = useAnchorProvider();

  const { data: todos, isLoading } = useQuery({
    queryKey: ["todos", profile.key.toBase58(), profile.todoCount],
    enabled: !!profile,
    queryFn: () => new TodoProgram(provider).fetchTodos(profile),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  console.log("todos", todos?.length);

  return (
    <ul className="space-y-2">
      {todos?.map((todo, idx) => (
        <TodoItem key={idx} content={todo.content} completed={todo.completed} />
      ))}
    </ul>
  );
}
