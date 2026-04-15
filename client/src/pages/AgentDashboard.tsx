import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, Copy, Check, ExternalLink, Shield, Plus, Search, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AgentDashboard() {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Queries
  const { data: myProperties, refetch: refetchProps, isLoading: loadingProps } = trpc.agent.getMyProperties.useQuery();
  const { data: availableProperties, refetch: refetchAvailable, isLoading: loadingAvailable } = trpc.agent.getAvailablePropertiesToClaim.useQuery();
  const { data: stealthLinks, refetch: refetchLinks, isLoading: loadingLinks } = trpc.agent.getStealthLinks.useQuery();

  // Mutations
  const claimMutation = trpc.agent.claimProperty.useMutation({
    onSuccess: () => {
      toast("Inmueble Captado", { description: "Ahora eres el Captador Oficial." });
      refetchProps();
      refetchAvailable();
    }
  });

  const generateLinkMutation = trpc.agent.generateStealthLink.useMutation({
    onSuccess: () => {
      toast("Enlace generado", { description: "Tu enlace Stealth está listo." });
      refetchLinks();
    }
  });

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/property/${token}`; // We'll map token resolver later
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
    toast("Copiado al portapapeles");
  };

  return (
    <div className="min-h-screen bg-black/95 text-zinc-100 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
              Dashboard de Captador
            </h1>
            <p className="text-zinc-400 mt-2 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-amber-500" />
              Gestión centralizada de inmuebles y red Stealth.
            </p>
          </div>
        </div>

        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800 rounded-full p-1 mb-8">
            <TabsTrigger value="properties" className="rounded-full px-6 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-black">
              Mis Inmuebles
            </TabsTrigger>
            <TabsTrigger value="links" className="rounded-full px-6 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-black">
              Red de Conexión
            </TabsTrigger>
            <TabsTrigger value="claim" className="rounded-full px-6 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-black">
              Asignar (Prueba)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingProps ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl bg-zinc-900 border border-zinc-800" />)
              ) : myProperties?.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                  <Search className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
                  <p className="text-zinc-400">No tienes propiedades captadas todavía.</p>
                </div>
              ) : (
                myProperties?.map(prop => (
                  <Card key={prop.id} className="bg-zinc-900/80 border-amber-900/30 overflow-hidden relative group hover:border-amber-500/50 transition-colors">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600 opacity-80" />
                    <CardHeader className="pb-2">
                       <div className="flex justify-between items-start">
                         <Badge className="bg-black text-amber-400 border border-amber-500/30">Captador Oficial</Badge>
                         <span className="text-xs font-mono text-zinc-500">{prop.matriculaInmobiliaria}</span>
                       </div>
                      <CardTitle className="mt-3 text-xl text-zinc-100">{prop.name}</CardTitle>
                      <CardDescription className="text-zinc-400">{prop.location}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-light text-amber-500">
                        ${Number(prop.price).toLocaleString()}
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        onClick={() => generateLinkMutation.mutate({ propertyId: prop.id })}
                        disabled={generateLinkMutation.isPending}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      >
                        <Link className="w-4 h-4 mr-2" />
                        Generar Enlace Blindado
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="links">
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-200">Fábrica de Enlaces Blindados</CardTitle>
                <CardDescription className="text-zinc-400">Tus enlaces inmutables para compartir. Todos los prospectos que entren por aquí quedan respaldados y anclados directamente a ti.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLinks ? (
                  <Skeleton className="h-40 w-full bg-zinc-800" />
                ) : stealthLinks?.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">No hay enlaces generados.</div>
                ) : (
                  <div className="space-y-4">
                    {stealthLinks?.map(({ link, property }) => (
                      <div key={link.id} className="flex flex-col md:flex-row items-center justify-between p-4 rounded-lg bg-black/50 border border-zinc-800/80 hover:border-amber-500/30 transition-all">
                        <div className="mb-4 md:mb-0">
                          <p className="font-medium text-amber-400">{property.name}</p>
                          <p className="text-xs font-mono text-zinc-500 mt-1">Ref: {property.matriculaInmobiliaria}</p>
                        </div>
                        <div className="flex items-center space-x-4 w-full md:w-auto">
                          <div className="bg-zinc-950 px-4 py-2 rounded-md font-mono text-sm text-zinc-300 border border-zinc-800 flex-1 md:flex-none">
                            {window.location.origin}/p/{link.token.substring(0,8)}...
                          </div>
                          <div className="flex flex-col items-center justify-center px-4">
                            <span className="text-2xl font-bold text-zinc-200">{link.clicks}</span>
                            <span className="text-xs text-zinc-500 uppercase tracking-wider">Clics</span>
                          </div>
                          <Button 
                            variant="secondary" 
                            className="bg-zinc-800 hover:bg-zinc-700 text-amber-500"
                            onClick={() => handleCopy(link.token)}
                          >
                            {copiedToken === link.token ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Oculto en producción normal, pero para demo podemos asignarnos propiedades huerfanas */}
          <TabsContent value="claim">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingAvailable ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl bg-zinc-900 border border-zinc-800" />)
              ) : availableProperties?.length === 0 ? (
                <div className="col-span-full py-8 text-center text-zinc-500">
                  No hay propiedades disponibles para Captar.
                </div>
              ) : (
                availableProperties?.map(prop => (
                  <Card key={prop.id} className="bg-black border-dashed border-zinc-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-zinc-300">{prop.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={() => claimMutation.mutate({ propertyId: prop.id })}
                        disabled={claimMutation.isPending}
                        variant="outline"
                        className="w-full border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Asignarme como Captador
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
