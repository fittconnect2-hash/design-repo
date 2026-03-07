'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import type { Project, Design, AuditLog, UserProfile } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, FileText, Folder } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

function OverviewSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </CardContent>
      </Card>
    </div>
  )
}

export default function OverviewPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Admin check
  const userProfileRef = useMemo(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const isSuperAdminByEmail = user?.email === 'fittconnect2@gmail.com';
  const isAdmin = useMemo(() => isSuperAdminByEmail || userProfile?.role === 'Admin', [isSuperAdminByEmail, userProfile]);

  // Data queries
  const projectsQuery = useMemo(() => query(collection(firestore, 'projects'), orderBy('createdAt', 'desc'), limit(5)), [firestore]);
  const { data: recentProjects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const designsQuery = useMemo(() => query(collection(firestore, 'designs'), orderBy('createdAt', 'desc'), limit(5)), [firestore]);
  const { data: recentDesigns, isLoading: isLoadingDesigns } = useCollection<Design>(designsQuery);

  const auditLogsQuery = useMemo(() => {
    if (!isAdmin) return null;
    return query(collection(firestore, 'auditLogs'), orderBy('timestamp', 'desc'), limit(5));
  }, [firestore, isAdmin]);
  const { data: recentAuditLogs, isLoading: isLoadingAuditLogs } = useCollection<AuditLog>(auditLogsQuery);
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const isLoading = isUserLoading || isUserProfileLoading || isLoadingProjects || isLoadingDesigns || (isAdmin && isLoadingAuditLogs);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">A high-level summary of your workspace.</p>
        </div>
      </div>
      
      {isLoading ? (
        <OverviewSkeleton />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Recent Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Projects</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/projects">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentProjects && recentProjects.length > 0 ? (
                <div className="space-y-4">
                  {recentProjects.map(project => (
                    <div key={project.id} className="flex items-center gap-4">
                      <Folder className="h-6 w-6 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium truncate">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Created on {project.createdAt ? format(project.createdAt.toDate(), 'PP') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No recent projects.</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Designs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Designs</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/designs">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentDesigns && recentDesigns.length > 0 ? (
                <div className="space-y-4">
                  {recentDesigns.map(design => (
                    <div key={design.id} className="flex items-center gap-4">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                      <div className="flex-1">
                        <Link href={`/designs/${design.id}`} className="font-medium truncate hover:underline">{design.name}</Link>
                        <p className="text-sm text-muted-foreground">
                          In project: {design.projectName || 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No recent designs.</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity (Audit Logs) - Admin only */}
          {isAdmin && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/audit-logs">
                    View All <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentAuditLogs && recentAuditLogs.length > 0 ? (
                  <div className="space-y-4">
                    {recentAuditLogs.map(log => (
                      <div key={log.id} className="flex items-start gap-4">
                         <Avatar className="h-8 w-8 mt-1">
                            <AvatarFallback>{getInitials(log.userDisplayName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm">{log.details}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.timestamp ? format(log.timestamp.toDate(), 'PP p') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No recent activity.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
