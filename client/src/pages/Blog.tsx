/**
 * BLOG PAGE - VECY TECH REAL ESTATE
 * 
 * Centro de blog y opiniones con múltiples autores
 */

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Calendar, User, ArrowRight } from 'lucide-react';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  authorRole: string;
  date: string;
  category: string;
  image: string;
  readTime: number;
}

const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: 'Tendencias del Mercado Inmobiliario 2026: Análisis Profundo',
    excerpt: 'Descubre las tendencias clave que están transformando el mercado de bienes raíces en Bogotá y Colombia.',
    content: 'El mercado inmobiliario en 2026 está experimentando cambios significativos...',
    author: 'Carlos Mendoza',
    authorRole: 'Analista de Mercado Senior',
    date: 'Mar 25, 2026',
    category: 'Mercado',
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663473049862/LD7yumWfXzokVvfeMUE2DU/blog-expertise-EquvMH32g8aQEWw6p8Myi6.webp',
    readTime: 8,
  },
  {
    id: 2,
    title: 'Cómo Invertir en Propiedades de Alto Rendimiento',
    excerpt: 'Estrategias probadas para maximizar tu retorno de inversión en el sector inmobiliario colombiano.',
    content: 'La inversión inmobiliaria requiere una estrategia bien planificada...',
    author: 'María González',
    authorRole: 'Asesora de Inversiones',
    date: 'Mar 22, 2026',
    category: 'Inversión',
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663473049862/LD7yumWfXzokVvfeMUE2DU/blog-expertise-EquvMH32g8aQEWw6p8Myi6.webp',
    readTime: 10,
  },
  {
    id: 3,
    title: 'Tecnología Blockchain en Transacciones Inmobiliarias',
    excerpt: 'Cómo la tecnología blockchain está revolucionando la seguridad en transacciones de bienes raíces.',
    content: 'La tecnología blockchain ofrece nuevas posibilidades para la seguridad...',
    author: 'David López',
    authorRole: 'Especialista en FinTech',
    date: 'Mar 20, 2026',
    category: 'Tecnología',
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663473049862/LD7yumWfXzokVvfeMUE2DU/market-analysis-abstract-cHA7YufaiFaibBrKENzMT2.webp',
    readTime: 7,
  },
  {
    id: 4,
    title: 'Sostenibilidad en Desarrollo Inmobiliario: El Futuro es Verde',
    excerpt: 'Por qué las propiedades sostenibles son la tendencia del futuro y cómo invertir en ellas.',
    content: 'La sostenibilidad es cada vez más importante en el desarrollo inmobiliario...',
    author: 'Laura Rodríguez',
    authorRole: 'Directora de Sostenibilidad',
    date: 'Mar 18, 2026',
    category: 'Sostenibilidad',
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663473049862/LD7yumWfXzokVvfeMUE2DU/property-showcase-luxury-MTWSLEHxZ8BsTsGNBRmKFQ.webp',
    readTime: 9,
  },
  {
    id: 5,
    title: 'Guía Completa: Cómo Comprar tu Primera Propiedad en Bogotá',
    excerpt: 'Pasos esenciales y consejos prácticos para realizar tu primera compra inmobiliaria exitosa.',
    content: 'Comprar tu primera propiedad es una decisión importante que requiere preparación...',
    author: 'Juan Pérez',
    authorRole: 'Asesor Inmobiliario Principal',
    date: 'Mar 15, 2026',
    category: 'Guía',
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663473049862/LD7yumWfXzokVvfeMUE2DU/hero-bogota-skyline-WeKHPDK9eyMhdzE5MDNStj.webp',
    readTime: 12,
  },
];

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const categories = ['all', 'Mercado', 'Inversión', 'Tecnología', 'Sostenibilidad', 'Guía'];

  const filteredPosts =
    selectedCategory === 'all'
      ? blogPosts
      : blogPosts.filter((post) => post.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-12 bg-gradient-to-b from-black to-background">
        <div className="container">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-display font-bold tracking-wider mb-4">
              LIDERAZGO <span className="text-accent">INTELECTUAL</span>
            </h1>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Análisis, tendencias e insights del mercado inmobiliario colombiano
            </p>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="py-12 bg-background">
        <div className="container">
          <div className="flex flex-wrap gap-4 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2 rounded-lg font-bold uppercase tracking-wider transition-all duration-300 ${
                  selectedCategory === cat
                    ? 'bg-accent text-accent-foreground glow-gold'
                    : 'bg-black text-gray-200 hover:bg-gray-900'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-12 bg-background">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, idx) => (
              <div
                key={post.id}
                className="card-float overflow-hidden hover:glow-gold-sm transition-all duration-300 cursor-pointer animate-slide-in-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
                onClick={() => setSelectedPost(post)}
              >
                {/* Imagen */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-accent text-accent-foreground px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                    {post.category}
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-3 line-clamp-2">{post.title}</h3>
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">{post.excerpt}</p>

                  {/* Metadata */}
                  <div className="space-y-3 mb-4 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <User size={16} className="text-accent" />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Calendar size={16} className="text-accent" />
                      <span>{post.date}</span>
                    </div>
                    <p className="text-gray-400 text-xs">{post.readTime} min de lectura</p>
                  </div>

                  {/* CTA */}
                  <button className="btn-gold-outline w-full text-sm flex items-center justify-center gap-2">
                    LEER MÁS
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Authors */}
      <section className="py-20 bg-gradient-to-b from-black to-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-wider">
              Nuestros <span className="text-accent">Expertos</span>
            </h2>
            <div className="line-gold w-24 mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Carlos Mendoza',
                role: 'Analista de Mercado Senior',
                bio: '15+ años de experiencia en análisis inmobiliario',
              },
              {
                name: 'María González',
                role: 'Asesora de Inversiones',
                bio: 'Especialista en portafolios inmobiliarios de alto rendimiento',
              },
              {
                name: 'David López',
                role: 'Especialista en FinTech',
                bio: 'Innovador en tecnología aplicada a bienes raíces',
              },
            ].map((author, idx) => (
              <div key={idx} className="card-float p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-gold-dark mx-auto mb-4"></div>
                <h3 className="text-xl font-bold text-white mb-1">{author.name}</h3>
                <p className="text-accent font-semibold text-sm mb-3 uppercase tracking-wider">{author.role}</p>
                <p className="text-gray-300 text-sm">{author.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 bg-background">
        <div className="container max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-wider">
            Suscríbete a Nuestro <span className="text-accent">Newsletter</span>
          </h2>
          <p className="text-gray-300 mb-8">
            Recibe los últimos artículos, análisis de mercado y oportunidades de inversión directamente en tu correo
          </p>
          <form className="flex gap-4">
            <input
              type="email"
              placeholder="Tu correo electrónico"
              className="flex-1 px-6 py-3 bg-black border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-accent transition-colors"
            />
            <button className="btn-gold">SUSCRIBIR</button>
          </form>
        </div>
      </section>

      {/* Modal de artículo */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10 glow-gold">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-black/95 backdrop-blur">
              <h2 className="text-2xl font-bold text-white flex-1">{selectedPost.title}</h2>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-2 hover:bg-black rounded-lg transition-colors ml-4"
              >
                ✕
              </button>
            </div>

            {/* Contenido */}
            <div className="p-8">
              <img
                src={selectedPost.image}
                alt={selectedPost.title}
                className="w-full h-64 object-cover rounded-xl mb-6"
              />

              {/* Metadata */}
              <div className="flex flex-wrap gap-6 mb-6 pb-6 border-b border-white/10">
                <div className="flex items-center gap-2 text-gray-300">
                  <User size={18} className="text-accent" />
                  <div>
                    <p className="text-sm text-gray-400">Por</p>
                    <p className="font-semibold">{selectedPost.author}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar size={18} className="text-accent" />
                  <div>
                    <p className="text-sm text-gray-400">Publicado</p>
                    <p className="font-semibold">{selectedPost.date}</p>
                  </div>
                </div>
                <div className="text-gray-300">
                  <p className="text-sm text-gray-400">Tiempo de lectura</p>
                  <p className="font-semibold">{selectedPost.readTime} min</p>
                </div>
              </div>

              {/* Contenido */}
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-200 leading-relaxed mb-6">{selectedPost.content}</p>
                <p className="text-gray-300 italic">
                  Este es un artículo de ejemplo. El contenido completo estaría disponible en la versión completa del sitio.
                </p>
              </div>

              {/* Botón de cierre */}
              <button
                onClick={() => setSelectedPost(null)}
                className="btn-gold w-full mt-8"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}

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
