'use client';

import * as React from 'react';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

import type { UserProfile } from '@/lib/definitions';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { UserForm } from './user-form';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface UsersTableProps {
  users: (UserProfile & { id: string })[];
}

export function UsersTable({ users }: UsersTableProps) {
  const [userToEdit, setUserToEdit] = React.useState<(UserProfile & { id: string }) | null>(null);
  const [userToDelete, setUserToDelete] = React.useState<(UserProfile & { id: string }) | null>(null);

  const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const handleDeleteConfirm = () => {
    if (userToDelete && auth.currentUser) {
      // Admins cannot delete their own account from the user management page.
      if (userToDelete.id === auth.currentUser.uid) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You cannot delete your own account from this panel.',
        });
        handleDeleteModalOpenChange(false);
        return;
      }
      
      const userRef = doc(firestore, 'users', userToDelete.id);
      
      deleteDoc(userRef)
        .then(() => {
          toast({
            title: 'Success',
            description: `User profile for ${userToDelete.displayName} deleted. This does not remove their authentication record.`,
          });
          handleDeleteModalOpenChange(false);
        })
        .catch(() => {
          const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'delete',
          });
          errorEmitter.emit('permission-error', permissionError);
          toast({
            variant: 'destructive',
            title: 'Permission Error',
            description: 'Failed to delete user profile.',
          });
        });
    }
  };

  const handleOpenEditSheet = (user: UserProfile & { id: string }) => {
    setUserToEdit(user);
    setIsEditSheetOpen(true);
  };
  
  const handleOpenDeleteModal = (user: UserProfile & { id: string }) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleEditSheetOpenChange = (isOpen: boolean) => {
    setIsEditSheetOpen(isOpen);
    if (!isOpen) {
      setUserToEdit(null);
    }
  };
  
  const handleDeleteModalOpenChange = (isOpen: boolean) => {
    setIsDeleteModalOpen(isOpen);
    if (!isOpen) {
      setUserToDelete(null);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Role</TableHead>
              <TableHead className="hidden lg:table-cell">Created At</TableHead>
              <TableHead className="text-right w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.length > 0 ? (
              users.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                       <Avatar className="h-8 w-8">
                        <AvatarImage src={''} alt={user.displayName ?? 'User'} />
                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className='font-medium'>{user.displayName || 'No Name'}</span>
                        <span className='text-xs text-muted-foreground md:hidden'>{user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {user.createdAt ? format(user.createdAt.toDate(), 'PP') : 'N/A'}
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
                          onSelect={() => handleOpenEditSheet(user)}
                          className="flex cursor-pointer items-center"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleOpenDeleteModal(user)}
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
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <Sheet open={isEditSheetOpen} onOpenChange={handleEditSheetOpenChange}>
        <SheetContent className="p-0 sm:max-w-md">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle>Edit User</SheetTitle>
            <SheetDescription>
              Modify the user's details and role. Click save when you're done.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-6.5rem)]">
            <div className="px-6 pb-6">
              {userToEdit && (
                <UserForm
                  user={userToEdit}
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
              This will permanently delete the user profile for &quot;{userToDelete?.displayName}&quot; from Firestore. This action does not delete the user's authentication account and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDeleteModalOpenChange(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} variant="destructive">
              Delete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
