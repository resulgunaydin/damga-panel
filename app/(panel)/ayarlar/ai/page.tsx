import {
  AI_MODELS,
  getAiProvider,
  getStoredKeys,
  providerConfigured,
} from "@/lib/ai";
import { AiSettings } from "@/components/settings/ai-settings";

export const dynamic = "force-dynamic";

export default async function AyarlarAiPage() {
  const [provider, anthropic, gemini, keys] = await Promise.all([
    getAiProvider(),
    providerConfigured("anthropic"),
    providerConfigured("gemini"),
    getStoredKeys(),
  ]);
  return (
    <AiSettings
      initial={{
        provider,
        anthropic,
        gemini,
        models: AI_MODELS,
        keys,
      }}
    />
  );
}
