"use client";

import useAnchorProvider from "@/hooks/use-anchor-provider";
import TodoProgram from "@/lib/todo-program";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { IdlAccounts } from "@coral-xyz/anchor";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TodoApp } from "../../../target/types/todo_app";

export default function NewTodo({
  profile,
}: {
  profile: IdlAccounts<TodoApp>["profile"];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const { toast } = useToast();

  const queryClient = useQueryClient();

  const [content, setContent] = useState("");

  const provider = useAnchorProvider();

  const { isPending, mutateAsync } = useMutation({
    mutationKey: ["create-todo", provider.publicKey, profile.todoCount],
    mutationFn: async (content: string) => {
      try {
        const program = new TodoProgram(provider);

        const tx = await program.createTodo(content, profile.todoCount);
        const signature = await provider.sendAndConfirm(tx);

        return signature;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: async (tx) => {
      console.log(tx);

      toast({
        title: "Transaction sent",
        variant: "default",
      });

      return queryClient.invalidateQueries({
        queryKey: ["profile", provider.publicKey.toBase58()],
      });
    },
    onError: (error) => {
      console.error(error);
    },
    onSettled: () => {
      setIsOpen(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    mutateAsync(content);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Add todo
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>New todo</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Describe what this todo is about"
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
              >
                {isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
