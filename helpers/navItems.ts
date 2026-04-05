import { Categories } from '@/lib/types/categories';
import { SideMenu } from '@/lib/types/menus';
import {
  LayoutDashboard,
  Clipboard,
  Users,
  Files,
  Coins,
  Ham,
} from 'lucide-react';

const parentPathName = 'admin';

export const customerMenus = (
  categories: Categories[] | null,
  id: string,
  cartId: string,
): SideMenu[] => {
  const newCategories = categories?.map((item) => {
    return {
      title: item.name,
      url: `/customer/${id}/${cartId}/shop?category=${item.name}`,
      icon: Ham,
      isActive: true,
    };
  });

  return (newCategories as SideMenu[]) || [];
};

export const adminMenus = (id: string, year: number): SideMenu[] => [
  {
    title: 'Dashboard',
    url: `/${parentPathName}/${id}/dashboard?year=${year}`,
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    url: `/${parentPathName}/${id}/orders`,
    title: 'Orders',
    icon: Ham,
    isActive: true,
  },
  {
    url: `/${parentPathName}/${id}/products`,
    title: 'Products',
    icon: Clipboard,
    isActive: true,
  },
  {
    url: `/${parentPathName}/${id}/categories`,
    title: 'Categories',
    icon: Files,
    isActive: true,
  },
  {
    url: `/${parentPathName}/${id}/vat`,
    title: 'Vat',
    icon: Coins,
    isActive: true,
  },
  {
    url: `/${parentPathName}/${id}/profiles`,
    title: 'Profiles',
    icon: Users,
    isActive: true,
  },
];
