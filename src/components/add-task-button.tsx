'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { TaskForm } from '@/components/task-form';
import { ScrollArea } from '@/components/ui/scroll-area';

export function AddTaskButton() {
  const [isMounted, setIsMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 0);
    }
  }, [open]);

  if (!isMounted) {
    return (
      <Button>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Task
      </Button>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </SheetTrigger>
      <SheetContent className="p-0 sm:max-w-md">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Add New Task</SheetTitle>
          <SheetDescription>
            Fill out the form below to add a new task to the board.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-6.5rem)]">
          <div className="px-6 pb-6">
            <TaskForm view="sheet" onSuccess={() => setOpen(false)} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
