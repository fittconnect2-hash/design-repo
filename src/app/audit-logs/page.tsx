'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { PlusCircle, Edit, Trash2, UserPlus, UserX, Share2, Lock, FileText, Folder, User, Mail, Filter } from 'lucide-react';

import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import type { AuditLog, UserProfile } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const ACTION_ICONS = {
    CREATE: <PlusCircle className="h-5 w-5 text-green-500" />,
    UPDATE: <Edit className="h-5 w-5 text-blue-500" />,
    DELETE: <Trash2 className="h-5 w-5 text-red-500" />,
    INVITE: <UserPlus className="h-5 w-5 text-blue-500" />,
    REVOKE_INVITE: <UserX className="h-5 w-5 text-orange-500" />,
    SET_PUBLIC: <Share2 className="h-5 w-5 text-green-500" />,
    SET_PRIVATE: <Lock className="h-5 w-5 text-gray-500" />,
    UPDATE_ROLE: <User className="h-5 w-5 text-purple-500" />,
};

const ENTITY_ICONS = {
    Project: <Folder className="h-4 w-4 mr-2" />,
    Design: <FileText className="h-4 w-4 mr-2" />,
    User: <User className="h-4 w-4 mr-2" />,
    Invite: <Mail className="h-4 w-4 mr-2" />,
}

function TimelineItem({ log }: { log: AuditLog }) {
    return (
        <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mt-1">
                {ACTION_ICONS[log.action as keyof typeof ACTION_ICONS]}
            </div>
            <div className="flex-1 border-b pb-6">
                <p className="font-medium text-foreground">{log.details}</p>
                <p className="text-sm text-muted-foreground flex items-center">
                    by {log.userDisplayName} ({log.userEmail}) on <span className="ml-1 flex items-center">{ENTITY_ICONS[log.entityType as keyof typeof ENTITY_ICONS]} {log.entityType}</span>
                </p>
                <time className="text-xs text-muted-foreground">
                    {log.timestamp ? format(log.timestamp.toDate(), 'PPP p') : 'N/A'}
                </time>
            </div>
        </div>
    );
}

function AuditLogSkeleton() {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">Track all activities within your workspace.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
           <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
        </CardHeader>
        <CardContent className="space-y-8">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-full mt-1" />
                    <div className="flex-1 space-y-2 border-b pb-6">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/4" />
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditLogsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const [userFilter, setUserFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [entityFilter, setEntityFilter] = useState('all');

    const userProfileRef = useMemo(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
      }, [firestore, user]);
    
    const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);
    
    const isSuperAdminByEmail = user?.email === 'fittconnect2@gmail.com';
    const isAdmin = useMemo(() => isSuperAdminByEmail || userProfile?.role === 'Admin', [isSuperAdminByEmail, userProfile]);

    const auditLogsQuery = useMemo(() => {
        if (!isAdmin) return null;
        return query(collection(firestore, 'auditLogs'), orderBy('timestamp', 'desc'));
    }, [firestore, isAdmin]);

    const { data: auditLogs, isLoading: isLoadingLogs, error } = useCollection<AuditLog>(auditLogsQuery);

    const filteredLogs = useMemo(() => {
        if (!auditLogs) return [];
        return auditLogs.filter(log => {
            const userMatch = userFilter ? log.userEmail.toLowerCase().includes(userFilter.toLowerCase()) : true;
            const actionMatch = actionFilter !== 'all' ? log.action === actionFilter : true;
            const entityMatch = entityFilter !== 'all' ? log.entityType === entityFilter : true;
            return userMatch && actionMatch && entityMatch;
        });
    }, [auditLogs, userFilter, actionFilter, entityFilter]);
    
    const isLoading = isUserLoading || isUserProfileLoading || (isAdmin && isLoadingLogs);

    if (isLoading) {
        return <AuditLogSkeleton />;
    }

    if (error || !isAdmin) {
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                <h1 className="text-3xl font-headline font-bold tracking-tight">Audit Logs</h1>
                <p className="text-muted-foreground">Track all activities within your workspace.</p>
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
  
    return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
       <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">Track all activities within your workspace.</p>
        </div>
      </div>
       <Card>
          <CardHeader>
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                placeholder="Filter by user email..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="md:col-span-1"
              />
               <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {Object.keys(ACTION_ICONS).map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by entity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entity Types</SelectItem>
                  {Object.keys(ENTITY_ICONS).map(entity => (
                    <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredLogs && filteredLogs.length > 0 ? (
                 <div className="space-y-0">
                    {filteredLogs.map(log => (
                        <TimelineItem key={log.id} log={log} />
                    ))}
                 </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Filter className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Logs Found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        No activities match your current filters. Try adjusting your search.
                    </p>
                </div>
            )}
          </CardContent>
      </Card>
    </div>
  );
}
