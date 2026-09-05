import { CourseProgram, FacultyMember, ResearchPaper } from '../types';

export const COURSES: CourseProgram[] = [
  {
    id: 'ai-survival',
    title: 'AI Survival & Mastery',
    subtitle: 'Say No to being replaced by AI — Intensive Workshop',
    description: 'A transformative 1-week, 3-day intensive workshop designed to eliminate busywork, master the 4-part prompt formula, and deliver immediate workplace superpowers.',
    badge: 'Fundamentals',
    duration: '1 Week (3 Days)',
    schedule: '3 Days • 2-3 Hours/Day (6-9 Hours Total)',
    durationCategory: 'short',
    level: 'beginner',
    icon: 'psychology',
    skills: ['The 4-Part Prompt Formula', 'Busywork Elimination & PDF Parsing', 'Everyday AI Automation', 'Career Irreplaceability'],
    investment: 'Rs. 7,500',
    priceNum: 7500,
    syllabusModules: [
      {
        period: 'Day 1',
        title: 'The AI Paradigm Shift & Foundations',
        description: 'Opening your eyes to what AI actually is and mastering the core reasoning formula.',
        topics: [
          'The Harsh Truth: Real market shifts & "Say No to being replaced by AI"',
          'What is AI: Reasoning engine vs traditional search engine (Google)',
          'The Big Three: Comparative breakdown of ChatGPT, Gemini, and Claude',
          'The Art of Prompting: The Formula (Context + Task + Tone + Format)',
          'Live Demo: Bad Prompt vs. High-Precision Prompt transformation',
          'Action Milestone: Account creation & first executive email prompt'
        ]
      },
      {
        period: 'Day 2',
        title: 'Day-to-Day Work Optimization (The "Magic" Day)',
        description: 'Immediate time-saving tools to eliminate cognitive load and daily communication friction.',
        topics: [
          'The "Busywork" Problem: Solving email fatigue, PDF parsing, and reformatting',
          'Email & Communication Mastery: De-escalating tense client emails with high polish',
          'Data & Document Summarization: Uploading 20-page PDF reports to extract 5 key action items',
          'Brainstorming & Strategy: Using AI as a tireless co-founder and project manager',
          'Interactive Roleplay: Solving live audience job challenges on screen'
        ]
      },
      {
        period: 'Day 3',
        title: 'Automation & Becoming Irreplaceable',
        description: 'Connecting AI to real tools and building a permanent bridge to professional mastery.',
        topics: [
          'The Limits of AI: Where humans are irreplaceable (Empathy, accountability, deep context)',
          'Introduction to Automation: Connecting AI to Google Sheets, Excel & Zapier triggers',
          'The "AI-Enhanced" Professional: Positioning yourself as your company\'s AI Lead',
          'The Bridge to Mastery: Priority gateway into the 3-Month AI Master Flagship (25 Priority Seats)'
        ]
      }
    ]
  },
  {
    id: 'ai-bridge',
    title: 'Applied AI Practitioner & Workflow Builder',
    subtitle: '8-Week Accelerator: Precision Reasoning, NotebookLM Hubs & Custom Gems',
    description: 'Transform from single-prompt chatter into an applied AI system builder. Master RTCC prompt frameworks, private NotebookLM research hubs, multimodal asset generation, and no-code Custom Gems automation.',
    badge: 'Amateur',
    duration: '8 Weeks',
    schedule: '8 Weeks • 2 Days/Week • 2 Hours/Session (32 Hours Total Live Labs)',
    durationCategory: 'long',
    level: 'amateur',
    icon: 'hub',
    skills: [
      'Precision Prompting (RTCC & CoT)',
      'NotebookLM Research Hubs & Audio',
      'Multimodal Assets (Imagen 3 & Vids)',
      'Custom Gems & Digital Assistants',
      'Workspace AI Copilot Pipelines',
      'Personal AI Operating System Capstone'
    ],
    investment: 'Rs. 38,000',
    priceNum: 38000,
    syllabusModules: [
      {
        period: 'Weeks 1-2',
        title: 'Precision Reasoning & Structured Prompting',
        description: 'Moving beyond conversational chat: deterministic prompting, few-shot decomposition, and structured JSON/Markdown data extraction.',
        topics: [
          'Week 1: The RTCC Framework (Role + Task + Context + Constraint) & Chain-of-Thought (CoT) reasoning',
          'Week 1: Few-shot prompting for strict consistency & eliminating ambiguous outputs',
          'Week 2: Enforcing structured JSON, Markdown tables, and programmatic schema outputs',
          'Week 2: Automated extraction from messy PDFs, meeting transcripts, and unstructured emails'
        ]
      },
      {
        period: 'Weeks 3-4',
        title: 'Private Knowledge Hubs & Advanced Research (NotebookLM)',
        description: 'Ingesting multi-source documentation into private notebooks without hallucinations and generating executive syntheses.',
        topics: [
          'Week 3: Multi-document ingestion: Ingesting 50+ page annual reports, PDFs, and Google Docs with zero hallucination',
          'Week 3: Strict source-grounded querying, citation verification, and cross-source synthesis',
          'Week 4: Automated briefing generation: Transforming 100-page policy briefs into 1-page action matrices',
          'Week 4: Generating synthetic podcast-style Audio Overviews for mobile auditory learning and team summaries'
        ]
      },
      {
        period: 'Weeks 5-6',
        title: 'Multimodal Creative Engines & Workspace Integration',
        description: 'Producing high-impact visual assets with Imagen 3, video scripting with Google Vids, and streamlining Docs & Gmail daily triage.',
        topics: [
          'Week 5: High-resolution visual generation with Imagen 3: Brand style consistency and marketing collateral',
          'Week 5: Video storyboard generation, script synthesis, and slide timing with Google Vids',
          'Week 6: Daily Workspace AI Amplification: Help Me Write for complex reports, bilingual translation, and tone shifts',
          'Week 6: Email triage systems: Sentiment classification, draft suggestion chains, and canned response automation'
        ]
      },
      {
        period: 'Weeks 7-8',
        title: 'Custom Gems, Automated Pipelines & Capstone Portfolio',
        description: 'Designing role-specific Custom Gems, setting up automated personal productivity flows, and presenting a validated capstone.',
        topics: [
          'Week 7: Architecture of Custom Gems: Custom system instructions, tone boundaries, and uploaded private knowledge',
          'Week 7: Building bespoke Gems (e.g. Executive Ghostwriter, Client Proposal Drafter, and SOP QA Bot)',
          'Week 8: Assembling your Personal AI Operating System saving 5+ hours of manual weekly toil',
          'Week 8: Capstone System Showcase, peer defense, and award of the Applied AI Practitioner Certificate'
        ]
      }
    ]
  },
  {
    id: 'ai-master',
    title: 'AI Master for Real Life',
    subtitle: 'Flagship 3-Month Program: Google AI Ecosystem, Custom Gems & Workplace Automation',
    description: 'Transform from a passive AI user into an irreplaceable AI-enhanced leader. Master Gemini Advanced, Workspace AI, Imagen 3, NotebookLM, Custom Gems, and No-Code Apps Script automation.',
    badge: 'Flagship Master',
    duration: '12 Weeks (3 Months)',
    schedule: '3 Days/Week • 2 Hours/Session • 36 Sessions (72 Hours Total Training)',
    durationCategory: 'long',
    level: 'advanced',
    icon: 'code_blocks',
    skills: [
      'Gemini Advanced & Workspace AI',
      'Custom Gems & AI Digital Employees',
      'NotebookLM Audio & Research Hubs',
      'Google Apps Script Automation (No-Code)',
      'Enterprise Data Privacy & AI Policy',
      'Real-Life ROI Capstone System'
    ],
    investment: 'Rs. 75,000',
    priceNum: 75000,
    syllabusModules: [
      {
        period: 'Month 1 (Weeks 1-4)',
        title: 'Foundations & The Google AI Ecosystem (24 Hours)',
        description: 'Demystify generative AI, master prompt engineering in Gemini, eliminate busywork in Google Workspace, and solve real-world workplace roleplays.',
        topics: [
          'Week 1: The AI Paradigm Shift, Gemini vs Search, Data Privacy, and Bilingual (Sinhala/English) Prompting',
          'Week 2: Deep Dive into Workspace AI — Help Me Write (Gmail/Docs), Help Me Organize (Sheets), and Help Me Visualize (Slides)',
          'Week 3: Real-Life Roleplays — The Overwhelmed Executive (inbox triage), The Project Manager (5 PM kickoff), and Marketer (Western Province campaign)',
          'Week 4: Business Scale Strategies — AI for Solopreneurs, SMEs/SMBs (SOPs & HR policies), Enterprise Security & Month 1 Practical Challenge'
        ]
      },
      {
        period: 'Month 2 (Weeks 5-8)',
        title: 'Creation, Custom Gems & Real-Life Automation (24 Hours)',
        description: 'Generate multimodal business assets (Imagen 3, NotebookLM, Google Vids), build specialized Custom Gems, and automate workflows with AI-generated Apps Script.',
        topics: [
          'Week 5: Multimodal Creation — Imagen 3 marketing assets, NotebookLM private research & Colombo commute Audio Overviews, and Google Vids',
          'Week 6: Building Custom "Gems" — Creating tailored AI digital employees (Translator, Proofreader, Customer Support) & conversational Drive search',
          'Week 7: Real-Life Automation — No-code triggers/actions, having Gemini write Google Apps Script without coding, and building an automated Google Workspace CRM',
          'Week 8: End-to-End Business Integration — HR Onboarding pipeline, Sales Campaign launch, and Month 2 Custom Gem & Script Showcase'
        ]
      },
      {
        period: 'Month 3 (Weeks 9-12)',
        title: 'Future-Proofing, Security & Capstone ROI Showcase (24 Hours)',
        description: 'Build automated AI news feeds, implement corporate data privacy policies, develop irreplaceable human soft skills, and complete your 1-on-1 Capstone Project.',
        topics: [
          'Week 9: Filtering the AI News Cycle — Differentiating beta vs production features, automated Google Alerts + Gemini newsfeeds, and the Shiny Object Filter',
          'Week 10: Security, Ethics & Compliance — Free vs Enterprise data boundaries, fact-checking with Search Grounding, and drafting an official Corporate AI Policy',
          'Week 11: Becoming the "AI Champion" — Irreplaceable human skills (EQ, negotiation, strategy), pitching AI ROI to management, and Capstone Workshop Part 1',
          'Week 12: Final Capstone Showcase & Graduation — Live project presentations (saving 5-10 hrs/week), Certificates of Completion & IoAi Alumni Network launch'
        ]
      }
    ]
  },
  {
    id: 'enterprise-custom',
    title: 'Enterprise Custom AI Solutions & Corporate Training',
    subtitle: 'Fully bespoke AI training, workflow automation, and custom syllabus co-designed for your organization',
    description: 'A flexible, bespoke corporate transformation and upskilling solution without fixed weekly limitations. We audit your team workflows, co-create a tailored syllabus matching your tech stack, and deploy private AI solutions with measurable business ROI.',
    badge: 'Enterprise',
    duration: 'Custom Timeline (Tailored to Client)',
    schedule: 'Flexible • 2-Day Intensive, Phased Multi-Week Cohort, or Transformation Retainer',
    durationCategory: 'long',
    level: 'advanced',
    icon: 'precision_manufacturing',
    skills: [
      'Bespoke Curriculum Co-Design',
      'Enterprise Data Privacy & AI Governance',
      'Departmental Workflow Audits',
      'Custom Team Gems & Automation SOPs',
      'Executive ROI Scorecards & KPIs'
    ],
    investment: 'Custom Proposal',
    priceNum: 0,
    isCustomEnterprise: true,
    ctaLabel: 'Contact Us for Custom Scope',
    syllabusModules: [
      {
        period: 'Phase 1',
        title: 'Needs Discovery & Organizational AI Audit',
        description: 'Assessing operational bottlenecks, existing tool licenses (Google Workspace, M365, internal APIs), and corporate data security constraints.',
        topics: [
          'Departmental skill matrix & AI readiness assessment',
          'Tooling audit: Google Workspace AI, Microsoft Copilot, or Private LLM infrastructure',
          'Identifying high-friction manual bottlenecks across departments',
          'Scoping delivery format: Executive retreat, team cohorts, or enterprise-wide rollout'
        ]
      },
      {
        period: 'Phase 2',
        title: 'Bespoke Curriculum & Sandbox Co-Design',
        description: 'Architecting custom syllabus modules mapped directly to your industry, team roles, and data privacy policies.',
        topics: [
          'Tailored role-based tracks (Executives, Ops, Sales/Marketing, HR, Engineering)',
          'Designing custom hands-on labs using sanitized company document templates',
          'Drafting company-specific prompt libraries and custom instruction templates',
          'Establishing sandbox environments compliant with corporate compliance rules'
        ]
      },
      {
        period: 'Phase 3',
        title: 'Hands-On Execution & Internal AI Solution Deployment',
        description: 'Live interactive on-site or hybrid training, building tailored digital employees (Custom Gems) and deploying workflow automations.',
        topics: [
          'Interactive on-site workshops (Colombo / Western Province or Global Remote)',
          'Building department-specific Custom Gems (e.g. Finance parser, Support responder)',
          'No-code workflow automations using Google Apps Script & webhook pipelines',
          'Live troubleshooting with team leads on real production use cases'
        ]
      },
      {
        period: 'Phase 4',
        title: 'Enterprise Governance, SOPs & Executive ROI Review',
        description: 'Delivering operational playbooks, formal corporate AI acceptable use policies, and measurable time-saved ROI scorecards.',
        topics: [
          'Publishing official Corporate AI Acceptable Use & Data Protection Policy',
          'Departmental Standard Operating Procedure (SOP) playbooks',
          'Executive ROI presentation: Tracking hours saved and output multipliers',
          'Dedicated IoAi enterprise advisor check-ins and ongoing alumni support'
        ]
      }
    ]
  }
];

