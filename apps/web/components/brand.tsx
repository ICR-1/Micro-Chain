import { Network } from "lucide-react";
import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="RantaiTangguh, beranda">
      <span className="brand-mark"><Network size={21} strokeWidth={1.8} aria-hidden="true" /></span>
      <span>Rantai<span className="brand-accent">Tangguh</span></span>
    </Link>
  );
}
