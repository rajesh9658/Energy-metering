import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ApiResponse<T> {
  data: T | null;
  isOffline: boolean;
  isCached: boolean;
  error: string | null;
}

/**
 * Safely executes an API call with automatic AsyncStorage caching and offline fallback.
 * 
 * @param cacheKey Unique string identifier for caching this API response (e.g. 'site_data_123')
 * @param fetchFn Async function that performs the network request
 * @param fallbackDefault Optional default data structure if both API and Cache fail
 */
export async function safeApiCall<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  fallbackDefault: T | null = null
): Promise<ApiResponse<T>> {
  const fullCacheKey = `CACHE_${cacheKey}`;

  try {
    // 1. Try Live Network API call
    const liveData = await fetchFn();

    if (liveData != null) {
      // Check if server response has success flag that indicates business logic error
      const anyData = liveData as any;
      if (anyData.success === false || anyData.status === false) {
        // If API explicitly responded with failure status, check cache
        const cached = await getCachedData<T>(fullCacheKey);
        if (cached) {
          return {
            data: cached,
            isOffline: true,
            isCached: true,
            error: anyData.message || "API responded with error; using cached data.",
          };
        }
      }

      // Save valid data to AsyncStorage cache
      try {
        await AsyncStorage.setItem(fullCacheKey, JSON.stringify(liveData));
      } catch (cacheErr) {
        console.warn("Failed to write API cache:", cacheErr);
      }

      return {
        data: liveData,
        isOffline: false,
        isCached: false,
        error: null,
      };
    }
  } catch (netErr: any) {
    console.log(`[API Call Failed: ${cacheKey}]`, netErr?.message || netErr);
  }

  // 2. Network Failed or returned null/undefined -> Try Cache
  const cached = await getCachedData<T>(fullCacheKey);
  if (cached != null) {
    return {
      data: cached,
      isOffline: true,
      isCached: true,
      error: "Network error. Loaded last saved data.",
    };
  }

  // 3. Both API and Cache failed -> Fallback Default
  return {
    data: fallbackDefault,
    isOffline: true,
    isCached: false,
    error: "Network error and no offline data available.",
  };
}

async function getCachedData<T>(cacheKey: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.warn("Failed to read API cache:", err);
  }
  return null;
}
