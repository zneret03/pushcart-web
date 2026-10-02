'use client';

import { JSX, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/custom/Container';
import { CustomButton } from '@/components/custom/CustomButton';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { anonymouslyLogin, signOut } from '@/services/auth/auth.services';
import {
  getStations,
  openStationSession,
  PosApiError,
} from '@/services/pos/pos.services';

// The shared counter tablet. Start shopping is the only thing on this screen: it ends any
// leftover session, signs in a fresh anonymous customer (which creates the cart), picks the
// station, and opens the session the desktop then binds to.
export default function ScanStartPage(): JSX.Element {
  const [message, setMessage] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onStart = (): void => {
    startTransition(async () => {
      setMessage('');

      try {
        // A previous customer's cookie must not be reused.
        try {
          await signOut();
        } catch {
          // No session to end.
        }

        const auth = await anonymouslyLogin();

        if (!auth?.user || !auth?.cart) {
          setMessage('Could not start a cart. Please ask staff.');
          return;
        }

        const stations = await getStations();

        if (!stations || stations.length === 0) {
          setMessage('No counter is configured. Please ask staff.');
          return;
        }

        // v1 auto-picks when there is only one station.
        await openStationSession(stations[0].id, auth.cart.id);

        router.push(`/customer/${auth.user.id}/${auth.cart.id}/scan`);
      } catch (error) {
        if (error instanceof PosApiError && error.message === 'busy') {
          setMessage('Counter busy — please wait for the current customer.');
          return;
        }
        setMessage(String(error));
      }
    });
  };

  return (
    <Container
      title="Self-checkout"
      description="Place your items on the counter, then review them here"
    >
      <div className="flex items-center justify-center py-10">
        <Card className="w-full max-w-lg shadow-xs">
          <CardHeader>
            <h1 className="text-3xl font-bold">Start shopping</h1>
            <span className="text-gray-500">
              Place your items on the counter one at a time. They will appear
              here automatically.
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <Alert className="border-red-500 bg-red-500/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Note!</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <CustomButton
              isLoading={isPending}
              disabled={isPending}
              onClick={onStart}
              className="w-full"
            >
              Start shopping
            </CustomButton>
          </CardFooter>
        </Card>
      </div>
    </Container>
  );
}
