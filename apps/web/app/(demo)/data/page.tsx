import type { Metadata } from "next";
import { DataEditor } from "@/features/data-editor/data-editor";

export const metadata: Metadata = { title: "Data Usaha" };
export default function DataPage() { return <DataEditor />; }