export const FACULTY: FacultyMember[] = [
  {
    id: 'aris-thorne',
    name: 'Dr. Aris Thorne',
    role: 'Lead Architect & Principal Investigator',
    division: 'Neural Architectures & Systems',
    bio: 'Ph.D. in Computer Science (Distributed AI Systems). Pioneer in sub-quadratic Transformer optimization, sparse KV-caching, and tensor-accelerated multimodal architectures across production clusters.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtmwT8dnFstuDDfBeUniAIiqOG1kAwYwmue1B9VTP6wtLX3WK7tt1wz4RzCrKQZ_f1k4FTU8XrIVfTys9zdYNmZ4xLsNjIaQyxQNP3ObKAgzxo7OlTo7vnINjR2IoTO8mH-9nT2ooMFMB4n6uT1JO-8MN3GpW0hXzZNo9COAuIie0zWdbl9JqMlbQYIOAzMA_aX6vV8Y0_eXbklll3ecvN3X0dOYkBUYYoWKrRJ1aipUM6ocs-MFRUBg',
    publications: 42,
    credentials: 'Ph.D. (MIT EECS), Former Senior Staff AI Scientist',
    citations: 3840,
    topCitation: 'NeurIPS 2024: Dynamic Vector Quantization for 1M Token Reasoning'
  },
  {
    id: 'sarah-chen',
    name: 'Sarah Chen, M.Sc.',
    role: 'Ethics Lead & Safety Director',
    division: 'Algorithmic Alignment & Safety',
    bio: 'M.Sc. in Machine Learning & AI Governance. Specializes in verifiable human-in-the-loop constraint protocols, deterministic guardrails, and cryptographic state rollback mechanisms for agent chains.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFPykJWU7xErU3Su44hLOmiQ_OOWjB0K8wNO9VNSHpecvvKfwlg3fFpEFWhhuNkYMZ84hKyT1R0PEDYJnQzgy4m1P96SiSVMN40zU21rGe5XYLpU3K1UrBdnE3CirKAeHkPu5TjrXKiL7YflmW0BRvYgwAfM6tsUurL6S6ZizRWJMGvGbQ0sAwxFIDFlH9F-qPD2xfijQJTANtjXKU-S9rAFPr56gq8Rvruu8_0QKKycOO_mGYLDmVLw',
    publications: 28,
    credentials: 'M.Sc. (Stanford AI Lab), Lead Contributor to NIST AI RMF',
    citations: 2190,
    topCitation: 'ICML 2025: Formal Verification of State-Boundary Invariants in Multi-Agent Graphs'
  },
  {
    id: 'marcus-vane',
    name: 'Marcus Vane, M.Eng.',
    role: 'Robotics Division & Systems Lead',
    division: 'Embodied Intelligence',
    bio: 'M.Eng. in Cyber-Physical Systems. Expert in sub-10ms sensory feedback loops on edge TPU hardware, spatial transformer sensor fusion, and low-latency motor control for industrial autonomous robotics.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQuIy56DUdygj8-j20NuH1C36egJuyWxoDUzUoHIsHppiK03UwlSGVLiuB_lJTrelWhun7I_50l14uvXBWMT-e6AQkjjBa-EBoKHq9fVVG5HHnFvxPea4EQjqCSaeRv1PpfPmywlBGniGoSKXmKEZDrUA6-ooyFIAPkyKHjFa98nnz6i_WTB5jaqXhfIWgpJNTG7sFEofUEL6SzjDI_ABapv3TQHo1-dqDzz0DctY6Z1GbU3Ylk1g_xA',
    publications: 35,
    credentials: 'M.Eng. (ETH Zurich Robotics), Edge TPU Kernel Architect',
    citations: 1940,
    topCitation: 'IEEE Robotics & Automation 2026: Sub-10ms Edge Transformer Motor Control'
  },
  {
    id: 'elena-rostova',
    name: 'Elena Rostova, Ph.D.',
    role: 'NLP Researcher & Linguistics Lead',
    division: 'Language Synthesis & Context',
    bio: 'Ph.D. in Computational Linguistics. Focuses on infinite-context window architectures, semantic hierarchical graph deduplication, and zero-shot cross-lingual reasoning synthesis for enterprise applications.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeR5qmcWvlql-_qMAGWzumBGgNG9XNh5PMYjzEtESrzh1Pb8XHzeh4vvd1i1kpedVdvURNfnb93sLMmIK-K9NaWdEveAj5NuyAjrUnUNiFppRL8z1HeE76eTaJs7uaYidGaaVDWUbEcoYEIHjkc9p4Sp5Xusy5fDYxaVu5o2Q6Osnpm7Y8OIGRA8keJOwX6BdZUG3OZRRugs9fqFEea5cSe89YcBsZxxaOvNOsx_awJHXJ7G0SGhwbGg',
    publications: 31,
    credentials: 'Ph.D. (Oxford NLP Lab), Lead Designer of Graph-RAG Synthesizer',
    citations: 2780,
    topCitation: 'ACL 2025: Hierarchical Vector Deduplication in Long-Horizon Task Execution'
  }
];

