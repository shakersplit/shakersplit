import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UtensilsCrossed } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const CATEGORIES = ['All', 'PRE_WORKOUT', 'POST_WORKOUT', 'PRE_GAME', 'HEALTHY', 'COCKTAIL', 'SNACK'] as const;
type Category = (typeof CATEGORIES)[number];

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  category: string;
  calories: number | null;
  protein_g: number | null;
  prep_time_minutes: number | null;
  ingredients: { name: string; quantity?: string }[];
  instructions: string | null;
  youtube_url: string | null;
  photo_url: string | null;
  is_public: boolean;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  PRE_WORKOUT: 'Pre-Workout',
  POST_WORKOUT: 'Post-Workout',
  PRE_GAME: 'Pre-Game',
  HEALTHY: 'Healthy',
  COCKTAIL: 'Cocktail',
  SNACK: 'Snack',
};

/**
 * Public recipe browser. Reads directly from Supabase using RLS — the recipes_select_public
 * policy allows reading rows where is_public = true (or own rows). No /api round-trip needed.
 */
export function ExploreRecipesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('All');

  const { data: recipes = [], isLoading, error } = useQuery({
    queryKey: ['recipes', 'public'],
    queryFn: async (): Promise<Recipe[]> => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recipes.filter((r) => {
      if (category !== 'All' && r.category !== category) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        (CATEGORY_LABELS[r.category] ?? '').toLowerCase().includes(q)
      );
    });
  }, [recipes, search, category]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5" />
        <h2 className="text-xl font-bold">Explore Recipes</h2>
      </div>

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

      {error ? (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          Couldn't load recipes: {(error as Error).message}
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-secondary" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            {recipes.length === 0
              ? 'No recipes published yet. An admin can add them from the Admin Panel.'
              : 'No recipes match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <article className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors">
      {recipe.photo_url ? (
        <img
          src={recipe.photo_url}
          alt={recipe.title}
          loading="lazy"
          className="h-32 w-full object-cover"
        />
      ) : (
        <div className="h-32 bg-gradient-to-br from-food/20 to-food/5 flex items-center justify-center">
          <UtensilsCrossed className="h-10 w-10 text-food/40" />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug">{recipe.title}</h3>
          <span className="shrink-0 rounded-full bg-food/20 px-2 py-0.5 text-xs text-food">
            {CATEGORY_LABELS[recipe.category] || recipe.category}
          </span>
        </div>
        {recipe.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{recipe.description}</p>
        )}
        <div className="flex gap-3 text-xs text-muted-foreground">
          {recipe.calories && <span>{recipe.calories} cal</span>}
          {recipe.protein_g && <span>{recipe.protein_g}g protein</span>}
          {recipe.prep_time_minutes && <span>{recipe.prep_time_minutes} min</span>}
        </div>
        {recipe.youtube_url && (
          <a
            href={recipe.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-mental hover:underline inline-flex items-center gap-1"
          >
            ▶ Watch video
          </a>
        )}
      </div>
    </article>
  );
}
