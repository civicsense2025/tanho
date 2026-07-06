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
import { developerPack } from "./developer";
import { authorPack } from "./author";
import { politicianPack } from "./politician";
import { journalistPack } from "./journalist";
import { painterPack } from "./painter";

export const SAMPLE_PACKS: Record<string, SamplePack> = {
  tech: techPack,
  artist: artistPack,
  services: servicesPack,
  nonprofit: nonprofitPack,
  // Design-system personas
  developer: developerPack,
  author: authorPack,
  politician: politicianPack,
  journalist: journalistPack,
  painter: painterPack,
};

export const SAMPLE_KEYS = Object.keys(SAMPLE_PACKS);
