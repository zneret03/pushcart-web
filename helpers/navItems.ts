import { SideMenu } from '@/lib/types/menus';
import {
  LayoutDashboard,
} from 'lucide-react';

export const adminMenus = (id: string): SideMenu[] => {
  return [
    {
      title: 'Dashboard',
      url: `/backend/${id}/dashboard`,
      icon: LayoutDashboard,
      isActive: true,
    },
  ]
};
