import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  TextInput,
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  Modal
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from "expo-router";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  source?: 'manual' | 'recipe';
}

export default function ShoppingListScreen() {
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadShoppingList();
    }, [])
  );

  const loadShoppingList = async () => {
    try {
      const saved = await AsyncStorage.getItem('shoppingList');
      if (saved) {
        setShoppingList(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading shopping list:', error);
    }
  };

  const saveShoppingList = async (items: ShoppingItem[]) => {
    try {
      await AsyncStorage.setItem('shoppingList', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving shopping list:', error);
    }
  };

  const addItem = () => {
    if (!newItemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      quantity: 1,
      unit: 'piece',
      checked: false,
      source: 'manual'
    };

    const updatedList = [newItem, ...shoppingList];
    setShoppingList(updatedList);
    saveShoppingList(updatedList);
    setNewItemName("");
    setShowAddModal(false);
  };

  const toggleCheck = (itemId: string) => {
    const updatedList = shoppingList.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setShoppingList(updatedList);
    saveShoppingList(updatedList);
  };

  const deleteItem = (itemId: string) => {
    const updatedList = shoppingList.filter(item => item.id !== itemId);
    setShoppingList(updatedList);
    saveShoppingList(updatedList);
  };

  const clearChecked = () => {
    Alert.alert(
      "Clear Checked Items",
      "Remove all checked items from your shopping list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            const updatedList = shoppingList.filter(item => !item.checked);
            setShoppingList(updatedList);
            saveShoppingList(updatedList);
          }
        }
      ]
    );
  };

  const orderAll = () => {
    const uncheckedItems = shoppingList.filter(item => !item.checked);
    if (uncheckedItems.length === 0) {
      Alert.alert('Empty List', 'Add items to your shopping list first!');
      return;
    }

    const ingredientNames = uncheckedItems.map(item => item.name).join(',');
    router.push(`/grocery-order?missingIngredients=${ingredientNames}&servings=1`);
  };

  const checkedCount = shoppingList.filter(item => item.checked).length;
  const uncheckedCount = shoppingList.length - checkedCount;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shopping List 🛒</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {shoppingList.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Your shopping list is empty!</Text>
          <Text style={styles.emptySubtext}>Add items manually or from recipe details</Text>
        </View>
      ) : (
        <>
          {/* Stats */}
          <View style={styles.statsBar}>
            <Text style={styles.statText}>
              {uncheckedCount} to buy • {checkedCount} checked
            </Text>
            {checkedCount > 0 && (
              <TouchableOpacity onPress={clearChecked}>
                <Text style={styles.clearText}>Clear Checked</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Action Buttons */}
          {uncheckedCount > 0 && (
            <TouchableOpacity style={styles.orderAllButton} onPress={orderAll}>
              <Text style={styles.orderAllText}>🚚 Order All ({uncheckedCount} items)</Text>
            </TouchableOpacity>
          )}

          {/* Shopping List */}
          <FlatList
            data={shoppingList}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <View style={[styles.itemCard, item.checked && styles.itemCardChecked]}>
                <TouchableOpacity 
                  style={styles.checkbox}
                  onPress={() => toggleCheck(item.id)}
                >
                  <Text style={styles.checkboxIcon}>{item.checked ? '✓' : ''}</Text>
                </TouchableOpacity>
                
                <View style={styles.itemContent}>
                  <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.quantity} {item.unit}
                    {item.source === 'recipe' && ' • From recipe'}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => deleteItem(item.id)}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      )}

      {/* Add Item Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Item</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter item name..."
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setShowAddModal(false);
                  setNewItemName("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={addItem}>
                <Text style={styles.saveButtonText}>Add</Text>
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
  title: { fontSize: 28, fontWeight: "bold", color: "#2C3E50" },
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

  statsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statText: { fontSize: 14, color: "#495057", fontWeight: "500" },
  clearText: { fontSize: 14, color: "#DC3545", fontWeight: "600" },

  orderAllButton: {
    backgroundColor: "#FF6B35",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  orderAllText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  list: { flex: 1 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  itemCardChecked: {
    backgroundColor: "#E8F5E8",
    opacity: 0.7,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#27AE60",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxIcon: {
    fontSize: 18,
    color: "#27AE60",
    fontWeight: "bold",
  },
  itemContent: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "500", color: "#2C3E50" },
  itemNameChecked: {
    textDecorationLine: "line-through",
    color: "#6C757D",
  },
  itemMeta: { fontSize: 12, color: "#6C757D", marginTop: 4 },
  deleteButton: { padding: 8 },
  deleteIcon: { fontSize: 18 },

  // Modal
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
    width: "85%",
  },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
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
});
