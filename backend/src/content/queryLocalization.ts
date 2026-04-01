import { OpportunityIntent } from "../types";
import { normalizeText } from "../utils/text";

export type QueryLanguage = "en" | "de" | "es" | "pt";

export type OpportunityQueryContext = {
  basePhrase: string;
  audience: string;
  comparison: string;
  region: string;
};

export type OpportunityQueryTemplate = {
  id: string;
  intent: OpportunityIntent;
  buildKeyword: (context: OpportunityQueryContext) => string;
  isEnabled?: (context: OpportunityQueryContext) => boolean;
};

const LANGUAGE_ALIASES: Record<string, QueryLanguage> = {
  en: "en",
  english: "en",
  inglês: "en",
  ingles: "en",
  de: "de",
  german: "de",
  deutsch: "de",
  alemão: "de",
  alemao: "de",
  es: "es",
  spanish: "es",
  espanol: "es",
  español: "es",
  espanhol: "es",
  pt: "pt",
  portuguese: "pt",
  portugues: "pt",
  português: "pt"
};

const STOP_WORDS_BY_LANGUAGE: Record<QueryLanguage, string[]> = {
  en: [
    "the",
    "and",
    "for",
    "with",
    "that",
    "from",
    "this",
    "your",
    "about",
    "into",
    "what",
    "when",
    "where",
    "have",
    "will",
    "best",
    "guide",
    "home",
    "page",
    "more",
    "latest"
  ],
  pt: [
    "para",
    "com",
    "como",
    "mais",
    "esta",
    "este",
    "isso",
    "sobre",
    "guia",
    "melhor",
    "blog",
    "pagina",
    "página",
    "ajuda",
    "ajudamos"
  ],
  es: [
    "para",
    "con",
    "como",
    "más",
    "mas",
    "esta",
    "este",
    "sobre",
    "guia",
    "guía",
    "mejor",
    "blog",
    "pagina",
    "página",
    "ayuda"
  ],
  de: [
    "und",
    "für",
    "mit",
    "wie",
    "mehr",
    "diese",
    "dieser",
    "uber",
    "über",
    "beste",
    "seite",
    "blog",
    "hilfe",
    "aktuell"
  ]
};

const QUESTION_PREFIXES: Record<QueryLanguage, RegExp[]> = {
  en: [/^what is\b/i, /^how to\b/i, /^how to improve\b/i, /^best\b/i, /^examples of\b/i, /^common mistakes in\b/i, /^why\b/i],
  pt: [/^o que e\b/i, /^como\b/i, /^melhores?\b/i, /^exemplos de\b/i, /^erros comuns em\b/i, /^porque\b/i],
  es: [/^que es\b/i, /^como\b/i, /^mejor(es)?\b/i, /^ejemplos de\b/i, /^errores comunes en\b/i, /^por que\b/i],
  de: [/^was ist\b/i, /^wie\b/i, /^beste\b/i, /^beispiele fur\b/i, /^beispiele für\b/i, /^haufige fehler bei\b/i, /^häufige fehler bei\b/i, /^warum\b/i]
};

function isPluralPhrase(basePhrase: string): boolean {
  const normalized = normalizeText(basePhrase);
  const tokens = normalized.split(" ").filter(Boolean);
  const lastToken = tokens[tokens.length - 1] ?? "";

  return normalized.includes(" and ") || (lastToken.endsWith("s") && !lastToken.endsWith("ss"));
}

function isDefinitionFriendly(basePhrase: string): boolean {
  const normalized = normalizeText(basePhrase);
  return !normalized.includes(" and ") && !/\b(outdoor|patio|paving|garden renovation)\b/.test(normalized);
}

function isProblemFriendly(basePhrase: string): boolean {
  const normalized = normalizeText(basePhrase);
  return /\b(automation|workflow|process|sop|system|systems|documentation|knowledge|bookkeeping|cash flow|approval|close|migration|governance)\b/.test(
    normalized
  );
}

function isLocalFriendly(basePhrase: string): boolean {
  const normalized = normalizeText(basePhrase);
  return /\b(service|services|consultant|consulting|bookkeeping|landscape design|garden renovation|patio design)\b/.test(normalized);
}

function isCommercialFriendly(basePhrase: string, audience: string): boolean {
  const normalizedPhrase = normalizeText(basePhrase);
  const normalizedAudience = normalizeText(audience);
  return (
    normalizedAudience !== "buyers" &&
    !normalizedPhrase.includes(normalizedAudience) &&
    !normalizedPhrase.includes(" for ") &&
    /\b(service|services|software|platform|automation|workflow|bookkeeping|landscape design|garden renovation|microsoft 365|migration|governance|approval)\b/.test(
      normalizedPhrase
    )
  );
}

function isComparisonFriendly(basePhrase: string): boolean {
  const normalized = normalizeText(basePhrase);
  return /\b(automation|workflow|software|platform|bookkeeping|landscape design|garden renovation|patio paving|microsoft 365|approval)\b/.test(
    normalized
  );
}

