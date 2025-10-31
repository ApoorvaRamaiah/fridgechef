import AsyncStorage from '@react-native-async-storage/async-storage';
import RatingService from './RatingService';

export interface UserPreference {
  dietaryRestrictions: string[]; // 'vegetarian', 'vegan', 'gluten-free'
  favoriteIngredients: string[];
  dislikedIngredients: string[];
  cuisinePreferences: string[]; // 'italian', 'mexican', 'asian', etc.
  maxCookingTime?: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface RecipeHistory {
  recipeId: number;
  viewedAt: number;
  viewCount: number;
  cookingAttempts?: number;
  lastCookedAt?: number;
}

export interface RecommendationScore {
  recipeId: number;
  score: number;
  reasons: string[];
}

class AdvancedRecommendationEngine {
  private static PREFERENCES_KEY = 'user_preferences';
  private static HISTORY_KEY = 'recipe_history';

  // Get user preferences
  async getUserPreferences(): Promise<UserPreference | null> {
    try {
      const stored = await AsyncStorage.getItem(AdvancedRecommendationEngine.PREFERENCES_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading preferences:', error);
      return null;
    }
  }

  // Save user preferences
  async saveUserPreferences(preferences: UserPreference): Promise<void> {
    try {
      await AsyncStorage.setItem(
        AdvancedRecommendationEngine.PREFERENCES_KEY,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  // Track recipe view
  async trackRecipeView(recipeId: number): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(AdvancedRecommendationEngine.HISTORY_KEY);
      const history: RecipeHistory[] = stored ? JSON.parse(stored) : [];

      const existingIndex = history.findIndex(h => h.recipeId === recipeId);
      
      if (existingIndex >= 0) {
        history[existingIndex].viewCount++;
        history[existingIndex].viewedAt = Date.now();
      } else {
        history.push({
          recipeId,
          viewedAt: Date.now(),
          viewCount: 1
        });
      }

      await AsyncStorage.setItem(
        AdvancedRecommendationEngine.HISTORY_KEY,
        JSON.stringify(history)
      );
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  }

  // Track cooking attempt
  async trackCookingAttempt(recipeId: number): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(AdvancedRecommendationEngine.HISTORY_KEY);
      const history: RecipeHistory[] = stored ? JSON.parse(stored) : [];

      const existingIndex = history.findIndex(h => h.recipeId === recipeId);
      
      if (existingIndex >= 0) {
        history[existingIndex].cookingAttempts = (history[existingIndex].cookingAttempts || 0) + 1;
        history[existingIndex].lastCookedAt = Date.now();
      } else {
        history.push({
          recipeId,
          viewedAt: Date.now(),
          viewCount: 1,
          cookingAttempts: 1,
          lastCookedAt: Date.now()
        });
      }

      await AsyncStorage.setItem(
        AdvancedRecommendationEngine.HISTORY_KEY,
        JSON.stringify(history)
      );
    } catch (error) {
      console.error('Error tracking cooking:', error);
    }
  }

  // Get recipe history
  async getRecipeHistory(): Promise<RecipeHistory[]> {
    try {
      const stored = await AsyncStorage.getItem(AdvancedRecommendationEngine.HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading history:', error);
      return [];
    }
  }

  // Calculate recommendation score for a recipe
  async calculateRecommendationScore(recipe: any): Promise<RecommendationScore> {
    const preferences = await this.getUserPreferences();
    const history = await this.getRecipeHistory();
    const ratings = await RatingService.getAllRatings();
    const recipeSummary = await RatingService.getRecipeRatingSummary(recipe.id);

    let score = 50; // Base score
    const reasons: string[] = [];

    // Factor 1: User ratings (30% weight)
    if (recipeSummary.totalRatings > 0) {
      const ratingScore = (recipeSummary.averageRating / 5) * 30;
      score += ratingScore;
      if (recipeSummary.averageRating >= 4) {
        reasons.push(`Highly rated (${recipeSummary.averageRating.toFixed(1)}⭐)`);
      }
    }

    // Factor 2: View history (20% weight)
    const recipeHistory = history.find(h => h.recipeId === recipe.id);
    if (recipeHistory) {
      const recency = Math.max(0, 1 - (Date.now() - recipeHistory.viewedAt) / (30 * 24 * 60 * 60 * 1000));
      const viewScore = Math.min(20, (recipeHistory.viewCount * 2 + recency * 10));
      score += viewScore;
      
      if (recipeHistory.cookingAttempts && recipeHistory.cookingAttempts > 0) {
        score += 10;
        reasons.push('Previously cooked');
      }
    }

    // Factor 3: Dietary preferences (25% weight)
    if (preferences) {
      let dietMatch = false;
      
      if (preferences.dietaryRestrictions.includes('vegan') && recipe.vegan) {
        score += 25;
        reasons.push('Vegan');
        dietMatch = true;
      } else if (preferences.dietaryRestrictions.includes('vegetarian') && recipe.vegetarian) {
        score += 20;
        reasons.push('Vegetarian');
        dietMatch = true;
      }
      
      if (preferences.dietaryRestrictions.includes('gluten-free') && recipe.glutenFree) {
        score += 15;
        reasons.push('Gluten-free');
        dietMatch = true;
      }
      
      // Penalize recipes that don't match diet restrictions
      if (!dietMatch && preferences.dietaryRestrictions.length > 0) {
        score -= 20;
      }
    }

    // Factor 4: Cooking time preferences (10% weight)
    if (preferences && preferences.maxCookingTime && recipe.readyInMinutes) {
      if (recipe.readyInMinutes <= preferences.maxCookingTime) {
        score += 10;
        reasons.push(`Quick (${recipe.readyInMinutes}min)`);
      } else {
        score -= 5;
      }
    }

    // Factor 5: Health score (10% weight)
    if (recipe.healthScore) {
      const healthBonus = (recipe.healthScore / 100) * 10;
      score += healthBonus;
      if (recipe.healthScore >= 70) {
        reasons.push('Healthy');
      }
    }

    // Factor 6: Ingredient availability (15% weight)
    if (recipe.usedIngredientCount && recipe.missedIngredientCount !== undefined) {
      const availabilityRatio = recipe.usedIngredientCount / (recipe.usedIngredientCount + recipe.missedIngredientCount);
      const availabilityScore = availabilityRatio * 15;
      score += availabilityScore;
      
      if (recipe.missedIngredientCount === 0) {
        reasons.push('All ingredients available');
      } else if (recipe.missedIngredientCount <= 2) {
        reasons.push('Most ingredients available');
      }
    }

    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score));

    return {
      recipeId: recipe.id,
      score,
      reasons
    };
  }

