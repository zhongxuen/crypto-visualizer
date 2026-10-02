'use client';

import { memo, useRef } from 'react';

import { Pulse, Reveal, Travel } from '@/components/motion';
import { bytesToHex } from '@/core/bytes/hex';
import type {
  KdfCollisionEvent,
  KdfEvent,
  KdfLookupEvent,
  KdfTableEvent,
  StoredUser,
} from '@/core/kdf/events';
import { cn } from '@/lib/cn';

import { DROP, SHAKE, STAMP, useStepKeyframes } from './useStepKeyframes';

const hex = (bytes: readonly number[]) => bytesToHex(Uint8Array.from(bytes));
const short = (bytes: readonly number[], length = 16) =>
  `${hex(bytes).slice(0, length)}…`;

/** The id of a user's stored-hash cell: where the lookup's token starts its travel. */
export const hashCellId = (name: string) => `pw-hash-${name}`;

/** The "cracked" stamp: lands on a hit, after the hash has reached the table. */
function CrackedStamp({ trigger, found }: { trigger: string | null; found: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useStepKeyframes(ref, trigger, STAMP, { duration: 200, delay: 180 });
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        ref={ref}
        data-stamp=""
        style={{ transform: 'rotate(-6deg)' }}
        className="border-danger text-danger inline-block rounded-sm border-2 px-1 text-[0.6875rem] leading-4 font-bold tracking-widest uppercase"
      >
        Cracked
      </span>
      <span className="text-danger font-mono font-medium">“{found}”</span>
    </span>
  );
}

/**
 * The users table as the server stores it, with the attacker's lookups filled in as
 * the run reaches them. Rows that share a hash are marked in words, not only colour.
 */
