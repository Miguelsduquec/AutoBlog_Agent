import http from "node:http";

const siteType = process.argv[2] ?? "simple";
const port = Number(process.argv[3] ?? 4010);

function page(title, description, h1, sections = [], bodyCopy = []) {
  const headingMarkup = sections.map((section) => `<section><h2>${section.heading}</h2><p>${section.copy}</p></section>`).join("");
  const bodyMarkup = bodyCopy.map((copy) => `<p>${copy}</p>`).join("");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      ${description ? `<meta name="description" content="${description}" />` : ""}
    </head>
    <body>
      <header>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/services">Services</a>
          <a href="/blog">Blog</a>
          <a href="/resources">Resources</a>
        </nav>
      </header>
      <main>
        ${h1 ? `<h1>${h1}</h1>` : ""}
        ${bodyMarkup}
        ${headingMarkup}
      </main>
    </body>
  </html>`;
}

function resolveSitePages(type) {
  const sites = {
    simple: {
      "/": page(
        "Northstar Bookkeeping | Bookkeeping for local businesses",
        "Monthly bookkeeping and finance support for local businesses that want clearer numbers.",
        "Bookkeeping support for local businesses",
        [
          {
            heading: "Monthly bookkeeping",
            copy: "We keep monthly books tidy, reconcile accounts, and make reports easier to understand."
          },
          {
            heading: "Cash flow visibility",
            copy: "Owners get cleaner reporting and a clearer picture of where money is going."
          }
        ],
        [
          "Northstar Bookkeeping helps small service businesses stay on top of invoicing, categorization, and reporting.",
          "The site explains the core service clearly, but there is only a small amount of educational support content today."
        ]
      ),
      "/about": page(
        "About Northstar Bookkeeping",
        "Meet the bookkeeping team behind Northstar.",
        "About Northstar",
        [{ heading: "Who we help", copy: "We mainly support trades, consultants, and local service businesses." }],
        ["We help owners understand their numbers without making finance feel intimidating."]
      ),
      "/services": page(
        "Bookkeeping services | Northstar",
        "Bookkeeping packages, reconciliations, and monthly reporting for service businesses.",
        "Bookkeeping services",
        [
          { heading: "Reporting setup", copy: "We create dependable monthly reporting rhythms." },
          { heading: "Receipt cleanup", copy: "We organize records so tax periods are less chaotic." }
        ],
        ["Our services are designed for owners who need reliable books and less admin."]
      )
    },
    "content-heavy": {
      "/": page(
        "Workflow Atlas | Operations and automation guidance for scaling teams",
        "Guides, templates, and consulting support for operations leaders improving automation, documentation, and delivery.",
        "Operations guidance for teams building better systems",
        [
          { heading: "Process automation", copy: "Learn where automation reduces manual work and where it creates more value." },
          { heading: "Knowledge systems", copy: "Build documentation habits that help teams scale without losing speed." },
          { heading: "Delivery operations", copy: "Improve project handoffs, internal workflows, and execution clarity." }
        ],
        [
          "Workflow Atlas publishes detailed guidance for operations leaders, project managers, and process owners who want stronger systems.",
          "The site already has educational content, practical examples, and multiple supporting topic clusters for workflow design, automation, and internal documentation.",
          "Readers can explore implementation advice, comparisons, templates, and updated operational frameworks for 2026."
        ]
      ),
      "/about": page(
        "About Workflow Atlas",
        "Why Workflow Atlas focuses on practical systems design for scaling teams.",
        "About Workflow Atlas",
        [
          { heading: "Practical operators", copy: "Our perspective comes from operating systems inside growing teams." },
          { heading: "Change management", copy: "We focus on rollout, adoption, and workflow clarity." }
        ],
        [
          "We help operations leaders build systems that teams will actually use.",
          "The business combines consulting, templates, and educational content."
        ]
      ),
      "/services": page(
        "Operations consulting services | Workflow Atlas",
        "Consulting for automation design, SOP creation, handoff cleanup, and operational planning.",
        "Operations consulting services",
        [
          { heading: "Automation design", copy: "Identify manual workflows that can be systemized without creating brittle processes." },
          { heading: "SOP systems", copy: "Build documentation and ownership models that hold up in real teams." },
          { heading: "Operating cadence", copy: "Improve meetings, metrics, and delivery rhythms." }
        ],
        [
          "The consulting offer supports high-intent buyers who already know operations is slowing them down."
        ]
      ),
      "/blog": page(
        "Workflow Atlas Blog",
        "Updated insights for operations, automation, and documentation leaders.",
        "Operations insights and blog articles",
        [
          { heading: "Latest automation guides", copy: "Updated articles on workflow automation, process mapping, and implementation mistakes." },
          { heading: "Comparison articles", copy: "Compare tools, systems, and rollout approaches before investing further." }
        ],
        [
          "The blog is active with recent insights, practical advice, and updated content clusters for 2026.",
          "Readers can move from educational articles into templates, consulting, or implementation help."
        ]
      ),
      "/resources": page(
        "Operations resources | Workflow Atlas",
        "Templates, checklists, and guides for operations teams.",
        "Resources for operations teams",
        [
          { heading: "Templates", copy: "Use SOP templates, meeting templates, and audit checklists." },
          { heading: "Playbooks", copy: "Review process mapping, governance, and handoff playbooks." }
        ],
        [
          "The resource library supports deeper content coverage across multiple search intents."
        ]
      )
    },
    weak: {
      "/": page(
        "Apex Growth",
        "",
        "We help businesses grow",
        [],
        ["Growth services for ambitious businesses."]
      )
    },
    empty: {
      "/": `<!doctype html><html><head><title>Empty Site</title></head><body><main></main></body></html>`
    },
    "missing-headings": {
      "/": `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Signal Stack | Workflow support for modern teams</title>
          <meta name="description" content="Workflow support and operational design for modern teams." />
        </head>
        <body>
          <main>
            <p>Signal Stack helps teams design cleaner operating systems, better workflows, and practical handoff models.</p>
            <p>This page deliberately has no H1 or H2 headings so the crawler has to fall back to other signals.</p>
            <p>It still includes meaningful text and service context so we can observe how resilient the analysis layer is.</p>
          </main>
        </body>
      </html>`
    },
    slow: {
      "/": page(
        "Slow Lane Systems | Workflow consulting",
        "A slow response site used for timeout validation.",
        "Workflow consulting with intentionally delayed responses",
        [{ heading: "Delayed content", copy: "This server intentionally waits before returning content." }],
        ["Useful for testing timeout and fallback behavior."]
      )
    }
  };

  return sites[type] ?? sites.simple;
}

const site = resolveSitePages(siteType);

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/favicon.ico") {
    response.writeHead(204);
    response.end();
    return;
  }

  const html = site[pathname] ?? site[`${pathname}/`] ?? null;

  if (!html) {
    response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    response.end("<h1>Not found</h1>");
    return;
  }

  const send = () => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
  };

  if (siteType === "slow") {
    setTimeout(send, 6500);
    return;
  }

  send();
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock site "${siteType}" listening on http://127.0.0.1:${port}`);
});
