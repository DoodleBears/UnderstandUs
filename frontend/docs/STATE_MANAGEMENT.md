# State Management Guidelines

## Local State Management (React Hooks)

### useState

- Use for simple component-level state
- Ideal for:
  - Form inputs
  - Toggle states (open/closed, visible/hidden)
  - Loading states
  - Error states

```typescript
// Example
const [isOpen, setIsOpen] = useState(false)
const [inputValue, setInputValue] = useState('')
```

### useMemo

- Use for expensive computations
- Memoize values that depend on state or props
- Apply when:
  - Computing derived data from props or state
  - Preventing unnecessary re-renders
  - Working with large datasets

```typescript
// Example
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name))
}, [items])
```

## Global State Management (Zustand)

### Store Structure

- Create separate stores for different domains
- Keep stores small and focused
- Use TypeScript interfaces for store state

```typescript
// Example store structure
interface UserStore {
  user: User | null
  isAuthenticated: boolean
  login: (credentials: Credentials) => Promise<void>
  logout: () => void
}

const useUserStore = create<UserStore>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (credentials) => {
    // Implementation
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}))
```

### Best Practices

1. **Store Organization**

   - Place stores in `src/stores` directory
   - One store per file
   - Name files like `useFeatureStore.ts`

2. **State Updates**

   - Use immer for complex state updates
   - Avoid storing derived state
   - Use selectors for computed values

3. **Performance**
   - Use selective subscriptions
   - Implement proper memoization
   - Split stores when they grow too large

```typescript
// Example of selective subscription
const username = useUserStore((state) => state.user?.name)
```

4. **Persistence**
   - Use Zustand middleware for persistence when needed
   - Be selective about what to persist
   - Clear persisted state on logout

### When to Use What

1. **Use Local State (useState) When:**

   - State is only used in one component
   - State doesn't need to be shared
   - Simple UI interactions

2. **Use Memoization (useMemo) When:**

   - Expensive calculations are involved
   - Values depend on props or state
   - Preventing unnecessary re-renders

3. **Use Global State (Zustand) When:**
   - State needs to be shared between components
   - State needs to persist across route changes
   - Managing application-wide state (auth, theme, etc.)
