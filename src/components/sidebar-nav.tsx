'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  BarChart3,
  BookText,
  History,
  FolderKanban,
  Archive,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDoc, useFirestore, useUser } from "@/firebase";
import { useMemo } from "react";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/definitions";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const insightsLinks: NavLink[] = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/reports", label: "Report", icon: BookText },
];

const workspaceLinks: NavLink[] = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/designs", label: "Design Repo", icon: Archive },
];

const adminLinks: NavLink[] = [
    { href: "/user-management", label: "User Management", icon: Users },
    { href: "/audit-logs",label: "Audit Logs", icon: History },
]

export function SidebarNav() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemo(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const isSuperAdminByEmail = user?.email === 'fittconnect2@gmail.com';
  const isAdmin = useMemo(() => isSuperAdminByEmail || userProfile?.role === 'Admin', [isSuperAdminByEmail, userProfile]);

  const isLoading = isUserLoading || (user && isUserProfileLoading);

  const renderLinks = (links: NavLink[]) => {
    return links.map((link) => {
      let isActive;
      if (link.href === '/') {
        isActive = pathname === '/';
      } else {
        isActive = pathname.startsWith(link.href);
      }

      return (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            tooltip={{
              children: link.label,
            }}
          >
            <Link href={link.href}>
              <link.icon />
              <span>{link.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };
  
  if (isLoading) {
    return (
      <>
        <SidebarGroup>
          <SidebarGroupLabel>Insights</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
          </SidebarMenu>
        </SidebarGroup>
      </>
    );
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Insights</SidebarGroupLabel>
        <SidebarMenu>
          {isAdmin ? renderLinks(insightsLinks) : renderLinks(insightsLinks.filter(l => l.href === '/'))}
        </SidebarMenu>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarMenu>
          {renderLinks(workspaceLinks)}
        </SidebarMenu>
      </SidebarGroup>
      {isAdmin && (
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarMenu>
            {renderLinks(adminLinks)}
          </SidebarMenu>
        </SidebarGroup>
      )}
    </>
  );
}
