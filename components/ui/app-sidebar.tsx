'use client';

import * as React from 'react';
import { NavMain } from '@/components/ui/nav-main';
import { NavUser } from '@/components/ui/nav-user';
import { TeamSwitcher } from '@/components/ui/team-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Categories } from '@/lib/types/categories';
import { getCategories } from '@/services/categories/categories.services';
import { usePathname } from 'next/navigation';
import { adminMenus, customerMenus } from '@/helpers/navItems';
import { useAuth } from '@/services/auth/states/auth-state';
import { appName } from '@/helpers/appName';

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>): React.JSX.Element {
  const [categories, setCategories] = React.useState<Categories[] | null>(null);
  const [isMount, setMount] = React.useState<boolean>(true);

  const { email, id } = useAuth();
  const today = new Date();

  const pathname = usePathname();

  const cartId = pathname.split('/')[3];

  const menus = pathname.startsWith('/customer')
    ? customerMenus(categories, id, cartId)
    : adminMenus(id, today.getFullYear());

  // This is sample data.
  const data = {
    user: {
      email: email as string,
      avatar: '',
    },
    teams: appName(email as string),
    navMain: menus,
  };

  React.useEffect(() => {
    const fetchCategories = async () => {
      const response = await getCategories(
        `?page=1&perPage=10&sortBy=created_at`,
      );

      setCategories(response.categories);
    };

    if (isMount && pathname.startsWith('/customer')) {
      fetchCategories();
      setMount(false);
    }
  }, []);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/*<NavProjects projects={data.projects} />*/}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
