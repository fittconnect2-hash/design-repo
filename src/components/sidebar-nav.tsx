'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  BarChart3,
  BookText,
  History,
  FolderKanban,
  Archive,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
    { href: "/audit-logs",label: "Audit Logs", icon: History },
]

export function SidebarNav() {
  const pathname = usePathname();

  const renderLinks = (links: NavLink[]) => {
    return links.map((link) => {
      let isActive;
      if (link.href === '/') {
        // "Overview" is active only on the homepage.
        isActive = pathname === '/';
      } else if (link.href === '/projects') {
         // "Projects" is active on the projects page and on specific design pages.
        isActive = pathname.startsWith('/projects') || /^\/designs\/.+/.test(pathname);
      } else if (link.href === '/designs') {
        // "Design Repo" is active only on the /designs page.
        isActive = pathname === '/designs';
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

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Insights</SidebarGroupLabel>
        <SidebarMenu>
          {renderLinks(insightsLinks)}
        </SidebarMenu>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarMenu>
          {renderLinks(workspaceLinks)}
        </SidebarMenu>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Administration</SidebarGroupLabel>
        <SidebarMenu>
          {renderLinks(adminLinks)}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