export const UsersTable = memo(function UsersTable({
  users,
  salted,
  lookups,
  current,
  pair,
  step = 0,
}: {
  users: StoredUser[];
  salted: boolean;
  lookups: KdfLookupEvent[];
  /** The user being looked up on this step. */
  current?: string;
  /** The two users with the same password, on the step that compares them. */
  pair?: readonly string[];
  step?: number;
}) {
  const hexes = users.map((user) => hex(user.hash));
  const shared = (index: number) =>
    hexes.filter((value) => value === hexes[index]).length > 1;

  return (
    <div className="border-border bg-surface overflow-x-auto rounded-md border">
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
            const now = current === user.name;
            return (
              <tr
                key={user.name}
                aria-current={now ? 'true' : undefined}
                className={cn('border-border border-t', now && 'bg-highlight')}
              >
                <th scope="row" className="px-2 py-1 text-left font-medium">
                  {user.name}
                </th>
                <td className="text-fg-muted px-2 py-1 font-mono">{user.password}</td>
                {salted ? (
                  <td className="text-secret px-2 py-1 font-mono text-xs">
                    {short(user.salt ?? [], 12)}
                  </td>
                ) : null}
                <td
                  className={cn(
                    'px-2 py-1 font-mono text-xs whitespace-nowrap',
                    same && 'border-diff-on pattern-changed border-2',
                  )}
                >
                  <Pulse trigger={step} active={pair?.includes(user.name) ?? false}>
                    <span id={hashCellId(user.name)}>{short(user.hash)}</span>
                  </Pulse>
                  {same ? (
                    <span className="text-diff-on ml-1 font-sans font-semibold">
                      same hash
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-1 whitespace-nowrap">
                  {lookup === undefined ? (
                    <span className="text-fg-muted">–</span>
                  ) : lookup.hit ? (
                    <CrackedStamp
                      trigger={now ? `${step}` : null}
                      found={lookup.found ?? ''}
                    />
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

/** The users, the attacker's table and the lookups as of step `index` of a run. */
export function tableStateAt(events: readonly KdfEvent[], index: number) {
  let users: StoredUser[] = [];
  let salted = false;
  let table: KdfTableEvent | undefined;
  const lookups: KdfLookupEvent[] = [];
  for (let i = 0; i <= index && i < events.length; i += 1) {
    const event = events[i];
    if (event.kind === 'kdf.users') {
      users = event.users;
      salted = event.salted;
    }
    if (event.kind === 'kdf.table') table = event;
    if (event.kind === 'kdf.lookup') lookups.push(event);
  }
  return { users, salted, table, lookups };
}

/** One lookup: the stolen hash travels into the table, and it hits or it misses. */
function LookupLine({ lookup, step }: { lookup: KdfLookupEvent; step: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useStepKeyframes(ref, lookup.hit ? null : step, SHAKE, { duration: 260, delay: 200 });
  return (
    <p
      ref={ref}
      data-lookup={lookup.hit ? 'hit' : 'miss'}
      className={cn(
        'bg-surface flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border-2 px-2 py-1.5 text-sm',
        lookup.hit ? 'border-danger' : 'border-ok',
      )}
    >
      <span>Looking up {lookup.name}’s hash</span>
      <Travel
        from={hashCellId(lookup.name)}
        trigger={step}
        className="bg-surface-overlay rounded-cell px-1 font-mono text-xs"
      >
        {short(lookup.hash)}
      </Travel>
      <span aria-hidden="true">→</span>
      {lookup.hit ? (
        <span className="text-danger font-medium">found “{lookup.found}”</span>
      ) : (
        <span className="text-ok font-medium">
          ✓ no match{lookup.salted ? ': the table has no salted hashes' : ''}
        </span>
      )}
    </p>
  );
}

/**
 * The attacker's precomputed table. Its first rows are always shown; each hash a lookup
 * cracks is added below them and lit up, so the table visibly fills with stolen
 * passwords. In the salted chapter it's the same table, built without salts.
 */
export function AttackerTable({
  table,
  lookups,
  current,
  salted,
  step = 0,
}: {
  table?: KdfTableEvent;
  lookups: KdfLookupEvent[];
  current?: KdfLookupEvent;
  salted: boolean;
  step?: number;
}) {
  const hits = lookups.filter((l) => l.hit);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">
        {table
          ? `The attacker’s precomputed table: ${table.size} common passwords, each hashed once.`
          : 'The attacker’s precomputed table, built from unsalted hashes.'}
        {salted ? ' None of its entries used these salts.' : ''}
      </p>
      {current ? <LookupLine key={current.name} lookup={current} step={step} /> : null}
      {table || hits.length > 0 ? (
        <table className="border-border bg-surface w-fit border text-sm">
          <caption className="sr-only">
            The attacker’s table: its first rows, and every row a lookup matched
          </caption>
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
            {table?.sample.map((row) => (
              <tr key={row.password} className="border-border border-t">
                <td className="px-2 py-1 font-mono text-xs">{short(row.hash)}</td>
                <td className="px-2 py-1 font-mono">{row.password}</td>
              </tr>
            ))}
            {table ? (
              <tr className="border-border border-t">
                <td colSpan={2} className="text-fg-muted px-2 py-0.5 text-xs">
                  ⋮ {table.size - table.sample.length} more rows
                </td>
              </tr>
            ) : null}
            {hits.map((hit) => {
              const now = hit.name === current?.name;
              return (
                <tr
                  key={hit.name}
                  aria-current={now ? 'true' : undefined}
                  className={cn('border-border border-t', now && 'bg-highlight')}
                >
                  <td className="px-2 py-1 font-mono text-xs">
                    <Pulse trigger={step} active={now}>
                      {short(hit.hash)}
                    </Pulse>
                  </td>
                  <td className="text-danger px-2 py-1 font-mono">
                    {hit.found}
                    <span className="sr-only"> ({hit.name}’s password)</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

function SaltChip({ step, lane, salt }: { step: number; lane: number; salt: number[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  useStepKeyframes(ref, step, DROP, { duration: 200, delay: lane * 60 });
  return (
    <span
      ref={ref}
      data-salt-drop=""
      className="border-secret text-secret inline-block rounded-full border px-1.5 font-mono text-xs"
    >
      <span className="sr-only">salt </span>
      {short(salt, 8)} ‖
    </span>
  );
}

/**
 * Two users with the same password, side by side. Unsalted, both lanes hash to the same
 * value. Salted, each lane's salt drops onto the password first, and the two hashes come
 * out different; the characters where they differ are marked.
 */
export function PairView({
  event,
  users,
  step = 0,
}: {
  event: KdfCollisionEvent;
  users: StoredUser[];
  step?: number;
}) {
  const [a, b] = event.hashes.map(hex);
  return (
    <div
      role="group"
      aria-label={`${event.names[0]} and ${event.names[1]}, compared`}
      className="border-border bg-surface flex flex-col gap-2 rounded-md border p-3 text-sm"
    >
      {event.names.map((name, lane) => {
        const user = users.find((u) => u.name === name);
        const mine = lane === 0 ? a : b;
        const other = lane === 0 ? b : a;
        return (
          <div key={name} className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="w-12 font-medium">{name}</span>
            <span className="text-fg-muted">SHA-256(</span>
            {event.salted && user?.salt ? (
              <SaltChip step={step} lane={lane} salt={user.salt} />
            ) : null}
            <span className="font-mono">{user?.password}</span>
            <span className="text-fg-muted">) =</span>
            <Reveal trigger={step} index={lane + 3} className="font-mono text-xs">
              {[...mine.slice(0, 24)].map((char, i) =>
                char === other[i] ? (
                  char
                ) : (
                  <mark key={i} className="bg-diff-on text-diff-on-fg rounded-[2px]">
                    {char}
                  </mark>
                ),
              )}
              …
            </Reveal>
          </div>
        );
      })}
      <p className={cn('font-medium', event.equal ? 'text-diff-on' : 'text-ok')}>
        {event.equal
          ? '= The same hash: crack one and you have both.'
          : '≠ Different hashes from the same password. Marked: where they differ.'}
      </p>
    </div>
  );
}
