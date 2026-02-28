export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Cleanly</h1>
      <p className="max-w-xl text-lg text-gray-600 dark:text-gray-400">
        Map and quantify ocean plastic pollution from drone imagery. Plan
        cleanup expeditions with AI-powered logistics.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card
          title="Import Images"
          description="Pull drone imagery and annotations from CVAT."
          href="/images"
        />
        <Card
          title="Analyze"
          description="Compute trash area, weight, and map coordinates."
          href="/analysis"
        />
        <Card
          title="Plan Expedition"
          description="AI agent recommends vessels, team, and logistics."
          href="/expedition"
        />
      </div>
    </div>
  );
}

function Card({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="rounded-xl border border-gray-200 p-6 text-left transition-colors hover:border-blue-500 dark:border-gray-800 dark:hover:border-blue-500"
    >
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </a>
  );
}
