import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';

// Wrap a CRM screen once. LazyMotion keeps only the DOM animation features in the bundle (use `m.*`,
// not `motion.*`), and reducedMotion="user" honours the device's "reduce motion" setting.
export default function MotionRoot({ children }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
