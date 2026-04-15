import React, { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, EyeOff, Lock, CheckCircle2, Bed, Bath, Expand } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  name: z.string().min(2, "Omitido"),
  documentNumber: z.string().min(5, "Omitido"),
  email: z.string().email("Correo inválido"),
  phone: z.string().min(7, "Teléfono obligatorio"),
  message: z.string().optional(),
});

export default function StealthPropertyView() {
  const [match, params] = useRoute("/p/:token");
  const token = params?.token || "";
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = trpc.leads.resolveStealthLink.useQuery({ token }, {
    enabled: !!token,
    retry: false
  });

  const submitMutation = trpc.leads.submitStealthLead.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("¡Información enviada!", { description: "Un asesor Black Edition te contactará pronto." });
    },
    onError: (err) => {
      toast.error("Error", { description: err.message });
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      documentNumber: "",
      email: "",
      phone: "",
      message: ""
    }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    submitMutation.mutate({
      token,
      name: values.name,
      documentNumber: values.documentNumber,
      email: values.email,
      phone: values.phone
    });
  }

  if (!match) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Shield className="w-12 h-12 text-amber-500 mb-4 animate-bounce" />
          <p className="text-amber-500 font-mono text-sm tracking-widest">DESCIFRANDO RED STEALTH...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-center p-4">
        <div>
          <EyeOff className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-50" />
          <h1 className="text-2xl font-bold text-zinc-200">Enlace Expirado o Inválido</h1>
          <p className="text-zinc-500 mt-2">Esta propiedad ya no está disponible en la Red Stealth o el enlace fue revocado.</p>
        </div>
      </div>
    );
  }

  const prop = data.property;

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-black to-black"></div>
        <div className="max-w-md w-full bg-zinc-900/80 backdrop-blur-md border border-amber-500/30 p-8 rounded-2xl text-center relative z-10">
          <CheckCircle2 className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-zinc-100 mb-4">Registro Exitoso</h2>
          <p className="text-zinc-400 mb-8">
            Has asegurado tu lugar. El Captador Oficial de esta propiedad se pondrá en contacto contigo a la brevedad para brindarte acceso al portafolio completo y organizar la visita.
          </p>
          <div className="p-4 bg-black/50 rounded-lg border border-zinc-800/80">
            <p className="text-xs font-mono text-zinc-500">Ref Ledger: {token.substring(0,8).toUpperCase()}</p>
          </div>
        </div>
      </div>
    );
  }

  const mainImage = prop.images && Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : "";

  return (
    <div className="min-h-screen bg-black font-sans text-zinc-200 flex flex-col md:flex-row">
      {/* CAPSULE: PROPERTY DETAILS (BLIND) */}
      <div className="w-full md:w-1/2 min-h-[40vh] md:min-h-screen relative overflow-hidden">
        {mainImage ? (
          <img src={mainImage} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Propiedad" />
        ) : (
          <div className="absolute inset-0 bg-zinc-900"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/80 to-transparent"></div>
        
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16">
          <BadgeBlind />
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-600 drop-shadow-sm mb-4">
            {prop.name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-zinc-300 font-medium mb-6">
            <div className="flex items-center"><Bed className="w-5 h-5 mr-2 text-amber-500" /> {prop.bedrooms} Hab</div>
            <div className="flex items-center"><Bath className="w-5 h-5 mr-2 text-amber-500" /> {prop.bathrooms} Baños</div>
            {prop.areaSquareMeters && <div className="flex items-center"><Expand className="w-5 h-5 mr-2 text-amber-500" /> {prop.areaSquareMeters} m²</div>}
          </div>
          <p className="text-zinc-400 text-lg mb-8 max-w-lg">
            Ubicada estratégicamente en {prop.zone}. Para conocer la dirección exacta, fotos interiores y tour virtual, ingresa al Sistema Vecy.
          </p>
          <div className="text-3xl font-light text-amber-400">
            ${Number(prop.price).toLocaleString()} COP
          </div>
        </div>
      </div>

      {/* CAPSULE: MURO DE FUEGO (FIREWALL FORM) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 relative bg-zinc-950">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 via-amber-600 to-amber-900 opacity-50"></div>
        
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Lock className="w-8 h-8 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-zinc-100">Desbloquear Acceso</h2>
            <p className="text-zinc-500 text-sm mt-2">Introduce tus datos para habilitar la información completa y conectar con el estructurador de este negocio.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400">Nombre Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Carlos Torres" className="bg-black border-zinc-800 text-amber-100 focus:border-amber-500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="documentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400">Cédula / NIT</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="1234..." className="bg-black border-zinc-800 text-amber-100 focus:border-amber-500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
               />
               <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400">WhatsApp</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+57..." className="bg-black border-zinc-800 text-amber-100 focus:border-amber-500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
               />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400">Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="carlos@empresa.com" className="bg-black border-zinc-800 text-amber-100 focus:border-amber-500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={submitMutation.isPending}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-black font-bold h-12 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                  {submitMutation.isPending ? "PROCESANDO..." : "VER PROPIEDAD"}
                </Button>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/80 text-xs text-zinc-500 leading-relaxed text-justify">
                <Shield className="w-3 h-3 inline-block mb-1 mr-1 text-amber-500/70" />
                <strong>Aviso Legal (Ley 1442):</strong> Al enviar este formulario, usted reconoce formalmente el interés en el inmueble referenciado bajo el token <code className="text-amber-500/50">{token.substring(0,6)}</code>. 
                Se establece la vinculación comercial con la red de intermediación responsable de su promoción. Cualquier intención de compra, renta o acuerdo directo derivado de esta conexión está regido bajo las normativas vigentes sobre comisión y corretaje.
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

function BadgeBlind() {
  return (
    <div className="inline-flex items-center px-3 py-1 rounded-full border border-amber-500/30 bg-black/50 backdrop-blur-sm text-xs font-mono text-amber-400 mb-6 w-fit">
      <EyeOff className="w-3 h-3 mr-2" />
      MODO CONFIDENCIAL
    </div>
  );
}
