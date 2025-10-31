import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image, TouchableOpacity, Alert, TextInput, Modal } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import RatingService, { RecipeRatingSummary } from '../../services/RatingService';

export default function RecipeDetailsScreen() {
  const { id } = useLocalSearchParams(); // dynamic route param
  const router = useRouter();
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [missingIngredients, setMissingIngredients] = useState<string[]>([]);
  const [servings, setServings] = useState(1);
  const [ratingSummary, setRatingSummary] = useState<RecipeRatingSummary | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');

  useEffect(() => {
    const fetchRecipeDetails = async () => {
      try {
        const url = `https://api.spoonacular.com/recipes/${id}/information?includeNutrition=true&apiKey=${process.env.EXPO_PUBLIC_SPOONACULAR_KEY}`;
        console.log("Fetching details:", url);

        const response = await fetch(url);
        const data = await response.json();
        setRecipe(data);
        setServings(data.servings || 1);
        
        // Check if recipe is in favorites
        const savedFavorites = await AsyncStorage.getItem('favoriteRecipes');
        if (savedFavorites) {
          const favorites = JSON.parse(savedFavorites);
          setIsFavorite(favorites.some((fav: any) => fav.id === id));
        }
        
        // Check for missing ingredients
        const savedIngredients = await AsyncStorage.getItem('fridgeIngredients');
        if (savedIngredients && data.extendedIngredients) {
          const fridgeIngredients = JSON.parse(savedIngredients);
          const missing = data.extendedIngredients.filter((ing: any) => 
            !fridgeIngredients.some((fridgeIng: string) => 
              ing.name.toLowerCase().includes(fridgeIng.toLowerCase())
            )
          ).map((ing: any) => ing.name);
          setMissingIngredients(missing);
        }
      } catch (err) {
        console.error("Error fetching recipe details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipeDetails();
    loadRating();
  }, [id]);
  
  const loadRating = async () => {
    const recipeId = parseInt(id as string);
    const summary = await RatingService.getRecipeRatingSummary(recipeId);
    setRatingSummary(summary);
    
    // Load user's existing rating if any
    const existing = await RatingService.getUserRating(recipeId);
    if (existing) {
      setUserRating(existing.rating);
      setUserReview(existing.review || '');
    }
  };
  
  const toggleFavorite = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem('favoriteRecipes');
      let favorites = savedFavorites ? JSON.parse(savedFavorites) : [];
      
      if (isFavorite) {
        // Remove from favorites
        favorites = favorites.filter((fav: any) => fav.id !== id);
        setIsFavorite(false);
      } else {
        // Add to favorites
        favorites.push({
          id: recipe.id,
          title: recipe.title,
          image: recipe.image
        });
        setIsFavorite(true);
      }
      
      await AsyncStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };
  
  const orderMissingIngredients = () => {
    if (missingIngredients.length === 0) return;
    
    // Navigate to grocery ordering screen with missing ingredients and servings
    router.push(`/grocery-order?missingIngredients=${missingIngredients.join(',')}&servings=${servings}`);
  };
  
  const addToShoppingList = async () => {
    if (missingIngredients.length === 0) return;
    
    try {
      const saved = await AsyncStorage.getItem('shoppingList');
      const shoppingList = saved ? JSON.parse(saved) : [];
      
      // Add missing ingredients to shopping list
      missingIngredients.forEach(ingredient => {
        // Check if item already exists
        const exists = shoppingList.find((item: any) => 
          item.name.toLowerCase() === ingredient.toLowerCase()
        );
        
        if (!exists) {
          shoppingList.push({
            id: Date.now().toString() + Math.random(),
            name: ingredient,
            quantity: 1,
            unit: 'piece',
            checked: false,
            source: 'recipe'
          });
        }
      });
      
      await AsyncStorage.setItem('shoppingList', JSON.stringify(shoppingList));
      Alert.alert(
        'Added to Shopping List',
        `${missingIngredients.length} items added to your shopping list`,
        [
          { text: 'OK' },
          { text: 'View List', onPress: () => router.push('/shopping-list') }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add items to shopping list');
    }
  };
  
  const adjustServings = (delta: number) => {
    const newServings = Math.max(1, servings + delta);
    setServings(newServings);
  };
  
  const getScaledQuantity = (originalAmount: string, originalServings: number) => {
    const servingMultiplier = servings / originalServings;
    // Extract number from string like "2 cups" or "1.5"
    const match = originalAmount.match(/([0-9.]+)/);
    if (match) {
      const originalQty = parseFloat(match[1]);
      const scaledQty = (originalQty * servingMultiplier).toFixed(2).replace(/\.?0+$/, '');
      return originalAmount.replace(match[1], scaledQty);
    }
    return originalAmount;
  };
  
  const submitRating = async () => {
    if (userRating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }
    
    try {
      await RatingService.addRating({
        recipeId: parseInt(id as string),
        rating: userRating,
        review: userReview,
        timestamp: Date.now()
      });
      
      await loadRating();
      setShowRatingModal(false);
      Alert.alert('Success', 'Your rating has been saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save rating');
    }
  };
  
  const renderStars = (rating: number, interactive: boolean = false, onPress?: (rating: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            disabled={!interactive}
            onPress={() => onPress && onPress(star)}
          >
            <Text style={[styles.star, interactive && styles.interactiveStar]}>
              {star <= rating ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#27AE60" />
        <Text>Loading recipe...</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.center}>
        <Text>No recipe details found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{recipe.title}</Text>
        <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteButton}>
          <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
      
      <Image source={{ uri: recipe.image }} style={styles.image} />
      
      {/* Recipe Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.stat}>⏱️ {recipe.readyInMinutes || 'N/A'} min</Text>
        <Text style={styles.stat}>👥 {recipe.servings || 'N/A'} servings</Text>
        <Text style={styles.stat}>💚 {recipe.healthScore || 'N/A'}/100</Text>
      </View>
      
      {/* Rating Section */}
      <View style={styles.ratingSection}>
        <View style={styles.ratingHeader}>
          <View>
            <Text style={styles.ratingTitle}>Recipe Rating</Text>
            {ratingSummary && ratingSummary.totalRatings > 0 ? (
              <>
                <View style={styles.ratingDisplay}>
                  {renderStars(Math.round(ratingSummary.averageRating))}
                  <Text style={styles.ratingText}>
                    {ratingSummary.averageRating.toFixed(1)} ({ratingSummary.totalRatings} {ratingSummary.totalRatings === 1 ? 'rating' : 'ratings'})
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.noRatings}>No ratings yet. Be the first!</Text>
            )}
          </View>
          <TouchableOpacity style={styles.rateButton} onPress={() => setShowRatingModal(true)}>
            <Text style={styles.rateButtonText}>Rate Recipe</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Portion Scaler */}
      <View style={styles.portionScaler}>
        <Text style={styles.portionLabel}>Adjust Portions:</Text>
        <View style={styles.portionControls}>
          <TouchableOpacity style={styles.portionButton} onPress={() => adjustServings(-1)}>
            <Text style={styles.portionButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.portionValue}>{servings} {servings === 1 ? 'serving' : 'servings'}</Text>
          <TouchableOpacity style={styles.portionButton} onPress={() => adjustServings(1)}>
            <Text style={styles.portionButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        {servings !== recipe.servings && (
          <Text style={styles.portionNote}>📊 Ingredients scaled {servings > recipe.servings ? 'up' : 'down'} from original</Text>
        )}
      </View>

      <Text style={styles.subtitle}>🍴 Ingredients ({servings} {servings === 1 ? 'serving' : 'servings'}):</Text>
      {recipe.extendedIngredients?.map((ing: any, idx: number) => (
        <Text key={idx} style={styles.ingredient}>
          • {getScaledQuantity(ing.original, recipe.servings)}
        </Text>
      ))}
      
      {/* Missing Ingredients Section */}
      {missingIngredients.length > 0 && (
        <View style={styles.missingSection}>
          <Text style={styles.missingTitle}>🛒 Missing Ingredients:</Text>
          {missingIngredients.map((ing, idx) => (
            <Text key={idx} style={styles.missingIngredient}>• {ing}</Text>
          ))}
          <View style={styles.missingActions}>
            <TouchableOpacity style={styles.addToListButton} onPress={addToShoppingList}>
              <Text style={styles.addToListButtonText}>📋 Add to List</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.orderButton} onPress={orderMissingIngredients}>
              <Text style={styles.orderButtonText}>🚚 Order Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.subtitle}>👨‍🍳 Instructions:</Text>
      <Text style={styles.instructions}>
        {recipe.instructions
          ? recipe.instructions.replace(/<[^>]+>/g, "") // remove HTML tags
          : "No instructions provided"}
      </Text>
      
      {/* Nutrition Information */}
      {recipe.nutrition && (
        <View style={styles.nutritionSection}>
          <Text style={styles.subtitle}>🥗 Nutrition (per serving):</Text>
          <Text>Calories: {recipe.nutrition.nutrients?.find((n: any) => n.name === 'Calories')?.amount ? Math.round(recipe.nutrition.nutrients.find((n: any) => n.name === 'Calories').amount) : 'N/A'}</Text>
          <Text>Protein: {recipe.nutrition.nutrients?.find((n: any) => n.name === 'Protein')?.amount ? Math.round(recipe.nutrition.nutrients.find((n: any) => n.name === 'Protein').amount) : 'N/A'}g</Text>
          <Text>Carbs: {recipe.nutrition.nutrients?.find((n: any) => n.name === 'Carbohydrates')?.amount ? Math.round(recipe.nutrition.nutrients.find((n: any) => n.name === 'Carbohydrates').amount) : 'N/A'}g</Text>
          <Text>Fat: {recipe.nutrition.nutrients?.find((n: any) => n.name === 'Fat')?.amount ? Math.round(recipe.nutrition.nutrients.find((n: any) => n.name === 'Fat').amount) : 'N/A'}g</Text>
        </View>
      )}
      
      {/* Rating Modal */}
      <Modal visible={showRatingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate this Recipe</Text>
            
            <View style={styles.ratingInput}>
              <Text style={styles.label}>Your Rating:</Text>
              {renderStars(userRating, true, setUserRating)}
            </View>
            
            <View style={styles.reviewInput}>
              <Text style={styles.label}>Your Review (optional):</Text>
              <TextInput
                style={styles.reviewTextInput}
                placeholder="Share your experience with this recipe..."
                value={userReview}
                onChangeText={setUserReview}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={submitRating}>
                <Text style={styles.submitButtonText}>Submit Rating</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  title: { fontSize: 26, fontWeight: "bold", flex: 1, marginRight: 10 },
  favoriteButton: {
    padding: 8,
  },
  favoriteIcon: { fontSize: 24 },
  subtitle: { fontSize: 20, fontWeight: "600", marginVertical: 15 },
  image: { width: "100%", height: 200, borderRadius: 10, marginVertical: 10 },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F8F9FA",
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  stat: { fontSize: 14, fontWeight: "500", color: "#495057" },
  ingredient: { fontSize: 16, marginVertical: 2, paddingLeft: 10 },
  instructions: { fontSize: 16, lineHeight: 24, color: "#495057" },
  missingSection: {
    backgroundColor: "#FFF3CD",
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
  },
  missingTitle: { fontSize: 18, fontWeight: "600", marginBottom: 10, color: "#856404" },
  missingIngredient: { fontSize: 14, color: "#856404", marginVertical: 1 },
  missingActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    gap: 10,
  },
  addToListButton: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    flex: 0.48,
  },
  addToListButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  orderButton: {
    backgroundColor: "#FF6B35",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    flex: 0.48,
  },
  orderButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  nutritionSection: {
    backgroundColor: "#E8F5E8",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  portionScaler: {
    backgroundColor: "#F0F8FF",
    padding: 16,
    borderRadius: 12,
    marginVertical: 15,
    borderWidth: 2,
    borderColor: "#007BFF",
  },
  portionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 12,
  },
  portionControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  portionButton: {
    backgroundColor: "#007BFF",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 15,
  },
  portionButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  portionValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007BFF",
    minWidth: 120,
    textAlign: "center",
  },
  portionNote: {
    fontSize: 12,
    color: "#007BFF",
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
  ratingSection: {
    backgroundColor: "#FFF8E1",
    padding: 16,
    borderRadius: 12,
    marginVertical: 15,
    borderWidth: 2,
    borderColor: "#FFD54F",
  },
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F57C00",
    marginBottom: 8,
  },
  ratingDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  starsContainer: {
    flexDirection: "row",
  },
  star: {
    fontSize: 20,
    marginHorizontal: 2,
  },
  interactiveStar: {
    fontSize: 32,
  },
  ratingText: {
    fontSize: 14,
    color: "#E65100",
    fontWeight: "500",
  },
  noRatings: {
    fontSize: 14,
    color: "#757575",
    fontStyle: "italic",
  },
  rateButton: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rateButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 15,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#2C3E50",
  },
  ratingInput: {
    marginBottom: 20,
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#495057",
  },
  reviewInput: {
    marginBottom: 20,
  },
  reviewTextInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  cancelButton: {
    backgroundColor: "#6C757D",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  submitButton: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
});
