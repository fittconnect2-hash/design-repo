'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';

import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import type { UserProfile, Invite } from '@/lib/definitions';
import { UsersTable } from '@/components/users-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AddUserSheet } from '@/components/add-user-sheet';

function UserManagementSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function UserManagementPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isAddUserSheetOpen, setIsAddUserSheetOpen] = useState(false);

  const userProfileRef = useMemo(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const isSuperAdminByEmail = user?.email === 'fittconnect2@gmail.com';
  const isAdmin = userProfile?.role === 'Admin' || isSuperAdminByEmail;

  const usersQuery = useMemo(() => {
    if (!user || !isAdmin) return null;
    const collRef = collection(firestore, 'users');
    return query(collRef, orderBy('createdAt', 'desc'));
  }, [firestore, user, isAdmin]);

  const { data: users, isLoading: isLoadingUsers, error: usersError } = useCollection<UserProfile & { id: string }>(usersQuery);

  const invitesQuery = useMemo(() => {
    if (!user || !isAdmin) return null;
    const collRef = collection(firestore, 'invites');
    return query(collRef, orderBy('createdAt', 'desc'));
  }, [firestore, user, isAdmin]);

  const { data: invites, isLoading: isLoadingInvites, error: invitesError } = useCollection<Invite & { id: string }>(invitesQuery);

  const isLoading = isUserLoading || isUserProfileLoading || (isAdmin && (isLoadingUsers || isLoadingInvites));
  const error = usersError || invitesError;

  const managedUsers = useMemo(() => {
    if (!users && !invites) return [];

    const activeUsers = (users || []).map(u => ({
      ...u,
      status: 'Active' as const
    }));

    const pendingUsers = (invites || []).map(i => ({
      id: i.id,
      displayName: i.email,
      email: i.email,
      role: i.role,
      createdAt: i.createdAt,
      status: 'Pending' as const,
    }));
    
    const combined = [...activeUsers, ...pendingUsers];

    combined.sort((a, b) => {
        const dateA = a.createdAt?.toDate()?.getTime() || 0;
        const dateB = b.createdAt?.toDate()?.getTime() || 0;
        return dateB - dateA;
    });

    return combined;
  }, [users, invites]);
  
  if (isLoading) {
    return <UserManagementSkeleton />;
  }
  
  if (error || !isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">Manage all users in your workspace.</p>
            </div>
        </div>
        <Card className="flex flex-col items-center justify-center py-20">
            <CardHeader>
            <CardTitle className="text-2xl text-destructive">Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground">You do not have permission to view this page.</p>
            <p className="text-sm text-muted-foreground">Please contact your administrator to get an 'Admin' role.</p>
            </CardContent>
        </Card>
      </div>
    );
  }

  const hasUsersOrInvites = managedUsers && managedUsers.length > 0;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">Invite and manage all users in your workspace.</p>
          </div>
          <Button onClick={() => setIsAddUserSheetOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        {hasUsersOrInvites ? (
          <Card>
            <UsersTable users={managedUsers || []} />
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center py-20">
              <CardHeader>
                <CardTitle className="text-2xl">No Users Found</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                  <p className="text-muted-foreground">Invited users who sign up will appear here.</p>
              </CardContent>
          </Card>
        )}
      </div>
      <AddUserSheet open={isAddUserSheetOpen} onOpenChange={setIsAddUserSheetOpen} />
    </>
  );
}
