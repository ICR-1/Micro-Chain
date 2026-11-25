import type { Metadata } from "next";
import MicroChainWorkspace from "@/components/workspace/MicroChainWorkspace";

export const metadata: Metadata = { title: "Demo Dapur Sari" };

export default function DemoPage() {
  return <MicroChainWorkspace mode="demo" />;
}
