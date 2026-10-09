/**
 * FOOTER INSTITUCIONAL OFICIAL — VECY BIENES RAÍCES (GOLD EDITION)
 * 
 * Componente unificado para todas las páginas y subpáginas del portal.
 * Diseño minimalista de alta gama:
 * - Logo dorado con resplandor sutil
 * - Marca corporativa y slogan oficial
 * - Iconos miniatura de todas las redes sociales oficiales + GitHub
 * - Enlaces legales discretos y elegantes (Términos / Privacidad)
 * - Copyright institucional con tracking expandido
 */

import React from 'react';
import { useLocation } from 'wouter';
import { 
  FaWhatsapp, 
  FaInstagram, 
  FaFacebookF, 
  FaYoutube, 
  FaTiktok, 
  FaLinkedinIn, 
  FaXTwitter, 
  FaGithub 
} from 'react-icons/fa6';
import { VECY_SOCIAL_NETWORKS } from '@/../../shared/const';

interface FooterProps {
  /** Opción para personalizar el texto de los enlaces legales */
  legalVariant?: 'completo' | 'corto' | 'minimalista';
  className?: string;
}

export default function Footer({ legalVariant = 'completo', className = '' }: FooterProps) {
  const [, navigate] = useLocation();

  const socialLinks = [
    {
      name: 'WhatsApp Oficial',
      url: VECY_SOCIAL_NETWORKS.whatsappChannel,
      icon: FaWhatsapp,
      hoverColor: 'hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/10'
    },
    {
      name: 'Instagram',
      url: VECY_SOCIAL_NETWORKS.instagram,
      icon: FaInstagram,
      hoverColor: 'hover:text-pink-400 hover:border-pink-500/40 hover:bg-pink-500/10'
    },
    {
      name: 'Facebook',
      url: VECY_SOCIAL_NETWORKS.facebookFanPage,
      icon: FaFacebookF,
      hoverColor: 'hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/10'
    },
    {
      name: 'YouTube',
      url: VECY_SOCIAL_NETWORKS.youtube,
      icon: FaYoutube,
      hoverColor: 'hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10'
    },
    {
      name: 'TikTok',
      url: VECY_SOCIAL_NETWORKS.tikTok,
      icon: FaTiktok,
      hoverColor: 'hover:text-cyan-300 hover:border-cyan-400/40 hover:bg-cyan-500/10'
    },
    {
      name: 'LinkedIn',
      url: VECY_SOCIAL_NETWORKS.linkedIn,
      icon: FaLinkedinIn,
      hoverColor: 'hover:text-sky-400 hover:border-sky-500/40 hover:bg-sky-500/10'
    },
    {
      name: 'X (Twitter)',
      url: VECY_SOCIAL_NETWORKS.xTwitter,
      icon: FaXTwitter,
      hoverColor: 'hover:text-white hover:border-white/40 hover:bg-white/10'
    },
    {
      name: 'GitHub Repositorio',
      url: 'https://github.com/Vecy-Bienes-Raices/vecy-network',
      icon: FaGithub,
      hoverColor: 'hover:text-purple-400 hover:border-purple-500/40 hover:bg-purple-500/10'
    }
  ];

  return (
    <footer className={`bg-black/95 border-t border-white/10 py-14 relative z-10 ${className}`}>
      <div className="container max-w-4xl mx-auto px-4 text-center">
        
        {/* LOGO DORADO CENTRAL */}
        <div 
          onClick={() => navigate('/')}
          className="inline-block cursor-pointer group mb-4 transition-transform duration-300 hover:scale-105"
        >
          <img 
            src="/logo-vecy.png" 
            alt="VECY Bienes Raíces" 
            className="h-12 sm:h-14 mx-auto object-contain drop-shadow-[0_0_20px_rgba(191,149,63,0.35)] group-hover:drop-shadow-[0_0_25px_rgba(191,149,63,0.55)] transition-all duration-300" 
          />
        </div>

        {/* IDENTIDAD DE MARCA */}
        <h3 className="font-['Audiowide'] text-white tracking-[0.2em] text-base sm:text-lg uppercase leading-tight">
          VECY <span className="text-gradient-gold">BIENES RAÍCES</span>
        </h3>
        <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto mt-2 leading-relaxed">
          La evolución inevitable para el sector de los bienes raíces en Colombia.
        </p>

        {/* LOGOS MINIATURA DE REDES SOCIALES */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 my-7">
          {socialLinks.map((social) => {
            const Icon = social.icon;
            return (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                title={social.name}
                aria-label={social.name}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-gray-400 transition-all duration-300 hover:scale-110 shadow-sm ${social.hoverColor}`}
              >
                <Icon className="w-4 h-4" />
              </a>
            );
          })}
        </div>

        {/* LÍNEA DIVISORIA SUTIL */}
        <div className="w-24 sm:w-36 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent mx-auto my-6" />

        {/* ENLACES LEGALES (TÉRMINOS / PRIVACIDAD) */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs font-medium text-gray-400">
          <button
            onClick={() => navigate('/terminos-y-condiciones')}
            className="hover:text-primary transition-colors duration-200 tracking-wider flex items-center gap-1.5"
          >
            {legalVariant === 'minimalista' && 'Términos'}
            {legalVariant === 'corto' && 'Condiciones'}
            {legalVariant === 'completo' && 'Términos y Condiciones'}
          </button>

          <span className="text-white/20 select-none">•</span>

          <button
            onClick={() => navigate('/politica-privacidad')}
            className="hover:text-primary transition-colors duration-200 tracking-wider flex items-center gap-1.5"
          >
            {legalVariant === 'minimalista' && 'Privacidad'}
            {legalVariant === 'corto' && 'Política'}
            {legalVariant === 'completo' && 'Política de Privacidad'}
          </button>
        </div>

        {/* COPYRIGHT CON TRACKING EXPANDIDO */}
        <p className="text-[10px] sm:text-[11px] font-mono text-gray-600 uppercase tracking-[0.3em] sm:tracking-[0.4em] mt-7">
          © 2026 VECY Bienes Raíces — Todos los derechos reservados.
        </p>

      </div>
    </footer>
  );
}