export function resolveQueryLanguage(language: string): QueryLanguage {
  return LANGUAGE_ALIASES[normalizeText(language)] ?? "en";
}

export function getLanguageStopWords(language: string | QueryLanguage): Set<string> {
  const resolved = resolveQueryLanguage(language);
  return new Set(STOP_WORDS_BY_LANGUAGE[resolved]);
}

function inferHowToVerb(basePhrase: string, language: QueryLanguage): string {
  const normalized = normalizeText(basePhrase);

  if (/\b(reporting|tax reporting)\b/.test(normalized)) {
    return {
      en: "set up",
      pt: "configurar",
      es: "configurar",
      de: "einrichten"
    }[language];
  }

  if (/\b(planning|management)\b/.test(normalized)) {
    return {
      en: "improve",
      pt: "melhorar",
      es: "mejorar",
      de: "verbessern"
    }[language];
  }

  if (/\b(cash flow|bookkeeping)\b/.test(normalized)) {
    return {
      en: "manage",
      pt: "gerir",
      es: "gestionar",
      de: "steuern"
    }[language];
  }

  if (/\b(microsoft|teams|sharepoint|software|platform|tool|power automate|power bi)\b/.test(normalized)) {
    return {
      en: "use",
      pt: "usar",
      es: "usar",
      de: "nutzen"
    }[language];
  }

  if (/\b(sop|standard operating procedure|knowledge|documentation|playbook|system|systems|workflow|automation|process)\b/.test(normalized)) {
    return {
      en: "build",
      pt: "criar",
      es: "crear",
      de: "aufbauen"
    }[language];
  }

  if (/\b(garden|landscape|renovation|patio|paving|outdoor)\b/.test(normalized)) {
    return {
      en: "plan",
      pt: "planear",
      es: "planificar",
      de: "planen"
    }[language];
  }

  return {
    en: "improve",
    pt: "melhorar",
    es: "mejorar",
    de: "verbessern"
  }[language];
}

function localizedRegionLabel(region: string, language: QueryLanguage): string {
  if (!region || normalizeText(region) === "global") {
    return "";
  }

  if (language === "pt") {
    return `em ${region}`;
  }
  if (language === "es") {
    return `en ${region}`;
  }
  if (language === "de") {
    return `in ${region}`;
  }

  return `in ${region}`;
}

export function getQueryIntentPrefixes(language: string | QueryLanguage): RegExp[] {
  return QUESTION_PREFIXES[resolveQueryLanguage(language)];
}

