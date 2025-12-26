import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function obfuscateName(name: string): string {
  if (!name || name === "System") return name;

  // Create a simple hash of the name to keep it consistent
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }

  const id = Math.abs(hash) % 1000;
  return `User ${id}`;
}

export function obfuscateText(text: string): string {
  if (!text) return text;

  // Replace alphanumeric characters with random similar ones
  // but keep length and structure roughly same
  return text
    .replace(/[a-zA-Z]/g, () => {
      const chars = "abcdefghijklmnopqrstuvwxyz";
      return chars.charAt(Math.floor(Math.random() * chars.length));
    })
    .replace(/[0-9]/g, () => {
      return Math.floor(Math.random() * 10).toString();
    });
}
