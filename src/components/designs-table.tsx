'use client';

import * as React from 'react';
import Image from 'next/image';
import { MoreHorizontal, Edit, Trash2, Eye, Share2, Figma, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

import type { Design } from '@/lib/definitions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Card, CardContent, CardHeader, CardTitle as UiCardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { DesignForm } from './design-form';


interface DesignsTableProps {
  designs: (Design & { id: string })[];
  isPublic?: boolean;
}

export function DesignsTable({ designs, isPublic = false }: DesignsTableProps) {
  const [designToView, setDesignToView] = React.useState<(Design & { id: string }) | null>(null);
  const [designToEdit, setDesignToEdit] = React.useState<(Design & { id: string }) | null>(null);
  const [designToDelete, setDesignToDelete] = React.useState<(Design & { id: string }) | null>(null);
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

  const handleShare = (designId: string) => {
    const url = `${window.location.origin}/designs/${designId}`;
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
    if (designToDelete) {
      handleDelete(designToDelete);
    }
  };

  const handleDelete = async (design: Design & { id: string }) => {
    if (auth.currentUser) {
      const designRef = doc(firestore, 'users', auth.currentUser.uid, 'designProjects', design.id);
      
      deleteDoc(designRef)
        .then(() => {
          toast({
            title: 'Success',
            description: 'Design project deleted successfully.',
          });
          setIsDeleteModalOpen(false);
          setDesignToDelete(null);
        })
        .catch(() => {
          const permissionError = new FirestorePermissionError({
            path: designRef.path,
            operation: 'delete',
          });
          errorEmitter.emit('permission-error', permissionError);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to delete design project.',
          });
        });
    }
  };

  const handleOpenViewModal = (design: Design & { id: string }) => {
    setDesignToView(design);
    setIsViewModalOpen(true);
  };

  const handleOpenEditSheet = (design: Design & { id: string }) => {
    setDesignToEdit(design);
    setIsEditSheetOpen(true);
  };
  
  const handleOpenDeleteModal = (design: Design & { id: string }) => {
    setDesignToDelete(design);
    setIsDeleteModalOpen(true);
  };

  const handleViewModalOpenChange = (isOpen: boolean) => {
    setIsViewModalOpen(isOpen);
    if (!isOpen) {
      setDesignToView(null);
      document.body.style.pointerEvents = 'auto';
    }
  };

  const handleEditSheetOpenChange = (isOpen: boolean) => {
    setIsEditSheetOpen(isOpen);
    if (!isOpen) {
      setDesignToEdit(null);
      document.body.style.pointerEvents = 'auto';
    }
  };
  
  const handleDeleteModalOpenChange = (isOpen: boolean) => {
    setIsDeleteModalOpen(isOpen);
    if (!isOpen) {
      setDesignToDelete(null);
      document.body.style.pointerEvents = 'auto';
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] hidden sm:table-cell">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden lg:table-cell">Tags</TableHead>
              <TableHead className="hidden md:table-cell">Version</TableHead>
              <TableHead className="hidden lg:table-cell">Last Updated</TableHead>
              {!isPublic && <TableHead className="text-right w-[80px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {designs && designs.length > 0 ? (
              designs.map(design => (
                <TableRow key={design.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Image
                      src={design.imageUrl || `https://picsum.photos/seed/${design.id}/80/60`}
                      alt={design.name || 'Design thumbnail'}
                      width={80}
                      height={60}
                      className="rounded-md object-cover"
                      data-ai-hint="design thumbnail"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{design.name || 'Untitled Project'}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {design.tags?.slice(0, 3).map((tag, index) => (
                        <Badge key={`${design.id}-${tag}-${index}`} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
                   <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">v{design.version}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {design.updatedAt ? format(design.updatedAt.toDate(), 'PP') : 'N/A'}
                  </TableCell>
                  {!isPublic && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => handleOpenViewModal(design)}
                            className="flex cursor-pointer items-center"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleShare(design.id)}
                            className="cursor-pointer"
                          >
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleOpenEditSheet(design)}
                            className="flex cursor-pointer items-center"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleOpenDeleteModal(design)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isPublic ? 5 : 6} className="h-24 text-center">
                  No designs to display.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!isPublic && (
        <>
          <Dialog open={isViewModalOpen} onOpenChange={handleViewModalOpenChange}>
            <DialogContent className="sm:max-w-3xl p-0">
              {designToView ? (
                <>
                  <DialogHeader className="p-6 pb-4">
                    <DialogTitle className="text-2xl font-headline font-bold">{designToView.name}</DialogTitle>
                    <DialogDescription className="text-base text-foreground/80 pt-2">{designToView.description}</DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[calc(100vh-12rem)]">
                    <div className="px-6 pb-6 space-y-6">
                      <div className="relative aspect-video w-full">
                        <Image
                          src={designToView.imageUrl}
                          alt={designToView.name}
                          fill
                          className="object-cover rounded-md border"
                          data-ai-hint="project hero"
                          priority
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {designToView.tags?.map((tag, index) => (
                          <Badge key={`${tag}-${index}`} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                      
                      <Separator />

                       <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                              <div className="font-semibold text-foreground">Version</div>
                              <div className="text-muted-foreground">v{designToView.version}</div>
                          </div>
                          <div>
                              <div className="font-semibold text-foreground">Created</div>
                              <div className="text-muted-foreground">{designToView.createdAt ? format(designToView.createdAt.toDate(), 'PP') : 'N/A'}</div>
                          </div>
                          <div>
                              <div className="font-semibold text-foreground">Last Updated</div>
                              <div className="text-muted-foreground">{designToView.updatedAt ? format(designToView.updatedAt.toDate(), 'PP') : 'N/A'}</div>
                          </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <a href={designToView.figmaLink} target="_blank" rel="noopener noreferrer" className="group">
                          <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <UiCardTitle className="text-sm font-medium">Figma Link</UiCardTitle>
                              <Figma className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                              <div className="text-lg font-bold text-primary group-hover:underline truncate">{designToView.figmaLink}</div>
                            </CardContent>
                          </Card>
                        </a>
                        <a href={designToView.prototypeUrl} target="_blank" rel="noopener noreferrer" className="group">
                          <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <UiCardTitle className="text-sm font-medium">Prototype Link</UiCardTitle>
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                              <div className="text-lg font-bold text-primary group-hover:underline truncate">{designToView.prototypeUrl}</div>
                            </CardContent>
                          </Card>
                        </a>
                      </div>
                    </div>
                  </ScrollArea>
                  <DialogFooter className="p-6 pt-4 border-t">
                      <Button type="button" variant="secondary" onClick={() => window.location.assign(`/designs/${designToView.id}`)}>
                        View Full Page
                      </Button>
                      <Button type="button" onClick={() => handleViewModalOpenChange(false)}>Close</Button>
                  </DialogFooter>
                </>
              ) : null}
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
                  {designToEdit && (
                    <DesignForm
                      design={designToEdit}
                      view="sheet"
                      onSuccess={() => handleEditSheetOpenChange(false)}
                    />
                  )}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <Dialog open={isDeleteModalOpen} onOpenChange={handleDeleteModalOpenChange}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete the project &quot;{designToDelete?.name}&quot;.
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
      )}
    </>
  );
}
