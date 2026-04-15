import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface PropertyGalleryProps {
  images: string[];
  propertyName: string;
}

export default function PropertyGallery({ images, propertyName }: PropertyGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeThumbnail = container.children[selectedIndex] as HTMLElement;
      if (activeThumbnail) {
        const scrollLeft = activeThumbnail.offsetLeft - container.offsetWidth / 2 + activeThumbnail.offsetWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const scrollThumbnails = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <>
      {/* Galería Principal */}
      <div className="space-y-4">
        {/* Imagen Principal */}
        <div className="relative w-full h-96 md:h-[500px] rounded-2xl overflow-hidden group cursor-pointer card-float"
          onClick={() => setIsFullscreen(true)}>
          <img
            src={images[selectedIndex]}
            alt={`${propertyName} - Vista ${selectedIndex + 1}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Overlay con controles */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-between p-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              className="bg-black/50 hover:bg-accent hover:text-black transition-all duration-300 rounded-full p-2 glow-gold"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="bg-black/50 hover:bg-accent hover:text-black transition-all duration-300 rounded-full p-2 glow-gold"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Indicador de imagen */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full text-white text-sm font-semibold">
            {selectedIndex + 1} / {images.length}
          </div>
        </div>

        {/* Miniaturas Carousel */}
        <div className="relative flex items-center gap-2">
          {/* Botón Prev Miniaturas */}
          <button 
            onClick={() => scrollThumbnails('left')}
            className="shrink-0 bg-[#1a1410]/80 hover:bg-accent hover:text-black transition-colors rounded-full p-2 border border-accent/20 glow-gold-sm z-10 hidden sm:block"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Contenedor Scrollable */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 flex gap-3 overflow-x-auto snap-x snap-mandatory py-2 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {images.map((image, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`relative shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-xl overflow-hidden transition-all duration-300 snap-center ${
                  idx === selectedIndex
                    ? 'ring-2 ring-accent glow-gold scale-105'
                    : 'opacity-60 hover:opacity-100 hover:scale-105'
                }`}
              >
                <img
                  src={image}
                  alt={`Miniatura ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Botón Next Miniaturas */}
          <button 
            onClick={() => scrollThumbnails('right')}
            className="shrink-0 bg-[#1a1410]/80 hover:bg-accent hover:text-black transition-colors rounded-full p-2 border border-accent/20 glow-gold-sm z-10 hidden sm:block"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modal Fullscreen */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 bg-accent text-black p-2 rounded-full hover:scale-110 transition-transform duration-300 glow-gold"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative w-full h-full flex items-center justify-center max-w-6xl">
            <img
              src={images[selectedIndex]}
              alt={`${propertyName} - Vista ${selectedIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />

            {/* Controles Fullscreen */}
            <button
              onClick={handlePrevious}
              className="absolute left-4 bg-accent text-black p-3 rounded-full hover:scale-110 transition-transform duration-300 glow-gold"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 bg-accent text-black p-3 rounded-full hover:scale-110 transition-transform duration-300 glow-gold"
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            {/* Indicador Fullscreen */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-6 py-3 rounded-full text-white text-sm font-semibold">
              {selectedIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
