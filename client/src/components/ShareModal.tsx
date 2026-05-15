import { X, Copy, CheckCheck, Calendar } from 'lucide-react';
import { FaWhatsapp, FaFacebook, FaLinkedin } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Título que aparecerá en el modal */
  modalTitle?: string;
  /** URL ya construida (con query params si aplica) */
  url: string;
  /** Texto descriptivo del recurso que se comparte */
  text: string;
}

export default function ShareModal({ isOpen, onClose, modalTitle = "Compartir", url, text }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const shareOptions = [
    {
      label: 'WhatsApp',
      icon: <FaWhatsapp className="text-xl" />,
      href: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
      color: 'text-[#25D366]',
      bg: 'bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/20 hover:border-[#25D366]/50',
    },
    {
      label: 'Facebook',
      icon: <FaFacebook className="text-xl" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'text-[#1877F2]',
      bg: 'bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border-[#1877F2]/20 hover:border-[#1877F2]/50',
    },
    {
      label: 'X (Twitter)',
      icon: <FaXTwitter className="text-xl" />,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      color: 'text-white',
      bg: 'bg-white/10 hover:bg-white/20 border-white/10 hover:border-white/30',
    },
    {
      label: 'LinkedIn',
      icon: <FaLinkedin className="text-xl" />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'text-[#0A66C2]',
      bg: 'bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 border-[#0A66C2]/20 hover:border-[#0A66C2]/50',
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fade-in"
        style={{
          background: 'linear-gradient(135deg, rgba(18,18,18,0.98) 0%, rgba(10,10,10,0.98) 100%)',
          border: '1px solid rgba(212,175,55,0.25)',
          boxShadow: '0 0 40px rgba(191,149,63,0.15), inset 0 0 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-soft-gold transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pr-6">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-accent" />
          </div>
          <h3
            className="text-lg font-bold tracking-wider uppercase"
            style={{ color: '#d4af37' }}
          >
            {modalTitle}
          </h3>
        </div>

        {/* Enlace preview */}
        <div
          className="mb-5 px-3 py-2 rounded-lg text-xs break-all font-mono"
          style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.1)', color: 'rgba(240,240,240,0.5)' }}
        >
          {url}
        </div>

        {/* Opciones */}
        <div className="space-y-2">
          {shareOptions.map((opt) => (
            <a
              key={opt.label}
              href={opt.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 w-full py-3 px-4 rounded-xl font-semibold text-sm border transition-all duration-200 ${opt.color} ${opt.bg}`}
            >
              {opt.icon}
              {opt.label}
            </a>
          ))}

          {/* Copiar */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-3 w-full py-3 px-4 mt-1 rounded-xl font-bold text-sm border transition-all duration-200"
            style={copied
              ? { background: 'rgba(191,149,63,0.2)', borderColor: 'rgba(191,149,63,0.6)', color: '#d4af37' }
              : { background: 'rgba(191,149,63,0.07)', borderColor: 'rgba(191,149,63,0.25)', color: '#d4af37' }
            }
          >
            {copied ? <CheckCheck className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? '¡Enlace copiado!' : 'Copiar Enlace'}
          </button>
        </div>
      </div>
    </div>
  );
}
