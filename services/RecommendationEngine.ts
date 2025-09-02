import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserPreferences {
  dietaryRestrictions: string[];
  favoriteIngredients: string[];
  dislikedIngredients: string[];
  cuisinePreferences: string[];
  maxCookingTime: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface CookingHistory {
  recipeId: string;
  cookedAt: string;
  rating?: number;
  notes?: string;
}

class RecommendationEngine {
  private readonly STORAGE_KEYS = {
    PREFERENCES: 'userPreferences',
    COOKING_HISTORY: 'cookingHistory'
  };

  private defaultPreferences: UserPreferences = {
    dietaryRestrictions: [],
    favoriteIngredients: [],
    dislikedIngredients: [],
    cuisinePreferences: [],
    maxCookingTime: 60,
    skillLevel: 'beginner'
  };

  async getUserPreferences(): Promise<UserPreferences> {
    try {
      const saved = await AsyncStorage.getItem(this.STORAGE_KEYS.PREFERENCES);
      return saved ? JSON.parse(saved) : this.defaultPreferences;
    } catch (error) {
      console.error('Error loading preferences:', error);
      return this.defaultPreferences;
    }
  }

  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const current = await this.getUserPreferences();
      const updated = { ...current, ...preferences };
      await AsyncStorage.setItem(this.STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  async getPersonalizedRecommendations(
    availableIngredients: string[],
    recipes: any[]
  ): Promise<any[]> {
    const preferences = await this.getUserPreferences();
    
    const scoredRecipes = recipes.map(recipe => {
      const score = this.calculateRecipeScore(recipe, preferences, availableIngredients);
      return { ...recipe, personalScore: score };
    });

    return scoredRecipes.sort((a, b) => b.personalScore - a.personalScore);
  }

  private calculateRecipeScore(
    recipe: any,
    preferences: UserPreferences,
    availableIngredients: string[]
  ): number {
    let score = 0;

    // Base score from health and popularity
    score += (recipe.healthScore || 50) * 0.3;
    score += (recipe.spoonacularScore || 50) * 0.2;

    // Ingredient availability bonus
    const recipeIngredients = recipe.extendedIngredients?.map((ing: any) => ing.name.toLowerCase()) || [];
    const availabilityScore = this.calculateIngredientAvailability(recipeIngredients, availableIngredients);
    score += availabilityScore * 20;

    // Cooking time preference
    const cookingTime = recipe.readyInMinutes || 60;
    if (cookingTime <= preferences.maxCookingTime) {
      score += 15;
      if (cookingTime <= 30) score += 10;
    } else {
      score -= 10;
    }

    // Favorite ingredients bonus
    const favoriteBonus = this.calculateFavoriteIngredientsBonus(recipeIngredients, preferences.favoriteIngredients);
    score += favoriteBonus;

    // Disliked ingredients penalty
    const dislikedPenalty = this.calculateDislikedIngredientsPenalty(recipeIngredients, preferences.dislikedIngredients);
    score -= dislikedPenalty;

    return Math.max(0, Math.min(100, score));
  }

  private calculateIngredientAvailability(recipeIngredients: string[], availableIngredients: string[]): number {
    if (recipeIngredients.length === 0) return 0;
    
    const availableCount = recipeIngredients.filter(recipeIng => 
      availableIngredients.some(availableIng => 
        availableIng.toLowerCase().includes(recipeIng) || 
        recipeIng.includes(availableIng.toLowerCase())
      )
    ).length;
    
    return availableCount / recipeIngredients.length;
  }

  private calculateFavoriteIngredientsBonus(recipeIngredients: string[], favoriteIngredients: string[]): number {
    if (favoriteIngredients.length === 0) return 0;
    
    const favoriteCount = recipeIngredients.filter(recipeIng => 
      favoriteIngredients.some(favorite => 
        recipeIng.includes(favorite.toLowerCase())
      )
    ).length;
    
    return favoriteCount * 8;
  }

  private calculateDislikedIngredientsPenalty(recipeIngredients: string[], dislikedIngredients: string[]): number {
    if (dislikedIngredients.length === 0) return 0;
    
    const dislikedCount = recipeIngredients.filter(recipeIng => 
      dislikedIngredients.some(disliked => 
        recipeIng.includes(disliked.toLowerCase())
      )
    ).length;
    
    return dislikedCount * 15;
  }

  async getSuggestedIngredients(currentIngredients: string[]): Promise<string[]> {
    const preferences = await this.getUserPreferences();
    const suggestions = new Set<string>();
    
    // Add favorite ingredients
    preferences.favoriteIngredients.forEach(ing => suggestions.add(ing));
    
    // Add complementary ingredients
    const complementary = this.getComplementaryIngredients(currentIngredients);
    complementary.forEach(ing => suggestions.add(ing));
    
    // Filter out existing and disliked ingredients
    return Array.from(suggestions)
      .filter(ing => 
        !currentIngredients.some(current => current.toLowerCase().includes(ing.toLowerCase())) &&
        !preferences.dislikedIngredients.some(disliked => disliked.toLowerCase().includes(ing.toLowerCase()))
      )
      .slice(0, 8);
  }

  private getComplementaryIngredients(ingredients: string[]): string[] {
    const complementaryMap: Record<string, string[]> = {
      'tomato': ['basil', 'mozzarella', 'garlic', 'olive oil'],
      'chicken': ['rosemary', 'thyme', 'lemon', 'garlic'],
      'pasta': ['parmesan', 'basil', 'garlic', 'olive oil'],
      'rice': ['soy sauce', 'ginger', 'scallions'],
      'beef': ['onion', 'garlic', 'mushrooms'],
      'salmon': ['dill', 'lemon', 'capers'],
      'potato': ['rosemary', 'thyme', 'garlic', 'butter']
    };

    const suggestions = new Set<string>();
    
    ingredients.forEach(ingredient => {
      const lowerIngredient = ingredient.toLowerCase();
      Object.keys(complementaryMap).forEach(key => {
        if (lowerIngredient.includes(key)) {
          complementaryMap[key].forEach(complement => suggestions.add(complement));
        }
      });
    });
    
    return Array.from(suggestions);
  }
}

export default new RecommendationEngine();
