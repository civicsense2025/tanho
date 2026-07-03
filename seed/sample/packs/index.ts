/**
 * Registry of industry sample packs. Each is a FICTIONAL, brand-neutral demo
 * site that fully populates the platform for exploration. Add a pack here to
 * expose it on the CLI (`npm run seed:sample -- <key>`).
 */
import type { SamplePack } from "../lib/types";
import { techPack } from "./tech";
import { artistPack } from "./artist";
import { servicesPack } from "./services";
import { nonprofitPack } from "./nonprofit";

export const SAMPLE_PACKS: Record<string, SamplePack> = {
  tech: techPack,
  artist: artistPack,
  services: servicesPack,
  nonprofit: nonprofitPack,
};

export const SAMPLE_KEYS = Object.keys(SAMPLE_PACKS);
