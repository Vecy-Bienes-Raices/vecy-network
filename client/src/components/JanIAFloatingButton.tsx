// @ts-nocheck
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';

export default function JanIAFloatingButton() {
  const [location, navigate] = useLocation();

  // No mostrar el botón si ya estamos en la consola
  if (location === '/jania') return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => navigate('/jania')}
      className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-full p-0 flex items-center justify-center z-40 glow-gold pulse-glow overflow-hidden shadow-2xl bg-black border-2 border-[#bf953f] group cursor-pointer"
      title="Abrir JanIA Console"
    >
      <img 
        src="/jania_perfil.png" 
        alt="JanIA"
        className="w-full h-full object-cover object-top scale-135 translate-y-1" 
        loading="eager"
        decoding="async"
      />
      {/* Tooltip opcional */}
      <div className="absolute -top-10 right-0 bg-black/85 backdrop-blur-md border border-primary/30 px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
        <span className="text-[10px] font-bold text-primary uppercase tracking-widest whitespace-nowrap">JanIA Console</span>
      </div>
    </motion.button>
  );
}
