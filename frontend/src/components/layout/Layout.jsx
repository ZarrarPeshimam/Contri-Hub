import Navbar from "./Navbar";

/**
 * Layout (AppShell)
 *
 * Wraps every page that should share the global application shell with:
 *   - Persistent Navbar at top
 *   - Main content area beneath
 *
 * Guest pages (Login, Signup) render outside this shell.
 *
 * Navbar renders for both authenticated and unauthenticated visitors so
 * that pages like public profiles keep the same global header/layout
 * structure regardless of auth state. Navbar itself is responsible for
 * showing/hiding auth-dependent controls (settings, avatar menu, etc).
 *
 * Note: the floating "Meet the developer" CTA is NOT mounted here. It's
 * mounted once at the App root instead, since it also needs to appear on
 * Login/Signup, which render outside this shell entirely — see App.jsx.
 */
export default function Layout({ children }) {
  return (
    <div className="min-h-screen w-full bg-gray-950 text-white">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}