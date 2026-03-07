'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Skeleton } from './ui/skeleton';
import { MainLayout } from './main-layout';

const unprotectedRoutes = ['/login', '/signup'];

function LoadingScreen() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6 flex-1">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </main>
    </div>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const isUnprotectedRoute = unprotectedRoutes.includes(pathname);

  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    if (!user && !isUnprotectedRoute) {
      router.replace('/login');
    } else if (user && isUnprotectedRoute) {
      router.replace('/');
    }
  }, [user, isUserLoading, router, pathname, isUnprotectedRoute]);
  
  const showLoading = isUserLoading || (!user && !isUnprotectedRoute) || (user && isUnprotectedRoute)

  if (showLoading) {
    return <LoadingScreen />;
  }

  if (isUnprotectedRoute) {
    return <>{children}</>;
  }

  return <MainLayout>{children}</MainLayout>;
}
