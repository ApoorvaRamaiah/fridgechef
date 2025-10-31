export type FilterState = {
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  nonVegetarian?: boolean;
};

type Listener = (filters: FilterState) => void;

class FilterBus {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(filters: FilterState) {
    this.listeners.forEach(l => l(filters));
  }
}

const filterBus = new FilterBus();
export default filterBus;
