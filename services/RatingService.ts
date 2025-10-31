import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecipeRating {
  recipeId: number;
  rating: number; // 1-5 stars
  review?: string;
  timestamp: number;
  userName?: string;
}

export interface RecipeRatingSummary {
  recipeId: number;
  averageRating: number;
  totalRatings: number;
  ratings: RecipeRating[];
}

class RatingService {
  private static STORAGE_KEY = 'recipe_ratings';

  // Get all ratings for a specific recipe
  async getRecipeRatings(recipeId: number): Promise<RecipeRating[]> {
    try {
      const stored = await AsyncStorage.getItem(this.constructor['STORAGE_KEY']);
      if (!stored) return [];
      
      const allRatings: RecipeRating[] = JSON.parse(stored);
      return allRatings.filter(r => r.recipeId === recipeId);
    } catch (error) {
      console.error('Error loading ratings:', error);
      return [];
    }
  }

  // Get rating summary for a recipe
  async getRecipeRatingSummary(recipeId: number): Promise<RecipeRatingSummary> {
    const ratings = await this.getRecipeRatings(recipeId);
    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings 
      : 0;

    return {
      recipeId,
      averageRating,
      totalRatings,
      ratings
    };
  }

  // Add or update a rating
  async addRating(rating: RecipeRating): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(RatingService.STORAGE_KEY);
      const allRatings: RecipeRating[] = stored ? JSON.parse(stored) : [];
      
      // Remove existing rating for this recipe if any (one rating per user per recipe)
      const filtered = allRatings.filter(r => r.recipeId !== rating.recipeId);
      
      // Add new rating
      filtered.push({
        ...rating,
        timestamp: Date.now()
      });
      
      await AsyncStorage.setItem(RatingService.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error saving rating:', error);
      throw error;
    }
  }

  // Get user's rating for a specific recipe
  async getUserRating(recipeId: number): Promise<RecipeRating | null> {
    const ratings = await this.getRecipeRatings(recipeId);
    return ratings.length > 0 ? ratings[0] : null;
  }

  // Get all ratings sorted by most recent
  async getAllRatings(): Promise<RecipeRating[]> {
    try {
      const stored = await AsyncStorage.getItem(RatingService.STORAGE_KEY);
      if (!stored) return [];
      
      const allRatings: RecipeRating[] = JSON.parse(stored);
      return allRatings.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error loading all ratings:', error);
      return [];
    }
  }

  // Delete a rating
  async deleteRating(recipeId: number): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(RatingService.STORAGE_KEY);
      if (!stored) return;
      
      const allRatings: RecipeRating[] = JSON.parse(stored);
      const filtered = allRatings.filter(r => r.recipeId !== recipeId);
      
      await AsyncStorage.setItem(RatingService.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting rating:', error);
      throw error;
    }
  }
}

export default new RatingService();
