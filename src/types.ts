export type ConnectionStatus = "none" | "outgoing_pending" | "incoming_pending" | "accepted";

export interface ProfilePhoto {
  url: string;
  key: string;
}

export interface PersonMatch {
  id: string;
  name: string;
  avatarUrl: string | null;
  photoUrls: string[];
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
  status: "pending" | "accepted";
  createdAt: string;
  created: boolean;
}

export type ConnectionLifecycleStatus = "pending" | "accepted" | "declined";

export interface ConnectionPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  locationLabel: string | null;
  linkedinProfileUrl: string | null;
}

export interface ConnectionItem {
  id: string;
  direction: "incoming" | "outgoing";
  status: ConnectionLifecycleStatus;
  sourceQuery: string;
  createdAt: string;
  respondedAt: string | null;
  person: ConnectionPerson;
}

export interface ConnectionInboxResponse {
  incoming: ConnectionItem[];
  outgoing: ConnectionItem[];
}

export interface ConnectionDecisionResponse {
  id: string;
  status: "accepted" | "declined";
  respondedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export type ReportReason = "spam" | "harassment" | "misleading" | "unsafe" | "other";

export interface BreaProfile {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  photos: ProfilePhoto[];
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
  latitude: number | null;
  longitude: number | null;
  linkedinProfileUrl: string | null;
  onboardingCompleted: boolean;
  isDiscoverable: boolean;
  isAvailable: boolean;
}

export interface EventSummary {
  id: string;
  title: string;
  startsAt: string;
  placeLabel: string;
  capacity: number;
  tags: string[];
  hostName: string;
  attendeeCount: number;
  isAttending: boolean;
  isHost: boolean;
}

export interface EventCreateInput {
  title: string;
  startsAt: string;
  placeLabel: string;
  capacity: number;
  tags: string[];
}

export interface EventRsvpResponse {
  eventId: string;
  attendeeCount: number;
  isAttending: boolean;
}

export interface EventAttendee {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
}

export interface EventAttendeesResponse {
  eventId: string;
  attendees: EventAttendee[];
  hiddenCount: number;
}

export type SearchStatus = "idle" | "loading" | "results" | "empty" | "error";

export type ConnectionUiState =
  | { status: "none" }
  | { status: "submitting" }
  | { status: "pending"; created: boolean }
  | { status: "incoming" }
  | { status: "accepted" }
  | { status: "unavailable" }
  | { status: "error"; message: string };