export const RESEARCH_PAPERS: ResearchPaper[] = [
  {
    id: 'paper-1',
    title: 'Sub-quadratic Neural Attention via Dynamic Vector Quantization',
    category: 'Neural Architectures',
    author: 'Dr. Aris Thorne & Elena Rostova',
    date: 'June 2026',
    summary: 'Proposing a novel sparse attention mechanism reducing linear KV-cache memory footprints by 68% while preserving zero-shot reasoning capabilities across 1M token contexts.',
    executiveSummary: 'This paper establishes a mathematical foundation for compressing autoregressive Key-Value caches in long-horizon LLMs using adaptive 4-bit vector quantization. By dynamically pruning low-entropy attention heads during inference, the proposed architecture achieves sub-quadratic memory scaling with negligible perplexity degradation across benchmark reasoning datasets.',
    keyFindings: [
      '68.4% reduction in peak VRAM consumption during 1M+ token context retrieval.',
      'Maintains 99.2% accuracy on LongEval and Needle-in-a-Haystack synthetic benchmarks.',
      'Achieves 2.4x throughput speedup on modern tensor-core server clusters.',
      'Zero-shot transferability across open-weight Transformer architectures.'
    ],
    tags: ['Attention Mechanism', 'Compute Efficiency', 'Transformers'],
    readTime: '12 min'
  },
  {
    id: 'paper-2',
    title: 'Human-in-the-Loop Constraint Protocols for Autonomous Agent Chains',
    category: 'Alignment & Ethics',
    author: 'Sarah Chen et al.',
    date: 'April 2026',
    summary: 'A formal framework enforcing deterministic state-boundary guarantees for multi-agent execution graphs operating in high-stakes financial and medical domains.',
    executiveSummary: 'We introduce a formal verification protocol for autonomous multi-agent networks that embeds immutable human oversight checkpoints into DAG execution graphs. The system mathematically guarantees that irreversible external side-effects (e.g. database mutations, transactions) are rejected unless cryptographic consensus thresholds are satisfied.',
    keyFindings: [
      'Zero unauthorized state-transition anomalies across 500,000 simulated agentic loops.',
      'Introduces a provably sound rollback mechanism for stochastic agent failures.',
      'Sub-50ms latency overhead for real-time cryptographic audit logging.',
      'Compliance with NIST AI RMF 2.0 and EU AI Act Level 4 autonomy guidelines.'
    ],
    tags: ['Ethical Guardrails', 'Agentic Safety', 'Formal Verification'],
    readTime: '18 min'
  },
  {
    id: 'paper-3',
    title: 'Low-Latency Spatial Transformer Feedback Loops in Embodied Robotics',
    category: 'Compute Optimization',
    author: 'Marcus Vane',
    date: 'January 2026',
    summary: 'Benchmarking sub-10ms sensory feedback pipeline execution on edge TPU hardware for tactile and stereo vision sensor fusion.',
    executiveSummary: 'This work explores hardware-software co-design for embodied robotic perception. By deploying a pipelined spatial transformer with temporal sensor fusion directly onto edge TPU accelerators, we achieve deterministic closed-loop motor control under 8.2ms, overcoming traditional cloud-inference latency bottlenecks.',
    keyFindings: [
      'Deterministic 8.2ms end-to-end sensor-to-actuation cycle time on edge compute.',
      '74% improvement in dynamic obstacle avoidance under low-light sensory noise.',
      'Custom quantized kernel reducing edge power consumption from 45W to 12W.',
      'Demonstrated on 6-DoF robotic manipulation arms with 99.6% trajectory precision.'
    ],
    tags: ['Edge AI', 'Robotics', 'Latency Reduction'],
    readTime: '15 min'
  },
  {
    id: 'paper-4',
    title: 'Self-Correcting Memory Networks with Hierarchical Vector Deduplication',
    category: 'Agentic Systems',
    author: 'Dr. Aris Thorne',
    date: 'March 2026',
    summary: 'Demonstrating dynamic graph-RAG restructuring where agentic memory nodes prune stale contextual assumptions during long-horizon task execution.',
    executiveSummary: 'Standard RAG pipelines suffer from memory contamination and semantic drift in iterative problem-solving. We propose a hierarchical memory network that continuously validates stored vector assumptions against ground-truth facts, automatically pruning hallucinated premises and consolidating long-term semantic knowledge into verified episodic graphs.',
    keyFindings: [
      '91% reduction in context pollution during multi-step research agent tasks.',
      'Hierarchical clustering reduces vector search latency by 4.2x over flat indexes.',
      'Dynamic graph restructuring prevents contradictory premises across conversation threads.',
      'Native compatibility with PostgreSQL pgvector and distributed document stores.'
    ],
    tags: ['RAG', 'Vector DB', 'Autonomous Agents'],
    readTime: '10 min'
  }
];

