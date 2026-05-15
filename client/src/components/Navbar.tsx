/**
 * NAVBAR - VECY GOLD EDITION
 * 
 * Design: Minimalismo Corporativo Oscuro
 * - Fondo oscuro con glassmorphism
 * - Logo y navegación en oro/crema
 * - Animación suave en scroll
 */

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Navbar() {
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'INICIO', href: '/' },
    { label: 'PROPIEDADES', href: '/properties' },
    { label: 'SERVICIOS', href: '/services' },
    { label: 'BLOG', href: '/blog' },
    { label: 'RED AGENTES', href: '/agent-dashboard' },
  ];

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'glass shadow-lg'
          : 'bg-background/50 backdrop-blur-sm'
      }`}
    >
      <div className="container flex items-center justify-between h-20">
        {/* Logo */}
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-12 h-12 flex items-center justify-center transition-all group-hover:scale-105">
            <img 
              src="/logo-vecy.png" 
              alt="Vecy Network Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-display font-bold text-accent tracking-wider leading-none">VECY</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-1 italic">NETWORK</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => item.href.startsWith('/') ? navigate(item.href) : window.location.hash = item.href}
              className="text-sm font-semibold uppercase tracking-wider text-foreground/80 hover:text-accent transition-colors duration-300 relative group"
            >
              {item.label}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300"></span>
            </button>
          ))}
        </div>

        {/* CTA Button */}
        <div className="hidden md:flex items-center gap-4">
          <button className="btn-gold text-sm">CONSULTAR</button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-foreground hover:text-accent transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden glass border-t border-white/10">
          <div className="container py-6 space-y-4">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block text-sm font-semibold uppercase tracking-wider text-foreground/80 hover:text-accent transition-colors py-2"
                onClick={() => {
                  if (item.href.startsWith('/')) {
                    navigate(item.href);
                  } else {
                    window.location.hash = item.href;
                  }
                  setIsOpen(false);
                }}
              >
                {item.label}
              </a>
            ))}
            <button className="btn-gold w-full text-sm mt-4">CONSULTAR</button>
          </div>
        </div>
      )}
    </nav>
  );
}
