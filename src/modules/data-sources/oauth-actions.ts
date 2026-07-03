"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { db } from "@/lib/db/client";
import {
  listProjects as managementListProjects,
  listOrganizations as managementListOrganizations,
  createProject as managementCreateProject,
  generateDbPassword,
  type SupabaseOrganizationSummary,
  type SupabaseProjectSummary,
} from "@/adapters/supabase-oauth/management";
import { getAccessToken } from "@/adapters/supabase-oauth/oauth";
import { sealConnectionConfig } from "./crypto";
import { allowDataSourceMutation } from "./rate-limit";
import { dataSourceConnections } from "./schema";
import { supabaseConfigSchema, type SupabaseConfig } from "./validation";

/**
 * Server actions backing the post-OAuth-callback picker screen
 * (SupabaseProjectPicker.tsx): list the connected account's projects, create
 * a brand-new one (zero-credential-entry — we generate + capture the
 * password ourselves), or finish connecting an existing one (the owner
 * supplies just the DB password, which Supabase's Management API can never
 * return via any auth method). Owner-gated and audited like every other
 * data-sources action.
 */

export type ListOAuthProjectsState =
  | { ok: true; projects: SupabaseProjectSummary[] }
  | { ok: false; error: string };

/** List every Supabase project the OAuth connection's account/org can see. */
export async function listOAuthProjects(oauthConnectionId: string): Promise<ListOAuthProjectsState> {
  const user = await requireUser("owner");
  if (!(await allowDataSourceMutation(user.id))) {
    return { ok: false, error: "Too many attempts. Try again in a minute." };
  }

  const accessToken = await getAccessToken(oauthConnectionId);
  if (!accessToken) return { ok: false, error: "Supabase connection not found or expired. Reconnect." };

  try {
    const projects = await managementListProjects(accessToken);
    await writeAudit({
      userId: user.id,
      action: "data_source.oauth_list_projects",
      ownerType: "data_source_oauth",
      ownerId: oauthConnectionId,
    });
    return { ok: true, projects };
  } catch (err) {
    console.error("[data-sources] listOAuthProjects failed", err instanceof Error ? err.message : "unknown error");
    return { ok: false, error: "Could not list Supabase projects. Try reconnecting." };
  }
}

export type ListOAuthOrganizationsState =
  | { ok: true; organizations: SupabaseOrganizationSummary[] }
  | { ok: false; error: string };

/** List the organizations the OAuth connection's account can create projects under. */
export async function listOAuthOrganizations(oauthConnectionId: string): Promise<ListOAuthOrganizationsState> {
  const user = await requireUser("owner");
  if (!(await allowDataSourceMutation(user.id))) {
    return { ok: false, error: "Too many attempts. Try again in a minute." };
  }

  const accessToken = await getAccessToken(oauthConnectionId);
  if (!accessToken) return { ok: false, error: "Supabase connection not found or expired. Reconnect." };

  try {
    const organizations = await managementListOrganizations(accessToken);
    await writeAudit({
      userId: user.id,
      action: "data_source.oauth_list_organizations",
      ownerType: "data_source_oauth",
      ownerId: oauthConnectionId,
    });
    return { ok: true, organizations };
  } catch (err) {
    console.error("[data-sources] listOAuthOrganizations failed", err instanceof Error ? err.message : "unknown error");
    return { ok: false, error: "Could not list Supabase organizations. Try reconnecting." };
  }
}

export type CreateOAuthProjectInput = {
  oauthConnectionId: string;
  name: string;
  organizationId: string;
  region: string;
};

export type OAuthConnectionActionState =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * "Create a new database" — calls the Management API to create a fresh
 * Supabase project, generating the DB password ourselves (never Supabase),
 * and writes a fully-populated dataSourceConnections row pointing at it.
 */
const createOAuthProjectInputSchema = z.object({
  oauthConnectionId: z.string().min(1),
  name: z.string().min(1).max(120),
  organizationId: z.string().min(1),
  region: z.string().min(1).max(64),
});

