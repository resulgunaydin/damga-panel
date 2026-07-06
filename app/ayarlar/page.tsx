import {
  AI_MODELS,
  getAiProvider,
  providerConfigured,
} from "@/lib/ai";
import { AiSettings } from "@/components/settings/ai-settings";

export const dynamic = "force-dynamic";

export default async function AyarlarPage() {
  const provider = await getAiProvider();
  return (
    <AiSettings
      initial={{
        provider,
        anthropic: providerConfigured("anthropic"),
        gemini: providerConfigured("gemini"),
        models: AI_MODELS,
      }}
    />
  );
}
