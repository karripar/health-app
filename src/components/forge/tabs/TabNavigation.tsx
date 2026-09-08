type TabKey = "today" | "food" | "progress" | "more";

export function TabNavigation({
  activeTab,
  onChange,
  copy,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
  copy: Record<TabKey, string>;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-(--border) bg-[rgba(10,15,12,0.96)] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
        {(["today", "food", "progress", "more"] as TabKey[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${activeTab === tab ? "bg-(--accent) text-black" : "text-(--text-secondary)"}`}
          >
            {copy[tab]}
          </button>
        ))}
      </div>
    </nav>
  );
}
