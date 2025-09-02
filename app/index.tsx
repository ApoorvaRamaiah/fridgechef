import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import RecommendationEngine from "../services/RecommendationEngine";

export default function HomeScreen() {
  const [fridgeItems, setFridgeItems] = useState<any[]>([]);
  const [suggestedIngredients, setSuggestedIngredients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  const loadDashboardData = async () => {
    try {
      // Load fridge items
      const savedFridge = await AsyncStorage.getItem('fridgeItems');
      if (savedFridge) {
        const items = JSON.parse(savedFridge);
        setFridgeItems(items);
        
        // Get ingredient suggestions
        const ingredientNames = items.map((item: any) => item.name);
        const suggestions = await RecommendationEngine.getSuggestedIngredients(ingredientNames);
        setSuggestedIngredients(suggestions);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const findRecipes = () => {
    if (fridgeItems.length === 0) {
      router.push('/fridge');
      return;
    }
    const ingredientNames = fridgeItems.map(item => item.name);
    router.push(`/recipes?ingredients=${ingredientNames.join(",")}`);
  };
  
  const quickStats = {
    totalItems: fridgeItems.length,
    categories: [...new Set(fridgeItems.map(item => item.category))].length,
    expiringItems: fridgeItems.filter(item => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      const today = new Date();
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    }).length
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading your kitchen...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Welcome to FridgeChef! 🍳</Text>
      
      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{quickStats.totalItems}</Text>
          <Text style={styles.statLabel}>Items in Fridge</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{quickStats.categories}</Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, quickStats.expiringItems > 0 && styles.warningText]}>
            {quickStats.expiringItems}
          </Text>
          <Text style={styles.statLabel}>Expiring Soon</Text>
        </View>
      </View>
      
      {/* Main Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.primaryAction} onPress={findRecipes}>
          <Text style={styles.actionIcon}>🍳</Text>
          <Text style={styles.primaryActionText}>
            {fridgeItems.length > 0 ? `Find Recipes (${fridgeItems.length} ingredients)` : 'Add ingredients to get started'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.secondaryActions}>
          <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push('/fridge')}>
            <Text style={styles.actionIcon}>🧊</Text>
            <Text style={styles.secondaryActionText}>Manage Fridge</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push('/favorites')}>
            <Text style={styles.actionIcon}>❤️</Text>
            <Text style={styles.secondaryActionText}>Favorites</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Ingredient Suggestions */}
      {suggestedIngredients.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionTitle}>🌱 Suggested Ingredients</Text>
          <Text style={styles.sectionSubtitle}>Great additions for more recipe options</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {suggestedIngredients.map((ingredient, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.suggestionChip}
                onPress={() => router.push('/fridge')}
              >
                <Text style={styles.suggestionText}>{ingredient}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Recent Fridge Items */}
      {fridgeItems.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>🧊 Recent Fridge Items</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {fridgeItems.slice(0, 6).map((item, index) => (
              <View key={index} style={styles.fridgeItemChip}>
                <Text style={styles.fridgeItemText}>{item.name}</Text>
                <Text style={styles.fridgeItemQuantity}>{item.quantity} {item.unit}</Text>
              </View>
            ))}
          </ScrollView>
          
          {fridgeItems.length > 6 && (
            <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/fridge')}>
              <Text style={styles.viewAllText}>View All ({fridgeItems.length} items)</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Quick Tips */}
      <View style={styles.tipsSection}>
        <Text style={styles.sectionTitle}>💡 Pro Tips</Text>
        <View style={styles.tip}>
          <Text style={styles.tipText}>• Keep your fridge updated for better recipe suggestions</Text>
        </View>
        <View style={styles.tip}>
          <Text style={styles.tipText}>• Use dietary filters in the sidebar for personalized results</Text>
        </View>
        <View style={styles.tip}>
          <Text style={styles.tipText}>• Favorite recipes to get similar recommendations</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, color: "#2C3E50", textAlign: "center" },
  
  // Stats Container
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F8F9FA",
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  stat: { alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "bold", color: "#27AE60" },
  statLabel: { fontSize: 12, color: "#6C757D", marginTop: 4 },
  warningText: { color: "#FF6B35" },
  
  // Actions Container
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  primaryAction: {
    backgroundColor: "#27AE60",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryActionText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "bold", 
    marginTop: 8 
  },
  actionIcon: { fontSize: 32 },
  
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  secondaryAction: {
    backgroundColor: "#fff",
    flex: 0.48,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginTop: 8,
    textAlign: "center",
  },
  
  // Sections
  suggestionsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  recentSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  tipsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6C757D",
    marginBottom: 15,
  },
  
  // Suggestion Chips
  suggestionChip: {
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#27AE60",
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#27AE60",
  },
  
  // Fridge Item Chips
  fridgeItemChip: {
    backgroundColor: "#F0F8FF",
    padding: 12,
    borderRadius: 10,
    marginRight: 10,
    minWidth: 80,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#B3D9FF",
  },
  fridgeItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2C3E50",
    textAlign: "center",
  },
  fridgeItemQuantity: {
    fontSize: 12,
    color: "#6C757D",
    marginTop: 4,
  },
  
  viewAllButton: {
    marginTop: 15,
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    color: "#27AE60",
    fontWeight: "600",
  },
  
  // Tips
  tip: {
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: "#495057",
    lineHeight: 20,
  },
});
