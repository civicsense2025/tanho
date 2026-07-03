import { rich, type Block } from "./demo-blocks";

/** Shared helpers for the platform-evaluation and stack-deploy guide seeds. */

export type GuideSeed = {
  slug: string;
  title: string;
  data: Record<string, unknown>;
  blocks: Block[];
};

export const sources = (items: string[]): Block =>
  rich(`<h2>Sources</h2><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`);

export const link = (url: string, label: string): string =>
  `<a href='${url}' target='_blank' rel='noopener noreferrer'>${label}</a>`;
