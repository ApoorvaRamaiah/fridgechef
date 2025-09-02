import { Drawer } from "expo-router/drawer";
import CustomDrawer from "../components/CustomDrawer"; // new component

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawer {...props} />}  // ✅ custom sidebar
      screenOptions={{
        headerStyle: { backgroundColor: "#27AE60" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Drawer.Screen name="index" options={{ title: "SmartChef 🥕" }} />
      <Drawer.Screen name="fridge" options={{ title: "My Fridge 🧊" }} />
      <Drawer.Screen name="favorites" options={{ title: "Favorites ❤️" }} />
      <Drawer.Screen name="recipes" options={{ title: "Recipes" }} />
      <Drawer.Screen name="recipes/[id]" options={{ title: "Recipe Details" }} />
      <Drawer.Screen name="grocery-order" options={{ title: "Grocery Delivery" }} />
      <Drawer.Screen name="orders" options={{ title: "My Orders 📦" }} />
      <Drawer.Screen name="FiltersScreen" options={{ title: "Filters" }} />
    </Drawer>
  );
}
