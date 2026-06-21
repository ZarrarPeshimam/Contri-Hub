import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function AuthInput({
  id,
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  autoComplete,
  helperText,
  minLength,
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-300 block">
        {label}
        {!required && <span className="text-gray-600 font-normal"></span>}
      </label>

      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        )}

        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          minLength={minLength}
          className={`w-full rounded-lg bg-zinc-900 border border-amber-500/20 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/40 transition-colors ${
            Icon ? "pl-9" : "pl-3"
          } ${isPassword ? "pr-10" : "pr-3"}`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
    </div>
  );
}