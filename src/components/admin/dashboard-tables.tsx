"use client";

import { DataTable, StatusDot, StackedCell, type Column } from "./data-table";

// ─── Types (serializable — only plain data) ───────────────────────────────────

export interface ActivityRow {
  id: string;
  ref: string;
  description: string;
  meta: string;
  amount?: string;
  status: string;
  date: string;
}

export interface BookingRow {
  id: string;
  booker_name: string;
  booker_email: string;
  purpose: string;
  scheduled_at: string;
  status: string;
}

// ─── Activity feed table ──────────────────────────────────────────────────────

const ACTIVITY_COLS: Column<Record<string, unknown>>[] = [
  {
    key: "ref",
    label: "Reference",
    className: "w-28",
    render: (row) => (
      <span className="font-mono text-xs font-semibold text-muted-foreground">
        {String(row.ref)}
      </span>
    ),
  },
  {
    key: "description",
    label: "Activity",
    render: (row) => (
      <StackedCell
        primary={String(row.description)}
        secondary={row.meta ? String(row.meta) : undefined}
      />
    ),
  },
  {
    key: "amount",
    label: "Amount",
    className: "text-right hidden sm:table-cell",
    render: (row) => (
      <span className="font-semibold text-foreground">
        {row.amount ? String(row.amount) : "—"}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (row) => <StatusDot status={String(row.status)} />,
  },
  {
    key: "date",
    label: "Date",
    className: "hidden md:table-cell",
    render: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {new Date(String(row.date)).toLocaleDateString("en-KE", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
    ),
  },
];

export function ActivityFeedTable({ rows }: { rows: ActivityRow[] }) {
  return (
    <DataTable
      columns={ACTIVITY_COLS}
      data={rows as unknown as Record<string, unknown>[]}
      emptyMessage="No recent activity."
      maxHeight="320px"
    />
  );
}

// ─── Bookings table ───────────────────────────────────────────────────────────

const BOOKING_COLS: Column<Record<string, unknown>>[] = [
  {
    key: "booker_name",
    label: "Client",
    render: (row) => (
      <StackedCell
        primary={String(row.booker_name)}
        secondary={String(row.booker_email)}
      />
    ),
  },
  {
    key: "purpose",
    label: "Purpose",
    render: (row) => (
      <span className="capitalize text-sm">
        {String(row.purpose ?? "—").replace(/_/g, " ")}
      </span>
    ),
  },
  {
    key: "scheduled_at",
    label: "Date & Time",
    render: (row) => (
      <span className="text-sm text-foreground">
        {new Date(String(row.scheduled_at)).toLocaleString("en-KE", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (row) => <StatusDot status={String(row.status)} />,
  },
];

export function BookingsFeedTable({ rows }: { rows: BookingRow[] }) {
  return (
    <DataTable
      columns={BOOKING_COLS}
      data={rows as unknown as Record<string, unknown>[]}
      emptyMessage="No upcoming bookings."
    />
  );
}
