'use client';

import * as React from 'react';
import Image from 'next/image';
import { MoreHorizontal, Edit, Trash2, Eye, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

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
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

interface DesignCardProps {
  design: Design & { id: string };
}

export function DesignCard({ design }: DesignCardProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  React.useEffect(() => {
    if (!isDeleteModalOpen) {
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 0);
    }
  }, [isDeleteModalOpen]);


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
      const designRef = doc(firestore, 'designs', design.id);
      
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
  
  const handleDeleteModalOpenChange = (isOpen: boolean) => {
    setIsDeleteModalOpen(isOpen);
     if (!isOpen) {
      document.body.style.pointerEvents = 'auto';
    }
  };

  return (
    <>
      <Card className="group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <Link href={`/designs/${design.id}`} className="block">
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
        </Link>
        <CardFooter className="p-4 pt-0 flex justify-between">
            <Button asChild variant="outline" size="sm">
                <Link href={`/designs/${design.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                </Link>
            </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                 <Link href={`/designs/${design.id}/edit`} className="flex w-full items-center cursor-pointer">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsDeleteModalOpen(true)} className="text-destructive focus:text-destructive cursor-pointer">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>

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
