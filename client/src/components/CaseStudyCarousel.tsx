/**
 * CASE STUDY CAROUSEL - VECY GOLD EDITION
 * 
 * Carrusel de estudios de caso con modales expandibles
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CaseStudy {
  id: number;
  title: string;
  category: string;
  image: string;
  description: string;
  results: string[];
  challenge: string;
  solution: string;
}

const caseStudies: CaseStudy[] = [
  {
    id: 1,
    title: 'Desarrollo Zona Rosa - Proyecto Emblema',
    category: 'Desarrollo Residencial',
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663473049862/LD7yumWfXzokVvfeMUE2DU/property-showcase-luxury-MTWSLEHxZ8BsTsGNBRmKFQ.webp',
    description: 'Transformación de un lote en la Zona Rosa en un complejo residencial de lujo con 45 unidades.',
    challenge: 'Ubicación en zona de alto valor con restricciones normativas complejas.',
    solution: 'Diseño arquitectónico innovador que maximiza espacio y cumple con regulaciones locales.',
    results: [
      'Venta de 100% de unidades en 6 meses',
      'Precio promedio 15% superior al mercado',
      'Certificación LEED Gold',
    ],
  },
  {
    id: 2,
    title: 'Inversión Chapinero - Portafolio Mixto',
    category: 'Inversión Inmobiliaria',
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663473049862/LD7yumWfXzokVvfeMUE2DU/property-showcase-luxury-MTWSLEHxZ8BsTsGNBRmKFQ.webp',
    description: 'Adquisición y gestión de portafolio de 12 propiedades en Chapinero con ROI de 18% anual.',
    challenge: 'Diversificación de riesgo en mercado volátil.',
    solution: 'Estrategia de inversión balanceada con mix de residencial y comercial.',
    results: [
      'ROI anual de 18%',
      'Ocupación promedio 95%',
      'Apreciación de capital 12% anual',
    ],
  },
  {
    id: 3,
    title: 'Renovación Usaquén - Patrimonio Moderno',
    category: 'Renovación Urbana',
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663473049862/LD7yumWfXzokVvfeMUE2DU/property-showcase-luxury-MTWSLEHxZ8BsTsGNBRmKFQ.webp',
    description: 'Restauración de casa colonial con integración de tecnología moderna y sostenibilidad.',
    challenge: 'Preservar valor histórico mientras se moderniza la propiedad.',
    solution: 'Diseño bioclimático que respeta arquitectura original con sistemas inteligentes.',
    results: [
      'Aumento de valor 35%',
      'Eficiencia energética 60%',
      'Reconocimiento arquitectónico nacional',
    ],
  },
];

export default function CaseStudyCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedStudy, setSelectedStudy] = useState<CaseStudy | null>(null);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % caseStudies.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + caseStudies.length) % caseStudies.length);
  };

  const current = caseStudies[currentIndex];

  return (
    <>
      {/* Carrusel */}
      <div className="relative">
        <div className="card-float overflow-hidden">
          {/* Imagen */}
          <div className="relative h-96 overflow-hidden">
            <img
              src={current.image}
              alt={current.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

            {/* Contenido sobre imagen */}
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <p className="text-accent font-bold uppercase tracking-wider text-sm mb-2">
                {current.category}
              </p>
              <h3 className="text-4xl font-bold mb-4">{current.title}</h3>
              <p className="text-gray-100 mb-6 max-w-2xl">{current.description}</p>
              <button
                onClick={() => setSelectedStudy(current)}
                className="btn-gold"
              >
                VER CASO COMPLETO
              </button>
            </div>
          </div>
        </div>

        {/* Controles de navegación */}
        <div className="flex items-center justify-between mt-8">
          <div className="flex gap-2">
            <button
              onClick={prev}
              className="p-3 rounded-lg bg-black hover:bg-accent hover:text-accent-foreground transition-all duration-300 glow-gold-sm"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={next}
              className="p-3 rounded-lg bg-black hover:bg-accent hover:text-accent-foreground transition-all duration-300 glow-gold-sm"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Indicadores */}
          <div className="flex gap-2">
            {caseStudies.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? 'bg-accent w-8'
                    : 'bg-zinc-900 w-2 hover:bg-zinc-900'
                }`}
              />
            ))}
          </div>

          {/* Contador */}
          <p className="text-gray-300 text-sm uppercase tracking-wider">
            {currentIndex + 1} / {caseStudies.length}
          </p>
        </div>
      </div>

      {/* Modal expandible */}
      {selectedStudy && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10 glow-gold">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-black/95 backdrop-blur">
              <h2 className="text-3xl font-bold text-white">{selectedStudy.title}</h2>
              <button
                onClick={() => setSelectedStudy(null)}
                className="p-2 hover:bg-black rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-8">
              {/* Imagen */}
              <img
                src={selectedStudy.image}
                alt={selectedStudy.title}
                className="w-full h-64 object-cover rounded-xl mb-8"
              />

              {/* Secciones */}
              <div className="space-y-8">
                {/* Categoría */}
                <div>
                  <p className="text-accent font-bold uppercase tracking-wider text-sm mb-2">
                    {selectedStudy.category}
                  </p>
                </div>

                {/* Descripción */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-3">Descripción</h3>
                  <p className="text-gray-300 leading-relaxed">{selectedStudy.description}</p>
                </div>

                {/* Desafío */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-3">Desafío</h3>
                  <p className="text-gray-300 leading-relaxed">{selectedStudy.challenge}</p>
                </div>

                {/* Solución */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-3">Solución</h3>
                  <p className="text-gray-300 leading-relaxed">{selectedStudy.solution}</p>
                </div>

                {/* Resultados */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Resultados</h3>
                  <div className="space-y-3">
                    {selectedStudy.results.map((result, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0"></div>
                        <p className="text-gray-300">{result}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botón de cierre */}
              <button
                onClick={() => setSelectedStudy(null)}
                className="btn-gold w-full mt-8"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
