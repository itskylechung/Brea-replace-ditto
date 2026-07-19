export type ConnectionStatus = "none" | "pending";

export interface PersonMatch {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string;
  bio: string | null;
  distanceKm: number;
  skills: string[];
  interests: string[];
  availability: string | null;
  matchReason: string;
  connectionStatus: ConnectionStatus;
}

export interface PeopleSearchResponse {
  results: PersonMatch[];
}

export interface ConnectionResponse {
  id: string;
  recipientId: string;
  status: "pending";
  createdAt: string;
  created: boolean;
}

export interface BreaProfile {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  interests: string[];
  availability: string | null;
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  linkedinProfileUrl: string | null;
  onboardingCompleted: boolean;
  isDiscoverable: boolean;
  isAvailable: boolean;
}

export interface ProfileUpdateInput {
  name: string;
  headline: string;
  bio: string | null;
  skills: string[];
  interests: string[];
  availability: string | null;
  locationLabel: string | null;
  latitude: number;
  longitude: number;
  linkedinProfileUrl: string | null;
  onboardingCompleted: boolean;
  isDiscoverable: boolean;
  isAvailable: boolean;
}

export type SearchStatus = "idle" | "loading" | "results" | "empty" | "error";

export type ConnectionUiState =
  | { status: "none" }
  | { status: "submitting" }
  | { status: "pending"; created: boolean }
  | { status: "error"; message: string };
