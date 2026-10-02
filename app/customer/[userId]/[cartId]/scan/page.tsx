'use client';

import { JSX, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Container } from '@/components/custom/Container';
import { CustomButton } from '@/components/custom/CustomButton';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  CameraOff,
  CheckCircle2,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import {
  calculateVat,
  calculateTotalPayment,
} from '@/app/user/[userId]/pos/helpers/calculateVat';
import { signOut } from '@/services/auth/auth.services';
import {
  editPosCartItem,
  finishPosCart,
  getActiveVatRate,
  getMySession,
  getPosCartItems,
  PosApiError,
  removePosCartItem,
  type PosCartItem,
  type PosSessionInfo,
} from '@/services/pos/pos.services';

const POLL_MS = 2000;
const CAMERA_OFFLINE_MS = 30000;
const CONFIRM_COUNTDOWN_S = 6;

export default function ScanPage(): JSX.Element {
  const params = useParams<{ userId: string; cartId: string }>();
  const { userId, cartId } = params;
  const router = useRouter();

  const [items, setItems] = useState<PosCartItem[]>([]);
  const [session, setSession] = useState<PosSessionInfo | null>(null);
  const [rate, setRate] = useState<number>(0);
  const [offline, setOffline] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [finishing, setFinishing] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(CONFIRM_COUNTDOWN_S);

  const load = useCallback(async (): Promise<void> => {
    try {
      const [cartItems, mySession, vatRate] = await Promise.all([
        getPosCartItems(cartId),
        getMySession(),
        getActiveVatRate(),
      ]);

      setItems(cartItems);
      setSession(mySession);
      setRate(vatRate);

      const lastSync = mySession?.last_sync_at
        ? Date.parse(mySession.last_sync_at)
        : 0;
      setOffline(!lastSync || Date.now() - lastSync > CAMERA_OFFLINE_MS);
    } catch {
      // A transient poll failure is not worth a banner; the next tick retries.
    }
  }, [cartId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // After a successful Finish, sign the customer out and clear the tablet for the next one.
  useEffect(() => {
    if (!done) return;
    if (countdown <= 0) {
      void signOut().finally(() => {
        router.push(`/customer/${userId}/scan-start`);
      });
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [done, countdown, router, userId]);

  const onQuantity = (item: PosCartItem, next: number): void => {
    void (async () => {
      setMessage('');
      try {
        if (next <= 0) {
          await removePosCartItem(cartId, item.product_id);
        } else {
          await editPosCartItem(cartId, item.product_id, next);
        }
        await load();
      } catch (error) {
        setMessage(String(error));
      }
    })();
  };

  const onFinish = (): void => {
    void (async () => {
      setFinishing(true);
      setMessage('');
      try {
        await finishPosCart(cartId);
        setDone(true);
      } catch (error) {
        if (
          error instanceof PosApiError &&
          error.message === 'insufficient_stock'
        ) {
          const short = (error.data?.items ?? []) as { name: string }[];
          setMessage(
            `These items need staff: ${short.map((i) => i.name).join(', ')}`,
          );
        } else {
          setMessage(String(error));
        }
      } finally {
        setFinishing(false);
      }
    })();
  };

  const subtotal = items.reduce(
    (acc, item) => acc + (item.products?.price ?? 0) * item.quantity,
    0,
  );
  const vat = calculateVat(subtotal, rate);
  const total = calculateTotalPayment(subtotal, vat);

  if (done) {
    return (
      <Container title="Thank you" description="Your order is complete">
        <div className="flex items-center justify-center py-10">
          <Card className="w-full max-w-lg text-center shadow-xs">
            <CardHeader className="items-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <h1 className="text-3xl font-bold">Order placed</h1>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                Your order is complete. Returning to the start screen in{' '}
                {countdown}s.
              </p>
            </CardContent>
          </Card>
        </div>
      </Container>
    );
  }

  return (
    <Container
      title="Your cart"
      description="Items appear automatically as you place them on the counter"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        {offline && (
          <Alert className="border-amber-500 bg-amber-500/20">
            <CameraOff className="h-4 w-4" />
            <AlertTitle>Camera offline</AlertTitle>
            <AlertDescription>
              Ask staff to add items. You can still review and finish your cart.
            </AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert className="border-red-500 bg-red-500/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Note!</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Card className="w-full shadow-xs">
          <CardHeader className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Items</h1>
            {session?.cart_code && (
              <Badge variant="secondary">
                Cart {session.cart_code.slice(0, 8)}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 && (
              <p className="py-8 text-center text-gray-500">
                Place an item on the counter.
              </p>
            )}

            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3"
              >
                <section className="flex items-center gap-3">
                  <Image
                    src={item.products.image_url || '/images/empty-food.jpg'}
                    width={500}
                    height={500}
                    alt={item.products.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div>
                    <h2 className="text-lg font-bold">{item.products.name}</h2>
                    <p className="text-gray-500">
                      ₱{item.products.price.toFixed(2)}
                    </p>
                  </div>
                </section>

                <section className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onQuantity(item, item.quantity - 1)}
                  >
                    <Minus />
                  </Button>
                  <Badge variant="secondary" className="min-w-8 justify-center">
                    {item.quantity}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onQuantity(item, item.quantity + 1)}
                  >
                    <Plus />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onQuantity(item, 0)}
                  >
                    <X />
                  </Button>
                </section>
              </div>
            ))}

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>VAT ({rate.toFixed(2)}%)</span>
                <span>₱{vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>₱{total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <CustomButton
              className="w-full"
              onClick={onFinish}
              isLoading={finishing}
              disabled={finishing || items.length === 0}
            >
              Finish
            </CustomButton>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-gray-400">
          Keep items in one layer, apart, labels up. Ask staff for anything the
          camera misses.
        </p>
      </div>
    </Container>
  );
}
