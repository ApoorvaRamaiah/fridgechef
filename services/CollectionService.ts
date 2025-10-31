import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecipeCollection {
  id: string;
  name: string;
  description?: string;
  recipeIds: number[];
  color: string;
  icon: string;
  createdAt: number;
  updatedAt: number;
}

class CollectionService {
  private static STORAGE_KEY = 'recipe_collections';

  // Get all collections
  async getAllCollections(): Promise<RecipeCollection[]> {
    try {
      const stored = await AsyncStorage.getItem(CollectionService.STORAGE_KEY);
      if (!stored) return this.getDefaultCollections();
      
      const collections: RecipeCollection[] = JSON.parse(stored);
      return collections.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Error loading collections:', error);
      return this.getDefaultCollections();
    }
  }

  // Get default collections
  private getDefaultCollections(): RecipeCollection[] {
    return [
      {
        id: 'favorites',
        name: 'Favorites',
        description: 'My favorite recipes',
        recipeIds: [],
        color: '#FF6B6B',
        icon: '❤️',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'quick-meals',
        name: 'Quick Meals',
        description: 'Recipes ready in 30 minutes or less',
        recipeIds: [],
        color: '#4ECDC4',
        icon: '⚡',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'healthy',
        name: 'Healthy',
        description: 'Nutritious and balanced meals',
        recipeIds: [],
        color: '#95E1D3',
        icon: '🥗',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
  }

  // Get single collection
  async getCollection(collectionId: string): Promise<RecipeCollection | null> {
    const collections = await this.getAllCollections();
    return collections.find(c => c.id === collectionId) || null;
  }

  // Create new collection
  async createCollection(
    name: string,
    description?: string,
    color: string = '#6C5CE7',
    icon: string = '📁'
  ): Promise<RecipeCollection> {
    try {
      const collections = await this.getAllCollections();
      
      const newCollection: RecipeCollection = {
        id: `collection_${Date.now()}`,
        name,
        description,
        recipeIds: [],
        color,
        icon,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      collections.push(newCollection);
      await AsyncStorage.setItem(CollectionService.STORAGE_KEY, JSON.stringify(collections));
      
      return newCollection;
    } catch (error) {
      console.error('Error creating collection:', error);
      throw error;
    }
  }

  // Update collection
  async updateCollection(collectionId: string, updates: Partial<RecipeCollection>): Promise<void> {
    try {
      const collections = await this.getAllCollections();
      const index = collections.findIndex(c => c.id === collectionId);
      
      if (index === -1) {
        throw new Error('Collection not found');
      }

      collections[index] = {
        ...collections[index],
        ...updates,
        updatedAt: Date.now()
      };

      await AsyncStorage.setItem(CollectionService.STORAGE_KEY, JSON.stringify(collections));
    } catch (error) {
      console.error('Error updating collection:', error);
      throw error;
    }
  }

  // Delete collection
  async deleteCollection(collectionId: string): Promise<void> {
    try {
      const collections = await this.getAllCollections();
      const filtered = collections.filter(c => c.id !== collectionId);
      
      await AsyncStorage.setItem(CollectionService.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting collection:', error);
      throw error;
    }
  }

  // Add recipe to collection
  async addRecipeToCollection(collectionId: string, recipeId: number): Promise<void> {
    try {
      const collections = await this.getAllCollections();
      const collection = collections.find(c => c.id === collectionId);
      
      if (!collection) {
        throw new Error('Collection not found');
      }

      if (!collection.recipeIds.includes(recipeId)) {
        collection.recipeIds.push(recipeId);
        collection.updatedAt = Date.now();
        
        await AsyncStorage.setItem(CollectionService.STORAGE_KEY, JSON.stringify(collections));
      }
    } catch (error) {
      console.error('Error adding recipe to collection:', error);
      throw error;
    }
  }

  // Remove recipe from collection
  async removeRecipeFromCollection(collectionId: string, recipeId: number): Promise<void> {
    try {
      const collections = await this.getAllCollections();
      const collection = collections.find(c => c.id === collectionId);
      
      if (!collection) {
        throw new Error('Collection not found');
      }

      collection.recipeIds = collection.recipeIds.filter(id => id !== recipeId);
      collection.updatedAt = Date.now();
      
      await AsyncStorage.setItem(CollectionService.STORAGE_KEY, JSON.stringify(collections));
    } catch (error) {
      console.error('Error removing recipe from collection:', error);
      throw error;
    }
  }

  // Get collections containing a recipe
  async getCollectionsForRecipe(recipeId: number): Promise<RecipeCollection[]> {
    const collections = await this.getAllCollections();
    return collections.filter(c => c.recipeIds.includes(recipeId));
  }

  // Get recipes in a collection
  async getRecipesInCollection(collectionId: string): Promise<number[]> {
    const collection = await this.getCollection(collectionId);
    return collection ? collection.recipeIds : [];
  }
}

export default new CollectionService();
