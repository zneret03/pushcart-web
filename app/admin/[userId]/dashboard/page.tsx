import { AnalyticsCards } from './components/AnalyticalCards';
import { Container } from '@/components/custom/Container';

export default function AdminPage() {
  return (
    <Container title="Dashboard" description="You can see all satistics here">
      <AnalyticsCards
        {...{
          users: 0,
          leaves: 0,
          awards: 0,
          certificates: 0,
        }}
      />
    </Container>
  );
}
