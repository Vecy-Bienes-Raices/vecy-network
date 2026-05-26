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
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => navigate('/jania')}
      className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center z-40 glow-gold pulse-glow overflow-hidden shadow-2xl bg-black border-2 border-primary/40"
      title="Abrir JanIA Console"
    >
      <video 
        src="/jania.mp4" 
        autoPlay 
        loop 
        muted 
        playsInline
        className="w-[88%] h-[88%] rounded-full object-cover contrast-110 saturate-105" 
      />
      {/* Tooltip opcional */}
      <div className="absolute -top-12 right-0 bg-black/80 backdrop-blur-md border border-primary/20 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <span className="text-[10px] font-bold text-primary uppercase tracking-widest whitespace-nowrap">JanIA Console</span>
      </div>
    </motion.button>
  );
}
