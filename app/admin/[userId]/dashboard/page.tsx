import { AnalyticsCards } from './components/AnalyticalCards';
import { Container } from '@/components/custom/Container';
import { getDashboardStats } from '@/services/dashboard/dashboard.services';

export default async function AdminPage() {
  const response = await getDashboardStats();

  console.log(response);

  return (
    <Container title="Dashboard" description="You can see all satistics here">
      <AnalyticsCards
        {...{
          users: { name: 'Total Users', count: 0 },
          orders: { name: 'Total Orders', count: 0 },
          products: { name: 'Total Products', count: 0 },
          monthlySales: { name: 'Total Monthly Sales', count: 0 },
        }}
      />
    </Container>
  );
}
