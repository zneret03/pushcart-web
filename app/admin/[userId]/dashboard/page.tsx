import { AnalyticsCards } from './components/AnalyticalCards';
import { Container } from '@/components/custom/Container';
import { getDashboardStats } from '@/services/dashboard/dashboard.services';
import {
  Card,
  CardTitle,
  CardDescription,
  CardHeader,
  CardContent,
} from '@/components/ui/card';
import { Chart } from './components/Barchart';
import Image from 'next/image';
import { Products } from '@/lib/types/product';
import { ShowMore } from './components/ShowMore';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ year: string }>;
}) {
  const { year } = await searchParams;
  const response = await getDashboardStats(Number(year));
  const today = new Date();

  return (
    <Container title="Dashboard" description="You can see all satistics here">
      <main className="space-y-4">
        <AnalyticsCards
          {...{
            users: { name: 'Total Users', count: response?.totalUsers || 0 },
            orders: { name: 'Total Orders', count: response?.totalOrders || 0 },
            products: {
              name: 'Total Products',
              count: response?.totalProducts || 0,
            },
            monthlySales: {
              name: 'Total Monthly Sales',
              count: response?.totalMonthlySales || 0,
            },
          }}
        />
        <div className="flex gap-4">
          <section className="flex-3">
            <Chart
              title="Monthly Sales Satistics"
              data={response?.yearlySales || []}
              year={response?.availableYears || []}
              currentYear={today.getFullYear().toString()}
            />
          </section>
          <section className="flex-1">
            <div className="flex-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Low product stocks</CardTitle>
                  <CardDescription>
                    you can see here all the products that has low stocks
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {response?.lowStockProducts.map(
                    (
                      item: Pick<
                        Products,
                        'id' | 'image_url' | 'name' | 'stock_quantity' | 'sku'
                      >,
                    ) => (
                      <section className="flex gap-2 space-y-4" key={item.id}>
                        <Image
                          src={
                            (item.image_url as string) ||
                            '/images/empty-food.jpg'
                          }
                          width={500}
                          height={500}
                          alt="sample"
                          className="h-20 w-20 rounded-md object-cover"
                        />

                        <div>
                          <h1 className="text-xl font-bold">{item.name}</h1>
                          <h2 className="text-md text-gray-500">{item.sku}</h2>
                          <h3 className="text-sm text-gray-500">
                            quantity: {item.stock_quantity}
                          </h3>
                        </div>
                      </section>
                    ),
                  )}

                  {response?.lowStockProducts?.length >= 5 && (
                    <ShowMore pagePath="products" title="Show more" />
                  )}
                </CardContent>

                {response?.lowStockProducts.length <= 0 && (
                  <div className="text-gray-500">No leave requests</div>
                )}
              </Card>
            </div>
          </section>
        </div>
      </main>
    </Container>
  );
}
