import { SideMenu } from '@/lib/types/menus';
import { Laptop, Clipboard } from 'lucide-react';

const parentPathName = 'admin';

export const adminMenus = (id: string): SideMenu[] => [
  {
    title: 'Pos',
    url: `/${parentPathName}/${id}/pos`,
    icon: Laptop,
    isActive: true,
  },
  {
    url: `/${parentPathName}/${id}/products`,
    title: 'Products',
    icon: Clipboard,
    isActive: true,
  },
];
