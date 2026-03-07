'use client';

import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { GlobalSearch } from '@/components/global-search';
import { UserNav } from '@/components/user-nav';
import { SidebarNav } from '@/components/sidebar-nav';
import { UserNotifications } from './user-notifications';

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <h1 className="text-2xl font-headline font-bold text-primary p-2 group-data-[collapsible=icon]:hidden">
            DesignDock
          </h1>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter>
          {/* Sidebar Footer Content if any */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger className="sm:hidden" />
          <GlobalSearch />
          <UserNotifications />
          <UserNav />
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
