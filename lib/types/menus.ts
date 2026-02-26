import { type LucideIcon } from 'lucide-react';

export interface SideMenu {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
}
