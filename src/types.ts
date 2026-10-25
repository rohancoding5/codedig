export type SourceFile = {
  path: string;
  content: string;
};

export type DeclarationKind = "function" | "class" | "const";

export type Declaration = {
  name: string;
  kind: DeclarationKind;
  file: string;
  line: number;
  hasDocumentation: boolean;
  snippet: string;
};

export type Find = {
  name: string;
  kind: DeclarationKind;
  file: string;
  line: number;
  lastModifiedDaysAgo: number | null;
  lastModifiedCommit: string | null;
  referenceCount: number;
  hasDocumentation: boolean;
  dependents: string[];
  obsoleteScore: number;
  snippet: string;
};

export type ArchaeologicalReport = {
  possibleHistoricalPurpose: string;
  recommendation: "ARCHIVE" | "KEEP";
  reasoning: string;
};
