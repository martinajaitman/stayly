import { PageHeader } from "@/components/ui";
import { PropertyForm } from "../property-form";

export default function NewPropertyPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader title="Nueva propiedad" subtitle="Toda esta información alimenta los mensajes automáticos y el asistente IA." />
      <PropertyForm />
    </div>
  );
}
