import type { Metadata } from "next";
import MicroChainWorkspace from "@/components/workspace/MicroChainWorkspace";

export const metadata: Metadata = { title: "Workspace" };

export default function WorkspacePage() {
  return <MicroChainWorkspace mode="workspace" />;
}
