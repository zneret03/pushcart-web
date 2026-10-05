'use client';

import { JSX, useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  clearPosStaffPin,
  getPosStaffPin,
  PosApiError,
  setPosStaffPin,
  type PosStaffPinStatus,
} from '@/services/pos/pos.services';

const SOURCE_LABEL: Record<PosStaffPinStatus['source'], string> = {
  admin: 'Set here',
  server: 'Server default (POS_STAFF_PIN)',
  off: 'Off',
};

const valid = (pin: string): boolean => /^[0-9]{4,8}$/.test(pin);

// The staff code staff type on the cart tablet (Staff -> code -> Remove 1). The code is stored
// hashed and never shown back: this card can set, change or clear it, and says which code is in
// force, but nobody can read the current one - forgetting it means setting a new one.
export function StaffCodeCard({
  className,
}: {
  className?: string;
}): JSX.Element {
  const [status, setStatus] = useState<PosStaffPinStatus | null>(null);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPosStaffPin()
      .then(setStatus)
      .catch((e: unknown) =>
        setNote({
          ok: false,
          text: e instanceof PosApiError ? e.message : String(e),
        }),
      );
  }, []);

  const run = (
    action: () => Promise<PosStaffPinStatus>,
    done: string,
  ): void => {
    setBusy(true);
    setNote(null);
    action()
      .then((s) => {
        setStatus(s);
        setPin('');
        setConfirm('');
        setNote({ ok: true, text: done });
      })
      .catch((e: unknown) =>
        setNote({
          ok: false,
          text: e instanceof PosApiError ? e.message : String(e),
        }),
      )
      .finally(() => setBusy(false));
  };

  const mismatch = confirm.length > 0 && confirm !== pin;
  const canSave = valid(pin) && pin === confirm && !busy;

  return (
    <Card className={`shadow-xs ${className ?? ''}`}>
      <CardHeader>
        <h2 className="text-xl font-bold">Staff code</h2>
        <p className="text-sm text-gray-500">
          The code staff enter on the cart tablet (Staff &rarr; code &rarr;
          Remove 1) to take off an item the camera missed. Five wrong tries lock
          it on that cart for a minute.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-500">In force:</span>
          <Badge
            variant={status?.source === 'off' ? 'destructive' : 'secondary'}
          >
            {status ? SOURCE_LABEL[status.source] : '…'}
          </Badge>
          {status?.updated_at && (
            <span className="text-gray-500">
              changed {new Date(status.updated_at).toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder="New code (4–8 digits)"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, '').slice(0, 8))
            }
            aria-label="New staff code"
          />
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder="Repeat the code"
            value={confirm}
            onChange={(e) =>
              setConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))
            }
            aria-label="Repeat the staff code"
          />
          <Button
            disabled={!canSave}
            onClick={() =>
              run(
                () => setPosStaffPin(pin),
                'Staff code saved. It works on the tablet now.',
              )
            }
          >
            <KeyRound />
            {status?.source === 'admin' ? 'Change' : 'Set'}
          </Button>
        </div>
        {mismatch && (
          <p className="text-sm text-red-600">The two codes do not match.</p>
        )}

        {status?.source === 'admin' && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() =>
              run(
                clearPosStaffPin,
                status.server_fallback
                  ? 'Cleared. The server default code is in force again.'
                  : 'Cleared. Staff removal is off until a code is set.',
              )
            }
          >
            Remove this code
          </Button>
        )}

        {note && (
          <p
            className={`text-sm ${note.ok ? 'text-green-700' : 'text-red-600'}`}
          >
            {note.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
