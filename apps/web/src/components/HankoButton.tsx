/** HankoButton — CTA stempel merah, satu-satunya di tiap layar (Doc 12 §2.2). */
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface HankoButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: "lg" | "md";
}

export function HankoButton({ children, size = "md", className = "", ...rest }: HankoButtonProps) {
  return (
    <button type="button" className={`hanko hanko--${size} ${className}`} {...rest}>
      <span className="hanko__cap" aria-hidden="true" />
      {children}
    </button>
  );
}
