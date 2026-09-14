import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { accesAdmin } from "@/lib/autorisations";
import { useAutorisations } from "@/lib/useAutorisations";

/**
 * Bouton « ESPACE ADMIN » visible uniquement pour les modérateurs,
 * administrateurs et super administrateurs connectés.
 */
export function BoutonEspaceAdmin() {
  const { autorisations, chargement } = useAutorisations();
  if (chargement || !accesAdmin(autorisations)) return null;

  return (
    <Link
      to="/admin"
      className="inline-flex items-center gap-1.5 rounded-full bg-admin-primary px-3 py-1.5 text-[11px] font-semibold tracking-wide text-admin-primary-foreground uppercase"
    >
      <ShieldCheck className="size-3.5" aria-hidden />
      Espace admin
    </Link>
  );
}