export async function createOAuthProject(input: CreateOAuthProjectInput): Promise<OAuthConnectionActionState> {
  const user = await requireUser("owner");
  if (!(await allowDataSourceMutation(user.id))) {
    return { ok: false, error: "Too many attempts. Try again in a minute." };
  }

  const parsedInput = createOAuthProjectInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: parsedInput.error.issues[0]?.message ?? "Invalid project details" };
  }

  const accessToken = await getAccessToken(parsedInput.data.oauthConnectionId);
  if (!accessToken) return { ok: false, error: "Supabase connection not found or expired. Reconnect." };

  const dbPass = generateDbPassword();

  let project: SupabaseProjectSummary;
  try {
    project = await managementCreateProject(accessToken, {
      name: parsedInput.data.name,
      organizationId: parsedInput.data.organizationId,
      region: parsedInput.data.region,
      dbPass,
    });
  } catch (err) {
    console.error("[data-sources] createOAuthProject failed", err instanceof Error ? err.message : "unknown error");
    return { ok: false, error: "Could not create the Supabase project. Try again." };
  }

  const config: SupabaseConfig = {
    provider: "supabase",
    projectRef: project.id,
    databasePassword: dbPass,
    usePooler: true,
    region: project.region,
    database: "postgres",
  };

  const parsedConfig = supabaseConfigSchema.safeParse(config);
  if (!parsedConfig.success) {
    console.error("[data-sources] createOAuthProject config validation failed", parsedConfig.error.issues[0]?.message);
    return { ok: false, error: "Could not create the Supabase project. Try again." };
  }

  const [row] = await db
    .insert(dataSourceConnections)
    .values({
      name: parsedInput.data.name,
      provider: "supabase",
      configEncrypted: sealConnectionConfig(parsedConfig.data),
      allowlistJson: [],
      status: "unverified",
      oauthConnectionId: parsedInput.data.oauthConnectionId,
      createdBy: user.id,
    })
    .returning({ id: dataSourceConnections.id });

  updateTag("data-sources");
  await writeAudit({
    userId: user.id,
    action: "data_source.oauth_create_project",
    ownerType: "data_source",
    ownerId: row!.id,
  });
  return { ok: true, id: row!.id };
}

export type ConnectExistingOAuthProjectInput = {
  oauthConnectionId: string;
  name: string;
  projectRef: string;
  region: string;
  /**
   * The Postgres `postgres` role's own DB password — the ONE thing Supabase
   * can never hand back through any API, so the owner pastes it here.
   */
  databasePassword: string;
};

/**
 * "Connect an existing project" — everything except the DB password comes
 * from the Management API (already fetched via listOAuthProjects); the
 * owner supplies just the password, once.
 */
const connectExistingOAuthProjectInputSchema = z.object({
  oauthConnectionId: z.string().min(1),
  name: z.string().min(1).max(120),
  projectRef: z.string().min(1),
  region: z.string().min(1),
  databasePassword: z.string().min(1),
});

export async function connectExistingOAuthProject(
  input: ConnectExistingOAuthProjectInput,
): Promise<OAuthConnectionActionState> {
  const user = await requireUser("owner");
  if (!(await allowDataSourceMutation(user.id))) {
    return { ok: false, error: "Too many attempts. Try again in a minute." };
  }

  const parsedInput = connectExistingOAuthProjectInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: parsedInput.error.issues[0]?.message ?? "Invalid project details" };
  }

  const config: SupabaseConfig = {
    provider: "supabase",
    projectRef: parsedInput.data.projectRef,
    databasePassword: parsedInput.data.databasePassword,
    usePooler: true,
    region: parsedInput.data.region,
    database: "postgres",
  };

  const parsedConfig = supabaseConfigSchema.safeParse(config);
  if (!parsedConfig.success) {
    return { ok: false, error: parsedConfig.error.issues[0]?.message ?? "Invalid project details" };
  }

  const [row] = await db
    .insert(dataSourceConnections)
    .values({
      name: parsedInput.data.name,
      provider: "supabase",
      configEncrypted: sealConnectionConfig(parsedConfig.data),
      allowlistJson: [],
      status: "unverified",
      oauthConnectionId: parsedInput.data.oauthConnectionId,
      createdBy: user.id,
    })
    .returning({ id: dataSourceConnections.id });

  updateTag("data-sources");
  await writeAudit({
    userId: user.id,
    action: "data_source.oauth_connect_project",
    ownerType: "data_source",
    ownerId: row!.id,
  });
  return { ok: true, id: row!.id };
}
