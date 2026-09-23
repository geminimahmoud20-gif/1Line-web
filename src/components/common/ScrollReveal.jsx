import React, { useEffect, useRef, useState } from 'react';

/**
 * ScrollReveal — Editorial fade-in animation component (§38-39, §61)
 *
 * Wraps children and reveals them as they enter the viewport with a
 * subtle opacity + translateY animation. Respects prefers-reduced-motion.
 *
 * Props:
 *   - delay?: number    (stagger delay in ms, e.g. 100, 200)
 *   - direction?: 'up' | 'down' | 'none'
 *   - distance?: number  (px, default 20)
 *   - duration?: number  (ms, default 500)
 *   - className?: string (extra classes for the wrapper)
 *   - threshold?: number (IntersectionObserver threshold, default 0.1)
 *   - once?: boolean    (reveal only once, default true)
 */
const ScrollReveal = ({
  children,
  delay = 0,
  direction = 'up',
  distance = 20,
  duration = 500,
  className = '',
  threshold = 0.1,
  once = true,
  ...rest
}) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  // Calculate transform based on direction
  let transformStr = 'none';
  if (direction === 'up') transformStr = `translateY(${distance}px)`;
  if (direction === 'down') transformStr = `translateY(-${distance}px)`;

  useEffect(() => {
    // Respect prefers-reduced-motion — if user disabled motion, show immediately
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    // If IntersectionObserver isn't supported, just show immediately
    if (!window.IntersectionObserver) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Stagger based on delay
            if (delay > 0) {
              setTimeout(() => setVisible(true), delay);
            } else {
              setVisible(true);
            }
            if (once) observer.unobserve(node);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [delay, direction, distance, once, threshold]);

  const style = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : transformStr,
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
    transitionDelay: delay > 0 ? `${delay}ms` : '0ms',
  };

  return (
    <div
      ref={ref}
      style={style}
      className={`scroll-reveal ${visible ? 'visible' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default ScrollReveal;
