export default function HomePage() {
  return (
    <div className="flex flex-col gap-12 py-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy-light to-ocean-dark px-8 py-20 text-center text-white shadow-xl">
        <div className="relative z-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ocean-light">
            Ocean Clean-Tech Platform
          </p>
          <h1 className="mb-5 text-5xl font-bold tracking-tight">Cleanly</h1>
          <p className="mx-auto max-w-lg text-lg leading-relaxed text-ocean-light/80">
            Map and quantify ocean plastic pollution from drone imagery. Plan
            cleanup expeditions with AI-powered logistics.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 80"
            fill="rgba(0,180,216,0.12)"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z" />
          </svg>
        </div>
      </div>

      {/* Workflow steps */}
      <div>
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-ocean dark:text-ocean-light">
          Three steps to a cleaner ocean
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Card
            step={1}
            title="Import Images"
            description="Pull drone imagery and annotations from CVAT to start your survey."
            href="/images"
          />
          <Card
            step={2}
            title="Analyze"
            description="Compute trash area, weight estimates, and precise map coordinates."
            href="/analysis"
          />
          <Card
            step={3}
            title="Plan Expedition"
            description="AI agent recommends vessels, team assignments, and full logistics."
            href="/expedition"
          />
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap justify-center gap-3">
        <QuickLink href="/dashboard" label="Mission Dashboard" />
        <QuickLink href="/map" label="Hotspot Map" />
        <QuickLink href="/employees" label="Team Directory" />
      </div>
    </div>
  );
}

function Card({
  step,
  title,
  description,
  href,
}: {
  step: number;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group relative rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-ocean/40 hover:shadow-md dark:border-navy-mid/60 dark:bg-navy-light dark:hover:border-ocean/50"
    >
      <div className="mb-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ocean text-xs font-bold text-white">
          {step}
        </span>
      </div>
      <h2 className="mb-2 text-lg font-semibold group-hover:text-ocean dark:text-gray-100 dark:group-hover:text-ocean-light">
        {title}
      </h2>
      <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </a>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-navy shadow-sm transition-all hover:border-ocean/40 hover:text-ocean hover:shadow dark:border-navy-mid dark:bg-navy-light dark:text-gray-300 dark:hover:border-ocean/50 dark:hover:text-ocean-light"
    >
      {label}
    </a>
  );
}
