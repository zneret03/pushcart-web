import { SideMenu } from '@/lib/types/menus';
import { LayoutDashboard, Clipboard, Users } from 'lucide-react';

const parentPathName = 'admin';

export const adminMenus = (id: string): SideMenu[] => [
  {
    title: 'Dashboard',
    url: `/${parentPathName}/${id}/dashboard`,
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    url: `/${parentPathName}/${id}/products`,
    title: 'Products',
    icon: Clipboard,
    isActive: true,
  },
  {
    url: `/${parentPathName}/${id}/profiles`,
    title: 'Profiles',
    icon: Users,
    isActive: true,
  },
];
