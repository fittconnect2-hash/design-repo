'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
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

const links = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/reports", label: "Report", icon: BookText },
  { href: "/audit-logs",label: "Audit Logs", icon: History },
  { href: "/", label: "Projects", icon: FolderKanban },
  { href: "/designs", label: "Design Repo", icon: Archive },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {links.map((link) => {
        let isActive;
        if (link.href === '/') {
          // "Projects" is active on the homepage and on specific design pages, but not the new Design Repo page.
          isActive = pathname === '/' || /^\/designs\/.+/.test(pathname);
        } else if (link.href === '/designs') {
          // "Design Repo" is active only on the /designs page.
          isActive = pathname === '/designs';
        }
        else {
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
      })}
    </SidebarMenu>
  );
}
