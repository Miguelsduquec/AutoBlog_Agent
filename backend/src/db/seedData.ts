import {
  ArticlePlan,
  AutomationRun,
  ContentOpportunity,
  Draft,
  ExportJob,
  SeoAuditRun,
  Website,
  WebsiteAnalysisRun,
  WebsitePage
} from "../types";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function getSeedData(): {
  websites: Website[];
  pages: WebsitePage[];
  analysisRuns: WebsiteAnalysisRun[];
  seoAudits: SeoAuditRun[];
  opportunities: ContentOpportunity[];
  articlePlans: ArticlePlan[];
  drafts: Draft[];
  automationRuns: AutomationRun[];
  exportJobs: ExportJob[];
} {
  const websites: Website[] = [
    {
      id: "site-polped",
      name: "Polped",
      domain: "https://polped.com",
      language: "Portuguese",
      targetCountry: "Portugal",
      niche: "Microsoft consulting for SMBs",
      tone: "Professional, trustworthy, Microsoft-focused",
      contentGoal: "Generate qualified leads from Microsoft and productivity search traffic",
      publishingFrequency: "Weekly",
      createdAt: daysAgo(20),
      updatedAt: hoursAgo(12)
    },
    {
      id: "site-finnova",
      name: "Finnova Ops",
      domain: "https://finnovaops.com",
      language: "English",
      targetCountry: "United States",
      niche: "Finance operations software",
      tone: "Clear, practical, data-driven",
      contentGoal: "Capture mid-funnel finance operations demand",
      publishingFrequency: "Twice per week",
      createdAt: daysAgo(16),
      updatedAt: hoursAgo(6)
    },
    {
      id: "site-greenforge",
      name: "Greenforge Landscapes",
      domain: "https://greenforge-landscapes.com",
      language: "English",
      targetCountry: "United Kingdom",
      niche: "Landscape design and outdoor renovation",
      tone: "Helpful, premium, approachable",
      contentGoal: "Drive local discovery and showcase expertise",
      publishingFrequency: "Bi-weekly",
      createdAt: daysAgo(12),
      updatedAt: hoursAgo(4)
    }
  ];

  const pages: WebsitePage[] = [
    {
      id: "page-polped-home",
      websiteId: "site-polped",
      url: "https://polped.com",
      title: "Polped | Microsoft Consulting for Business Productivity",
      metaDescription: "Helping SMBs implement Microsoft 365, Teams, and secure productivity workflows.",
      h1: "Microsoft consulting that helps teams work better",
      headingsJson: [
        "Microsoft 365 consulting",
        "Teams phone deployment",
        "SharePoint intranet delivery"
      ],
      contentExtract:
        "Polped helps businesses adopt Microsoft 365, improve collaboration, modernize workflows, and strengthen security.",
      pageType: "homepage",
      createdAt: daysAgo(18)
    },
    {
      id: "page-polped-services",
      websiteId: "site-polped",
      url: "https://polped.com/services",
      title: "Services | Microsoft 365, Teams and SharePoint",
      metaDescription: "Consulting, rollout, governance, and support for Microsoft productivity platforms.",
      h1: "Microsoft services for modern work",
      headingsJson: [
        "Microsoft 365 migration",
        "Teams governance",
        "SharePoint intranets"
      ],
      contentExtract:
        "Service pages focus on migrations, governance, security, and employee enablement through Microsoft tools.",
      pageType: "service",
      createdAt: daysAgo(17)
    },
    {
      id: "page-polped-about",
      websiteId: "site-polped",
      url: "https://polped.com/about",
      title: "About Polped",
      metaDescription: "Meet the consultants behind Polped's Microsoft advisory practice.",
      h1: "About Polped",
      headingsJson: ["Who we help", "How we deliver", "Why clients choose us"],
      contentExtract:
        "The team works with SMB leaders to align Microsoft adoption to operations, compliance, and collaboration goals.",
      pageType: "about",
      createdAt: daysAgo(16)
    },
    {
      id: "page-finnova-home",
      websiteId: "site-finnova",
      url: "https://finnovaops.com",
      title: "Finnova Ops | Finance Operations Automation Software",
      metaDescription: "Automate reconciliations, approvals, and reporting across modern finance teams.",
      h1: "Finance operations software for lean teams",
      headingsJson: ["Automated close", "Approval workflows", "Real-time finance dashboards"],
      contentExtract:
        "Finnova Ops helps finance teams reduce manual close work, centralize requests, and improve visibility.",
      pageType: "homepage",
      createdAt: daysAgo(15)
    },
    {
      id: "page-finnova-platform",
      websiteId: "site-finnova",
      url: "https://finnovaops.com/platform",
      title: "Platform | Workflow Automation for Accounting Teams",
      metaDescription: "",
      h1: "A finance operations layer for accounting teams",
      headingsJson: ["Close automation", "Approval routing", "Audit-friendly workflows"],
      contentExtract:
        "The platform streamlines close tasks, approval requests, reconciliations, and audit evidence collection.",
      pageType: "product",
      createdAt: daysAgo(14)
    },
    {
      id: "page-finnova-resources",
      websiteId: "site-finnova",
      url: "https://finnovaops.com/resources",
      title: "Resources",
      metaDescription: "Templates and guides for modern finance operations leaders.",
      h1: "Finance operations resources",
      headingsJson: ["Close checklist", "Controller metrics", "Approval policy examples"],
      contentExtract:
        "Resource hub includes guides, templates, and finance ops frameworks, but blog depth is still limited.",
      pageType: "resources",
      createdAt: daysAgo(13)
    },
    {
      id: "page-greenforge-home",
      websiteId: "site-greenforge",
      url: "https://greenforge-landscapes.com",
      title: "Greenforge Landscapes | Outdoor Design and Garden Renovation",
      metaDescription: "Premium outdoor spaces, patio renovations, and landscape design across the South East.",
      h1: "Outdoor spaces designed to be lived in",
      headingsJson: ["Landscape design", "Patios and paving", "Garden renovation"],
      contentExtract:
        "Greenforge creates outdoor living spaces with a focus on design, materials, planting, and long-term maintenance.",
      pageType: "homepage",
      createdAt: daysAgo(11)
    },
    {
      id: "page-greenforge-services",
      websiteId: "site-greenforge",
      url: "https://greenforge-landscapes.com/services",
      title: "Landscape Design Services and Patio Builds",
      metaDescription: "Design, build, and planting services for premium residential projects.",
      h1: "Landscape design and build services",
      headingsJson: ["Design consultation", "Hardscaping", "Planting plans"],
      contentExtract:
        "Services cover consultation, concept design, patio installation, planting, drainage, and finishing details.",
      pageType: "service",
      createdAt: daysAgo(10)
    },
    {
      id: "page-greenforge-projects",
      websiteId: "site-greenforge",
      url: "https://greenforge-landscapes.com/projects",
      title: "Projects",
      metaDescription: "",
      h1: "Selected garden transformations",
      headingsJson: ["Before and after", "Materials used", "Client outcomes"],
      contentExtract:
        "Project pages are visual and persuasive but lack informational support content that could attract early-stage search traffic.",
      pageType: "portfolio",
      createdAt: daysAgo(9)
    }
  ];

  const analysisRuns: WebsiteAnalysisRun[] = [
    {
      id: "analysis-polped-1",
      websiteId: "site-polped",
      nicheSummary:
        "Polped is positioned as a Microsoft consulting partner for SMB productivity, governance, and collaboration rollouts.",
      contentPillarsJson: ["Microsoft 365 adoption", "Teams governance", "SharePoint collaboration", "SMB productivity"],
      keywordsJson: ["microsoft", "teams", "sharepoint", "productivity"],
      extractedDataJson: {
        url: "https://polped.com",
        title: "Polped | Microsoft Consulting for Business Productivity",
        metaDescription: "Helping SMBs implement Microsoft 365, Teams, and secure productivity workflows.",
        h1: "Microsoft consulting that helps teams work better",
        h2Headings: ["Microsoft 365 consulting", "Teams phone deployment", "SharePoint intranet delivery"],
        mainTextContent:
          "Polped helps businesses adopt Microsoft 365, improve collaboration, modernize workflows, and strengthen security."
      },
      analyzedPageCount: 3,
      status: "analyzed",
      createdAt: daysAgo(8)
    },
    {
      id: "analysis-finnova-1",
      websiteId: "site-finnova",
      nicheSummary:
        "Finnova Ops targets finance leaders who need workflow automation for close, approvals, and audit readiness.",
      contentPillarsJson: ["Finance automation", "Month-end close", "Approvals", "Audit readiness"],
      keywordsJson: ["finance", "close", "approval", "automation"],
      extractedDataJson: {
        url: "https://finnovaops.com",
        title: "Finnova Ops | Finance Operations Automation Software",
        metaDescription: "Automate reconciliations, approvals, and reporting across modern finance teams.",
        h1: "Finance operations software for lean teams",
        h2Headings: ["Automated close", "Approval workflows", "Real-time finance dashboards"],
        mainTextContent:
          "Finnova Ops helps finance teams reduce manual close work, centralize requests, and improve visibility."
      },
      analyzedPageCount: 3,
      status: "analyzed",
      createdAt: daysAgo(6)
    },
    {
      id: "analysis-greenforge-1",
      websiteId: "site-greenforge",
      nicheSummary:
        "Greenforge focuses on premium residential landscape design with strong service intent and weak informational coverage.",
      contentPillarsJson: ["Landscape design", "Patio planning", "Outdoor renovation", "Garden inspiration"],
      keywordsJson: ["landscape", "garden", "patio", "renovation"],
      extractedDataJson: {
        url: "https://greenforge-landscapes.com",
        title: "Greenforge Landscapes | Outdoor Design and Garden Renovation",
        metaDescription: "Premium outdoor spaces, patio renovations, and landscape design across the South East.",
        h1: "Outdoor spaces designed to be lived in",
        h2Headings: ["Landscape design", "Patios and paving", "Garden renovation"],
        mainTextContent:
          "Greenforge creates outdoor living spaces with a focus on design, materials, planting, and long-term maintenance."
      },
      analyzedPageCount: 3,
      status: "analyzed",
      createdAt: daysAgo(5)
    }
  ];

  const seoAudits: SeoAuditRun[] = [
    {
      id: "audit-polped-1",
      websiteId: "site-polped",
      score: 84,
      findingsJson: [
        {
          id: "audit-polped-f1",
          category: "content coverage",
          severity: "medium",
          title: "Limited blog support for Microsoft buying journey",
          description: "Service coverage is strong, but educational support content is thin.",
          recommendation: "Publish how-to and comparison articles for SMB Microsoft decision makers."
        },
        {
          id: "audit-polped-f2",
          category: "internal linking",
          severity: "low",
          title: "Service pages could link into future educational content",
          description: "Current navigation has limited contextual links between services and supporting content.",
          recommendation: "Link product pages to category-level blog hubs once articles are live."
        }
      ],
      createdAt: daysAgo(7)
    },
    {
      id: "audit-finnova-1",
      websiteId: "site-finnova",
      score: 73,
      findingsJson: [
        {
          id: "audit-finnova-f1",
          category: "metadata",
          severity: "high",
          title: "Missing meta description on platform page",
          description: "The platform page is missing a meta description, reducing SERP clarity.",
          pageUrl: "https://finnovaops.com/platform",
          recommendation: "Add a benefit-led description targeting finance workflow automation."
        },
        {
          id: "audit-finnova-f2",
          category: "blog support",
          severity: "medium",
          title: "Resource center is not yet acting as a scalable blog engine",
          description: "Existing resources are useful but insufficient for systematic SEO expansion.",
          recommendation: "Create recurring informational content clusters around close and approvals."
        }
      ],
      createdAt: daysAgo(5)
    },
    {
      id: "audit-greenforge-1",
      websiteId: "site-greenforge",
      score: 68,
      findingsJson: [
        {
          id: "audit-greenforge-f1",
          category: "metadata",
          severity: "high",
          title: "Projects page is missing a meta description",
          description: "Portfolio pages are important entry points but one of the key pages lacks metadata.",
          pageUrl: "https://greenforge-landscapes.com/projects",
          recommendation: "Add a local-intent description focused on design and build outcomes."
        },
        {
          id: "audit-greenforge-f2",
          category: "content coverage",
          severity: "medium",
          title: "Informational content gap around planning and budgeting",
          description: "The website is persuasive for buyers who are already ready, but weak for early research queries.",
          recommendation: "Publish guides on costs, materials, planning, and design choices."
        }
      ],
      createdAt: daysAgo(4)
    }
  ];

  const opportunities: ContentOpportunity[] = [
    {
      id: "opp-polped-1",
      websiteId: "site-polped",
      keyword: "microsoft 365 migration checklist for small business",
      topic: "Microsoft 365 Migration Checklist for Small Businesses",
      cluster: "Microsoft 365 adoption",
      intent: "informational",
      relevanceScore: 93,
      estimatedDifficulty: "medium",
      priority: "high",
      source: "analysis-gap",
      status: "new",
      createdAt: daysAgo(6)
    },
    {
      id: "opp-polped-2",
      websiteId: "site-polped",
      keyword: "teams governance best practices",
      topic: "Teams Governance Best Practices",
      cluster: "Teams governance",
      intent: "commercial",
      relevanceScore: 90,
      estimatedDifficulty: "high",
      priority: "high",
      source: "pillar-expansion",
      status: "planned",
      createdAt: daysAgo(5)
    },
    {
      id: "opp-finnova-1",
      websiteId: "site-finnova",
      keyword: "month end close automation software",
      topic: "Month-End Close Automation Software",
      cluster: "Month-end close",
      intent: "commercial",
      relevanceScore: 94,
      estimatedDifficulty: "high",
      priority: "high",
      source: "product-led",
      status: "planned",
      createdAt: daysAgo(5)
    },
    {
      id: "opp-finnova-2",
      websiteId: "site-finnova",
      keyword: "approval workflow for finance teams",
      topic: "Approval Workflow for Finance Teams",
      cluster: "Approvals",
      intent: "informational",
      relevanceScore: 88,
      estimatedDifficulty: "medium",
      priority: "medium",
      source: "seo-audit",
      status: "new",
      createdAt: daysAgo(4)
    },
    {
      id: "opp-greenforge-1",
      websiteId: "site-greenforge",
      keyword: "garden renovation budget guide",
      topic: "Garden Renovation Budget Guide",
      cluster: "Outdoor renovation",
      intent: "informational",
      relevanceScore: 91,
      estimatedDifficulty: "low",
      priority: "high",
      source: "seo-audit",
      status: "planned",
      createdAt: daysAgo(3)
    },
    {
      id: "opp-greenforge-2",
      websiteId: "site-greenforge",
      keyword: "best patio materials for uk gardens",
      topic: "Best Patio Materials for UK Gardens",
      cluster: "Patio planning",
      intent: "commercial",
      relevanceScore: 89,
      estimatedDifficulty: "medium",
      priority: "medium",
      source: "analysis-gap",
      status: "new",
      createdAt: daysAgo(2)
    }
  ];

  const articlePlans: ArticlePlan[] = [
    {
      id: "plan-polped-1",
      websiteId: "site-polped",
      opportunityId: "opp-polped-2",
      title: "Teams Governance Best Practices for Growing Businesses",
      targetKeyword: "teams governance best practices",
      secondaryKeywordsJson: ["microsoft teams governance", "teams policy management", "teams rollout checklist"],
      searchIntent: "commercial",
      angle: "Help SMB leaders create policies before Teams sprawl slows collaboration.",
      cta: "Book a Microsoft governance workshop with Polped.",
      brief:
        "Explain why governance matters, what to standardize first, and how SMB teams can implement practical controls without slowing users down.",
      status: "planned",
      createdAt: daysAgo(4)
    },
    {
      id: "plan-finnova-1",
      websiteId: "site-finnova",
      opportunityId: "opp-finnova-1",
      title: "How Finance Teams Evaluate Month-End Close Automation Software",
      targetKeyword: "month end close automation software",
      secondaryKeywordsJson: ["close automation tools", "accounting close workflow", "controller automation"],
      searchIntent: "commercial",
      angle: "Frame the article as an evaluation guide that leads naturally into workflow software.",
      cta: "Request a Finnova Ops workflow walkthrough.",
      brief:
        "Cover pain points, evaluation criteria, common implementation mistakes, and how teams can identify quick wins for close automation.",
      status: "planned",
      createdAt: daysAgo(4)
    },
    {
      id: "plan-greenforge-1",
      websiteId: "site-greenforge",
      opportunityId: "opp-greenforge-1",
      title: "Garden Renovation Budget Guide: What UK Homeowners Should Plan For",
      targetKeyword: "garden renovation budget guide",
      secondaryKeywordsJson: ["garden renovation costs", "landscape design budget", "outdoor renovation planning"],
      searchIntent: "informational",
      angle: "Offer practical cost framing without sounding salesy, while reinforcing premium planning value.",
      cta: "Book a design consultation with Greenforge Landscapes.",
      brief:
        "Break down cost drivers, planning stages, material choices, and how homeowners can phase a project intelligently.",
      status: "planned",
      createdAt: daysAgo(2)
    }
  ];

  const drafts: Draft[] = [
    {
      id: "draft-polped-1",
      websiteId: "site-polped",
      articlePlanId: "plan-polped-1",
      outlineJson: [
        "Why Teams governance matters before collaboration scales",
        "The core policies every SMB should define first",
        "How to balance user freedom with compliance",
        "A practical rollout checklist for IT and operations"
      ],
      articleMarkdown:
        "# Teams Governance Best Practices for Growing Businesses\n\nGrowing companies often adopt Microsoft Teams quickly, but governance usually arrives later than it should. That creates inconsistent naming, unmanaged guests, and unclear ownership.\n\n## Why governance matters\n\nA lightweight governance model keeps collaboration usable as the company grows.\n\n## What to standardize first\n\nStart with workspace naming, guest access, retention expectations, and ownership rules.\n\n## A practical rollout approach\n\nPilot a baseline, measure adoption issues, and refine before broader rollout.",
      articleHtml:
        "<h1>Teams Governance Best Practices for Growing Businesses</h1><p>Growing companies often adopt Microsoft Teams quickly, but governance usually arrives later than it should. That creates inconsistent naming, unmanaged guests, and unclear ownership.</p><h2>Why governance matters</h2><p>A lightweight governance model keeps collaboration usable as the company grows.</p><h2>What to standardize first</h2><p>Start with workspace naming, guest access, retention expectations, and ownership rules.</p><h2>A practical rollout approach</h2><p>Pilot a baseline, measure adoption issues, and refine before broader rollout.</p>",
      slug: "teams-governance-best-practices-for-growing-businesses",
      metaTitle: "Teams Governance Best Practices for Growing Businesses",
      metaDescription: "A practical guide to Microsoft Teams governance policies for SMBs that want to scale collaboration without chaos.",
      faqJson: [
        {
          question: "What should a Teams governance policy include?",
          answer: "It should define naming, ownership, guest access, retention, and lifecycle rules."
        },
        {
          question: "Who should own Teams governance?",
          answer: "IT should partner with operations or compliance leaders so adoption and control stay aligned."
        }
      ],
      internalLinksJson: [
        {
          label: "Microsoft 365 consulting",
          url: "https://polped.com/services",
          reason: "Supports service discovery from governance readers."
        }
      ],
      readinessScore: 86,
      status: "review",
      createdAt: daysAgo(3)
    },
    {
      id: "draft-finnova-1",
      websiteId: "site-finnova",
      articlePlanId: "plan-finnova-1",
      outlineJson: [
        "Why finance teams are automating the close",
        "Evaluation criteria buyers should use",
        "Where close automation delivers ROI first",
        "Questions to ask before implementation"
      ],
      articleMarkdown:
        "# How Finance Teams Evaluate Month-End Close Automation Software\n\nFinance leaders are under pressure to close faster without losing control. That is why month-end close automation software is increasingly evaluated as an operations upgrade rather than a finance-only purchase.\n\n## Key evaluation criteria\n\nBuyers should compare workflow visibility, approval routing, system integrations, and audit readiness.\n\n## Where ROI appears first\n\nHigh-volume reconciliations, task ownership, and evidence collection often produce the clearest gains.",
      articleHtml:
        "<h1>How Finance Teams Evaluate Month-End Close Automation Software</h1><p>Finance leaders are under pressure to close faster without losing control. That is why month-end close automation software is increasingly evaluated as an operations upgrade rather than a finance-only purchase.</p><h2>Key evaluation criteria</h2><p>Buyers should compare workflow visibility, approval routing, system integrations, and audit readiness.</p><h2>Where ROI appears first</h2><p>High-volume reconciliations, task ownership, and evidence collection often produce the clearest gains.</p>",
      slug: "how-finance-teams-evaluate-month-end-close-automation-software",
      metaTitle: "How Finance Teams Evaluate Month-End Close Automation Software",
      metaDescription: "A practical buying guide for finance leaders evaluating month-end close automation software.",
      faqJson: [
        {
          question: "What processes benefit most from close automation?",
          answer: "Task management, approvals, reconciliations, and evidence collection are often the first wins."
        }
      ],
      internalLinksJson: [
        {
          label: "workflow automation platform",
          url: "https://finnovaops.com/platform",
          reason: "Turns category demand into product exploration."
        }
      ],
      readinessScore: 91,
      status: "ready",
      createdAt: daysAgo(2)
    }
  ];

  const automationRuns: AutomationRun[] = [
    {
      id: "run-polped-1",
      websiteId: "site-polped",
      runType: "full-pipeline",
      status: "completed",
      logsJson: [
        "Loaded website \"Polped\" for a full-pipeline automation run.",
        "Reused existing analysis from the website memory.",
        "Generated 2 new analysis-based opportunities and promoted 1 to a plan.",
        "Created a review draft for the selected Microsoft 365 topic."
      ],
      outputSummary: {
        analysisCreated: false,
        opportunitiesCreated: 2,
        plansCreated: 1,
        draftsCreated: 1,
        exportsCreated: 0,
        skippedItems: 1,
        errors: [],
        outputIds: {
          opportunityIds: ["opp-polped-1", "opp-polped-2"],
          planIds: ["plan-polped-1"],
          draftIds: ["draft-polped-1"],
          exportJobIds: []
        },
        message: "2 opportunities created, 1 plan created, 1 draft created, 1 item skipped"
      },
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2)
    },
    {
      id: "run-finnova-1",
      websiteId: "site-finnova",
      runType: "full-pipeline",
      status: "partial",
      logsJson: [
        "Loaded website \"Finnova Ops\" for a full-pipeline automation run.",
        "Reused existing finance operations analysis.",
        "Selected high-priority close automation opportunities for planning.",
        "Created 1 article plan but one downstream draft step failed."
      ],
      outputSummary: {
        analysisCreated: false,
        opportunitiesCreated: 1,
        plansCreated: 1,
        draftsCreated: 0,
        exportsCreated: 0,
        skippedItems: 1,
        errors: [
          "Draft generation failed for \"How Finance Teams Evaluate Month-End Close Automation Software\": Example downstream formatting error."
        ],
        outputIds: {
          opportunityIds: ["opp-finnova-1"],
          planIds: ["plan-finnova-1"],
          draftIds: [],
          exportJobIds: []
        },
        message: "1 opportunity created, 1 plan created, 1 item skipped"
      },
      createdAt: hoursAgo(5),
      updatedAt: hoursAgo(4)
    },
    {
      id: "run-greenforge-1",
      websiteId: "site-greenforge",
      runType: "opportunities-only",
      status: "completed",
      logsJson: [
        "Loaded website \"Greenforge Landscapes\" for an opportunities-only automation run.",
        "Website analysis completed with 3 analyzed pages.",
        "Generated informational and commercial topics around planning, costs, and patio design."
      ],
      outputSummary: {
        analysisCreated: true,
        opportunitiesCreated: 2,
        plansCreated: 0,
        draftsCreated: 0,
        exportsCreated: 0,
        skippedItems: 0,
        errors: [],
        outputIds: {
          opportunityIds: ["opp-greenforge-1", "opp-greenforge-2"],
          planIds: [],
          draftIds: [],
          exportJobIds: []
        },
        message: "analysis refreshed, 2 opportunities created"
      },
      createdAt: hoursAgo(20),
      updatedAt: hoursAgo(19)
    }
  ];

  const exportJobs: ExportJob[] = [
    {
      id: "export-finnova-1",
      websiteId: "site-finnova",
      draftId: "draft-finnova-1",
      exportPath: "backend/output/finnovaops/how-finance-teams-evaluate-month-end-close-automation-software",
      status: "exported",
      createdAt: daysAgo(1)
    }
  ];

  return {
    websites,
    pages,
    analysisRuns,
    seoAudits,
    opportunities,
    articlePlans,
    drafts,
    automationRuns,
    exportJobs
  };
}
