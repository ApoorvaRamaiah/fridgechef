import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserPreferences {
  dietaryRestrictions: string[];
  favoriteIngredients: string[];
  dislikedIngredients: string[];
  cuisinePreferences: string[];
  maxCookingTime: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface RecipeScore {
  recipeId: string;
  score: number;
  reasons: string[];
}

export interface CookingHistory {
  recipeId: string;
  cookedAt: string;
  rating?: number;
  notes?: string;
}

class RecommendationService {
  private readonly STORAGE_KEYS = {
    PREFERENCES: 'userPreferences',
    COOKING_HISTORY: 'cookingHistory',
    RECIPE_RATINGS: 'recipeRatings'
  };

  // Default preferences for new users
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

  async getCookingHistory(): Promise<CookingHistory[]> {
    try {
      const saved = await AsyncStorage.getItem(this.STORAGE_KEYS.COOKING_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading cooking history:', error);
      return [];
    }
  }

  async addToCookingHistory(recipeId: string, rating?: number, notes?: string): Promise<void> {
    try {
      const history = await this.getCookingHistory();
      const newEntry: CookingHistory = {
        recipeId,
        cookedAt: new Date().toISOString(),
        rating,
        notes
      };
      
      // Remove any existing entry for this recipe and add the new one
      const updatedHistory = [newEntry, ...history.filter(h => h.recipeId !== recipeId)];
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.COOKING_HISTORY, JSON.stringify(updatedHistory));
    } catch (error) {\n      console.error('Error saving to cooking history:', error);\n    }\n  }\n\n  async getPersonalizedRecommendations(\n    availableIngredients: string[],\n    recipes: any[]\n  ): Promise<any[]> {\n    const preferences = await this.getUserPreferences();\n    const cookingHistory = await this.getCookingHistory();\n    \n    const scoredRecipes = recipes.map(recipe => {\n      const score = this.calculateRecipeScore(recipe, preferences, cookingHistory, availableIngredients);\n      return { ...recipe, personalScore: score };\n    });\n\n    // Sort by personal score (highest first)\n    return scoredRecipes.sort((a, b) => b.personalScore - a.personalScore);\n  }\n\n  private calculateRecipeScore(\n    recipe: any,\n    preferences: UserPreferences,\n    history: CookingHistory[],\n    availableIngredients: string[]\n  ): number {\n    let score = 0;\n    const reasons: string[] = [];\n\n    // Base score from Spoonacular's healthScore and spoonacularScore\n    score += (recipe.healthScore || 50) * 0.3;\n    score += (recipe.spoonacularScore || 50) * 0.2;\n\n    // Ingredient availability bonus\n    const recipeIngredients = recipe.extendedIngredients?.map((ing: any) => ing.name.toLowerCase()) || [];\n    const availabilityScore = this.calculateIngredientAvailability(recipeIngredients, availableIngredients);\n    score += availabilityScore * 20;\n    if (availabilityScore > 0.8) reasons.push('Most ingredients available');\n\n    // Cooking time preference\n    const cookingTime = recipe.readyInMinutes || 60;\n    if (cookingTime <= preferences.maxCookingTime) {\n      score += 15;\n      if (cookingTime <= 30) {\n        score += 10;\n        reasons.push('Quick to make');\n      }\n    } else {\n      score -= 10;\n    }\n\n    // Favorite ingredients bonus\n    const favoriteBonus = this.calculateFavoriteIngredientsBonus(recipeIngredients, preferences.favoriteIngredients);\n    score += favoriteBonus;\n    if (favoriteBonus > 0) reasons.push('Contains favorite ingredients');\n\n    // Disliked ingredients penalty\n    const dislikedPenalty = this.calculateDislikedIngredientsPenalty(recipeIngredients, preferences.dislikedIngredients);\n    score -= dislikedPenalty;\n    if (dislikedPenalty > 0) reasons.push('Contains disliked ingredients');\n\n    // Cooking history bonus (if cooked before and rated highly)\n    const historyEntry = history.find(h => h.recipeId === recipe.id.toString());\n    if (historyEntry?.rating) {\n      score += historyEntry.rating * 5;\n      if (historyEntry.rating >= 4) reasons.push('You loved this before!');\n    }\n\n    // Dietary restrictions compliance\n    if (this.checkDietaryCompliance(recipe, preferences.dietaryRestrictions)) {\n      score += 10;\n      reasons.push('Matches dietary preferences');\n    }\n\n    // Skill level appropriateness\n    const skillBonus = this.calculateSkillLevelBonus(recipe, preferences.skillLevel);\n    score += skillBonus;\n    if (skillBonus > 0) reasons.push('Appropriate for your skill level');\n\n    return Math.max(0, Math.min(100, score));\n  }\n\n  private calculateIngredientAvailability(recipeIngredients: string[], availableIngredients: string[]): number {\n    if (recipeIngredients.length === 0) return 0;\n    \n    const availableCount = recipeIngredients.filter(recipeIng => \n      availableIngredients.some(availableIng => \n        availableIng.toLowerCase().includes(recipeIng) || \n        recipeIng.includes(availableIng.toLowerCase())\n      )\n    ).length;\n    \n    return availableCount / recipeIngredients.length;\n  }\n\n  private calculateFavoriteIngredientsBonus(recipeIngredients: string[], favoriteIngredients: string[]): number {\n    if (favoriteIngredients.length === 0) return 0;\n    \n    const favoriteCount = recipeIngredients.filter(recipeIng => \n      favoriteIngredients.some(favorite => \n        recipeIng.includes(favorite.toLowerCase())\n      )\n    ).length;\n    \n    return favoriteCount * 8; // 8 points per favorite ingredient\n  }\n\n  private calculateDislikedIngredientsPenalty(recipeIngredients: string[], dislikedIngredients: string[]): number {\n    if (dislikedIngredients.length === 0) return 0;\n    \n    const dislikedCount = recipeIngredients.filter(recipeIng => \n      dislikedIngredients.some(disliked => \n        recipeIng.includes(disliked.toLowerCase())\n      )\n    ).length;\n    \n    return dislikedCount * 15; // 15 point penalty per disliked ingredient\n  }\n\n  private checkDietaryCompliance(recipe: any, dietaryRestrictions: string[]): boolean {\n    // This would need to be enhanced based on Spoonacular's diet tags\n    if (dietaryRestrictions.includes('vegetarian') && !recipe.vegetarian) return false;\n    if (dietaryRestrictions.includes('vegan') && !recipe.vegan) return false;\n    if (dietaryRestrictions.includes('glutenFree') && !recipe.glutenFree) return false;\n    return true;\n  }\n\n  private calculateSkillLevelBonus(recipe: any, skillLevel: string): number {\n    // Estimate complexity based on cooking time and instruction length\n    const complexity = this.estimateRecipeComplexity(recipe);\n    \n    switch (skillLevel) {\n      case 'beginner':\n        return complexity === 'easy' ? 10 : complexity === 'medium' ? 0 : -10;\n      case 'intermediate':\n        return complexity === 'medium' ? 10 : 5;\n      case 'advanced':\n        return complexity === 'hard' ? 15 : 8;\n      default:\n        return 0;\n    }\n  }\n\n  private estimateRecipeComplexity(recipe: any): 'easy' | 'medium' | 'hard' {\n    const cookingTime = recipe.readyInMinutes || 30;\n    const instructionLength = recipe.instructions?.length || 0;\n    const ingredientCount = recipe.extendedIngredients?.length || 0;\n    \n    const complexityScore = (cookingTime / 10) + (instructionLength / 100) + ingredientCount;\n    \n    if (complexityScore < 15) return 'easy';\n    if (complexityScore < 30) return 'medium';\n    return 'hard';\n  }\n\n  async getSuggestedIngredients(currentIngredients: string[]): Promise<string[]> {\n    const preferences = await this.getUserPreferences();\n    const history = await this.getCookingHistory();\n    \n    // Get ingredients from previously cooked and highly rated recipes\n    const frequentIngredients = new Set<string>();\n    \n    // Add favorite ingredients\n    preferences.favoriteIngredients.forEach(ing => frequentIngredients.add(ing));\n    \n    // Add complementary ingredients based on what's already in fridge\n    const complementaryIngredients = this.getComplementaryIngredients(currentIngredients);\n    complementaryIngredients.forEach(ing => frequentIngredients.add(ing));\n    \n    // Filter out ingredients already in fridge and disliked ingredients\n    return Array.from(frequentIngredients)\n      .filter(ing => \n        !currentIngredients.some(current => current.toLowerCase().includes(ing.toLowerCase())) &&\n        !preferences.dislikedIngredients.some(disliked => disliked.toLowerCase().includes(ing.toLowerCase()))\n      )\n      .slice(0, 8); // Limit suggestions\n  }\n\n  private getComplementaryIngredients(ingredients: string[]): string[] {\n    const complementaryMap: Record<string, string[]> = {\n      'tomato': ['basil', 'mozzarella', 'garlic', 'olive oil'],\n      'chicken': ['rosemary', 'thyme', 'lemon', 'garlic'],\n      'pasta': ['parmesan', 'basil', 'garlic', 'olive oil'],\n      'rice': ['soy sauce', 'ginger', 'scallions', 'sesame oil'],\n      'beef': ['onion', 'garlic', 'worcestershire sauce', 'mushrooms'],\n      'salmon': ['dill', 'lemon', 'capers', 'asparagus'],\n      'potato': ['rosemary', 'thyme', 'garlic', 'butter'],\n      'avocado': ['lime', 'cilantro', 'jalapeño', 'red onion']\n    };\n\n    const suggestions = new Set<string>();\n    \n    ingredients.forEach(ingredient => {\n      const lowerIngredient = ingredient.toLowerCase();\n      Object.keys(complementaryMap).forEach(key => {\n        if (lowerIngredient.includes(key)) {\n          complementaryMap[key].forEach(complement => suggestions.add(complement));\n        }\n      });\n    });\n    \n    return Array.from(suggestions);\n  }\n\n  async getRecipeOfTheDay(): Promise<any | null> {\n    try {\n      // Check if we already fetched today's recipe\n      const today = new Date().toDateString();\n      const savedData = await AsyncStorage.getItem('recipeOfTheDay');\n      \n      if (savedData) {\n        const { date, recipe } = JSON.parse(savedData);\n        if (date === today) {\n          return recipe;\n        }\n      }\n\n      // Fetch a new recipe of the day\n      const preferences = await this.getUserPreferences();\n      let dietParam = '';\n      \n      if (preferences.dietaryRestrictions.includes('vegetarian')) dietParam = '&diet=vegetarian';\n      if (preferences.dietaryRestrictions.includes('vegan')) dietParam = '&diet=vegan';\n      \n      const url = `https://api.spoonacular.com/recipes/random?number=1&apiKey=${process.env.EXPO_PUBLIC_SPOONACULAR_KEY}${dietParam}`;\n      \n      const response = await fetch(url);\n      const data = await response.json();\n      const recipe = data.recipes?.[0];\n      \n      if (recipe) {\n        // Save for today\n        await AsyncStorage.setItem('recipeOfTheDay', JSON.stringify({\n          date: today,\n          recipe\n        }));\n      }\n      \n      return recipe;\n    } catch (error) {\n      console.error('Error fetching recipe of the day:', error);\n      return null;\n    }\n  }\n\n  async getSeasonalRecommendations(): Promise<string[]> {\n    const currentMonth = new Date().getMonth();\n    \n    const seasonalIngredients: Record<string, string[]> = {\n      'winter': ['butternut squash', 'sweet potato', 'brussels sprouts', 'cranberries', 'pomegranate'],\n      'spring': ['asparagus', 'artichoke', 'peas', 'strawberries', 'rhubarb'],\n      'summer': ['tomatoes', 'corn', 'zucchini', 'peaches', 'berries'],\n      'fall': ['pumpkin', 'apples', 'pears', 'root vegetables', 'persimmons']\n    };\n\n    let season: string;\n    if ([11, 0, 1].includes(currentMonth)) season = 'winter';\n    else if ([2, 3, 4].includes(currentMonth)) season = 'spring';\n    else if ([5, 6, 7].includes(currentMonth)) season = 'summer';\n    else season = 'fall';\n\n    return seasonalIngredients[season] || [];\n  }\n\n  async getTrendingRecipes(): Promise<any[]> {\n    try {\n      // This would typically call a trending recipes API\n      const url = `https://api.spoonacular.com/recipes/random?number=5&tags=popular&apiKey=${process.env.EXPO_PUBLIC_SPOONACULAR_KEY}`;\n      \n      const response = await fetch(url);\n      const data = await response.json();\n      \n      return data.recipes || [];\n    } catch (error) {\n      console.error('Error fetching trending recipes:', error);\n      return [];\n    }\n  }\n\n  async getHealthyAlternatives(recipeId: string): Promise<any[]> {\n    try {\n      // Get similar recipes with better health scores\n      const url = `https://api.spoonacular.com/recipes/${recipeId}/similar?number=3&apiKey=${process.env.EXPO_PUBLIC_SPOONACULAR_KEY}`;\n      \n      const response = await fetch(url);\n      const data = await response.json();\n      \n      return data || [];\n    } catch (error) {\n      console.error('Error fetching healthy alternatives:', error);\n      return [];\n    }\n  }\n\n  async updateIngredientPreference(ingredient: string, liked: boolean): Promise<void> {\n    const preferences = await this.getUserPreferences();\n    \n    if (liked) {\n      if (!preferences.favoriteIngredients.includes(ingredient)) {\n        preferences.favoriteIngredients.push(ingredient);\n      }\n      // Remove from disliked if it was there\n      preferences.dislikedIngredients = preferences.dislikedIngredients.filter(ing => ing !== ingredient);\n    } else {\n      if (!preferences.dislikedIngredients.includes(ingredient)) {\n        preferences.dislikedIngredients.push(ingredient);\n      }\n      // Remove from favorites if it was there\n      preferences.favoriteIngredients = preferences.favoriteIngredients.filter(ing => ing !== ingredient);\n    }\n    \n    await this.updateUserPreferences(preferences);\n  }\n}\n\nexport default new RecommendationService();
