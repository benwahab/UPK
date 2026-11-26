import type {
  ContributionData,
  Locale,
  PlacePhoto,
  PlaceSummary,
  ReportData,
  SearchInput,
  SearchResult,
} from "@upk/domain";

export type AppUser = {
  id: string;
  email?: string;
  roles: string[];
  permissions: string[];
};

export type PlaceRepository = {
  search(input: SearchInput): Promise<SearchResult>;
  byId(id: string): Promise<PlaceSummary | null>;
  listPublishedIds(): Promise<string[]>;
};

export type Category = {
  id: string;
  slug: string;
  nom: string;
  ordre: number;
};

export type CategoryRepository = {
  list(locale: Locale): Promise<Category[]>;
};

export type Photo = PlacePhoto;

export type ModerationPlace = {
  id: string;
  nom: string;
  categorieSlug: string;
  categorieNom: string;
  description: string | null;
  quartier: string | null;
  adresse: string | null;
  ville: string | null;
  latitude: number;
  longitude: number;
  telephone: string | null;
  whatsapp: string | null;
  siteWeb: string | null;
  horaires: string | null;
  contactEmail: string | null;
  gpsPrecisionM: number | null;
  statutPublication: string;
  createdAt: string;
  ownerId: string | null;
  photos: Photo[];
};

export type ReportRow = {
  id: string;
  placeId: string;
  placeNom: string;
  typeProbleme: string;
  description: string | null;
  email: string | null;
  statut: string;
  motif: string | null;
  createdAt: string;
  traiteLe: string | null;
};

export type ContributionRepository = {
  create(
    data: ContributionData,
    meta: { userId: string | null; contactEmail?: string; gpsPrecisionM?: number },
  ): Promise<{ id: string; submissionToken: string }>;
  addPhoto(placeId: string, key: string, alt: string | null): Promise<void>;
  verifySubmission(placeId: string, token: string): Promise<boolean>;
};

export type ReportRepository = {
  create(
    data: ReportData,
    meta: { userId: string | null; email?: string },
  ): Promise<{ id: string }>;
};

export type ModerationRepository = {
  listPending(): Promise<ModerationPlace[]>;
  findPending(id: string): Promise<ModerationPlace | null>;
  approve(id: string, actorId: string): Promise<void>;
  reject(id: string, actorId: string, motif: string): Promise<void>;
  listReports(): Promise<ReportRow[]>;
  resolveReport(
    id: string,
    statut: "traite" | "refuse",
    motif: string | null,
    actorId: string,
  ): Promise<void>;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export type RateLimitRepository = {
  consume(
    scope: string,
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult>;
};

export type AuditEntry = {
  actorId: string | null;
  actorRole: string | null;
  action: string;
  section: string;
  targetType?: string;
  targetId?: string;
  result?: string;
  before?: unknown;
  after?: unknown;
};

export type AuditRepository = {
  append(entry: AuditEntry): Promise<void>;
};

export type TurnstileVerifier = {
  verify(token: string | undefined, ip: string): Promise<boolean>;
};

export type ClientInfo = {
  ip: string;
  ipHash: string;
  userAgent: string | null;
};

export type Context = {
  user: AppUser | null;
  client: ClientInfo;
  places: PlaceRepository;
  categories: CategoryRepository;
  contributions: ContributionRepository;
  reports: ReportRepository;
  moderation: ModerationRepository;
  rateLimits: RateLimitRepository;
  audit: AuditRepository;
  turnstile: TurnstileVerifier;
};