export const TEAM_IMAGE_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuAa_SKMbQOyCn9J9M2ZpvgjkIHzkxcIolts4AnAttzhK7Kt654DWQKBlJ4qtpbgnOxo-BNyvKgpkyoLwfM9GUfEaL4zVvw-gRqA38ijapLXe35LgsyVfv47HZ4Zu1Ma69ZscA7V4lFaSPnQOuywFTsVDNkJ6fCMADP_72Ja28OivIeQo-m-Q_vuKdomW1WywsPPy0rJAm-nkVWBaAl6lY0QOa_tXZXp5G-rHpdQc1nIcnKzJM9f4k3Aag";

export const RACK_IMAGE_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuBjwceHIqyyNm0WDNHS5Iym_5PBHcG5qRcrthtyNOQXjL3oHgWdZMWc4vXcBO5DiH4VTzEeEZ2ywrCwE-_tUUErpfEUaUu8-vgqwALnf_42sTXCX81ohKau8qaOJ3x0dAXpsJaDbvyuj9QkxCUbAGq0vNN7lMGek5qAlm3-mxTNgpMAhsPDzEGyRd_37lT63BjPElKIWIwvVrU45w0mtpggWRrLe4RG5J5LVG4nOfIoVpY_fIHhPHcSbQ";

export const MAP_IMAGE_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuBL1y7fdAavllQGzsBA4WtBHX2B8vOAFGsyAv_9ij5CIIcnzwhsRl6VMqLL2MaH2qKm1A2ijcr0g_p1Tz8r8ptI3Mik8p9L9b3otHUDhQqpQA1fnoct_iESZSN-xrnYSrvNtqII_JepgISVcJxYgu3Op6brg_RRpntEMm_fk80sBpbZ7UGk-Xrl_xs3Pgtk8OYTHx2ZGJP2IJfbsfXneD6Bh6H8cMsQl4Wug5Mmtmv8huDGZz7q4uRKGg";

export const LOGO_ICON_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuDE05IuGvZjgAvJMQNvEshRpd0jV6WXWd_5kTTkQLNLOYpJUJiWGl5YSpM-LetfrDb5ChBIdd02G1_5sTWXQ9cv_W1jiOeLkkeWf1E9UAGLuETXFUTOkfh85VMetl8I1sKt3iwX09Jgc13FX1hWWQkoJ33ACN5q6k3y-rcQIkFW4-DXNssEZ5uxZgfG8YjaNHZZ6Xw4VsWbxXa8SPd0x2cqqoV4SivBbQB4BhbUXkaCtHLr1eKjZ40Y9QYp7p8O7-Yo8-E";
