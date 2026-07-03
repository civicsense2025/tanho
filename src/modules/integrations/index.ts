/**
 * BYO integration connections — the deployment-local store of encrypted
 * external-account credentials (Google OAuth tokens, AI provider keys). See
 * docs/entities/integrations.md.
 */
export {
  isConnected,
  connectionSummary,
  getCredentials,
  saveConnection,
  updateCredentials,
  deleteConnection,
  type ConnectionSummary,
} from "./queries";
export { disconnectIntegration } from "./actions";
export {
  INTEGRATION_PROVIDERS,
  GOOGLE_PROVIDERS,
  type IntegrationProvider,
  type IntegrationCredentials,
  type OAuthCredentials,
  type ApiKeyCredentials,
} from "./validation";
