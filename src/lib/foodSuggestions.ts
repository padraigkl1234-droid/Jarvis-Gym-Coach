/**
 * Rule-based meal suggestions: given how many calories/protein/carbs/fat you
 * have left today, rank a curated food library by how well each option fits
 * — prioritizing whichever macro you're proportionally furthest behind on,
 * without blowing past what's left of the others. No AI call, instant.
 */

export type DietTag = 'vegetarian' | 'vegan' | 'pescatarian';
export const DIETARY_STYLES = ['No preference', 'Vegetarian', 'Vegan', 'Pescatarian'] as const;

export interface FoodOption {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  diet: DietTag[]; // omnivore if empty
}

export const FOOD_LIBRARY: FoodOption[] = [
  // High protein, lean
  { name: 'Grilled Chicken Breast (150g)', calories: 248, proteinG: 46, carbsG: 0, fatG: 5, diet: [] },
  { name: 'Greek Yoghurt, plain (200g)', calories: 130, proteinG: 22, carbsG: 9, fatG: 0, diet: ['vegetarian'] },
  { name: 'Cottage Cheese (200g)', calories: 180, proteinG: 24, carbsG: 6, fatG: 5, diet: ['vegetarian'] },
  { name: 'Tuna, in water (1 can)', calories: 140, proteinG: 32, carbsG: 0, fatG: 1, diet: ['pescatarian'] },
  { name: 'Egg Whites (6)', calories: 106, proteinG: 22, carbsG: 2, fatG: 0, diet: ['vegetarian'] },
  { name: 'Whey Protein Shake', calories: 120, proteinG: 24, carbsG: 3, fatG: 1, diet: ['vegetarian'] },
  { name: 'Turkey Breast (150g)', calories: 165, proteinG: 34, carbsG: 0, fatG: 2, diet: [] },
  { name: 'Prawns (150g)', calories: 150, proteinG: 32, carbsG: 1, fatG: 2, diet: ['pescatarian'] },
  { name: 'Tofu, firm (200g)', calories: 176, proteinG: 20, carbsG: 4, fatG: 10, diet: ['vegetarian', 'vegan'] },

  // Balanced meals
  { name: 'Chicken & Rice Bowl', calories: 520, proteinG: 40, carbsG: 60, fatG: 12, diet: [] },
  { name: 'Salmon, Sweet Potato & Greens', calories: 560, proteinG: 38, carbsG: 45, fatG: 22, diet: ['pescatarian'] },
  { name: 'Turkey Wrap', calories: 420, proteinG: 32, carbsG: 40, fatG: 14, diet: [] },
  { name: 'Beef Stir Fry with Rice', calories: 580, proteinG: 36, carbsG: 55, fatG: 20, diet: [] },
  { name: 'Tofu & Veg Stir Fry', calories: 400, proteinG: 24, carbsG: 45, fatG: 14, diet: ['vegetarian', 'vegan'] },
  { name: 'Lentil & Rice Bowl', calories: 450, proteinG: 20, carbsG: 70, fatG: 8, diet: ['vegetarian', 'vegan'] },
  { name: 'Protein Pasta Bolognese', calories: 620, proteinG: 42, carbsG: 65, fatG: 18, diet: [] },
  { name: 'Whole Eggs, 3 (scrambled)', calories: 234, proteinG: 19, carbsG: 1, fatG: 15, diet: ['vegetarian'] },

  // Carb-forward
  { name: 'Banana', calories: 105, proteinG: 1, carbsG: 27, fatG: 0, diet: ['vegetarian', 'vegan'] },
  { name: 'Oats with Milk (80g)', calories: 380, proteinG: 15, carbsG: 60, fatG: 8, diet: ['vegetarian'] },
  { name: 'White Rice, cooked (200g)', calories: 260, proteinG: 5, carbsG: 56, fatG: 1, diet: ['vegetarian', 'vegan'] },
  { name: 'Sweet Potato, baked (250g)', calories: 215, proteinG: 4, carbsG: 50, fatG: 0, diet: ['vegetarian', 'vegan'] },
  { name: 'Wholegrain Bagel', calories: 280, proteinG: 11, carbsG: 55, fatG: 2, diet: ['vegetarian', 'vegan'] },
  { name: 'Pasta, plain (200g)', calories: 280, proteinG: 10, carbsG: 56, fatG: 2, diet: ['vegetarian', 'vegan'] },

  // Fat-forward
  { name: 'Almonds (30g)', calories: 174, proteinG: 6, carbsG: 6, fatG: 15, diet: ['vegetarian', 'vegan'] },
  { name: 'Peanut Butter (2 tbsp)', calories: 190, proteinG: 8, carbsG: 6, fatG: 16, diet: ['vegetarian', 'vegan'] },
  { name: 'Avocado (1 medium)', calories: 240, proteinG: 3, carbsG: 12, fatG: 22, diet: ['vegetarian', 'vegan'] },
  { name: 'Cheddar Cheese (50g)', calories: 200, proteinG: 12, carbsG: 1, fatG: 17, diet: ['vegetarian'] },

  // Snacks
  { name: 'Protein Bar', calories: 220, proteinG: 20, carbsG: 22, fatG: 8, diet: ['vegetarian'] },
  { name: 'Apple with Peanut Butter', calories: 240, proteinG: 5, carbsG: 28, fatG: 12, diet: ['vegetarian', 'vegan'] },
  { name: 'Rice Cakes with Cottage Cheese', calories: 160, proteinG: 14, carbsG: 20, fatG: 2, diet: ['vegetarian'] },
  { name: 'Hummus & Veg Sticks', calories: 200, proteinG: 7, carbsG: 18, fatG: 11, diet: ['vegetarian', 'vegan'] },
];

