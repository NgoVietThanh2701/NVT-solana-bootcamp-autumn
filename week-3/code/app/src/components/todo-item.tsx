"use client";

import { Checkbox } from "@/components/ui/checkbox";

export default function TodoItem({
  content,
  completed = false,
}: {
  content: string;
  completed?: boolean;
}) {
  return (
    <li className="border-b border-gray-200 py-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          defaultChecked={completed}
          id={`todo-${content}`}
        />
        <label 
          htmlFor={`todo-${content}`}
          className={`text-sm cursor-pointer ${completed ? "line-through text-muted-foreground" : ""}`}
        >
          {content}
        </label>
      </div>
    </li>
  );
}
