import { Users, FileText, Medal, ShieldCheck } from 'lucide-react';
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
  leaves: Options;
  awards: Options;
  certificates: Options;
}

const cardIcons: { [key: string]: ReactNode } = {
  'Total Users': <Users />,
  'Total Leaves': <FileText />,
  'Unread awards': <Medal />,
  'Certificate Requests': <ShieldCheck />,
};

export function AnalyticsCards({
  users,
  leaves,
  awards,
  certificates,
}: SectionCards): JSX.Element {
  const summationData = [users, leaves, awards, certificates];

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
