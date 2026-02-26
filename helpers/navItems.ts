import { SideMenu } from '@/lib/types/menus';
import {
  LayoutDashboard,
  Clipboard
} from 'lucide-react';

const parentPathName = 'admin'

export const adminMenus = (id: string): SideMenu[] => {
  return [
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
  ]
};
