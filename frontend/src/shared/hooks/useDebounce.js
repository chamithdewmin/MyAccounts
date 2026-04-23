import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of `value` that only updates
 * after `delay` ms of inactivity. Use for search inputs to
 * avoid firing a filter/request on every keystroke.
 */
const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebounce;
