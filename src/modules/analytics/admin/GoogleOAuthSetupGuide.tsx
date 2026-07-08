"use client";

import styles from "./analytics.module.css";

type GoogleService = "google-analytics" | "google-search-console";

interface GoogleOAuthSetupGuideProps {
  service: GoogleService;
  productionUrl?: string;
}

/**
 * Step-by-step guide for setting up Google OAuth credentials for Analytics or Search Console.
 * Shows the specific API to enable and scopes needed for each service.
 */
export function GoogleOAuthSetupGuide({ service, productionUrl }: GoogleOAuthSetupGuideProps) {
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const developmentUrl = currentOrigin;

  // Use production URL if set, otherwise use current origin
  const primaryUrl = productionUrl || developmentUrl;

  // Show both URLs if they differ
  const showBothUrls = productionUrl && productionUrl !== developmentUrl;

  const redirectUri = `${primaryUrl}/api/oauth/google/callback`;

  const serviceConfig = {
    "google-analytics": {
      title: "Google Analytics",
      apiName: "Google Analytics Data API v1",
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      searchQuery: "Google Analytics Data API",
    },
    "google-search-console": {
      title: "Google Search Console",
      apiName: "Google Search Console API",
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      searchQuery: "Google Search Console API",
    },
  }[service];

  return (
    <div className={styles.setupGuide}>
      <h3 className={styles.setupGuideTitle}>Setup Google OAuth for {serviceConfig.title}</h3>
      <ol className={styles.setupGuideSteps}>
        <li>
          <strong>Create a Google Cloud project</strong>
          <p>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">console.cloud.google.com</a> and create a new project or select an existing one.</p>
        </li>
        <li>
          <strong>Configure OAuth consent screen</strong>
          <p>Navigate to APIs & Services → OAuth consent screen. Choose &ldquo;External&rdquo; user type, fill in the required fields (app name, support email), and save.</p>
        </li>
        <li>
          <strong>Enable the {serviceConfig.title} API</strong>
          <p>Go to APIs & Services → Library. Search for &ldquo;{serviceConfig.searchQuery}&rdquo; and click Enable.</p>
        </li>
        <li>
          <strong>Create OAuth credentials</strong>
          <p>Go to APIs & Services → Credentials. Click &ldquo;Create Credentials&rdquo; → &ldquo;OAuth client ID&rdquo;. Choose &ldquo;Web application&rdquo;.</p>
        </li>
        <li>
          <strong>Add authorized redirect URI</strong>
          <p>Under &ldquo;Authorized redirect URIs&rdquo;, add:</p>
          {showBothUrls ? (
            <>
              <p className={styles.setupGuideNote}>
                <strong>Production:</strong>
              </p>
              <code className={styles.codeBlock}>{`${productionUrl}/api/oauth/google/callback`}</code>
              <p className={styles.setupGuideNote}>
                <strong>Development:</strong>
              </p>
              <code className={styles.codeBlock}>{`${developmentUrl}/api/oauth/google/callback`}</code>
              <p className={styles.setupGuideNote}>
                Add both URIs to support both environments.
              </p>
            </>
          ) : (
            <code className={styles.codeBlock}>{redirectUri}</code>
          )}
        </li>
        <li>
          <strong>Copy your credentials</strong>
          <p>After creating, copy the Client ID and Client Secret shown.</p>
        </li>
        <li>
          <strong>Set environment variables</strong>
          <p>Add these to your deployment environment:</p>
          <code className={styles.codeBlock}>
            GOOGLE_OAUTH_CLIENT_ID=your_client_id_here
          </code>
          <code className={styles.codeBlock}>
            GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here
          </code>
        </li>
        <li>
          <strong>Restart your deployment</strong>
          <p>After setting the environment variables, restart your deployment for the changes to take effect.</p>
        </li>
      </ol>
      <p className={styles.setupGuideBottomNote}>
        <strong>Note:</strong> The same OAuth credentials (Client ID and Secret) can be used for both Google Analytics and Google Search Console. You just need to enable both APIs in your Google Cloud project.
      </p>
    </div>
  );
}
