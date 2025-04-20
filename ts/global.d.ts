export {}; // This line is important for ensuring this file is treated as a module declaration

declare global {
  interface Window {
    init: () => void;
  }
}