export type LawyerProfile = {
  id: string;
  name: string;
  style: string;
  tagline: string;
  description: string;
  color: string;
  accent: string;
  emoji: string;
};

export const claimantLawyers: LawyerProfile[] = [
  {
    id: "marcus_stone",
    name: "Marcus Stone",
    style: "Ruthless Litigator",
    tagline: "No mercy. No compromise.",
    description: "Aggressive, direct, and relentless under pressure.",
    color: "from-red-600 to-red-800",
    accent: "red",
    emoji: "⚔️",
  },
  {
    id: "elena_voss",
    name: "Elena Voss",
    style: "Strategic and Assertive",
    tagline: "Every move calculated.",
    description: "Builds the case methodically and prioritizes leverage.",
    color: "from-violet-600 to-violet-800",
    accent: "violet",
    emoji: "♟️",
  },
  {
    id: "james_okafor",
    name: "James Okafor",
    style: "Fair but Firm",
    tagline: "Justice through reason.",
    description: "Balanced, rational, and strong on clear factual framing.",
    color: "from-blue-600 to-blue-800",
    accent: "blue",
    emoji: "⚖️",
  },
  {
    id: "priya_sharma",
    name: "Priya Sharma",
    style: "Empathetic Advocate",
    tagline: "Your story matters.",
    description: "Helps the user articulate the human impact and missing context.",
    color: "from-amber-500 to-amber-700",
    accent: "amber",
    emoji: "💛",
  },
  {
    id: "sofia_chen",
    name: "Sofia Chen",
    style: "Conciliatory Mediator",
    tagline: "Peace is the real victory.",
    description: "Optimizes for settlement paths and practical compromise.",
    color: "from-emerald-500 to-emerald-700",
    accent: "emerald",
    emoji: "🕊️",
  },
];

export const respondentLawyers: LawyerProfile[] = [
  { ...claimantLawyers[0], name: "Viktor Hale" },
  { ...claimantLawyers[1], name: "Nadia Kruger" },
  { ...claimantLawyers[2], name: "Daniel Moreau" },
  { ...claimantLawyers[3], name: "Amara Diallo" },
  { ...claimantLawyers[4], name: "Lena Petrov" },
];

export function getLawyersBySide(side: "claimant" | "respondent") {
  return side === "respondent" ? respondentLawyers : claimantLawyers;
}

export function getLawyerById(id: string | null | undefined, side: "claimant" | "respondent") {
  if (!id) {
    return null;
  }
  return getLawyersBySide(side).find((lawyer) => lawyer.id === id) || null;
}
