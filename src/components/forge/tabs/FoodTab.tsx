import { type Food, type Meal } from "@/lib/forge/models";
import { Button, Field, Input, StatCard } from "../ui";
import { formatFoodDisplayName } from "../helpers";

export function FoodTab({
  copy,
  foodQuery,
  searchResults,
  selectedFoodId,
  selectedFood,
  selectedFoodGrams,
  selectedFoodNutrition,
  searchMessage,
  quickFoods,
  customFood,
  mealName,
  mealDraft,
  showCustomFood,
  showMealBuilder,
  foodsById,
  stateMeals,
  onFoodQueryChange,
  onSearch,
  onClear,
  onSelectFood,
  onChangeSelectedGrams,
  onSaveSelectedFood,
  onBuildMeal,
  onAddFoodToToday,
  onToggleCustomFood,
  onCustomFoodChange,
  onAddCustomFood,
  onToggleMealBuilder,
  onMealNameChange,
  onMealDraftChange,
  onSaveMeal,
  onAddMealToToday,
}: {
  copy: Record<string, string>;
  foodQuery: string;
  searchResults: Food[];
  selectedFoodId: string;
  selectedFood: Food | undefined;
  selectedFoodGrams: string;
  selectedFoodNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  searchMessage: string;
  quickFoods: Food[];
  customFood: {
    name: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  };
  mealName: string;
  mealDraft: Array<{ foodId: string; grams: number }>;
  showCustomFood: boolean;
  showMealBuilder: boolean;
  foodsById: Map<string, Food>;
  stateMeals: Meal[];
  onFoodQueryChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onSelectFood: (id: string) => void;
  onChangeSelectedGrams: (value: string) => void;
  onSaveSelectedFood: () => void;
  onBuildMeal: (food: Food) => void;
  onAddFoodToToday: (food: Food, grams: number) => void;
  onToggleCustomFood: () => void;
  onCustomFoodChange: (field: keyof typeof customFood, value: string) => void;
  onAddCustomFood: () => void;
  onToggleMealBuilder: () => void;
  onMealNameChange: (value: string) => void;
  onMealDraftChange: (index: number, grams: number) => void;
  onSaveMeal: () => void;
  onAddMealToToday: (meal: Meal) => void;
}) {
  return (
    <section className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                className="flex-1"
                value={foodQuery}
                onChange={(event) => onFoodQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onSearch();
                  }
                }}
                placeholder={copy.foodSearch}
              />
              <div className="flex gap-2">
                <Button className="bg-(--accent) text-black" onClick={onSearch}>
                  {copy.search}
                </Button>
                {foodQuery ? <Button onClick={onClear}>Clear</Button> : null}
              </div>
            </div>
            <div className="text-sm text-(--text-secondary)">
              {searchMessage || copy.noteFineli}
            </div>
          </div>

          {searchResults.length ? (
            <div className="space-y-3 border-t border-(--border) pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{copy.foodSearch}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
                  {searchResults.length} results
                </div>
              </div>
              <div className="max-h-105 space-y-2 overflow-y-auto pr-1">
                {searchResults.slice(0, 12).map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => onSelectFood(food.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${selectedFoodId === food.id ? "border-(--accent) bg-white/3" : "border-(--border) hover:border-(--accent)/70"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-[15px]">
                          {formatFoodDisplayName(food.name)}
                        </div>
                        {food.brand ? (
                          <div className="mt-1 text-xs text-(--text-muted)">
                            {formatFoodDisplayName(food.brand)}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 rounded-md bg-white/3 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
                        {food.defaultServingGrams}g
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-(--text-secondary)">
                      <span>{food.nutritionPer100g.calories} kcal / 100g</span>
                      <span>•</span>
                      <span>{food.nutritionPer100g.protein}P</span>
                      <span>•</span>
                      <span>{food.nutritionPer100g.carbs}C</span>
                      <span>•</span>
                      <span>{food.nutritionPer100g.fat}F</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 rounded-xl border border-(--border) bg-white/2 p-4">
          {selectedFood ? (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
                  Selected item
                </div>
                <div className="mt-2 text-lg font-medium">
                  {formatFoodDisplayName(selectedFood.name)}
                </div>
                {selectedFood.brand ? (
                  <div className="mt-1 text-sm text-(--text-secondary)">
                    {formatFoodDisplayName(selectedFood.brand)}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-(--text-secondary)">
                  {selectedFood.nutritionPer100g.calories} kcal / 100g
                </div>
                <Input
                  className="w-24"
                  type="number"
                  value={selectedFoodGrams}
                  onChange={(event) =>
                    onChangeSelectedGrams(event.target.value)
                  }
                />
              </div>
              {selectedFoodNutrition ? (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label={copy.calories}
                    value={`${selectedFoodNutrition.calories}`}
                  />
                  <StatCard
                    label={copy.protein}
                    value={`${selectedFoodNutrition.protein}g`}
                  />
                  <StatCard
                    label={copy.carbs}
                    value={`${selectedFoodNutrition.carbs}g`}
                  />
                  <StatCard
                    label={copy.fat}
                    value={`${selectedFoodNutrition.fat}g`}
                  />
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="bg-(--accent) text-black"
                  onClick={() =>
                    onAddFoodToToday(
                      selectedFood,
                      Number(selectedFoodGrams) ||
                        selectedFood.defaultServingGrams,
                    )
                  }
                >
                  {`Add ${Number(selectedFoodGrams) || selectedFood.defaultServingGrams} g`}
                </Button>
                <Button onClick={onSaveSelectedFood}>{copy.saveFood}</Button>
              </div>
              <Button
                className="w-full"
                onClick={() => onBuildMeal(selectedFood)}
              >
                {copy.buildMeal}
              </Button>
            </>
          ) : (
            <div className="flex h-full min-h-55 items-center justify-center text-sm text-(--text-secondary)">
              {copy.fineliChooseFood}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 border-t border-(--border) pt-5">
        <div className="text-sm font-medium">{copy.savedFoods}</div>
        <div className="space-y-2">
          {quickFoods.map((food) => (
            <div
              key={food.id}
              className="flex items-center justify-between gap-3 border-b border-(--border) py-2.5"
            >
              <div>
                <div className="font-medium">{food.name}</div>
                <div className="text-sm text-(--text-secondary)">
                  {food.defaultServingGrams} g
                </div>
              </div>
              <Button
                onClick={() => onAddFoodToToday(food, food.defaultServingGrams)}
              >
                {copy.addToToday}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-(--border) pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">{copy.customFood}</div>
          <Button onClick={onToggleCustomFood}>
            {showCustomFood ? copy.hide : copy.open}
          </Button>
        </div>
        {showCustomFood ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label={copy.name}>
              <Input
                value={customFood.name}
                onChange={(event) =>
                  onCustomFoodChange("name", event.target.value)
                }
              />
            </Field>
            <Field label={copy.calories}>
              <Input
                type="number"
                value={customFood.calories}
                onChange={(event) =>
                  onCustomFoodChange("calories", event.target.value)
                }
              />
            </Field>
            <Field label={copy.protein}>
              <Input
                type="number"
                value={customFood.protein}
                onChange={(event) =>
                  onCustomFoodChange("protein", event.target.value)
                }
              />
            </Field>
            <Field label={copy.carbs}>
              <Input
                type="number"
                value={customFood.carbs}
                onChange={(event) =>
                  onCustomFoodChange("carbs", event.target.value)
                }
              />
            </Field>
            <Field label={copy.fat}>
              <Input
                type="number"
                value={customFood.fat}
                onChange={(event) =>
                  onCustomFoodChange("fat", event.target.value)
                }
              />
            </Field>
          </div>
        ) : null}
        {showCustomFood ? (
          <Button
            className="w-full bg-(--accent) text-black"
            onClick={onAddCustomFood}
          >
            {copy.save}
          </Button>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-(--border) pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">{copy.meals}</div>
          <Button onClick={onToggleMealBuilder}>
            {showMealBuilder ? copy.hide : copy.open}
          </Button>
        </div>
        {showMealBuilder ? (
          <div className="space-y-3">
            <Field label={copy.mealName}>
              <Input
                value={mealName}
                onChange={(event) => onMealNameChange(event.target.value)}
              />
            </Field>
            {mealDraft.map((item, index) => {
              const food = foodsById.get(item.foodId);
              return (
                <div
                  key={`${item.foodId}-${index}`}
                  className="flex items-center justify-between gap-3 border-b border-(--border) py-2.5"
                >
                  <div className="font-medium">{food?.name ?? "Food"}</div>
                  <Input
                    className="w-24"
                    type="number"
                    value={item.grams}
                    onChange={(event) =>
                      onMealDraftChange(index, Number(event.target.value))
                    }
                  />
                </div>
              );
            })}
            <Button
              className="w-full bg-(--accent) text-black"
              onClick={onSaveMeal}
            >
              {copy.saveMeal}
            </Button>
          </div>
        ) : null}
        <div className="space-y-2">
          {stateMeals.map((meal) => (
            <div
              key={meal.id}
              className="flex items-center justify-between gap-3 border-b border-(--border) py-2.5"
            >
              <div>
                <div className="font-medium">{meal.name}</div>
                <div className="text-sm text-(--text-secondary)">
                  {meal.items.reduce((sum, item) => sum + item.grams, 0)} g
                </div>
              </div>
              <Button onClick={() => onAddMealToToday(meal)}>
                {copy.addToToday}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
