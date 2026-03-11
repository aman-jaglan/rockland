"use client";

/**
 * Multi-select checkbox grid for FQHC services
 *
 * Used in the organization profile form to capture
 * which services the FQHC provides.
 */

interface ServicesSelectorProps {
  value: string[];
  onChange: (services: string[]) => void;
  label: string;
  options: string[];
  error?: string;
}

export function ServicesSelector({
  value,
  onChange,
  label,
  options,
  error,
}: ServicesSelectorProps) {
  function handleToggle(service: string) {
    if (value.includes(service)) {
      onChange(value.filter((s) => s !== service));
    } else {
      onChange([...value, service]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const isSelected = value.includes(option);
          const checkboxId = `${label.toLowerCase().replace(/\s+/g, "-")}-${option.toLowerCase().replace(/\s+/g, "-")}`;

          return (
            <label
              key={option}
              htmlFor={checkboxId}
              className={`
                flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors duration-150
                ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }
              `}
            >
              <input
                type="checkbox"
                id={checkboxId}
                checked={isSelected}
                onChange={() => handleToggle(option)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600"
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
