'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MoreHorizontal, Edit, Trash2, Eye, Share2, Figma, ExternalLink } from 'lucide-react';

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
  DialogClose,
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


interface DesignsTableProps {
  designs: (Design & { id: string })[];
}

export function DesignsTable({ designs }: DesignsTableProps) {
  const [designToView, setDesignToView] = React.useState<(Design & { id: string }) | null>(null);
  const [designToDelete, setDesignToDelete] = React.useState<(Design & { id: string }) | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

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
  
  const handleOpenDeleteModal = (design: Design & { id: string }) => {
    setDesignToDelete(design);
    setIsDeleteModalOpen(true);
  };

  const handleViewModalOpenChange = (isOpen: boolean) => {
    setIsViewModalOpen(isOpen);
    if (!isOpen) {
      // THIS IS THE FIX:
      // When the modal closes, we force the body's pointer-events back to 'auto'.
      // This is wrapped in a timeout to ensure it runs *after* Radix's own (buggy)
      // cleanup logic, winning the race condition.
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 0);
      
      // Delay clearing data to allow for exit animation before content disappears
      setTimeout(() => {
        setDesignToView(null);
      }, 150);
    }
  };
  
  const handleDeleteModalOpenChange = (isOpen: boolean) => {
    setIsDeleteModalOpen(isOpen);
    if (!isOpen) {
       // THIS IS THE FIX:
      // Same logic for the delete modal.
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 0);
      setDesignToDelete(null);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] hidden md:table-cell">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden lg:table-cell">Description</TableHead>
              <TableHead className="hidden sm:table-cell">Tags</TableHead>
              <TableHead className="text-right w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {designs && designs.length > 0 ? (
              designs.map(design => (
                <TableRow key={design.id}>
                  <TableCell className="hidden md:table-cell">
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
                  <TableCell className="hidden lg:table-cell max-w-sm truncate">
                    {design.description || 'No description available.'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {design.tags?.slice(0, 3).map((tag, index) => (
                        <Badge key={`${design.id}-${tag}-${index}`} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
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
                        <DropdownMenuItem asChild>
                          <Link href={`/designs/${design.id}/edit`} className="flex cursor-pointer items-center">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
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
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No design projects yet. Start by adding one!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={handleViewModalOpenChange}>
        <DialogContent className="sm:max-w-3xl p-0">
          {designToView ? (
            <>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-2xl font-headline font-bold">{designToView.name}</DialogTitle>
                <DialogDescription className="text-base text-foreground/80 pt-4">{designToView.description}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(100vh-10rem)]">
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
              <DialogFooter className="p-6 pt-0">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Close
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={handleDeleteModalOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the project &quot;{designToDelete?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
