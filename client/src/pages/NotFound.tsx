import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

/**
 * NOT FOUND PAGE - VECY GOLD EDITION
 * 
 * Design: Minimalismo Corporativo Oscuro con Acentos Dorados
 * Colores: Negro profundo (#050505), Slate-900 (#0f172a), Oro (#bf953f), Crema (#fcf6ba)
 */

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background to-black">
      <Card className="w-full max-w-lg mx-4 shadow-lg border border-white/10 bg-black/80 backdrop-blur-sm glow-gold">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-accent" />
            </div>
          </div>

          <h1 className="text-5xl font-display font-bold text-accent mb-2 uppercase tracking-wider">404</h1>

          <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-wider">
            Página No Encontrada
          </h2>

          <p className="text-gray-300 mb-8 leading-relaxed">
            Lo sentimos, la página que buscas no existe.
            <br />
            Puede haber sido movida o eliminada.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              className="btn-gold"
            >
              <Home className="w-4 h-4 mr-2" />
              Ir al Inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
