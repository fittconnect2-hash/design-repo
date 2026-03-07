'use client';

import * as React from 'react';
import Image from 'next/image';
import { MoreHorizontal, Edit, Trash2, Eye, Share2, Figma, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

import type { Design } from '@/lib/definitions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardFooter, CardHeader, CardTitle as UiCardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { DesignForm } from './design-form';

interface DesignCardProps {
  design: Design & { id: string };
}

export function DesignCard({ design }: DesignCardProps) {
  const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  React.useEffect(() => {
    if (!isViewModalOpen && !isEditSheetOpen && !isDeleteModalOpen) {
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 0);
    }
  }, [isViewModalOpen, isEditSheetOpen, isDeleteModalOpen]);


  const handleShare = () => {
    const url = `${window.location.origin}/designs/${design.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: 'Link Copied!',
        description: 'The project link has been copied to your clipboard.',
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy link.',
      });
    });
  };

  const handleDeleteConfirm = () => {
    if (auth.currentUser) {
      const designRef = doc(firestore, 'users', auth.currentUser.uid, 'designProjects', design.id);
      
      deleteDoc(designRef)
        .then(() => {
          toast({
            title: 'Success',
            description: 'Design project deleted successfully.',
          });
          setIsDeleteModalOpen(false);
        })
        .catch(() => {
          const permissionError = new FirestorePermissionError({
            path: designRef.path,
            operation: 'delete',
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    }
  };
  
  const handleViewModalOpenChange = (isOpen: boolean) => {
    setIsViewModalOpen(isOpen);
    if (!isOpen) {
      document.body.style.pointerEvents = 'auto';
    }
  };

  const handleEditSheetOpenChange = (isOpen: boolean) => {
    setIsEditSheetOpen(isOpen);
    if (!isOpen) {
      document.body.style.pointerEvents = 'auto';
    }
  };
  
  const handleDeleteModalOpenChange = (isOpen: boolean) => {
    setIsDeleteModalOpen(isOpen);
     if (!isOpen) {
      document.body.style.pointerEvents = 'auto';
    }
  };

  return (
    <>
      <Card className="group flex flex-col overflow-hidden transition-all hover:shadow-lg">
        <CardHeader className="p-0">
          <div className="relative aspect-video w-full overflow-hidden">
            <Image
              src={design.imageUrl}
              alt={design.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              data-ai-hint="design thumbnail"
            />
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">v{design.version}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4">
          <h3 className="font-headline font-semibold text-lg leading-tight truncate">{design.name}</h3>
          <p className="text-sm text-muted-foreground">{design.updatedAt ? format(design.updatedAt.toDate(), 'PP') : 'N/A'}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between">
          <Button variant="outline" size="sm" onClick={() => setIsViewModalOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setIsEditSheetOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsDeleteModalOpen(true)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>

      <Dialog open={isViewModalOpen} onOpenChange={handleViewModalOpenChange}>
        <DialogContent className="sm:max-w-3xl p-0">
            <>
              <DialogHeader className="p-6 pb-4">
                <DialogTitle className="text-2xl font-headline font-bold">{design.name}</DialogTitle>
                <DialogDescription className="text-base text-foreground/80 pt-2">{design.description}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(100vh-12rem)]">
                <div className="px-6 pb-6 space-y-6">
                  <div className="relative aspect-video w-full">
                    <Image
                      src={design.imageUrl}
                      alt={design.name}
                      fill
                      className="object-cover rounded-md border"
                      data-ai-hint="project hero"
                      priority
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {design.tags?.map((tag, index) => (
                      <Badge key={`${tag}-${index}`} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                  
                  <Separator />

                   <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                          <div className="font-semibold text-foreground">Version</div>
                          <div className="text-muted-foreground">v{design.version}</div>
                      </div>
                      <div>
                          <div className="font-semibold text-foreground">Created</div>
                          <div className="text-muted-foreground">{design.createdAt ? format(design.createdAt.toDate(), 'PP') : 'N/A'}</div>
                      </div>
                      <div>
                          <div className="font-semibold text-foreground">Last Updated</div>
                          <div className="text-muted-foreground">{design.updatedAt ? format(design.updatedAt.toDate(), 'PP') : 'N/A'}</div>
                      </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <a href={design.figmaLink} target="_blank" rel="noopener noreferrer" className="group">
                      <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <UiCardTitle className="text-sm font-medium">Figma Link</UiCardTitle>
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
                          <UiCardTitle className="text-sm font-medium">Prototype Link</UiCardTitle>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-lg font-bold text-primary group-hover:underline truncate">{design.prototypeUrl}</div>
                        </CardContent>
                      </Card>
                    </a>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="p-6 pt-4 border-t">
                  <Button type="button" variant="secondary" onClick={() => window.location.assign(`/designs/${design.id}`)}>
                    View Full Page
                  </Button>
                  <Button type="button" onClick={() => handleViewModalOpenChange(false)}>Close</Button>
              </DialogFooter>
            </>
        </DialogContent>
      </Dialog>
      
      <Sheet open={isEditSheetOpen} onOpenChange={handleEditSheetOpenChange}>
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
                onSuccess={() => handleEditSheetOpenChange(false)}
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={isDeleteModalOpen} onOpenChange={handleDeleteModalOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the project &quot;{design?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDeleteModalOpenChange(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
