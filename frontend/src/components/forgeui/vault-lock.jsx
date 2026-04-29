import React from 'react';
import { ShieldCheck } from 'lucide-react';

const VaultLock = ({
  cardTitle = 'Vault Access',
  cardDescription = 'Smooth and secure login experience, backed by encrypted access and seamless visual transitions',
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/70 p-6 shadow-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.22),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(34,211,238,0.18),transparent_42%)]" />
      <div className="relative flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-500/15">
          <ShieldCheck className="h-7 w-7 text-cyan-300" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-white">{cardTitle}</h3>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-cyan-100/80">{cardDescription}</p>
      </div>
    </div>
  );
};

export default VaultLock;
