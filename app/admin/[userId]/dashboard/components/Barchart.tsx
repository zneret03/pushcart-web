'use client';

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  CustomTooltipProps,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePathname, useRouter } from 'next/navigation';

interface ChartType {
  year: number[];
  currentYear: string;
  data: {
    month: string;
    sales: string;
  }[];
  title: string;
}

const chartConfig = {
  days_present: {
    color: '#2563eb',
  },
  days_absent: {
    color: '#5186f2',
  },
  tardiness_count: {
    color: '#7ba6f8',
  },
} satisfies ChartConfig;

export function Chart({ data, year, currentYear, title }: ChartType) {
  const pathname = usePathname();
  const router = useRouter();

  const yearFilter = (value: string): void => {
    router.replace(`${pathname}?year=${value}`);
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-2xl">{title}</CardTitle>

        <Select
          value={currentYear as string}
          onValueChange={(e) => yearFilter(e)}
        >
          <SelectTrigger className="w-auto">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {year.map((item, index) => (
              <SelectItem key={`${item}-${index}`} value={item.toString()}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="max-h-[400px] w-full">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              content={(props) => (
                <ChartTooltipContent
                  {...(props as CustomTooltipProps)}
                  hideIndicator
                  hideLabel
                />
              )}
            />
            <Bar dataKey="sales" fill="var(--color-days_present)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
