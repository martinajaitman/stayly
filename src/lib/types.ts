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
  document_image_path: string | null;
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
  rules_accepted_at: string | null;
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

export type TaskType = "cleaning" | "maintenance";
export type IncidentPriority = "low" | "medium" | "high";
export type IncidentCategory = "maintenance" | "cleaning" | "access" | "amenities" | "noise" | "other";

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface Task {
  id: string;
  organization_id: string;
  type: TaskType;
  property_id: string;
  reservation_id: string | null;
  incident_id: string | null;
  assigned_to: string | null;
  scheduled_for: string | null;
  status: TaskStatus;
  checklist: ChecklistItem[];
  photos: string[];
  notes: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Incident {
  id: string;
  organization_id: string;
  number: number;
  property_id: string;
  reservation_id: string | null;
  category: IncidentCategory;
  priority: IncidentPriority;
  title: string;
  description: string;
  reported_by: string;
  assigned_to: string | null;
  status: IncidentStatus;
  resolved_at: string | null;
  created_at: string;
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En proceso",
  done: "Finalizada",
};

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  pending: "Pendiente",
  assigned: "Asignada",
  in_progress: "En proceso",
  resolved: "Resuelta",
};

export const INCIDENT_PRIORITY_LABEL: Record<IncidentPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const INCIDENT_CATEGORY_LABEL: Record<IncidentCategory, string> = {
  maintenance: "Mantenimiento",
  cleaning: "Limpieza",
  access: "Acceso / llaves",
  amenities: "Amenities",
  noise: "Ruidos / vecinos",
  other: "Otro",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  cleaner: "Limpieza",
  maintenance: "Mantenimiento",
};
