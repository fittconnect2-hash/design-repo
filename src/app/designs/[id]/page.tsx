'use client';

import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Edit, ExternalLink, Figma } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShareButton } from '@/components/share-button';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Design } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState } from 'react';
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

function DesignDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
       <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Skeleton className="h-8 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </header>
      <main className="container mx-auto max-w-4xl p-4 md:p-6">
        <Card className="overflow-hidden">
          <CardHeader className="p-0">
             <Skeleton className="aspect-video w-full" />
          </CardHeader>
          <CardContent className="p-6">
            <Skeleton className="h-10 w-3/4" />
            <div className="my-4 flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <Separator className="my-6" />
             <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
             </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}


export default function DesignDetailsPage() {
  const params = useParams<{ id: string }>();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const designRef = useMemo(() => {
    if (!user || !params.id) return null;
    return doc(firestore, 'users', user.uid, 'designProjects', params.id);
  }, [firestore, user, params.id]);

  const { data: design, isLoading: isDesignLoading } = useDoc<Design & { id: string }>(designRef);

  const isLoading = isUserLoading || isDesignLoading;

  if (isLoading) {
    return <DesignDetailsSkeleton />;
  }

  if (!design) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
           <Button asChild variant="ghost" className="pl-0">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              All Projects
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <ShareButton />
            <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
              <SheetTrigger asChild>
                <Button>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </SheetTrigger>
              <SheetContent className="p-0 sm:max-w-2xl">
                <SheetHeader className="p-6 pb-4">
                  <SheetTitle>Edit Design Project</SheetTitle>
                  <SheetDescription>
                    Make changes to your project here. Click save when you're done.
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-6.5rem)]">
                  <div className="px-6 pb-6">
                    <DesignForm
                      design={design}
                      view="sheet"
                      onSuccess={() => setIsEditSheetOpen(false)}
                    />
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="container mx-auto max-w-4xl p-4 md:p-6">
        <Card className="overflow-hidden">
          <CardHeader className="p-0">
             <div className="relative aspect-video w-full">
              <Image
                src={design.imageUrl}
                alt={design.name}
                fill
                className="object-cover"
                data-ai-hint="project hero"
              />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <CardTitle className="text-3xl font-headline font-bold">{design.name}</CardTitle>
            <div className="my-4 flex flex-wrap gap-2">
              {design.tags.map((tag, index) => (
                <Badge key={`${tag}-${index}`} variant="secondary">{tag}</Badge>
              ))}
            </div>
            <CardDescription className="text-base text-foreground/80">{design.description}</CardDescription>
            
            <Separator className="my-6" />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <a href={design.figmaLink} target="_blank" rel="noopener noreferrer" className="group">
                    <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Figma Link</CardTitle>
                            <Figma className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-bold text-primary group-hover:underline truncate">{design.figmaLink}</div>
                        </CardContent>
                    </Card>
                </a>
                 <a href={design.prototypeUrl} target="_blank" rel="noopener noreferrer" className="group">
                    <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Prototype Link</CardTitle>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-bold text-primary group-hover:underline truncate">{design.prototypeUrl}</div>
                        </CardContent>
                    </Card>
                </a>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
