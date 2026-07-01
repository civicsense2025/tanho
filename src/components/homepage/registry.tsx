import type { ComponentType } from "react";
import { ProfileHeaderBlock } from "./ProfileHeaderBlock";
import { ProjectListBlock } from "./ProjectListBlock";
import { ExperienceListBlock } from "./ExperienceListBlock";
import { SkillsListBlock } from "./SkillsListBlock";
import { AwardListBlock } from "./AwardListBlock";
import { EducationListBlock } from "./EducationListBlock";

export type HomepageBlockType = "profile-header" | "project-list" | "experience-list" | "skills-list" | "award-list" | "education-list";

export interface HomepageBlock {
  type: HomepageBlockType;
  props: Record<string, unknown>;
}

// Distinct from src/lib/blocks/{editors,renderers}.ts: these are "data-bound"
// blocks that query the DB themselves rather than carrying their own content
// inline in the page JSON, so they get their own small registry rather than
// being forced into the case-study BlockType union. Each component's real
// prop shape differs (ProfileHeaderBlock takes name/bio/avatarSrc, the list
// blocks take an optional heading); `unknown` here documents the one
// intentional widening point where per-block props meet this uniform map.
export const homepageBlockRenderers: Record<HomepageBlockType, ComponentType<Record<string, unknown>>> = {
  "profile-header": ProfileHeaderBlock as unknown as ComponentType<Record<string, unknown>>,
  "project-list": ProjectListBlock as unknown as ComponentType<Record<string, unknown>>,
  "experience-list": ExperienceListBlock as unknown as ComponentType<Record<string, unknown>>,
  "skills-list": SkillsListBlock as unknown as ComponentType<Record<string, unknown>>,
  "award-list": AwardListBlock as unknown as ComponentType<Record<string, unknown>>,
  "education-list": EducationListBlock as unknown as ComponentType<Record<string, unknown>>,
};
