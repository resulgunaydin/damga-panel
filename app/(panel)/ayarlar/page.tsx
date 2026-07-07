import Link from "next/link";
import {
  AI_MODELS,
  getAiProvider,
  getStoredKeys,
  providerConfigured,
} from "@/lib/ai";
import { AiSettings } from "@/components/settings/ai-settings";

export const dynamic = "force-dynamic";

export default async function AyarlarPage() {
  const [provider, anthropic, gemini, keys] = await Promise.all([
    getAiProvider(),
    providerConfigured("anthropic"),
    providerConfigured("gemini"),
    getStoredKeys(),
  ]);
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <Link
        href="/ayarlar/sunum"
        className="hover:bg-accent mb-6 flex items-center justify-between rounded-lg border p-4"
      >
        <span>
          <span className="block font-medium">Sunum Markası &amp; Temalar</span>
          <span className="text-muted-foreground text-sm">Logo, iletişim ve tema seçimi</span>
        </span>
        <span aria-hidden>→</span>
      </Link>
      <AiSettings
        initial={{
          provider,
          anthropic,
          gemini,
          models: AI_MODELS,
          keys,
        }}
      />
    </div>
  );
}
