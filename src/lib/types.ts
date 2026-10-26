// Tipos de dominio, espejo de supabase/migrations/*_init.sql.

export type UserRole = "admin" | "cleaner" | "maintenance";
export type PropertyStatus = "available" | "occupied" | "cleaning" | "maintenance" | "ready";
export type BookingChannel = "airbnb" | "booking" | "direct" | "other";
export type ReservationStatus = "confirmed" | "checked_in" | "checked_out" | "cancelled";
export type TaskStatus = "pending" | "in_progress" | "done";
export type IncidentStatus = "pending" | "assigned" | "in_progress" | "resolved";

export interface Recommendation {
  category: string;
  name: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
}

export interface Organization {
  id: string;
  name: string;
  timezone: string;
}

export interface Property {
  id: string;
  organization_id: string;
  name: string;
  address: string;
  capacity: number;
  bedrooms: number;
  amenities: string[];
  wifi_ssid: string;
  wifi_password: string;
  house_rules: string;
  checkin_time: string;
  checkout_time: string;
  access_instructions: string;
  access_code: string;
  keys_info: string;
  manager_contact: string;
  default_cleaner_id: string | null;
  recommendations: Recommendation[];
  faq: FaqItem[];
  ical_urls: string[];
  ical_last_synced_at: string | null;
  ical_last_error: string | null;
  status: PropertyStatus;
  created_at: string;
}

export interface Guest {
  id: string;
  organization_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  document_type: string | null;
  document_number: string | null;
  nationality: string | null;
}

export interface Reservation {
  id: string;
  organization_id: string;
  property_id: string;
  guest_id: string | null;
  channel: BookingChannel;
  external_uid: string | null;
  confirmation_code: string | null;
  check_in_at: string;
  check_out_at: string;
  guests_count: number;
  status: ReservationStatus;
  notes: string;
  portal_token: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
}

export const PROPERTY_STATUS_LABEL: Record<PropertyStatus, string> = {
  available: "Disponible",
  occupied: "Ocupado",
  cleaning: "En limpieza",
  maintenance: "En mantenimiento",
  ready: "Listo",
};

export const CHANNEL_LABEL: Record<BookingChannel, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  direct: "Directa",
  other: "Otro canal",
};

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  confirmed: "Confirmada",
  checked_in: "En curso",
  checked_out: "Finalizada",
  cancelled: "Cancelada",
};
