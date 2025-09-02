import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RecipesScreen() {
  const { ingredients } = useLocalSearchParams(); // from query param
  const router = useRouter();

  const [recipes, setRecipes] = useState<any[]>([]);
  const [recipesWithNutrition, setRecipesWithNutrition] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<any>({});

  const fetchRecipes = async () => {
    try {
      if (!ingredients) return;
      
      setLoading(true);
      
      // Load saved filters
      const saved = await AsyncStorage.getItem('filters');
      const filters = saved ? JSON.parse(saved) : {};
      setCurrentFilters(filters);
      
      let dietParam = '';
      let intoleranceParam = '';
      
      if (filters.vegetarian) dietParam = '&diet=vegetarian';
      if (filters.vegan) dietParam = '&diet=vegan';
      if (filters.glutenFree) intoleranceParam = '&intolerances=gluten';
      
      const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&number=15&apiKey=${process.env.EXPO_PUBLIC_SPOONACULAR_KEY}${dietParam}${intoleranceParam}`;

      console.log("Fetching URL:", url);
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        setRecipes(data);
        
        // Fetch nutrition data for each recipe (bulk request)
        const recipeIds = data.slice(0, 10).map(recipe => recipe.id).join(',');
        const nutritionUrl = `https://api.spoonacular.com/recipes/informationBulk?ids=${recipeIds}&includeNutrition=true&apiKey=${process.env.EXPO_PUBLIC_SPOONACULAR_KEY}`;
        
        const nutritionResponse = await fetch(nutritionUrl);
        const nutritionData = await nutritionResponse.json();
        
        if (nutritionData && Array.isArray(nutritionData)) {
          setRecipesWithNutrition(nutritionData);
        }
      }
    } catch (err) {
      console.error("Error fetching recipes:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, [ingredients]);
  
  // Refresh recipes when screen comes into focus (to apply filter changes)
  useFocusEffect(
    useCallback(() => {
      const checkFilters = async () => {
        const saved = await AsyncStorage.getItem('filters');
        const filters = saved ? JSON.parse(saved) : {};
        
        // Check if filters have changed
        if (JSON.stringify(filters) !== JSON.stringify(currentFilters)) {
          fetchRecipes();
        }
      };
      
      checkFilters();
    }, [currentFilters, ingredients])
  );
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchRecipes();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#27AE60" />
        <Text>Fetching recipes...</Text>
      </View>
    );
  }

  if (!recipes.length) {
    return (
      <View style={styles.center}>
        <Text>No recipes found for: {ingredients}</Text>
      </View>
    );
  }

  const getRecipeNutrition = (recipeId: number) => {
    return recipesWithNutrition.find(r => r.id === recipeId);
  };
  
  const getFilterBadges = () => {
    const badges = [];
    if (currentFilters.vegetarian) badges.push('🌱 Vegetarian');
    if (currentFilters.vegan) badges.push('🌿 Vegan');
    if (currentFilters.glutenFree) badges.push('🌾 Gluten-Free');
    if (currentFilters.nonVegetarian) badges.push('🍖 Non-Veg');
    return badges;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recipes with: {ingredients}</Text>
        
        {/* Active Filters Display */}
        {getFilterBadges().length > 0 && (
          <View style={styles.filtersDisplay}>
            <Text style={styles.filtersLabel}>Active filters:</Text>
            <View style={styles.filterBadges}>
              {getFilterBadges().map((badge, index) => (
                <View key={index} style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{badge}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#27AE60']} />
        }
        renderItem={({ item }) => {
          const nutritionData = getRecipeNutrition(item.id);
          const calories = nutritionData?.nutrition?.nutrients?.find((n: any) => n.name === 'Calories')?.amount;
          const protein = nutritionData?.nutrition?.nutrients?.find((n: any) => n.name === 'Protein')?.amount;
          
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/recipes/${item.id}`)}
            >
              <Image source={{ uri: item.image }} style={styles.image} />
              <View style={styles.cardContent}>
                <Text style={styles.recipeTitle}>{item.title}</Text>
                
                {/* Recipe Stats */}
                <View style={styles.recipeStats}>
                  <Text style={styles.stat}>⏱️ {nutritionData?.readyInMinutes || 'N/A'} min</Text>
                  {calories && <Text style={styles.stat}>🔥 {Math.round(calories)} cal</Text>}
                  {protein && <Text style={styles.stat}>🍖 {Math.round(protein)}g protein</Text>}
                </View>
                
                {/* Missing Ingredients Count */}
                <Text style={styles.missingCount}>
                  Missing: {item.missedIngredientCount || 0} ingredients
                </Text>
                
                {/* Diet Tags */}
                <View style={styles.dietTags}>
                  {nutritionData?.vegetarian && <Text style={styles.dietTag}>🌱</Text>}
                  {nutritionData?.vegan && <Text style={styles.dietTag}>🌿</Text>}
                  {nutritionData?.glutenFree && <Text style={styles.dietTag}>🌾</Text>}
                  {nutritionData?.healthScore && (
                    <Text style={styles.healthScore}>💪 {Math.round(nutritionData.healthScore)}/100</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  
  // Filter Display
  filtersDisplay: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  filtersLabel: { fontSize: 14, fontWeight: "600", color: "#495057", marginBottom: 8 },
  filterBadges: { flexDirection: "row", flexWrap: "wrap" },
  filterBadge: {
    backgroundColor: "#27AE60",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  filterBadgeText: { fontSize: 12, color: "#fff", fontWeight: "500" },
  
  // Recipe Cards
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  image: { width: 80, height: 80, borderRadius: 10 },
  cardContent: { flex: 1, marginLeft: 15, justifyContent: "space-between" },
  recipeTitle: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#2C3E50", 
    marginBottom: 8,
    lineHeight: 20
  },
  
  // Recipe Stats
  recipeStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  stat: {
    fontSize: 12,
    color: "#495057",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 3,
  },
  
  missingCount: {
    fontSize: 12,
    color: "#FF6B35",
    fontWeight: "500",
    marginBottom: 6,
  },
  
  // Diet Tags
  dietTags: {
    flexDirection: "row",
    alignItems: "center",
  },
  dietTag: {
    fontSize: 16,
    marginRight: 6,
  },
  healthScore: {
    fontSize: 11,
    color: "#28A745",
    fontWeight: "600",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
