import { Users, ShoppingCart, FileText, DollarSign } from 'lucide-react';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { JSX, ReactNode } from 'react';

interface Options {
  name: string;
  count: number;
}

interface SectionCards {
  users: Options;
  orders: Options;
  products: Options;
  monthlySales: Options;
}

const cardIcons: { [key: string]: ReactNode } = {
  'Total Users': <Users />,
  'Total Orders': <ShoppingCart />,
  Products: <FileText />,
  'Total Monthly Sales': <DollarSign />,
};

export function AnalyticsCards({
  users,
  orders,
  products,
  monthlySales,
}: SectionCards): JSX.Element {
  const summationData = [users, orders, products, monthlySales];

  return (
    <div className="grid grid-cols-4 gap-2">
      {summationData.map((item) => (
        <Card className="@container/card" key={item.name}>
          <CardHeader>
            <CardDescription>{item.name}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {item.count}
            </CardTitle>
            <CardAction>{cardIcons[item.name]}</CardAction>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