  // Get personalized recommendations
  async getPersonalizedRecommendations(recipes: any[], limit: number = 10): Promise<any[]> {
    const scoredRecipes = await Promise.all(
      recipes.map(async (recipe) => {
        const recommendation = await this.calculateRecommendationScore(recipe);
        return {
          ...recipe,
          recommendationScore: recommendation.score,
          recommendationReasons: recommendation.reasons
        };
      })
    );

    // Sort by score (descending) and return top N
    return scoredRecipes
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  }

  // Get trending recipes based on community engagement
  async getTrendingRecipes(recipes: any[]): Promise<any[]> {
    const ratings = await RatingService.getAllRatings();
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Count recent ratings for each recipe
    const trendingScores = new Map<number, number>();
    
    ratings
      .filter(r => r.timestamp >= oneWeekAgo)
      .forEach(rating => {
        const current = trendingScores.get(rating.recipeId) || 0;
        // Weight by rating value (higher ratings = more trending)
        trendingScores.set(rating.recipeId, current + rating.rating);
      });

    // Add trending scores to recipes
    return recipes
      .map(recipe => ({
        ...recipe,
        trendingScore: trendingScores.get(recipe.id) || 0
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore);
  }

  // Get similar recipes based on collaborative filtering
  async getSimilarRecipes(recipeId: number, allRecipes: any[], limit: number = 5): Promise<any[]> {
    const ratings = await RatingService.getAllRatings();
    
    // Find users who rated the target recipe highly (4+ stars)
    const similarUsers = ratings
      .filter(r => r.recipeId === recipeId && r.rating >= 4)
      .map(r => r.userName || 'anonymous');

    // Find other recipes these users rated highly
    const recommendedRecipeIds = new Map<number, number>();
    
    ratings
      .filter(r => similarUsers.includes(r.userName || 'anonymous') && r.recipeId !== recipeId && r.rating >= 4)
      .forEach(rating => {
        const current = recommendedRecipeIds.get(rating.recipeId) || 0;
        recommendedRecipeIds.set(rating.recipeId, current + 1);
      });

    // Sort by number of similar user ratings
    const sortedRecommendations = Array.from(recommendedRecipeIds.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    // Return matching recipes
    return allRecipes.filter(recipe => sortedRecommendations.includes(recipe.id));
  }

  // Learn from user behavior
  async updatePreferencesFromBehavior(): Promise<void> {
    const history = await this.getRecipeHistory();
    const ratings = await RatingService.getAllRatings();
    let preferences = await this.getUserPreferences();

    if (!preferences) {
      preferences = {
        dietaryRestrictions: [],
        favoriteIngredients: [],
        dislikedIngredients: [],
        cuisinePreferences: [],
        skillLevel: 'beginner'
      };
    }

    // Learn dietary restrictions from highly rated recipes
    const highlyRated = ratings.filter(r => r.rating >= 4);
    
    // This would need recipe data to be meaningful - placeholder logic
    // In production, you'd fetch recipe details and analyze patterns

    await this.saveUserPreferences(preferences);
  }
}

export default new AdvancedRecommendationEngine();
