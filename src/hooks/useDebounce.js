import { useState, useEffect } from "react";

/**
 * Debounce hook — delays updating the value until the user
 * stops typing for the specified delay (default 400ms).
 * Prevents firing a query on every keystroke.
 */
const useDebounce = (value, delay = 400) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
