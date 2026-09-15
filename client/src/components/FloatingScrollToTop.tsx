// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useLocation } from 'wouter';

export default function FloatingScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const mainEl = document.querySelector('main');
      const mainScroll = mainEl ? mainEl.scrollTop : 0;
      const windowScroll = window.scrollY || document.documentElement.scrollTop || 0;
      
      // Mostrar la flecha si el usuario ha bajado más de 250px
      setIsVisible(windowScroll > 250 || mainScroll > 250);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }

    // Comprobación inicial
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, [location]);

  // Si estamos en la consola de chat completa, ocultar
  if (location === '/jania') return null;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={scrollToTop}
          className="fixed bottom-6 left-6 md:bottom-8 md:left-8 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center z-40 bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f] text-black border border-black/30 shadow-[0_4px_15px_rgba(191,149,63,0.45)] hover:shadow-[0_6px_22px_rgba(191,149,63,0.7)] cursor-pointer group transition-all"
          title="Volver arriba"
        >
          <ArrowUp className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-black stroke-[3] group-hover:-translate-y-0.5 transition-transform" />
          
          {/* Tooltip elegante */}
          <div className="absolute -top-10 left-0 bg-black/85 backdrop-blur-md border border-primary/30 px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest whitespace-nowrap">Volver Arriba</span>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
