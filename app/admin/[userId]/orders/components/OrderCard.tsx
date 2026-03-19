import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Image from 'next/image';

export function OrderImage() {
  return (
    <Card className="relative mx-auto w-full max-w-sm pt-0">
      <Image
        width={500}
        height={500}
        src="http://localhost:54321/storage/v1/object/public/products/Pancit%20canton/pexels-james-lee-932763-6054896.jpg"
        alt="Event cover"
        className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40"
      />
      <CardHeader>
        <CardAction>
          <Badge variant="secondary">Featured</Badge>
        </CardAction>
        <CardTitle>Design systems meetup</CardTitle>
        <CardDescription>
          A practical talk on component APIs, accessibility, and shipping
          faster.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button className="w-full">View Event</Button>
      </CardFooter>
    </Card>
  );
}
