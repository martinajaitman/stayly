import { Badge, type Tone } from "@/components/ui";
import {
  CHANNEL_LABEL,
  INCIDENT_PRIORITY_LABEL,
  INCIDENT_STATUS_LABEL,
  TASK_STATUS_LABEL,
  type IncidentPriority,
  type IncidentStatus,
  type TaskStatus,
  PROPERTY_STATUS_LABEL,
  RESERVATION_STATUS_LABEL,
  type BookingChannel,
  type PropertyStatus,
  type ReservationStatus,
} from "@/lib/types";

const propertyTone: Record<PropertyStatus, Tone> = {
  available: "green",
  ready: "green",
  occupied: "blue",
  cleaning: "yellow",
  maintenance: "red",
};

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  return (
    <Badge tone={propertyTone[status]}>
      <span className="size-1.5 rounded-full bg-current" />
      {PROPERTY_STATUS_LABEL[status]}
    </Badge>
  );
}

const reservationTone: Record<ReservationStatus, Tone> = {
  confirmed: "blue",
  checked_in: "green",
  checked_out: "neutral",
  cancelled: "red",
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return <Badge tone={reservationTone[status]}>{RESERVATION_STATUS_LABEL[status]}</Badge>;
}

export function ChannelBadge({ channel }: { channel: BookingChannel }) {
  return <Badge>{CHANNEL_LABEL[channel]}</Badge>;
}

const taskTone: Record<TaskStatus, Tone> = { pending: "yellow", in_progress: "blue", done: "green" };

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={taskTone[status]}>{TASK_STATUS_LABEL[status]}</Badge>;
}

const incidentTone: Record<IncidentStatus, Tone> = {
  pending: "red",
  quoting: "yellow",
  awaiting_approval: "red",
  assigned: "blue",
  scheduled: "blue",
  in_progress: "blue",
  resolved: "green",
};

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge tone={incidentTone[status]}>{INCIDENT_STATUS_LABEL[status]}</Badge>;
}

const priorityTone: Record<IncidentPriority, Tone> = { low: "neutral", medium: "yellow", high: "red" };

export function PriorityBadge({ priority }: { priority: IncidentPriority }) {
  return <Badge tone={priorityTone[priority]}>Prioridad {INCIDENT_PRIORITY_LABEL[priority].toLowerCase()}</Badge>;
}
