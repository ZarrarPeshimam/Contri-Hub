import { motion } from "framer-motion";

/**
 * PageTransition
 *
 * Subtle, fast page-entry animation used when a route's page content
 * first mounts (e.g. navigating profile <-> highlights). Fades in and
 * settles up from a few pixels below — intentionally small and quick so
 * navigation still feels immediate, not "animated".
 *
 * This only needs an entry animation, not an exit one: React Router
 * unmounts the previous route's page and mounts the next one, so simply
 * animating in on mount is sufficient and keeps this component tiny.
 *
 * Reduced-motion is handled centrally via the <MotionConfig
 * reducedMotion="user"> wrapper in App.jsx, which makes framer-motion
 * skip this (and every other motion.* animation in the app) for users
 * with prefers-reduced-motion enabled — no per-component check needed
 * here.
 */
export default function PageTransition({ children, className }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}