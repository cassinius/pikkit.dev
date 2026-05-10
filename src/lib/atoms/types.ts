import type { AtomAppliesTo } from "../../../db/schema";

export type AtomSeverity = "critical" | "high" | "medium" | "low";

export type AtomDraft = {
  id: string;
  version: number;
  title: string;
  category: string;
  severity: AtomSeverity;
  triggers: string[];
  applies_to: AtomAppliesTo;
  checklist: string[];
  red_flag?: string;
  detect_cmd?: string;
  fix_pattern?: string;
  see_also: string[];
};
