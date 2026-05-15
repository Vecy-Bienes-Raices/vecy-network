// @ts-nocheck
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AgendaForm from "@/components/agenda-pro/AgendaForm";

/** Genera código de referencia: zona + posición consecutiva dentro de la zona */
function generateRefCode(zone: string, rank: number): string {
  const normalized = (zone || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const abbrevMap: Record<string, string> = {
    'santa barbara central': 'SBC', 'santa barbara occidental': 'SBOCC',
    'santa barbara oriental': 'SBORI', 'santa barbara': 'SB',
    'chapinero': 'CHP', 'chapinero alto': 'CHRA', 'chapinero central': 'CHRC',
    'usaquen': 'USQ', 'salitre': 'SAL', 'san patricio': 'SP',
    'zona rosa': 'ZR', 'teusaquillo': 'TEU', 'el lago': 'LAG',
    'la soledad': 'SOL', 'cedritos': 'CED', 'chico': 'CHC',
    'chico norte': 'CHCN', 'santa ana': 'SNA', 'country': 'COU',
    'rosales': 'ROS', 'nogal': 'NOG',
  };
  const abbrev = abbrevMap[normalized] ||
    (zone || 'XX').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 5);
  return `ID-BOG-${abbrev}${String(rank).padStart(2, '0')}`;
}

export default function Agenda() {
  const [matchAgenda, paramsAgenda] = useRoute("/agenda/:propertyId");
  const propertyId = paramsAgenda?.propertyId;
  const [, navigate] = useLocation();
  const { data: property, isLoading: isPropertyLoading } = trpc.properties.getById.useQuery(
    { id: Number(propertyId) },
    { enabled: !!propertyId && !isNaN(Number(propertyId)) }
  );

  const [isSubmitted, setIsSubmitted] = useState(false);

  if (isPropertyLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="animate-spin w-10 h-10 text-accent" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col justify-center items-center">
          <h2 className="text-2xl font-bold text-white mb-4">Inmueble no encontrado</h2>
          <Button variant="outline" className="btn-gold" onClick={() => navigate('/properties')}>
            Volver al Catálogo
          </Button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col justify-center items-center text-center p-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl glass p-10 max-w-lg w-full">
            <h3 className="text-3xl font-bold text-accent mb-4">¡Solicitud Enviada!</h3>
            <p className="text-gray-400 mb-8 text-lg">
              Tu solicitud para <strong>{property.name}</strong> ha sido recibida exitosamente. Revisa tu correo y WhatsApp para la confirmación.
            </p>
            <Button className="btn-gold w-full py-6 text-sm tracking-widest font-bold" onClick={() => navigate('/properties')}>
              VOLVER AL CATÁLOGO
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <section className="pt-32 pb-20">
        <div className="container max-w-4xl">
          <AgendaForm 
            propertyName={property.name} 
            propertyCode={generateRefCode(property.zone || '', (property as any).zoneRank ?? 1)} 
            isLocked={true} 
            onSuccess={() => setIsSubmitted(true)}
          />
        </div>
      </section>
    </div>
  );
}
