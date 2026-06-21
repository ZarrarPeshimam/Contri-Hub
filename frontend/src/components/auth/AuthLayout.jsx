import { Link } from "react-router-dom";
import { GitPullRequest, LayoutGrid, Share2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen w-full bg-gray-950 text-white flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-r border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/40 via-gray-950 to-gray-950" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-orange-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <Logo />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-md space-y-8"
          >
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-[2.75rem] font-bold leading-[1.1] tracking-tight text-white">
                Showcase your <span className="text-amber-400">open-source</span> journey.
              </h1>
              <p className="text-gray-400 text-base leading-relaxed">
                Turn scattered pull requests, issues, and repos into one structured,
                shareable portfolio - built for recruiters, mentors, and programs
                like HacktoberFest, GSOC, GSSOC, etc.
              </p>
            </div>

            <div className="space-y-3">
              <FeatureRow
                icon={GitPullRequest}
                label="Track contributions"
                desc="PRs, issues, and repos in one place"
              />
              <FeatureRow
                icon={LayoutGrid}
                label="Build your portfolio"
                desc="Organize work into custom collections"
              />
              <FeatureRow
                icon={Share2}
                label="Share your impact"
                desc="One link, fully shareable"
              />
            </div>
          </motion.div>

          <div />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-10">
        <div className="lg:hidden mb-8">
          <Logo compact />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <div className="rounded-2xl border border-amber-500/15 bg-amber-950/10 backdrop-blur-sm shadow-[0_0_40px_rgba(245,158,11,0.06)] p-7 sm:p-8">
            <div className="mb-6 space-y-1.5">
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
            </div>

            {children}
          </div>

          {footer && (
            <div className="mt-6 text-center text-sm text-gray-400">{footer}</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Logo({ compact }) {
  return (
    <Link to="/login" className="inline-flex items-center gap-2.5 w-fit">
      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-gray-950 font-bold text-base shadow-lg shadow-amber-500/20 select-none">
        C
      </span>
      <span
        className={`font-semibold text-white tracking-tight ${
          compact ? "text-base" : "text-lg"
        }`}
      >
        ContriHub
      </span>
    </Link>
  );
}

function FeatureRow({ icon: Icon, label, desc }) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-amber-500/15 bg-amber-950/20 px-4 py-3">
      <span className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-amber-400" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  );
}