// Define the structure of the object that our function will return
// This helps with type safety in TypeScript
interface ThemeClasses {
  themeClasses: string; // Classes for the main page background/text
  cardClasses: string; // Classes for the main content card/container
  inputBgClasses: string; // Classes for input/textarea backgrounds and borders
  buttonGradient: string; // Classes for the main translate button gradient
  secondaryButtonClasses: string; // Classes for secondary buttons (e.g., clear history)
  tooltipClasses: string; // Classes for tooltip backgrounds/text
  actionButtonClasses: string; // Classes for specific action buttons (if any use this)
}

/**
 * Generates dynamic Tailwind CSS class strings based on the dark mode status.
 * @param darkMode - A boolean indicating whether dark mode is currently active.
 * @returns An object containing class strings for various UI elements to apply the correct theme.
 */
export const getThemeClasses = (darkMode: boolean): ThemeClasses => {
  // Define classes for light and dark mode for each UI element
  const themeClasses = darkMode
    ? "bg-gradient-to-br from-gray-900 to-black text-white"
    : "bg-gradient-to-br from-blue-50 to-white text-gray-900";

  const cardClasses = darkMode
    ? "bg-gray-800/50 backdrop-blur-lg border-gray-700" // Dark mode card style (semi-transparent, blurred background, dark border)
    : "bg-white/70 backdrop-blur-lg border-gray-200"; // Light mode card style (semi-transparent, blurred background, light border)

  const inputBgClasses = darkMode
    ? "bg-gray-700/50 border-gray-600 text-white placeholder-gray-500" // Dark mode input style
    : "bg-gray-100/80 border-gray-300 text-gray-800 placeholder-gray-400"; // Light mode input style

  const buttonGradient = darkMode
    ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700" // Dark mode button gradient
    : "bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"; // Light mode button gradient

  const secondaryButtonClasses = darkMode
    ? "bg-gray-700 hover:bg-gray-600 text-gray-300" // Dark mode secondary button
    : "bg-gray-200 hover:bg-gray-300 text-gray-700"; // Light mode secondary button

  const tooltipClasses = darkMode
    ? "bg-gray-700 text-white" // Dark mode tooltip
    : "bg-gray-100 text-gray-800"; // Light mode tooltip

  const actionButtonClasses = darkMode
    ? "bg-blue-600/20 hover:bg-blue-500/30 text-blue-400 border-blue-700/30" // Dark mode action button (e.g., for copy, share, download)
    : "bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200"; // Light mode action button

  // Return an object containing all the generated class strings
  return {
    themeClasses,
    cardClasses,
    inputBgClasses,
    buttonGradient,
    secondaryButtonClasses,
    tooltipClasses,
    actionButtonClasses,
  };
};
