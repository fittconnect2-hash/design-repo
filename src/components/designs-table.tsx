'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MoreHorizontal, Edit, Trash2, Eye, Globe, Lock, ExternalLink, Figma } from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, deleteDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Checkbox } from './ui/checkbox';
import { useSearchParams } from 'next/navigation';


interface DesignsTableProps {
  designs: (Design & { id: string })[];
  isPublic?: boolean;
  userId?: string;
}

export function DesignsTable({ designs, isPublic = false, userId }: DesignsTableProps) {
  const [designToDelete, setDesignToDelete] = React.useState<(Design & { id: string }) | null>(null);
  const [designToTogglePublic, setDesignToTogglePublic] = React.useState<(Design & { id: string }) | null>(null);
  
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [bulkAction, setBulkAction] = React.useState<'public' | 'private' | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isPublicConfirmOpen, setIsPublicConfirmOpen] = React.useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  
  const numSelected = React.useMemo(() => Object.values(rowSelection).filter(Boolean).length, [rowSelection]);
  
  React.useEffect(() => {
    setRowSelection({});
  }, [designs]);

  const publicLink = React.useCallback((designId: string) => {
    const projectIds = searchParams.get('projects');
    let link = `/share/designs/${designId}?from=${userId}`;
    if (projectIds) {
        link += `&projects=${projectIds}`;
    }
    return link;
  }, [searchParams, userId]);

  React.useEffect(() => {
    if (!isDeleteModalOpen && !isPublicConfirmOpen && !bulkAction) {
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 0);
    }
  }, [isDeleteModalOpen, isPublicConfirmOpen, bulkAction]);

  const handleDeleteConfirm = () => {
    if (designToDelete) {
      handleDelete(designToDelete);
    }
  };

  const handleDelete = async (design: Design & { id: string }) => {
    if (user) {
      const designRef = doc(firestore, 'designs', design.id);
      
      deleteDoc(designRef)
        .then(async () => {
          const auditLogRef = collection(firestore, 'auditLogs');
          await addDoc(auditLogRef, {
              userId: user.uid,
              userDisplayName: user.displayName,
              userEmail: user.email,
              action: 'DELETE',
              entityType: 'Design',
              entityId: design.id,
              entityName: design.name,
              details: `User deleted design '${design.name}'`,
              timestamp: serverTimestamp(),
          });

          toast({
            title: 'Success',
            description: 'Design deleted successfully.',
          });
          handleDeleteModalOpenChange(false);
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
            description: 'Failed to delete design.',
          });
        });
    }
  };

  const handleTogglePublicConfirm = async () => {
    if (!designToTogglePublic || !user) return;
    
    const designRef = doc(firestore, 'designs', designToTogglePublic.id);
    const newPublicState = !designToTogglePublic.isPublic;
    
    try {
      await setDoc(designRef, { isPublic: newPublicState }, { merge: true });

      const auditLogRef = collection(firestore, 'auditLogs');
      await addDoc(auditLogRef, {
          userId: user.uid,
          userDisplayName: user.displayName,
          userEmail: user.email,
          action: newPublicState ? 'SET_PUBLIC' : 'SET_PRIVATE',
          entityType: 'Design',
          entityId: designToTogglePublic.id,
          entityName: designToTogglePublic.name,
          details: `User set design '${designToTogglePublic.name}' to ${newPublicState ? 'Public' : 'Private'}`,
          timestamp: serverTimestamp(),
      });

      toast({
        title: 'Success',
        description: `Design has been made ${newPublicState ? 'public' : 'private'}.`,
      });
    } catch (error) {
       const permissionError = new FirestorePermissionError({
          path: designRef.path,
          operation: 'update',
          requestResourceData: { isPublic: newPublicState },
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update design status.',
        });
    } finally {
        handlePublicConfirmOpenChange(false);
    }
  };
  
  const handleBulkUpdateConfirm = async () => {
    if (!user || bulkAction === null) return;

    const isPublic = bulkAction === 'public';
    const selectedIds = Object.keys(rowSelection).filter(id => rowSelection[id]);

    const updatePromises = selectedIds.map(id => {
        const designToUpdate = designs.find(d => d.id === id);
        if (!designToUpdate) {
            console.warn(`Could not find design with id ${id} for bulk update.`);
            return Promise.resolve();
        }

        const designRef = doc(firestore, 'designs', id);
        return setDoc(designRef, { isPublic }, { merge: true }).then(async () => {
          const auditLogRef = collection(firestore, 'auditLogs');
          await addDoc(auditLogRef, {
              userId: user.uid,
              userDisplayName: user.displayName,
              userEmail: user.email,
              action: isPublic ? 'SET_PUBLIC' : 'SET_PRIVATE',
              entityType: 'Design',
              entityId: id,
              entityName: designToUpdate.name,
              details: `User set design '${designToUpdate.name}' to ${isPublic ? 'Public' : 'Private'} via bulk action`,
              timestamp: serverTimestamp(),
          });
        });
    });

    try {
        await Promise.all(updatePromises);
        toast({
            title: 'Success',
            description: `${selectedIds.length} designs have been updated to ${bulkAction}.`,
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update one or more designs. You may not have permission.',
        });
        console.error("Bulk update failed:", error);
    } finally {
        setBulkAction(null);
        setRowSelection({});
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked === true) {
      const newSelection = designs.reduce((acc, design) => {
        acc[design.id] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setRowSelection(newSelection);
    } else {
      setRowSelection({});
    }
  };

  const handleRowSelect = (designId: string, checked: boolean) => {
    setRowSelection(prev => ({
      ...prev,
      [designId]: checked,
    }));
  };
  
  const handleOpenDeleteModal = (design: Design & { id: string }) => {
    setDesignToDelete(design);
    setIsDeleteModalOpen(true);
  };
  
  const handleOpenPublicConfirmModal = (design: Design & { id: string }) => {
    setDesignToTogglePublic(design);
    setIsPublicConfirmOpen(true);
  };

  const handleDeleteModalOpenChange = (isOpen: boolean) => {
    setIsDeleteModalOpen(isOpen);
    if (!isOpen) {
      setDesignToDelete(null);
      document.body.style.pointerEvents = 'auto';
    }
  };

  const handlePublicConfirmOpenChange = (isOpen: boolean) => {
    setIsPublicConfirmOpen(isOpen);
    if (!isOpen) {
      setDesignToTogglePublic(null);
      document.body.style.pointerEvents = 'auto';
    }
  };

  return (
    <>
      {!isPublic && numSelected > 0 && (
        <div className="flex items-center gap-4 p-2.5 bg-muted/50 border-b">
          <p className="text-sm text-muted-foreground px-2">{numSelected} selected</p>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('public')}>
            <Globe className="mr-2 h-4 w-4" /> Make Public
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('private')}>
            <Lock className="mr-2 h-4 w-4" /> Make Private
          </Button>
        </div>
      )}
      <div className="rounded-md border-t">
        <Table>
          <TableHeader>
            <TableRow>
              {!isPublic && (
                <TableHead className="w-[40px] px-3">
                  <Checkbox
                    checked={numSelected > 0 && numSelected === designs.length}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    aria-label="Select all rows"
                  />
                </TableHead>
              )}
              <TableHead className="w-[80px] hidden sm:table-cell">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Project</TableHead>
              
              {isPublic ? (
                <>
                  <TableHead className="hidden xl:table-cell">Figma</TableHead>
                  <TableHead className="hidden xl:table-cell">Prototype</TableHead>
                  <TableHead className="text-right w-[120px]">Details</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="hidden lg:table-cell">Tags</TableHead>
                  <TableHead className="hidden md:table-cell">Version</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Updated</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {designs && designs.length > 0 ? (
              designs.map(design => (
                <TableRow key={design.id} data-state={!isPublic && rowSelection[design.id] ? 'selected' : undefined}>
                  {!isPublic && (
                     <TableCell className="px-3">
                      <Checkbox
                        checked={rowSelection[design.id] || false}
                        onCheckedChange={(checked) => handleRowSelect(design.id, Boolean(checked))}
                        aria-label={`Select row for ${design.name}`}
                      />
                    </TableCell>
                  )}
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
                  <TableCell className="font-medium">
                     <Link href={isPublic ? publicLink(design.id) : `/designs/${design.id}`} className="hover:underline">
                        {design.name || 'Untitled Design'}
                     </Link>
                  </TableCell>
                   <TableCell className="hidden md:table-cell text-muted-foreground">{design.projectName || 'N/A'}</TableCell>
                  
                  {isPublic ? (
                    <>
                      <TableCell className="hidden xl:table-cell">
                        {design.figmaLink ? (
                          <a href={design.figmaLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                            <Figma className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{design.figmaLink}</span>
                          </a>
                        ) : <span className="text-muted-foreground">N/A</span>}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {design.prototypeUrl ? (
                          <a href={design.prototypeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                            <ExternalLink className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{design.prototypeUrl}</span>
                          </a>
                        ) : <span className="text-muted-foreground">N/A</span>}
                      </TableCell>
                      <TableCell className="text-right">
                         <Button asChild variant="outline" size="sm">
                            <Link href={publicLink(design.id)}>View Details</Link>
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
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
                      <TableCell className="hidden md:table-cell">
                        {design.isPublic ? (
                          <Badge variant="outline" className="text-green-700 border-green-500/50 dark:text-green-400 dark:border-green-400/50">Public</Badge>
                        ) : (
                          <Badge variant="secondary">Private</Badge>
                        )}
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
                            <DropdownMenuItem asChild>
                                <Link href={`/designs/${design.id}`} className="flex w-full items-center cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" />
                                View
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                               <Link href={`/designs/${design.id}/edit`} className="flex w-full items-center cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => handleOpenPublicConfirmModal(design)}
                              className="cursor-pointer"
                            >
                              {design.isPublic ? (
                                <><Lock className="mr-2 h-4 w-4" /> Make Private</>
                              ) : (
                                <><Globe className="mr-2 h-4 w-4" /> Make Public</>
                              )}
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
                    </>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isPublic ? 5 : 8} className="h-24 text-center">
                  No designs to display.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {!isPublic && (
        <>
          <AlertDialog open={isDeleteModalOpen} onOpenChange={handleDeleteModalOpenChange}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the design &quot;{designToDelete?.name}&quot;.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button variant="outline" onClick={() => handleDeleteModalOpenChange(false)}>Cancel</Button>
                <Button onClick={handleDeleteConfirm} variant="destructive">
                  Delete
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
           <AlertDialog open={isPublicConfirmOpen} onOpenChange={handlePublicConfirmOpenChange}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will change the visibility of the design &quot;{designToTogglePublic?.name}&quot;. 
                  Do you want to make it {designToTogglePublic?.isPublic ? 'private' : 'public'}?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleTogglePublicConfirm}>
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={!!bulkAction} onOpenChange={(open) => !open && setBulkAction(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This will change the visibility for {numSelected} selected designs.
                    Do you want to make them {bulkAction}?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setBulkAction(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkUpdateConfirm}>
                    Confirm
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}
