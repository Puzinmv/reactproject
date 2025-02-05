import { useState, useEffect } from 'react';

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут в миллисекундах

export const useCache = (key, fetchFunction) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Проверяем кэш
        const cachedData = cache.get(key);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
          setData(cachedData.data);
          setLoading(false);
          return;
        }

        // Если данных нет в кэше или они устарели, делаем запрос
        const freshData = await fetchFunction();
        
        // Сохраняем в кэш
        cache.set(key, {
          data: freshData,
          timestamp: Date.now()
        });

        setData(freshData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [key, fetchFunction]);

  return { data, loading, error };
}; 