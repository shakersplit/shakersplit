import { useState, useMemo } from 'react';
import { Search, UtensilsCrossed } from 'lucide-react';

const CATEGORIES = ['All', 'PRE_WORKOUT', 'POST_WORKOUT', 'PRE_GAME', 'HEALTHY', 'COCKTAIL', 'SNACK'] as const;

type Category = (typeof CATEGORIES)[number];

const SAMPLE_RECIPES = [
  {
    id: '1',
    title: 'High-Protein Chicken Bowl',
    category: 'POST_WORKOUT',
    calories: 520,
    protein_g: 48,
    prep_time_minutes: 20,
    description: 'Grilled chicken, rice, and veggies — the classic post-workout meal.',
  },
  {
    id: '2',
    title: 'Pre-Game Pasta',
    category: 'PRE_GAME',
    calories: 640,
    protein_g: 28,
    prep_time_minutes: 15,
    description: 'Carb-heavy pasta with light sauce to fuel a big night.',
  },
  {
    id: '3',
    title: 'Protein Smoothie',
    category: 'PRE_WORKOUT',
    calories: 340,
    protein_g: 35,
    prep_time_minutes: 5,
    description: 'Banana, oats, protein powder, and almond milk.',
  },
  {
    id: '4',
    title: 'Avocado Toast Stack',
    category: 'HEALTHY',
    calories: 420,
    protein_g: 18,
    prep_time_minutes: 8,
    description: 'Sourdough, smashed avocado, poached egg, chili flakes.',
  },
  {
    id: '5',
    title: 'Cucumber Vodka Soda',
    category: 'COCKTAIL',
    calories: 110,
    protein_g: 0,
    prep_time_minutes: 3,
    description: 'Lower-cal mixer for a tactical night out.',
  },
  {
    id: '6',
    title: 'Greek Yogurt Bowl',
    category: 'SNACK',
    calories: 280,
    protein_g: 22,
    prep_time_minutes: 4,
    description: 'Greek yogurt, granola, berries, drizzle of honey.',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  PRE_WORKOUT: 'Pre-Workout',
  POST_WORKOUT: 'Post-Workout',
  PRE_GAME: 'Pre-Game',
  HEALTHY: 'Healthy',
  COCKTAIL: 'Cocktail',
  SNACK: 'Snack',
};

export function ExploreRecipesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('All');

  // Filter is derived state — recompute whenever search or category changes.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SAMPLE_RECIPES.filter((r) => {
      if (category !== 'All' && r.category !== category) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (CATEGORY_LABELS[r.category] ?? '').toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5" />
        <h2 className="text-xl font-bold">Explore Recipes</h2>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes..."
          className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              category === cat
                ? 'bg-secondary border-secondary text-foreground'
                : 'border-border text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
            }`}
          >
            {cat === 'All' ? 'All' : CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Recipe Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No recipes match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((recipe) => (
            <div
              key={recipe.id}
              className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
            >
              <div className="h-28 bg-gradient-to-br from-food/20 to-food/5 flex items-center justify-center">
                <UtensilsCrossed className="h-10 w-10 text-food/40" />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug">{recipe.title}</h3>
                  <span className="shrink-0 rounded-full bg-food/20 px-2 py-0.5 text-xs text-food">
                    {CATEGORY_LABELS[recipe.category] || recipe.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{recipe.description}</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {recipe.calories && <span>{recipe.calories} cal</span>}
                  {recipe.protein_g && <span>{recipe.protein_g}g protein</span>}
                  {recipe.prep_time_minutes && <span>{recipe.prep_time_minutes} min</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        More recipes coming soon. Admins can add recipes via the API.
      </p>
    </div>
  );
}
