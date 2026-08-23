import { STATUTS, type StatutVerification } from "@/lib/upk";

export function BadgeVerification({
  statut,
  avecAide = false,
}: {
  statut: StatutVerification;
  avecAide?: boolean;
}) {
  const info = STATUTS[statut] ?? STATUTS.a_verifier;
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
        <span aria-hidden>{info.puce}</span>
        {info.label}
      </span>
      {avecAide ? <span className="text-xs text-muted-foreground">{info.aide}</span> : null}
    </span>
  );
}
