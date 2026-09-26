'use client';

import { memo } from 'react';

import { bytesToHex } from '@/core/bytes/hex';
import type { KdfEvent, KdfLookupEvent, StoredUser } from '@/core/kdf/events';
import { cn } from '@/lib/cn';

const short = (bytes: readonly number[], length = 16) =>
  `${bytesToHex(Uint8Array.from(bytes)).slice(0, length)}…`;

/**
 * The users table as the server stores it, with the attacker's lookups filled in as
 * the run reaches them. Rows that share a hash are marked in words, not only colour.
 */
export const UsersTable = memo(function UsersTable({
  users,
  salted,
  lookups,
  current,
}: {
  users: StoredUser[];
  salted: boolean;
  lookups: KdfLookupEvent[];
  current?: string;
}) {
  const hexes = users.map((user) => bytesToHex(Uint8Array.from(user.hash)));
  const shared = (index: number) =>
    hexes.filter((hex) => hex === hexes[index]).length > 1;

  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          {salted ? 'Salted' : 'Unsalted'} password table as the server stores it
        </caption>
        <thead className="bg-surface-overlay">
          <tr>
            <th scope="col" className="px-2 py-1 text-left font-medium">
              User
            </th>
            <th scope="col" className="text-fg-muted px-2 py-1 text-left font-medium">
              Password <span className="font-normal">(not stored)</span>
            </th>
            {salted ? (
              <th scope="col" className="px-2 py-1 text-left font-medium">
                Salt
              </th>
            ) : null}
            <th scope="col" className="px-2 py-1 text-left font-medium">
              Stored hash
            </th>
            <th scope="col" className="px-2 py-1 text-left font-medium">
              Attacker’s lookup
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => {
            const lookup = lookups.find((l) => l.name === user.name);
            const same = shared(index);
            return (
              <tr
                key={user.name}
                aria-current={current === user.name ? 'true' : undefined}
                className={cn(
                  'border-border border-t',
                  current === user.name && 'bg-highlight',
                )}
              >
                <th scope="row" className="px-2 py-1 text-left font-medium">
                  {user.name}
                </th>
                <td className="text-fg-muted px-2 py-1 font-mono">{user.password}</td>
                {salted ? (
                  <td className="px-2 py-1 font-mono text-xs">
                    {short(user.salt ?? [], 12)}
                  </td>
                ) : null}
                <td
                  className={cn(
                    'px-2 py-1 font-mono text-xs',
                    same && 'border-diff-on pattern-changed border-2',
                  )}
                >
                  {short(user.hash)}
                  {same ? (
                    <span className="text-diff-on ml-1 font-sans font-semibold">
                      same hash
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-1">
                  {lookup === undefined ? (
                    <span className="text-fg-muted">–</span>
                  ) : lookup.hit ? (
                    <span className="text-danger font-medium">
                      ✗ cracked: “{lookup.found}”
                    </span>
                  ) : (
                    <span className="text-ok font-medium">✓ no match</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

/** The users and lookups as of step `index` of a password-table run. */
export function tableStateAt(events: readonly KdfEvent[], index: number) {
  let users: StoredUser[] = [];
  let salted = false;
  const lookups: KdfLookupEvent[] = [];
  for (let i = 0; i <= index && i < events.length; i += 1) {
    const event = events[i];
    if (event.kind === 'kdf.users') {
      users = event.users;
      salted = event.salted;
    }
    if (event.kind === 'kdf.lookup') lookups.push(event);
  }
  return { users, salted, lookups };
}

export function AttackerTable({
  event,
}: {
  event: Extract<KdfEvent, { kind: 'kdf.table' }>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">
        The attacker’s precomputed table: {event.size} common passwords, each hashed once.
        The first few:
      </p>
      <table className="border-border w-fit border text-sm">
        <caption className="sr-only">The first rows of the attacker’s table</caption>
        <thead className="bg-surface-overlay">
          <tr>
            <th scope="col" className="px-2 py-1 text-left font-medium">
              SHA-256
            </th>
            <th scope="col" className="px-2 py-1 text-left font-medium">
              Password
            </th>
          </tr>
        </thead>
        <tbody>
          {event.sample.map((row) => (
            <tr key={row.password} className="border-border border-t">
              <td className="px-2 py-1 font-mono text-xs">{short(row.hash)}</td>
              <td className="px-2 py-1 font-mono">{row.password}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
