import React, { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Shield, EyeOff, Lock, CheckCircle2, Bed, Bath, Expand } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  documentNumber: z.string().min(5, "Cédula/NIT requerido"),
  email: z.string().email("Correo inválido"),
  phone: z.string().min(7, "Teléfono obligatorio"),
});

export default function StealthPropertyView() {
  const [match, params] = useRoute("/p/:token");
  const token = params?.token || "";
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = trpc.leads.resolveStealthLink.useQuery({ token }, {
    enabled: !!token,
    retry: false,
  });

  const submitMutation = trpc.leads.submitStealthLead.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("¡Registro exitoso!", { description: "Un asesor se pondrá en contacto contigo." });
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", documentNumber: "", email: "", phone: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    submitMutation.mutate({ token, ...values });
  }

  if (!match) return null;

  /* ---- LOADING ---- */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-12 h-12 text-primary animate-bounce" />
          <p className="text-primary font-mono text-sm tracking-widest animate-pulse">VERIFICANDO ENLACE...</p>
        </div>
      </div>
    );
  }

  /* ---- ERROR ---- */
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="panel-card max-w-sm w-full p-10 text-center animate-fade-in">
          <EyeOff className="w-16 h-16 text-destructive mx-auto mb-4 opacity-50" />
          <h1 className="text-2xl font-black text-foreground mb-2">Enlace Expirado</h1>
          <p className="text-muted-foreground text-sm">
            Este inmueble ya no está disponible o el enlace fue revocado.
          </p>
        </div>
      </div>
    );
  }

  const prop = data.property;
  const mainImage = Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : "";

  /* ---- SUCCESS ---- */
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glow background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(191,149,63,0.08)_0%,transparent_70%)]" />
        <div className="panel-card max-w-md w-full p-10 text-center relative z-10 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6 glow-gold-sm">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black text-foreground mb-4">Registro Exitoso</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Has asegurado tu lugar. El Captador Oficial de esta propiedad se pondrá en contacto 
            contigo a la brevedad para brindarte acceso al portafolio completo.
          </p>
          <div className="p-4 bg-secondary rounded-xl border border-border">
            <p className="text-xs font-mono text-muted-foreground">
              Referencia Ledger: <span className="text-primary">{token.substring(0, 10).toUpperCase()}</span>
            </p>
          </div>
          <div className="separator-gold mt-8" />
          <p className="text-xs text-muted-foreground mt-4">
            Conserva esta referencia. Es el respaldo legal de tu manifestación de interés.
          </p>
        </div>
      </div>
    );
  }

  /* ---- MAIN VIEW ---- */
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">

      {/* ===== LADO IZQUIERDO: Propiedad ===== */}
      <div className="w-full md:w-1/2 min-h-[45vh] md:min-h-screen relative overflow-hidden">
        {mainImage ? (
          <img src={mainImage} className="absolute inset-0 w-full h-full object-cover opacity-50" alt={prop.name} />
        ) : (
          <div className="absolute inset-0 bg-gradient-dark" />
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-background via-background/90 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-14">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-background/60 backdrop-blur-sm text-xs font-mono text-primary mb-6 w-fit">
            <EyeOff className="w-3 h-3" />
            ENLACE BLINDADO — MODO CONFIDENCIAL
          </div>

          <h1 className="page-header-gold text-3xl md:text-5xl font-black mb-4 leading-tight">
            {prop.name}
          </h1>

          <div className="flex flex-wrap gap-4 text-foreground/80 text-sm font-medium mb-6">
            {prop.bedrooms && (
              <div className="flex items-center gap-2">
                <Bed className="w-4 h-4 text-primary" /> {prop.bedrooms} Hab.
              </div>
            )}
            {prop.bathrooms && (
              <div className="flex items-center gap-2">
                <Bath className="w-4 h-4 text-primary" /> {prop.bathrooms} Baños
              </div>
            )}
            {prop.areaSquareMeters && (
              <div className="flex items-center gap-2">
                <Expand className="w-4 h-4 text-primary" /> {prop.areaSquareMeters} m²
              </div>
            )}
          </div>

          <p className="text-muted-foreground mb-6 max-w-md leading-relaxed text-sm">
            Ubicada estratégicamente en <strong className="text-foreground">{prop.zone}</strong>. 
            Para conocer la dirección exacta, fotos interiores y tour virtual, completa el formulario de acceso.
          </p>

          <div className="text-3xl font-light text-primary">
            ${Number(prop.price).toLocaleString("es-CO")} COP
          </div>
        </div>
      </div>

      {/* ===== LADO DERECHO: Formulario (Muro de Fuego) ===== */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-14 relative bg-card">
        {/* Borde dorado izquierdo */}
        <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-primary/40 to-transparent" />

        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4 glow-gold-sm">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">Desbloquear Acceso</h2>
            <p className="text-muted-foreground text-sm">
              Introduce tus datos para habilitar la información completa y conectar con el estructurador de este negocio.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Nombre Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Carlos Torres" className="input-vecy h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="documentNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Cédula / NIT</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890" className="input-vecy h-11 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">WhatsApp</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+57 300..." className="input-vecy h-11 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="tu@correo.com" className="input-vecy h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="btn-gold w-full h-12 text-base"
                >
                  {submitMutation.isPending ? "PROCESANDO..." : "VER PROPIEDAD COMPLETA"}
                </Button>
              </div>

              {/* Aviso Legal */}
              <div className="mt-4 p-4 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground leading-relaxed">
                <Shield className="w-3 h-3 inline-block mb-0.5 mr-1 text-primary/60" />
                <strong className="text-foreground/80">Aviso Legal (Ley 1442):</strong> Al enviar este formulario, 
                usted reconoce formalmente el interés en el inmueble referenciado bajo el token{" "}
                <code className="text-primary/60 font-mono">{token.substring(0, 8)}</code>. 
                Se establece la vinculación comercial con la red de intermediación responsable de su promoción.
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
