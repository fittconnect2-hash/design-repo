'use client';

import * as React from 'react';
import { MoreHorizontal, Edit, Trash2, Send, Link as LinkIcon, AlertTriangle } from 'lucide-react';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { doc, deleteDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
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

type ManagedUser = {
  id: string;
  displayName: string;
  email: string;
  role: 'Admin' | 'Staff Designer';
  createdAt?: any;
  status: 'Active' | 'Pending';
};

interface UsersTableProps {
  users: ManagedUser[];
}

export function UsersTable({ users }: UsersTableProps) {
  const [userToEdit, setUserToEdit] = React.useState<ManagedUser | null>(null);
  const [userToDelete, setUserToDelete] = React.useState<ManagedUser | null>(null);
  const [inviteToRevoke, setInviteToRevoke] = React.useState<ManagedUser | null>(null);

  const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = React.useState(false);

  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const firestore = useFirestore();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const handleCopyInviteLink = (inviteId: string) => {
    const origin = window.location.origin;
    const link = `${origin}/signup?invite=${inviteId}`;
    navigator.clipboard.writeText(link).then(() => {
        toast({ title: 'Success', description: 'Invite link copied to clipboard.' });
    });
  };

  const handleResendInvite = (email: string, inviteId: string) => {
    const origin = window.location.origin;
    const link = `${origin}/signup?invite=${inviteId}`;
    const subject = encodeURIComponent("Reminder: You're invited to join DesignDock");
    const body = encodeURIComponent(
      `Hello,\n\nYou have been invited to join our team on DesignDock.\n\nPlease use the following link to sign up:\n${link}\n\nWe're looking forward to collaborating with you!\n\nBest,\nThe DesignDock Team`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleRevokeConfirm = () => {
     if (inviteToRevoke && currentUser) {
        const inviteRef = doc(firestore, 'invites', inviteToRevoke.id);
        deleteDoc(inviteRef)
            .then(async () => {
                const auditLogRef = collection(firestore, 'auditLogs');
                await addDoc(auditLogRef, {
                    userId: currentUser.uid,
                    userDisplayName: currentUser.displayName,
                    userEmail: currentUser.email,
                    action: 'REVOKE_INVITE',
                    entityType: 'Invite',
                    entityId: inviteToRevoke.id,
                    entityName: inviteToRevoke.email,
                    details: `User revoked invitation for '${inviteToRevoke.email}'`,
                    timestamp: serverTimestamp(),
                });
                
                toast({
                    title: 'Success',
                    description: `Invitation for ${inviteToRevoke.email} has been revoked.`,
                });
                handleRevokeModalOpenChange(false);
            })
            .catch(() => {
                 const permissionError = new FirestorePermissionError({
                    path: inviteRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
                 toast({
                    variant: 'destructive',
                    title: 'Permission Error',
                    description: 'Failed to revoke invitation.',
                });
            });
     }
  };


  const handleDeleteConfirm = () => {
    if (userToDelete && currentUser) {
      if (userToDelete.id === currentUser.uid) {
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
        .then(async () => {
          const auditLogRef = collection(firestore, 'auditLogs');
          await addDoc(auditLogRef, {
              userId: currentUser.uid,
              userDisplayName: currentUser.displayName,
              userEmail: currentUser.email,
              action: 'DELETE',
              entityType: 'User',
              entityId: userToDelete.id,
              entityName: userToDelete.displayName,
              details: `User deleted user profile for '${userToDelete.displayName}'`,
              timestamp: serverTimestamp(),
          });
          
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

  const handleOpenEditSheet = (user: ManagedUser) => {
    setUserToEdit(user);
    setIsEditSheetOpen(true);
  };
  
  const handleOpenDeleteModal = (user: ManagedUser) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleOpenRevokeModal = (user: ManagedUser) => {
    setInviteToRevoke(user);
    setIsRevokeModalOpen(true);
  };

  const handleEditSheetOpenChange = (isOpen: boolean) => {
    setIsEditSheetOpen(isOpen);
    if (!isOpen) {
      setUserToEdit(null);
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 0);
    }
  };
  
  const handleDeleteModalOpenChange = (isOpen: boolean) => {
    setIsDeleteModalOpen(isOpen);
    if (!isOpen) {
      setUserToDelete(null);
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 0);
    }
  };
  
  const handleRevokeModalOpenChange = (isOpen: boolean) => {
    setIsRevokeModalOpen(isOpen);
    if (!isOpen) {
      setInviteToRevoke(null);
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 0);
    }
  };


  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Role</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Date Added</TableHead>
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
                        <span className={`font-medium ${user.status === 'Pending' ? 'italic text-muted-foreground' : ''}`}>
                          {user.displayName || 'No Name'}
                        </span>
                        <span className='text-xs text-muted-foreground md:hidden'>{user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                     <Badge variant={user.status === 'Active' ? 'outline' : 'destructive'} className={user.status === 'Active' ? 'border-green-500/50 text-green-700 dark:border-green-400/50 dark:text-green-400' : ''}>
                        {user.status}
                    </Badge>
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
                        {user.status === 'Active' ? (
                          <>
                            <DropdownMenuItem
                              onSelect={() => handleOpenEditSheet(user)}
                              className="flex cursor-pointer items-center"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => handleOpenDeleteModal(user)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem onSelect={() => handleResendInvite(user.email, user.id)} className="cursor-pointer">
                                <Send className="mr-2 h-4 w-4" />
                                Resend Invite
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleCopyInviteLink(user.id)} className="cursor-pointer">
                                <LinkIcon className="mr-2 h-4 w-4" />
                                Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleOpenRevokeModal(user)} className="cursor-pointer text-destructive focus:text-destructive">
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Revoke Invite
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No users or invitations found.
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
                  user={userToEdit as UserProfile & { id: string }}
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

      <AlertDialog open={isRevokeModalOpen} onOpenChange={handleRevokeModalOpenChange}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This will permanently revoke the invitation for &quot;{inviteToRevoke?.email}&quot;. They will not be able to sign up with this link.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRevokeConfirm} className="bg-destructive hover:bg-destructive/90">
                    Revoke
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
