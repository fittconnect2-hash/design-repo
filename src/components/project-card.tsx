'use client';

import * as React from 'react';
import { MoreHorizontal, Edit, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

import type { Project } from '@/lib/definitions';
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
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { doc, deleteDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ProjectForm } from './project-form';
import { ScrollArea } from './ui/scroll-area';

interface ProjectCardProps {
  project: Project & { id: string };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  React.useEffect(() => {
    if (!isEditSheetOpen && !isDeleteModalOpen) {
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 0);
    }
  }, [isEditSheetOpen, isDeleteModalOpen]);


  const handleDeleteConfirm = () => {
    if (user) {
      const projectRef = doc(firestore, 'projects', project.id);
      
      deleteDoc(projectRef)
        .then(async () => {
          const auditLogRef = collection(firestore, 'auditLogs');
          await addDoc(auditLogRef, {
              userId: user.uid,
              userDisplayName: user.displayName,
              userEmail: user.email,
              action: 'DELETE',
              entityType: 'Project',
              entityId: project.id,
              entityName: project.name,
              details: `User deleted project '${project.name}'`,
              timestamp: serverTimestamp(),
          });

          toast({
            title: 'Success',
            description: 'Project deleted successfully.',
          });
          setIsDeleteModalOpen(false);
        })
        .catch(() => {
          const permissionError = new FirestorePermissionError({
            path: projectRef.path,
            operation: 'delete',
          });
          errorEmitter.emit('permission-error', permissionError);
        });
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
      <Card className="group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle className="text-xl">{project.name}</CardTitle>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsDeleteModalOpen(true)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <div className='flex items-center gap-2'>
            <Calendar className='h-4 w-4' />
            <span>{project.startDate ? format(project.startDate.toDate(), 'PP') : 'N/A'}</span>
          </div>
           <p className="text-sm">Updated {project.updatedAt ? format(project.updatedAt.toDate(), 'PP') : 'N/A'}</p>
        </CardFooter>
      </Card>
      
      <Sheet open={isEditSheetOpen} onOpenChange={handleEditSheetOpenChange}>
        <SheetContent className="p-0 sm:max-w-2xl">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle>Edit Project</SheetTitle>
            <SheetDescription>
              Make changes to your project here. Click save when you're done.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-6.5rem)]">
            <div className="px-6 pb-6">
              <ProjectForm
                project={project}
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
              This action cannot be undone. This will permanently delete the project &quot;{project?.name}&quot; and all associated designs.
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
