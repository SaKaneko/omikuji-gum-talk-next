import { ThemeType, ThemeStatus } from "@prisma/client";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface ThemeFormData {
  subject: string;
  content: string;
  type: ThemeType;
  expectedDuration: number;
}

export interface DrawFilters {
  type?: ThemeType;
  minDuration?: number;
  maxDuration?: number;
}

export interface ThemeWithAuthor {
  id: string;
  subject: string;
  content: string;
  type: ThemeType;
  expectedDuration: number;
  actualDuration: number | null;
  status: ThemeStatus;
  presentedAt: Date | null;
  createdAt: Date;
  authorId: string;
  author: {
    id: string;
    name: string;
    displayName: string;
    timeBiasCoefficient: number;
    deletedAt: Date | null;
  };
  _count?: {
    comments: number;
  };
}

export interface ActiveTheme {
  id: string;
  subject: string;
  content: string;
  type: ThemeType;
  expectedDuration: number;
  author: {
    displayName: string;
    deletedAt: Date | null;
  };
}

export interface CommentWithAuthor {
  id: string;
  content: string;
  themeId: string;
  authorId: string | null;
  author: {
    displayName: string;
  } | null;
  createdAt: Date;
}

export interface PaginatedThemes {
  themes: ThemeWithAuthor[];
  totalCount: number;
  page: number;
  perPage: number;
  totalPages: number;
}
