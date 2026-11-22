import type { Locale, PlaceSummary, SearchInput, SearchResult } from "@upk/domain";

export type AppUser = {
  id: string;
  roles: string[];
  permissions: string[];
};

export type PlaceRepository = {
  search(input: SearchInput): Promise<SearchResult>;
  byId(id: string): Promise<PlaceSummary | null>;
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

export type Context = {
  user: AppUser | null;
  places: PlaceRepository;
  categories: CategoryRepository;
};
