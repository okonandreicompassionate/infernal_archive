export type CanonStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "CANON"
  | "NON_CANON"
  | "RETCONNED"
  | "DEPRECATED"
  | "ALTERNATE";

export interface Universe {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  timelineSystem: string;
  creationDate: string;
  canonStatus: CanonStatus;
  coverImage?: string;
}

export interface Planet {
  id: string;
  name: string;
  designation: string;
  universeId: string;
  starSystem: string;
  planetType: string;
  population: string;
  gravity: string;
  atmosphere: string;
  climate: string;
  diameter: string;
  moons: number;
  technologyLevel: string;
  politicalSystem: string;
  dominantSpecies: string;
  description: string;
  canonStatus: CanonStatus;
  image?: string;
}

export interface Location {
  id: string;
  name: string;
  planetId: string;
  type: string;
  parentLocation: string;
  description: string;
  coordinates: string;
  history: string;
  canonStatus: CanonStatus;
  image?: string;
}

export interface Character {
  id: string;
  name: string;
  codeName: string;
  aliases: string[];
  universeId: string;
  species: string;
  gender: string;
  age: number;
  birthDate: string;
  birthplace: string;
  currentLocation: string;
  occupation: string;
  height: string;
  build: string;
  hair: string;
  eyes: string;
  distinguishingFeatures: string;
  costume: string;
  personality: string;
  powers: string[];
  skills: string[];
  weaknesses: string[];
  equipment: string[];
  origin: string;
  biography: string;
  firstAppearance: string;
  currentStatus: string;
  canonStatus: CanonStatus;
  portrait?: string;
}

export interface Team {
  id: string;
  name: string;
  type: string;
  leader: string;
  headquarters: string;
  foundingDate: string;
  members: string[];
  formerMembers: string[];
  allies: string[];
  enemies: string[];
  goals: string;
  history: string;
  status: string;
  universeId: string;
  canonStatus: CanonStatus;
  logo?: string;
}

export interface Organization {
  id: string;
  name: string;
  type: string;
  leadership: string;
  headquarters: string;
  resources: string;
  goals: string;
  influence: string;
  status: string;
  canonStatus: CanonStatus;
}

export interface Species {
  id: string;
  name: string;
  category?: string;
  image?: string;
  caption?: string;
  status?: string;
  homePlanet: string;
  primaryLocations?: string;
  lifespan: string;
  biology: string;
  abilities: string;
  weaknesses: string;
  culture: string;
  language: string;
  population: string;
  government?: string;
  technologyLevel?: string;
  overview?: string;
  appearance?: string;
  physiology?: string;
  lifecycleReproduction?: string;
  diet?: string;
  innateAbilities?: string;
  learnedEnhanced?: string;
  limitationsWeaknesses?: string;
  customsValues?: string;
  governmentStructure?: string;
  technology?: string;
  notableFactions?: string;
  origins?: string;
  majorEvents?: string;
  currentStatus?: string;
  notableIndividuals?: string;
  trivia?: string;
  seeAlso?: string;
  notesReferences?: string;
  image?: string;
  canonStatus: CanonStatus;
}

export interface Power {
  id: string;
  name: string;
  category: string;
  description: string;
  knownUsers: string[];
  limitations: string;
  strengthRating: number;
  canonStatus: CanonStatus;
}

export interface Artifact {
  id: string;
  name: string;
  type: string;
  creator: string;
  currentOwner: string;
  origin: string;
  abilities: string;
  history: string;
  status: string;
  canonStatus: CanonStatus;
  image?: string;
}

export interface EventItem {
  id: string;
  name: string;
  date: string;
  location: string;
  characters: string[];
  teams: string[];
  consequences: string;
  category?: string;
  fullName?: string;
  alias?: string;
  type?: string;
  status?: string;
  era?: string;
  duration?: string;
  scale?: string;
  cause?: string;
  participants?: string;
  keyFigures?: string;
  factions?: string;
  outcome?: string;
  casualties?: string;
  overview?: string;
  longTermTensions?: string;
  immediateTriggers?: string;
  warningSigns?: string;
  prelude?: string;
  theEvent?: string;
  climax?: string;
  aftermath?: string;
  immediateResults?: string;
  longTermConsequences?: string;
  unresolvedThreads?: string;
  significance?: string;
  legacy?: string;
  trivia?: string;
  seeAlso?: string;
  notesReferences?: string;
  issues: string[];
  canonStatus: CanonStatus;
}

export interface Issue {
  id: string;
  issueNumber: number;
  title: string;
  storyArc: string;
  releaseStatus: string;
  publicationDate: string;
  synopsis: string;
  characters: string[];
  locations: string[];
  events: string[];
  writer: string;
  artist: string;
  colorist: string;
  letterer: string;
  editor: string;
  pages: number;
  canonStatus: CanonStatus;
  cover?: string;
  finalFileUrl?: string | null;
  finalFileName?: string | null;
  finalFileType?: "image" | "pdf" | "file" | null;
}

export interface StoryArc {
  id: string;
  title: string;
  issues: string[];
  mainCharacters: string[];
  majorEvents: string[];
  status: string;
  canonStatus: CanonStatus;
}

export interface Relationship {
  id: string;
  source: string;
  sourceName: string;
  target: string;
  targetName: string;
  type: string;
  startDate: string;
  endDate: string;
  description: string;
  canonStatus: CanonStatus;
}

export interface ScriptItem {
  id: string;
  issueId: string;
  pageNumber: number;
  panelNumber: number;
  setting: string;
  description: string;
  dialogue: { character: string; text: string }[];
  narration: string;
  sfx: string;
  artistNote: string;
  editorNote: string;
}

export interface Artwork {
  id: string;
  title: string;
  entityId: string;
  entityType: string;
  stage: string;
  url: string;
  artist: string;
  version: string;
  notes: string;
  issueId?: string;
  pageNumber?: number;
  panelNumber?: number;
  approvalStatus?: "SKETCH" | "REVIEW" | "REVISION" | "APPROVED";
  canonStatus: CanonStatus;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface CommentItem {
  id: string;
  targetId: string;
  targetType: string;
  author: string;
  text: string;
  timestamp: string;
  resolved: boolean;
}

export interface TaskItem {
  id: string;
  issueId: string;
  stage: string;
  assignee: string;
  deadline: string;
  status: string;
}

export interface Retcon {
  id: string;
  entityId: string;
  entityName: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  issue: string;
  approvedBy: string;
  date: string;
}

export interface ChatMessage {
  id: string;
  channel: "public" | "dm";
  senderId: string;
  senderName: string;
  recipientId: string | null;
  recipientName: string | null;
  text: string;
  attachmentUrl?: string | null;
  attachmentType?: "image" | "file" | null;
  attachmentName?: string | null;
  createdAt: string;
}

export interface ChatContact {
  id: string;
  displayName: string;
  email: string;
  role: "admin" | "god";
  active: boolean;
}

export interface ChatDmSummary {
  contactId: string;
  contactName: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderId: string;
  hasAttachment: boolean;
}
