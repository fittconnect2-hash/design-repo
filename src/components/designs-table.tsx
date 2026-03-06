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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DesignsTableProps {
  designs: (Design & { id: string })[];
}

export function DesignsTable({ designs }: DesignsTableProps) {
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isViewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [selectedDesign, setSelectedDesign] = React.useState<(Design & { id: string }) | null>(null);
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

  const handleDelete = async () => {
    if (selectedDesign && auth.currentUser) {
      const designRef = doc(firestore, 'users', auth.currentUser.uid, 'designProjects', selectedDesign.id);
      
      deleteDoc(designRef)
        .then(() => {
          toast({
            title: 'Success',
            description: 'Design project deleted successfully.',
          });
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
    setDeleteDialogOpen(false);
    setSelectedDesign(null);
  };

  const handleViewClick = (design: Design & { id: string }) => {
    setSelectedDesign(design);
    setViewDialogOpen(true);
  };

  const handleDeleteClick = (design: Design & { id: string }) => {
    setSelectedDesign(design);
    setDeleteDialogOpen(true);
  }

  const onDialogClose = () => {
    // When either dialog closes, reset the selected design
    setSelectedDesign(null);
  }

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
                        <DropdownMenuItem onSelect={() => handleViewClick(design)} className="flex cursor-pointer items-center">
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
                          onSelect={() => handleDeleteClick(design)}
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) onDialogClose(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this design project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => { setViewDialogOpen(open); if (!open) onDialogClose(); }}>
        <DialogContent className="max-w-4xl p-0">
            {selectedDesign && (
              <>
              <ScrollArea className="max-h-[90vh]">
                <div className="relative aspect-video w-full">
                  <Image
                    src={selectedDesign.imageUrl}
                    alt={selectedDesign.name}
                    fill
                    className="object-cover"
                    data-ai-hint="project hero"
                  />
                </div>
                <div className="p-6">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-headline font-bold">{selectedDesign.name}</DialogTitle>
                  </DialogHeader>
                  <div className="my-4 flex flex-wrap gap-2">
                    {selectedDesign.tags.map((tag, index) => (
                      <Badge key={`${tag}-${index}`} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                  <p className="text-base text-foreground/80">{selectedDesign.description}</p>
                  
                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <a href={selectedDesign.figmaLink} target="_blank" rel="noopener noreferrer" className="group">
                          <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                  <CardTitle className="text-sm font-medium">Figma Link</CardTitle>
                                  <Figma className="h-4 w-4 text-muted-foreground" />
                              </CardHeader>
                              <CardContent>
                                  <div className="text-lg font-bold text-primary group-hover:underline truncate">{selectedDesign.figmaLink}</div>
                              </CardContent>
                          </Card>
                      </a>
                      <a href={selectedDesign.prototypeUrl} target="_blank" rel="noopener noreferrer" className="group">
                          <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                  <CardTitle className="text-sm font-medium">Prototype Link</CardTitle>
                                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                              </CardHeader>
                              <CardContent>
                                  <div className="text-lg font-bold text-primary group-hover:underline truncate">{selectedDesign.prototypeUrl}</div>
                              </CardContent>
                          </Card>
                      </a>
                  </div>
                </div>
              </ScrollArea>
              </>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
