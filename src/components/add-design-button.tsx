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
import { DesignForm } from '@/components/design-form';
import { ScrollArea } from '@/components/ui/scroll-area';

export function AddDesignButton() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Render a placeholder on the server and initial client render
    return (
      <Button>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Design
      </Button>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Design
        </Button>
      </SheetTrigger>
      <SheetContent className="p-0 sm:max-w-2xl">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Add New Design Project</SheetTitle>
          <SheetDescription>
            Fill out the form below to add a new project to your portfolio.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-6.5rem)]">
          <div className="px-6 pb-6">
            <DesignForm view="sheet" />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
