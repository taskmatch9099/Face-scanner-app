import React, { useEffect, useRef } from 'react';

// Define the global VANTA object that will be available after the script loads
declare global {
  interface Window {
    VANTA: any;
  }
}

const VantaBackground = () => {
  const effectRef = useRef<any>(null);
  const vantaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadScript = (src: string) => {
      return new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        (script as any).defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Script load error for ${src}`));
        document.body.appendChild(script);
      });
    };

    const init = async () => {
      try {
        // Load scripts in order
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.cells.min.js');

        if (!isMounted || effectRef.current || !vantaRef.current || !window.VANTA) return;

        // Initialize Vanta effect with provided config
        effectRef.current = window.VANTA.CELLS({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          // Note: The provided colors were 0x63ff7 and 0xd0d0c (5-hex). Convert to nearest 6-hex.
          // Using 0x063FF7 (blue) and 0x0D0D0C (near-black) to respect intent.
          color1: 0x063FF7,
          color2: 0x0D0D0C,
          size: 4.3,
        });
      } catch (e) {
        console.error(e);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (effectRef.current) {
        try {
          effectRef.current.destroy();
        } catch {}
        effectRef.current = null;
      }
    };
  }, []);

  return (
    <div
      id="your-element-selector"
      ref={vantaRef}
      style={{
        position: 'fixed',
        inset: 0 as any,
        width: '100vw',
        height: '100vh',
        zIndex: -1, // Ensure it's behind all other content
        pointerEvents: 'none', // Never intercept clicks/touches
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    />
  );
};

export default VantaBackground;
