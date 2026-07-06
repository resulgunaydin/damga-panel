import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai";

// Aktif sağlayıcıyla küçük bir üretim yaparak anahtarın çalıştığını doğrular.
export async function POST() {
  try {
    const result = await generateText({
      system: "Sen kısa ve net yanıt veren bir asistansın.",
      prompt:
        "Tek cümlelik bir test: 'DamgaPanel AI bağlantısı çalışıyor.' cümlesini aynen yaz.",
      tier: "simple",
      maxTokens: 100,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI çağrısı başarısız." },
      { status: 500 },
    );
  }
}
