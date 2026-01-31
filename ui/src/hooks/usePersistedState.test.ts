import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistedState } from './usePersistedState';

describe('usePersistedState Hook', () => {
  const mockLocalStorage: Record<string, string> = {};
  let getItemSpy: ReturnType<typeof vi.fn>;
  let setItemSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);

    getItemSpy = vi.fn((key: string) => mockLocalStorage[key] ?? null);
    setItemSpy = vi.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: getItemSpy,
        setItem: setItemSpy,
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
        }),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Value Handling', () => {
    it('returns initial value when localStorage is empty', () => {
      const { result } = renderHook(() => usePersistedState('test-key', 'default'));
      expect(result.current[0]).toBe('default');
    });

    it('returns initial value for complex objects', () => {
      const initialValue = { name: 'test', count: 42 };
      const { result } = renderHook(() => usePersistedState('test-key', initialValue));
      expect(result.current[0]).toEqual(initialValue);
    });

    it('returns initial value for arrays', () => {
      const initialValue = [1, 2, 3];
      const { result } = renderHook(() => usePersistedState('test-key', initialValue));
      expect(result.current[0]).toEqual(initialValue);
    });

    it('returns initial value for boolean', () => {
      const { result } = renderHook(() => usePersistedState('test-key', true));
      expect(result.current[0]).toBe(true);
    });

    it('returns initial value for number', () => {
      const { result } = renderHook(() => usePersistedState('test-key', 123));
      expect(result.current[0]).toBe(123);
    });

    it('returns initial value for null', () => {
      const { result } = renderHook(() => usePersistedState<string | null>('test-key', null));
      expect(result.current[0]).toBeNull();
    });
  });

  describe('Reading from localStorage', () => {
    it('reads stored string value from localStorage', () => {
      mockLocalStorage['test-key'] = JSON.stringify('stored value');

      const { result } = renderHook(() => usePersistedState('test-key', 'default'));
      expect(result.current[0]).toBe('stored value');
    });

    it('reads stored object from localStorage', () => {
      const storedValue = { name: 'stored', count: 99 };
      mockLocalStorage['test-key'] = JSON.stringify(storedValue);

      const { result } = renderHook(() =>
        usePersistedState('test-key', { name: 'default', count: 0 })
      );
      expect(result.current[0]).toEqual(storedValue);
    });

    it('reads stored array from localStorage', () => {
      const storedValue = ['a', 'b', 'c'];
      mockLocalStorage['test-key'] = JSON.stringify(storedValue);

      const { result } = renderHook(() => usePersistedState('test-key', []));
      expect(result.current[0]).toEqual(storedValue);
    });

    it('reads stored boolean from localStorage', () => {
      mockLocalStorage['test-key'] = JSON.stringify(false);

      const { result } = renderHook(() => usePersistedState('test-key', true));
      expect(result.current[0]).toBe(false);
    });

    it('reads stored number from localStorage', () => {
      mockLocalStorage['test-key'] = JSON.stringify(42);

      const { result } = renderHook(() => usePersistedState('test-key', 0));
      expect(result.current[0]).toBe(42);
    });

    it('reads stored null from localStorage', () => {
      mockLocalStorage['test-key'] = JSON.stringify(null);

      const { result } = renderHook(() => usePersistedState<string | null>('test-key', 'default'));
      expect(result.current[0]).toBeNull();
    });
  });

  describe('Writing to localStorage', () => {
    it('writes new value to localStorage on state change', () => {
      const { result } = renderHook(() => usePersistedState('test-key', 'initial'));

      act(() => {
        result.current[1]('new value');
      });

      expect(result.current[0]).toBe('new value');
      expect(setItemSpy).toHaveBeenCalledWith('test-key', JSON.stringify('new value'));
      expect(mockLocalStorage['test-key']).toBe(JSON.stringify('new value'));
    });

    it('writes object to localStorage', () => {
      const { result } = renderHook(() =>
        usePersistedState('test-key', { name: 'initial', count: 0 })
      );

      act(() => {
        result.current[1]({ name: 'updated', count: 5 });
      });

      expect(mockLocalStorage['test-key']).toBe(JSON.stringify({ name: 'updated', count: 5 }));
    });

    it('writes array to localStorage', () => {
      const { result } = renderHook(() => usePersistedState<number[]>('test-key', []));

      act(() => {
        result.current[1]([1, 2, 3, 4]);
      });

      expect(mockLocalStorage['test-key']).toBe(JSON.stringify([1, 2, 3, 4]));
    });

    it('writes on initial render via useEffect', () => {
      renderHook(() => usePersistedState('test-key', 'initial'));

      expect(setItemSpy).toHaveBeenCalledWith('test-key', JSON.stringify('initial'));
    });

    it('writes when value changes via updater function', () => {
      const { result } = renderHook(() => usePersistedState('counter', 0));

      act(() => {
        result.current[1]((prev) => prev + 1);
      });

      expect(result.current[0]).toBe(1);
      expect(mockLocalStorage['counter']).toBe(JSON.stringify(1));
    });
  });

  describe('Error Handling', () => {
    it('returns initial value when localStorage has invalid JSON', () => {
      mockLocalStorage['test-key'] = 'not valid json';

      const { result } = renderHook(() => usePersistedState('test-key', 'default'));
      expect(result.current[0]).toBe('default');
    });

    it('handles localStorage.getItem throwing error', () => {
      getItemSpy.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => usePersistedState('test-key', 'default'));
      expect(result.current[0]).toBe('default');
    });

    it('handles localStorage.setItem throwing error silently', () => {
      setItemSpy.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => usePersistedState('test-key', 'initial'));

      // Should not throw, error is silently caught
      expect(result.current[0]).toBe('initial');

      // State updates should still work even if persistence fails
      act(() => {
        result.current[1]('new value');
      });

      expect(result.current[0]).toBe('new value');
    });
  });

  describe('Key Changes', () => {
    it('persists to new key when key prop changes', () => {
      const { result, rerender } = renderHook(({ key }) => usePersistedState(key, 'default'), {
        initialProps: { key: 'key-1' },
      });

      expect(result.current[0]).toBe('default');

      rerender({ key: 'key-2' });

      // The current state value is persisted to the new key
      expect(setItemSpy).toHaveBeenCalledWith('key-2', JSON.stringify('default'));
    });
  });

  describe('Type Safety', () => {
    it('preserves type for generic state', () => {
      interface UserSettings {
        theme: 'light' | 'dark';
        fontSize: number;
      }

      const initialSettings: UserSettings = { theme: 'light', fontSize: 14 };
      const { result } = renderHook(() => usePersistedState<UserSettings>('settings', initialSettings));

      expect(result.current[0].theme).toBe('light');
      expect(result.current[0].fontSize).toBe(14);

      act(() => {
        result.current[1]({ theme: 'dark', fontSize: 16 });
      });

      expect(result.current[0].theme).toBe('dark');
      expect(result.current[0].fontSize).toBe(16);
    });
  });

  describe('Return Value Structure', () => {
    it('returns tuple with state and setter', () => {
      const { result } = renderHook(() => usePersistedState('test-key', 'initial'));

      expect(Array.isArray(result.current)).toBe(true);
      expect(result.current).toHaveLength(2);
      expect(typeof result.current[0]).toBe('string');
      expect(typeof result.current[1]).toBe('function');
    });

    it('setter is stable across renders', () => {
      const { result, rerender } = renderHook(() => usePersistedState('test-key', 'initial'));

      const firstSetter = result.current[1];

      rerender();

      // Setter should be the same reference (React's useState behavior)
      expect(result.current[1]).toBe(firstSetter);
    });
  });
});
