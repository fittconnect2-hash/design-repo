'use client';

import { useMemo } from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import Link from 'next/link';

import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import type { UserProfile } from '@/lib/definitions';
import { UsersTable } from '@/components/users-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

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

  const userProfileRef = useMemo(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  // An admin is someone with the 'Admin' role or the designated super admin email.
  const isSuperAdminByEmail = user?.email === 'fittconnect2@gmail.com';
  const isAdmin = userProfile?.role === 'Admin' || isSuperAdminByEmail;

  const usersQuery = useMemo(() => {
    // Only create the query if the user is an admin.
    if (!user || !isAdmin) return null;
    const collRef = collection(firestore, 'users');
    return query(collRef, orderBy('createdAt', 'desc'));
  }, [firestore, user, isAdmin]);

  const { data: users, isLoading: isLoadingUsers, error } = useCollection<UserProfile & { id: string }>(usersQuery);

  const isLoading = isUserLoading || isUserProfileLoading || (isAdmin && isLoadingUsers);
  
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

  const hasUsers = users && users.length > 0;

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage all users in your workspace. New users can be added via the signup page.</p>
        </div>
         <Button asChild>
          <Link href="/signup" target="_blank">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Link>
        </Button>
      </div>

      {hasUsers ? (
        <Card>
          <UsersTable users={users || []} />
        </Card>
      ) : (
         <Card className="flex flex-col items-center justify-center py-20">
            <CardHeader>
              <CardTitle className="text-2xl">No Users Found</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <p className="text-muted-foreground">Users who sign up will appear here.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