export function getLocalizedQueryTemplates(language: string): OpportunityQueryTemplate[] {
  const resolved = resolveQueryLanguage(language);

  if (resolved === "pt") {
    return [
      {
        id: "what-is",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `o que e ${basePhrase}`,
        isEnabled: ({ basePhrase }) => isDefinitionFriendly(basePhrase)
      },
      {
        id: "how-to",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `como ${inferHowToVerb(basePhrase, resolved)} ${basePhrase}`
      },
      {
        id: "how-to-improve",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `como melhorar ${basePhrase}`
      },
      {
        id: "best-for",
        intent: "commercial",
        buildKeyword: ({ basePhrase, audience }) => `melhor ${basePhrase} para ${audience}`,
        isEnabled: ({ basePhrase, audience }) => isCommercialFriendly(basePhrase, audience)
      },
      {
        id: "versus",
        intent: "comparison",
        buildKeyword: ({ basePhrase, comparison }) => `${basePhrase} vs ${comparison}`,
        isEnabled: ({ basePhrase }) => isComparisonFriendly(basePhrase)
      },
      {
        id: "examples",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `exemplos de ${basePhrase}`
      },
      {
        id: "mistakes",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `erros comuns em ${basePhrase}`
      },
      {
        id: "why-fails",
        intent: "commercial",
        buildKeyword: ({ basePhrase }) => `porque ${basePhrase} falha`,
        isEnabled: ({ basePhrase }) => isProblemFriendly(basePhrase)
      },
      {
        id: "local",
        intent: "local",
        buildKeyword: ({ basePhrase, region }) => `${basePhrase} ${localizedRegionLabel(region, resolved)}`.trim(),
        isEnabled: ({ basePhrase, region }) => Boolean(region) && normalizeText(region) !== "global" && isLocalFriendly(basePhrase)
      }
    ];
  }

  if (resolved === "es") {
    return [
      {
        id: "what-is",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `que es ${basePhrase}`,
        isEnabled: ({ basePhrase }) => isDefinitionFriendly(basePhrase)
      },
      {
        id: "how-to",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `como ${inferHowToVerb(basePhrase, resolved)} ${basePhrase}`
      },
      {
        id: "how-to-improve",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `como mejorar ${basePhrase}`
      },
      {
        id: "best-for",
        intent: "commercial",
        buildKeyword: ({ basePhrase, audience }) => `mejor ${basePhrase} para ${audience}`,
        isEnabled: ({ basePhrase, audience }) => isCommercialFriendly(basePhrase, audience)
      },
      {
        id: "versus",
        intent: "comparison",
        buildKeyword: ({ basePhrase, comparison }) => `${basePhrase} vs ${comparison}`,
        isEnabled: ({ basePhrase }) => isComparisonFriendly(basePhrase)
      },
      {
        id: "examples",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `ejemplos de ${basePhrase}`
      },
      {
        id: "mistakes",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `errores comunes en ${basePhrase}`
      },
      {
        id: "why-fails",
        intent: "commercial",
        buildKeyword: ({ basePhrase }) => `por que ${basePhrase} falla`,
        isEnabled: ({ basePhrase }) => isProblemFriendly(basePhrase)
      },
      {
        id: "local",
        intent: "local",
        buildKeyword: ({ basePhrase, region }) => `${basePhrase} ${localizedRegionLabel(region, resolved)}`.trim(),
        isEnabled: ({ basePhrase, region }) => Boolean(region) && normalizeText(region) !== "global" && isLocalFriendly(basePhrase)
      }
    ];
  }

  if (resolved === "de") {
    return [
      {
        id: "what-is",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `was ist ${basePhrase}`,
        isEnabled: ({ basePhrase }) => isDefinitionFriendly(basePhrase)
      },
      {
        id: "how-to",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `wie ${inferHowToVerb(basePhrase, resolved)} man ${basePhrase}`
      },
      {
        id: "how-to-improve",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `wie man ${basePhrase} verbessert`
      },
      {
        id: "best-for",
        intent: "commercial",
        buildKeyword: ({ basePhrase, audience }) => `beste ${basePhrase} fur ${audience}`,
        isEnabled: ({ basePhrase, audience }) => isCommercialFriendly(basePhrase, audience)
      },
      {
        id: "versus",
        intent: "comparison",
        buildKeyword: ({ basePhrase, comparison }) => `${basePhrase} vs ${comparison}`,
        isEnabled: ({ basePhrase }) => isComparisonFriendly(basePhrase)
      },
      {
        id: "examples",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `beispiele fur ${basePhrase}`
      },
      {
        id: "mistakes",
        intent: "informational",
        buildKeyword: ({ basePhrase }) => `haufige fehler bei ${basePhrase}`
      },
      {
        id: "why-fails",
        intent: "commercial",
        buildKeyword: ({ basePhrase }) => `warum ${basePhrase} scheitert`,
        isEnabled: ({ basePhrase }) => isProblemFriendly(basePhrase)
      },
      {
        id: "local",
        intent: "local",
        buildKeyword: ({ basePhrase, region }) => `${basePhrase} ${localizedRegionLabel(region, resolved)}`.trim(),
        isEnabled: ({ basePhrase, region }) => Boolean(region) && normalizeText(region) !== "global" && isLocalFriendly(basePhrase)
      }
    ];
  }

  return [
    {
      id: "what-is",
      intent: "informational",
      buildKeyword: ({ basePhrase }) => `${isPluralPhrase(basePhrase) ? "what are" : "what is"} ${basePhrase}`,
      isEnabled: ({ basePhrase }) => isDefinitionFriendly(basePhrase)
    },
    {
      id: "how-to",
      intent: "informational",
      buildKeyword: ({ basePhrase }) => `how to ${inferHowToVerb(basePhrase, resolved)} ${basePhrase}`
    },
    {
      id: "how-to-improve",
      intent: "informational",
      buildKeyword: ({ basePhrase }) => `how to improve ${basePhrase}`
    },
    {
      id: "best-for",
      intent: "commercial",
      buildKeyword: ({ basePhrase, audience }) => `best ${basePhrase} for ${audience}`,
      isEnabled: ({ basePhrase, audience }) => isCommercialFriendly(basePhrase, audience)
    },
    {
      id: "versus",
      intent: "comparison",
      buildKeyword: ({ basePhrase, comparison }) => `${basePhrase} vs ${comparison}`,
      isEnabled: ({ basePhrase }) => isComparisonFriendly(basePhrase)
    },
    {
      id: "examples",
      intent: "informational",
      buildKeyword: ({ basePhrase }) => `examples of ${basePhrase}`
    },
    {
      id: "mistakes",
      intent: "informational",
      buildKeyword: ({ basePhrase }) => `common mistakes in ${basePhrase}`
    },
    {
      id: "why-fails",
      intent: "commercial",
      buildKeyword: ({ basePhrase }) => `why ${basePhrase} ${isPluralPhrase(basePhrase) ? "fail" : "fails"}`,
      isEnabled: ({ basePhrase }) => isProblemFriendly(basePhrase)
    },
    {
      id: "local",
      intent: "local",
      buildKeyword: ({ basePhrase, region }) => `${basePhrase} ${localizedRegionLabel(region, resolved)}`.trim(),
      isEnabled: ({ basePhrase, region }) => Boolean(region) && normalizeText(region) !== "global" && isLocalFriendly(basePhrase)
    }
  ];
}