export interface Remaining {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Targets {
  calorieTarget: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
}

export interface Suggestion {
  food: FoodOption;
  reason: string;
}

function dietFilter(diet: string | undefined) {
  const d = (diet ?? '').toLowerCase();
  if (d.includes('vegan')) return (f: FoodOption) => f.diet.includes('vegan');
  if (d.includes('pescatarian')) return (f: FoodOption) => f.diet.includes('vegetarian') || f.diet.includes('pescatarian');
  if (d.includes('vegetarian')) return (f: FoodOption) => f.diet.includes('vegetarian');
  return () => true;
}

/** Ranks the food library against what's left of today's targets. */
export function suggestMeals(remaining: Remaining, targets: Targets, dietaryStyle?: string): Suggestion[] {
  if (remaining.calories <= 0) return [];

  // Which macro is proportionally most behind (most room left relative to its target)?
  const ratios: { macro: 'proteinG' | 'carbsG' | 'fatG'; label: string; room: number }[] = [
    { macro: 'proteinG', label: 'protein', room: targets.proteinTargetG > 0 ? remaining.proteinG / targets.proteinTargetG : 0 },
    { macro: 'carbsG', label: 'carbs', room: targets.carbsTargetG > 0 ? remaining.carbsG / targets.carbsTargetG : 0 },
    { macro: 'fatG', label: 'fat', room: targets.fatTargetG > 0 ? remaining.fatG / targets.fatTargetG : 0 },
  ];
  const priority = ratios.sort((a, b) => b.room - a.room)[0];

  const buffer = 0.25; // allow options that overshoot a single remaining macro by up to 25%, calories excepted
  const candidates = FOOD_LIBRARY.filter(dietFilter(dietaryStyle)).filter(
    (f) =>
      f.calories <= remaining.calories + 60 &&
      f.carbsG <= remaining.carbsG * (1 + buffer) + 10 &&
      f.fatG <= remaining.fatG * (1 + buffer) + 5
  );

  const scored = candidates.map((f) => {
    const density = f.calories > 0 ? f[priority.macro] / f.calories : 0; // macro grams per calorie
    const closeness = 1 - Math.abs(remaining.calories - f.calories) / Math.max(remaining.calories, f.calories, 1);
    return { food: f, score: density * 100 + closeness };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map(({ food }) => {
    const macroG = food[priority.macro];
    const reason =
      priority.room > 0.4
        ? `${macroG}g ${priority.label} — you're behind on ${priority.label} today`
        : `Fits your remaining ${Math.round(remaining.calories)} kcal well`;
    return { food, reason };
  });
}
