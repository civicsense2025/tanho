export interface ListQuery<T> {
  where?: Partial<{ [K in keyof T]: T[K] | { in: T[K][] } }>;
  orderBy?: { field: keyof T; direction: "asc" | "desc" }[];
  limit?: number;
  offset?: number;
}

export interface Repository<T extends { id: string }> {
  list(query?: ListQuery<T>): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T>;
  update(id: string, data: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>): Promise<T>;
  delete(id: string): Promise<void>;
}

export type ProjectStatus = "draft" | "published";

export interface Project {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  coverImage: string | null;
  logoUrl: string | null;
  tags: string;
  githubUrl: string | null;
  liveUrl: string | null;
  year: number | null;
  status: ProjectStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectBlock {
  id: string;
  projectId: string;
  type: "text" | "image" | "video" | "metric" | "gallery";
  content: string;
  sortOrder: number;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  current: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Award {
  id: string;
  title: string;
  organization: string | null;
  description: string | null;
  date: string | null;
  url: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string | null;
  span: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbAdapter {
  projects: Repository<Project>;
  experience: Repository<Experience>;
  skills: Repository<Skill>;
  awards: Repository<Award>;
  education: Repository<Education>;
  /** Project blocks are keyed off projectId but have no independent sort-stable list-replace semantics in the generic Repository shape, so they get one bespoke method here rather than forcing a relational concept into the storage-agnostic interface. */
  getProjectBlocks(projectId: string): Promise<ProjectBlock[]>;
  replaceProjectBlocks(projectId: string, blocks: Omit<ProjectBlock, "id" | "projectId">[]): Promise<void>;
  migrate(): Promise<void>;
}
