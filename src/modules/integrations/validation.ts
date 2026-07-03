import { z } from "zod";

/**
 * Provider keys are a closed set so a typo can't create an orphan connection.
 * Add a key here when a new BYO integration lands.
 */
export const INTEGRATION_PROVIDERS = [
  "google-calendar",
  "google-analytics",
  "google-search-console",
  "ai",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

/** The three Google surfaces share one OAuth app but connect independently. */
export const GOOGLE_PROVIDERS = [
  "google-calendar",
  "google-analytics",
  "google-search-console",
] as const;

/** Shape of the sealed credential blob for an OAuth (Google) connection. */
export const oauthCredentialsSchema = z.object({
  kind: z.literal("oauth"),
  refreshToken: z.string().min(1),
  /** Cached access token + its expiry (ms); refreshed on demand. */
  accessToken: z.string().optional(),
  accessTokenExpiresAt: z.number().int().optional(),
  scope: z.string().default(""),
});

export type OAuthCredentials = z.infer<typeof oauthCredentialsSchema>;

/** Shape of the sealed credential blob for an API-key (AI) connection. */
export const apiKeyCredentialsSchema = z.object({
  kind: z.literal("api-key"),
  apiKey: z.string().min(1),
  /** For OpenAI-compatible custom providers. */
  baseUrl: z.string().url().optional(),
});

export type ApiKeyCredentials = z.infer<typeof apiKeyCredentialsSchema>;

export const integrationCredentialsSchema = z.discriminatedUnion("kind", [
  oauthCredentialsSchema,
  apiKeyCredentialsSchema,
]);

export type IntegrationCredentials = z.infer<typeof integrationCredentialsSchema>;
