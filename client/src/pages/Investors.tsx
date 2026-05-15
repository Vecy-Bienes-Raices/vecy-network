/**
 * INVESTORS PAGE - VECY TECH REAL ESTATE
 * 
 * Centro para inversores y propietarios con informes descargables
 */

import Navbar from '@/components/Navbar';
import { Download, TrendingUp, BarChart3, PieChart, FileText, Lock, Calculator, Scale, LineChart, BadgeDollarSign } from 'lucide-react';

export default function Investors() {
  const reports = [
    {
      id: 1,
      title: 'Reporte de Mercado Bogotá Q1 2026',
      description: 'Análisis completo del mercado inmobiliario en Bogotá para el primer trimestre de 2026',
      date: 'Mar 2026',
      size: '2.4 MB',
      type: 'PDF',
    },
    {
      id: 2,
      title: 'Tendencias de Inversión 2026',
      description: 'Proyecciones y tendencias clave para inversores inmobiliarios en Colombia',
      date: 'Mar 2026',
      size: '1.8 MB',
      type: 'PDF',
    },
    {
      id: 3,
      title: 'Análisis Comparativo de Zonas',
      description: 'Comparativa detallada de precios, rentabilidad y potencial de crecimiento por zona',
      date: 'Feb 2026',
      size: '3.1 MB',
      type: 'PDF',
    },
    {
      id: 4,
      title: 'Guía de Inversión Inmobiliaria',
      description: 'Estrategias probadas para maximizar retorno de inversión en bienes raíces',
      date: 'Feb 2026',
      size: '2.7 MB',
      type: 'PDF',
    },
  ];

  const metrics = [
    {
      label: 'Rentabilidad Promedio',
      value: '12-18%',
      icon: TrendingUp,
      color: 'text-accent',
    },
    {
      label: 'Ocupación Promedio',
      value: '94%',
      icon: BarChart3,
      color: 'text-gray-200',
    },
    {
      label: 'Apreciación Anual',
      value: '8-12%',
      icon: PieChart,
      color: 'text-accent',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-12 bg-gradient-to-b from-black to-background">
        <div className="container">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-display font-bold tracking-wider mb-4">
              CENTRO DE <span className="text-accent">INVERSORES</span>
            </h1>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Recursos, análisis y herramientas para optimizar tu portafolio inmobiliario
            </p>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-wider">
              Métricas de <span className="text-accent">Mercado</span>
            </h2>
            <div className="line-gold w-24 mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {metrics.map((metric, idx) => {
              const Icon = metric.icon;
              return (
                <div key={idx} className="card-float p-8 text-center hover:glow-gold-sm transition-all">
                  <Icon className={`${metric.color} mx-auto mb-4`} size={40} />
                  <p className="text-gray-300 text-sm uppercase tracking-wider mb-2">
                    {metric.label}
                  </p>
                  <p className="text-4xl font-bold text-accent">{metric.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Reports Section */}
      <section className="py-20 bg-gradient-to-b from-black to-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-wider">
              Informes <span className="text-accent">Descargables</span>
            </h2>
            <p className="text-gray-300">Acceso a reportes exclusivos para miembros registrados</p>
            <div className="line-gold w-24 mx-auto mt-4"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {reports.map((report, idx) => (
              <div
                key={report.id}
                className="card-float p-8 hover:glow-gold-sm transition-all animate-slide-in-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-black rounded-lg">
                    <FileText className="text-accent" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{report.title}</h3>
                    <p className="text-gray-300 text-sm">{report.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between py-4 border-t border-white/10">
                  <div className="flex gap-4 text-sm text-gray-400">
                    <span>{report.date}</span>
                    <span>•</span>
                    <span>{report.size}</span>
                  </div>
                  <button className="btn-gold flex items-center gap-2 text-sm">
                    <Download size={16} />
                    DESCARGAR
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Investment Tools */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-wider">
              Herramientas de <span className="text-accent">Inversión</span>
            </h2>
            <div className="line-gold w-24 mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: 'Calculadora ROI',
                description: 'Calcula el retorno de inversión potencial basado en tus parámetros',
                icon: <Calculator size={48} className="text-accent glow-gold-sm rounded-full p-2 bg-black/50" />,
              },
              {
                title: 'Comparador de Propiedades',
                description: 'Compara múltiples propiedades lado a lado con análisis detallado',
                icon: <Scale size={48} className="text-accent glow-gold-sm rounded-full p-2 bg-black/50" />,
              },
              {
                title: 'Proyector de Precios',
                description: 'Proyecciones de apreciación de propiedades a largo plazo',
                icon: <LineChart size={48} className="text-accent glow-gold-sm rounded-full p-2 bg-black/50" />,
              },
              {
                title: 'Análisis de Rentabilidad',
                description: 'Análisis profundo de rentabilidad por zona y tipo de propiedad',
                icon: <BadgeDollarSign size={48} className="text-accent glow-gold-sm rounded-full p-2 bg-black/50" />,
              },
            ].map((tool, idx) => (
              <div key={idx} className="card-float p-8 hover:glow-gold-sm transition-all">
                <div className="mb-6 flex justify-center">{tool.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-3 text-center">{tool.title}</h3>
                <p className="text-gray-300 mb-6 text-center">{tool.description}</p>
                <button className="btn-gold-outline w-full">ACCEDER</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Section */}
      <section className="py-20 bg-gradient-to-b from-black to-background">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-wider">
              Membresía <span className="text-accent">Premium</span>
            </h2>
            <p className="text-gray-300">Acceso ilimitado a todos nuestros recursos y herramientas</p>
          </div>

          <div className="card-float p-12 text-center glow-gold">
            <div className="inline-block p-3 bg-accent/20 rounded-lg mb-6">
              <Lock className="text-accent" size={32} />
            </div>

            <h3 className="text-3xl font-bold text-white mb-4">Miembro Premium</h3>

            <ul className="space-y-4 mb-8 text-left">
              {[
                'Acceso a todos los reportes de mercado',
                'Herramientas de análisis avanzadas',
                'Consultas mensuales con expertos',
                'Alertas de oportunidades de inversión',
                'Comunidad exclusiva de inversores',
                'Webinars y capacitaciones mensuales',
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3 text-gray-200">
                  <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0"></span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mb-8">
              <p className="text-gray-300 mb-2">Desde</p>
              <p className="text-5xl font-bold text-accent">$99</p>
              <p className="text-gray-300 text-sm">por mes</p>
            </div>

            <button className="btn-gold w-full">ACTIVAR MEMBRESÍA PREMIUM</button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-background">
        <div className="container max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-wider">
            ¿Preguntas sobre <span className="text-accent">Inversión?</span>
          </h2>
          <p className="text-gray-300 mb-8">
            Nuestro equipo de expertos está disponible para ayudarte a tomar las mejores decisiones de inversión
          </p>
          <button className="btn-gold">CONTACTAR A UN EXPERTO</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Vecy</h4>
              <p className="text-gray-300 text-sm">Liderazgo en tecnología inmobiliaria.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Navegación</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="/" className="hover:text-accent transition-colors">Inicio</a></li>
                <li><a href="/properties" className="hover:text-accent transition-colors">Propiedades</a></li>
                <li><a href="/blog" className="hover:text-accent transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-accent transition-colors">Términos</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Privacidad</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Contacto</h4>
              <p className="text-gray-300 text-sm">
                +57 (1) 1234-5678<br />
                vecybienesraices@gmail.com
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2026 Vecy. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
