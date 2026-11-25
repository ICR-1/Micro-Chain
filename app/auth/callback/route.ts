import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadUserWorkspace } from "@/lib/supabase/workspace-repo";

/** Tujuan redirect selalu tetap (parameter `next` diabaikan) agar bebas open-redirect. */
export async function GET(request: NextRequest) {
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return fail("tautan");

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail("kedaluwarsa");
    await loadUserWorkspace(supabase); // menyiapkan salinan Dapur Sari bila pengguna baru
    return NextResponse.redirect(new URL("/workspace", request.url));
  } catch {
    return fail("server");
  }
}
