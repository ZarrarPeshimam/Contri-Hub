import Navbar from "./Navbar";
import { useAuth } from "../../hooks/useAuth";

/**
 * Layout (AppShell)
 *
 * Wraps every authenticated page with:
 *   - Persistent Navbar at top
 *   - Main content area beneath
 *
 * Guest pages (Login, Signup) render outside this shell.
 */
export default function Layout({ children }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen w-full bg-gray-950 text-white">
      {user && <Navbar />}
      <main>{children}</main>
    </div>
  );
}
