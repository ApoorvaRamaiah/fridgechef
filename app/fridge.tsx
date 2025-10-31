import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Modal,
  ScrollView
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";

interface FridgeItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  category: string;
}

const INGREDIENT_CATEGORIES = [
  'Vegetables', 'Fruits', 'Meat', 'Dairy', 'Grains', 'Spices', 'Other'
];

const COMMON_INGREDIENTS = [
  // Vegetables
  'tomato', 'onion', 'garlic', 'potato', 'carrot', 'bell pepper', 'spinach', 'lettuce',
  // Fruits
  'apple', 'banana', 'lemon', 'orange', 'strawberry', 'avocado',
  // Meat & Protein
  'chicken breast', 'ground beef', 'salmon', 'eggs', 'tofu',
  // Dairy
  'milk', 'cheese', 'yogurt', 'butter', 'cream',
  // Grains & Pantry
  'rice', 'pasta', 'bread', 'flour', 'olive oil', 'salt', 'pepper'
];

export default function FridgeScreen() {
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchAddModal, setShowBatchAddModal] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [newItem, setNewItem] = useState<Partial<FridgeItem>>({
    name: '',
    quantity: 1,
    unit: 'piece',
    category: 'Other'
  });
  const router = useRouter();

  useEffect(() => {
    loadFridgeItems();
  }, []);

  const loadFridgeItems = async () => {
    try {
      const saved = await AsyncStorage.getItem('fridgeItems');
      if (saved) {
        setFridgeItems(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading fridge items:', error);
    }
  };

  const saveFridgeItems = async (items: FridgeItem[]) => {
    try {
      await AsyncStorage.setItem('fridgeItems', JSON.stringify(items));
      // Also save just ingredient names for recipe matching
      const ingredientNames = items.map(item => item.name);
      await AsyncStorage.setItem('fridgeIngredients', JSON.stringify(ingredientNames));
    } catch (error) {
      console.error('Error saving fridge items:', error);
    }
  };

  const addItem = async () => {
    if (!newItem.name) {
      Alert.alert('Error', 'Please enter an ingredient name');
      return;
    }

    const item: FridgeItem = {
      id: Date.now().toString(),
      name: newItem.name || '',
      quantity: newItem.quantity || 1,
      unit: newItem.unit || 'piece',
      category: newItem.category || 'Other',
      expiryDate: newItem.expiryDate
    };

    const updatedItems = [...fridgeItems, item];
    setFridgeItems(updatedItems);
    await saveFridgeItems(updatedItems);
    
    setNewItem({ name: '', quantity: 1, unit: 'piece', category: 'Other' });
    setShowAddModal(false);
  };

  const addBatchItems = async () => {
    if (!batchInput.trim()) {
      Alert.alert('Error', 'Please enter ingredients');
      return;
    }

    // Parse batch input - support comma or newline separated
    const ingredientNames = batchInput
      .split(/[,\n]/)  
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (ingredientNames.length === 0) {
      Alert.alert('Error', 'No valid ingredients found');
      return;
    }

    // Create items with smart categorization
    const newItems: FridgeItem[] = ingredientNames.map((name, index) => {
      const lowercaseName = name.toLowerCase();
      let category = 'Other';
      
      // Smart categorization
      if (['tomato', 'onion', 'potato', 'carrot', 'bell pepper', 'spinach', 'lettuce', 'broccoli', 'cucumber'].some(veg => lowercaseName.includes(veg))) {
        category = 'Vegetables';
      } else if (['apple', 'banana', 'lemon', 'orange', 'strawberry', 'avocado', 'mango'].some(fruit => lowercaseName.includes(fruit))) {
        category = 'Fruits';
      } else if (['chicken', 'beef', 'pork', 'salmon', 'fish', 'meat', 'turkey'].some(meat => lowercaseName.includes(meat))) {
        category = 'Meat';
      } else if (['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg'].some(dairy => lowercaseName.includes(dairy))) {
        category = 'Dairy';
      } else if (['rice', 'pasta', 'bread', 'flour', 'oats', 'quinoa', 'wheat'].some(grain => lowercaseName.includes(grain))) {
        category = 'Grains';
      } else if (['salt', 'pepper', 'cumin', 'oregano', 'basil', 'cinnamon', 'garlic powder'].some(spice => lowercaseName.includes(spice))) {
        category = 'Spices';
      }

      return {
        id: `${Date.now()}_${index}`,
        name,
        quantity: 1,
        unit: 'piece',
        category
      };
    });

    const updatedItems = [...fridgeItems, ...newItems];
    setFridgeItems(updatedItems);
    await saveFridgeItems(updatedItems);
    
    setBatchInput('');
    setShowBatchAddModal(false);
    Alert.alert('Success', `Added ${newItems.length} ingredient${newItems.length > 1 ? 's' : ''}!`);
  };

  const removeItem = async (itemId: string) => {
    const updatedItems = fridgeItems.filter(item => item.id !== itemId);
    setFridgeItems(updatedItems);
    await saveFridgeItems(updatedItems);
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    const updatedItems = fridgeItems.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );
    setFridgeItems(updatedItems);
    await saveFridgeItems(updatedItems);
  };

  const getFilteredSuggestions = () => {
    if (query === "") return [];
    return COMMON_INGREDIENTS.filter(ingredient =>
      ingredient.toLowerCase().includes(query.toLowerCase()) &&
      !fridgeItems.some(item => item.name.toLowerCase() === ingredient.toLowerCase())
    ).slice(0, 5);
  };

  const addFromSuggestion = (ingredient: string) => {
    setNewItem({ ...newItem, name: ingredient });
    setQuery("");
  };

  const findRecipes = () => {
    const ingredientNames = fridgeItems.map(item => item.name);
    if (ingredientNames.length === 0) {
      Alert.alert('Empty Fridge', 'Add some ingredients to find recipes!');
      return;
    }
    router.push(`/recipes?ingredients=${ingredientNames.join(",")}`);
  };

  // Filter items based on search and category
  const getFilteredItems = () => {
    let filtered = fridgeItems;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    return filtered;
  };
  
  const categorizedItems = INGREDIENT_CATEGORIES.map(category => ({
    category,
    items: getFilteredItems().filter(item => item.category === category)
  })).filter(group => group.items.length > 0);
  
  const filteredItemsCount = getFilteredItems().length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Fridge 🧊</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.batchAddButton} onPress={() => setShowBatchAddModal(true)}>
            <Text style={styles.batchAddButtonText}>+ Batch</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Search Bar */}
      {fridgeItems.length > 0 && (
        <>
          <TextInput
            style={styles.searchBar}
            placeholder="🔍 Search ingredients..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          
          {/* Category Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryFilter}
            contentContainerStyle={styles.categoryFilterContent}
          >
            <TouchableOpacity 
              style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>
                All ({fridgeItems.length})
              </Text>
            </TouchableOpacity>
            {INGREDIENT_CATEGORIES.map((category) => {
              const count = fridgeItems.filter(item => item.category === category).length;
              if (count === 0) return null;
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.filterChip, selectedCategory === category && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(category === selectedCategory ? null : category)}
                >
                  <Text style={[styles.filterChipText, selectedCategory === category && styles.filterChipTextActive]}>
                    {category} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      {fridgeItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Your fridge is empty!</Text>
          <Text style={styles.emptySubtext}>Start adding ingredients to discover amazing recipes</Text>
        </View>
      ) : (
        <>
          {(searchQuery || selectedCategory) && (
            <Text style={styles.filterInfo}>
              Showing {filteredItemsCount} of {fridgeItems.length} items
              {selectedCategory && ` in ${selectedCategory}`}
            </Text>
          )}
          
          <TouchableOpacity style={styles.findRecipesButton} onPress={findRecipes}>
            <Text style={styles.findRecipesText}>🍳 Find Recipes ({fridgeItems.length} ingredients)</Text>
          </TouchableOpacity>

          <ScrollView style={styles.itemsList}>
            {categorizedItems.map(({ category, items }) => (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {items.map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDetails}>
                        {item.quantity} {item.unit}
                        {item.expiryDate && ` • Expires: ${item.expiryDate}`}
                      </Text>
                    </View>
                    <View style={styles.itemControls}>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Text style={styles.quantityButtonText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantity}>{item.quantity}</Text>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => removeItem(item.id)}
                      >
                        <Text style={styles.removeText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* Add Item Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Ingredient</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter ingredient name..."
              value={newItem.name}
              onChangeText={(text) => {
                setNewItem({ ...newItem, name: text });
                setQuery(text);
              }}
            />

            {/* Quick Add Suggestions */}
            {query && getFilteredSuggestions().length > 0 && (
              <View style={styles.suggestions}>
                {getFilteredSuggestions().map((ingredient, idx) => (
                  <TouchableOpacity 
                    key={idx}
                    style={styles.suggestion}
                    onPress={() => addFromSuggestion(ingredient)}
                  >
                    <Text>{ingredient}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.smallInput}
                  value={newItem.quantity?.toString()}
                  keyboardType="numeric"
                  onChangeText={(text) => setNewItem({ ...newItem, quantity: parseInt(text) || 1 })}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.label}>Unit</Text>
                <TextInput
                  style={styles.smallInput}
                  value={newItem.unit}
                  placeholder="piece, cup, lb..."
                  onChangeText={(text) => setNewItem({ ...newItem, unit: text })}
                />
              </View>
            </View>

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {INGREDIENT_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryChip, newItem.category === category && styles.selectedCategory]}
                  onPress={() => setNewItem({ ...newItem, category })}
                >
                  <Text style={[styles.categoryChipText, newItem.category === category && styles.selectedCategoryText]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={addItem}>
                <Text style={styles.saveButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Batch Add Modal */}
      <Modal visible={showBatchAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Multiple Ingredients</Text>
            <Text style={styles.modalSubtitle}>Enter ingredients separated by commas or new lines</Text>
            
            <TextInput
              style={styles.batchInput}
              placeholder="e.g. tomato, onion, chicken breast\nrice, eggs, milk"
              value={batchInput}
              onChangeText={setBatchInput}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />

            <Text style={styles.helperText}>💡 Items will be auto-categorized</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowBatchAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={addBatchItems}>
                <Text style={styles.saveButtonText}>Add All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: "bold" },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  batchAddButton: {
    backgroundColor: "#007BFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  batchAddButtonText: { color: "#fff", fontWeight: "bold" },
  addButton: {
    backgroundColor: "#27AE60",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 20, fontWeight: "600", color: "#666", marginBottom: 10 },
  emptySubtext: { fontSize: 14, color: "#999", textAlign: "center" },
  findRecipesButton: {
    backgroundColor: "#27AE60",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  findRecipesText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  itemsList: { flex: 1 },
  categorySection: { marginBottom: 20 },
  categoryTitle: { fontSize: 18, fontWeight: "600", marginBottom: 10, color: "#495057" },
  itemCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "500" },
  itemDetails: { fontSize: 12, color: "#6C757D", marginTop: 4 },
  itemControls: { flexDirection: "row", alignItems: "center" },
  quantityButton: {
    backgroundColor: "#007BFF",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
  quantityButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  quantity: { fontSize: 16, fontWeight: "500", minWidth: 20, textAlign: "center" },
  removeButton: { padding: 5, marginLeft: 10 },
  removeText: { fontSize: 16 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  suggestions: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    marginBottom: 15,
    maxHeight: 120,
  },
  suggestion: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  formRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  formField: { flex: 0.45 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#495057" },
  smallInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  categoryScroll: { marginBottom: 20 },
  categoryChip: {
    backgroundColor: "#E9ECEF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },
  selectedCategory: { backgroundColor: "#27AE60" },
  categoryChipText: { fontSize: 12, color: "#495057" },
  selectedCategoryText: { color: "#fff" },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: "#6C757D",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.45,
  },
  cancelButtonText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  saveButton: {
    backgroundColor: "#27AE60",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.45,
  },
  saveButtonText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  
  searchBar: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  categoryFilter: {
    marginBottom: 16,
    height: 44,
  },
  categoryFilterContent: {
    alignItems: 'center',
    paddingVertical: 0,
  },
  filterChip: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    alignSelf: 'center',
  },
  filterChipActive: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  filterChipText: {
    fontSize: 13,
    color: "#495057",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  filterInfo: {
    fontSize: 13,
    color: "#6C757D",
    marginBottom: 12,
    fontStyle: "italic",
  },
  batchInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    minHeight: 150,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6C757D",
    marginBottom: 15,
    textAlign: "center",
  },
  helperText: {
    fontSize: 12,
    color: "#6C757D",
    fontStyle: "italic",
    marginBottom: 15,
  },
});
