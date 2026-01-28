import React, { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Loader2 } from 'lucide-react';

interface LocationSuggestion {
  id: string;
  place_name: string;
  text: string;
  coordinates: [number, number];
  context: any[];
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, coordinates?: [number, number]) => void;
  placeholder?: string;
  className?: string;
  initialCoordinates?: [number, number]; // Pass existing coords to skip geocoding
  skipInitialSearch?: boolean; // Skip search on initial load
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Enter location",
  className = "",
  initialCoordinates,
  skipInitialSearch = false
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  
  // Refs to prevent unnecessary API calls
  const skipNextSearchRef = useRef(false);
  const lastSelectedValueRef = useRef<string>('');
  const hasUserInteractedRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Check if value looks like a complete/selected address
  const isCompleteAddress = (val: string): boolean => {
    if (!val) return false;
    // Detect patterns like "Place, Sri Lanka" or "Place, City, Sri Lanka"
    const completePatterns = [
      /, Sri Lanka$/i,
      /, LK$/i,
      /\d{5}/, // Postal codes
    ];
    return completePatterns.some(pattern => pattern.test(val));
  };

  const searchLocations = async (query: string) => {
    // Skip search if flag is set (after selection)
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    // Skip if value matches last selected (user clicked suggestion)
    if (query === lastSelectedValueRef.current) {
      return;
    }

    // Skip search for complete addresses (already selected)
    if (isCompleteAddress(query)) {
      return;
    }

    // Minimum 3 characters to reduce API calls
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-locations', {
        body: { query: query.trim() }
      });

      if (error) {
        console.error('Error searching locations:', error);
        setSuggestions([]);
      } else {
        setSuggestions(data?.suggestions || []);
        setShowSuggestions(true);
        setHighlightedIndex(-1);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSearch = (query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    // 500ms debounce to reduce redundant API calls
    debounceRef.current = setTimeout(() => {
      searchLocations(query);
    }, 500);
  };

  useEffect(() => {
    // Skip search on initial mount if skipInitialSearch is true
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      if (skipInitialSearch || value) {
        // Don't search on initial load - wait for user interaction
        return;
      }
    }

    // Only search if user has interacted with the input
    if (!hasUserInteractedRef.current) {
      return;
    }

    debouncedSearch(value);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    hasUserInteractedRef.current = true;
    onChange(e.target.value);
  };

  const handleSuggestionClick = async (suggestion: LocationSuggestion) => {
    // Set flags to prevent re-searching
    skipNextSearchRef.current = true;
    lastSelectedValueRef.current = suggestion.place_name;
    
    // Check if coordinates are valid (not [0,0])
    const hasValidCoords = suggestion.coordinates && 
      suggestion.coordinates[0] !== 0 && 
      suggestion.coordinates[1] !== 0;
    
    if (hasValidCoords) {
      // Use existing valid coordinates
      onChange(suggestion.place_name, suggestion.coordinates);
    } else {
      // Fetch real coordinates from Place Details API
      try {
        setIsLoading(true);
        const { data, error } = await supabase.functions.invoke('search-locations', {
          body: { getDetails: true, placeId: suggestion.id }
        });
        
        if (!error && data?.coordinates && data.coordinates[0] !== 0 && data.coordinates[1] !== 0) {
          console.log('Fetched coordinates for', suggestion.place_name, ':', data.coordinates);
          onChange(suggestion.place_name, data.coordinates);
        } else {
          console.warn('Could not fetch coordinates, passing name only');
          onChange(suggestion.place_name);
        }
      } catch (error) {
        console.warn('Failed to fetch coordinates:', error);
        onChange(suggestion.place_name);
      } finally {
        setIsLoading(false);
      }
    }
    
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    
    // Remove focus from input to prevent re-showing suggestions
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Immediately hide suggestions when clicking outside
    setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }, 100);
  };

  const handleFocus = () => {
    hasUserInteractedRef.current = true;
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={className}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-[100] w-full sm:min-w-[400px] mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`px-3 py-3 sm:py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground active:bg-accent/80 ${
                index === highlightedIndex ? 'bg-accent text-accent-foreground' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm break-words">
                    {suggestion.text}
                  </div>
                  <div className="text-xs text-muted-foreground break-words">
                    {suggestion.place_name}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
