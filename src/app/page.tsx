import { getDesigns } from '@/lib/data';
import { DesignsTable } from '@/components/designs-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default async function Home() {
  const designs = await getDesigns();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <h1 className="text-2xl font-headline font-bold text-primary">DesignDock</h1>
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
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Design Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <DesignsTable designs={designs} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
