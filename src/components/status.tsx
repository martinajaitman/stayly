import { Badge, type Tone } from "@/components/ui";
import {
  CHANNEL_LABEL,
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
