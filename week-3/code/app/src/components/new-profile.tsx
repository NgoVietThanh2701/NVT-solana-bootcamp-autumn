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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function NewProfile() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const queryClient = useQueryClient();

  const [name, setName] = useState("");

  const provider = useAnchorProvider();

  const { isPending, mutateAsync } = useMutation({
    mutationKey: ["create-profile", provider.publicKey],
    mutationFn: async (name: string) => {
      const program = new TodoProgram(provider);

      const tx = await program.createProfile(name);

      const signature = await provider.sendAndConfirm(tx);

      return signature;
    },
    onSuccess: (tx) => {
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
    mutateAsync(name);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        New profile
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>New profile</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
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
