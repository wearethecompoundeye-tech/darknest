export const ASSET = (relativePath: string): string => {
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return `${import.meta.env.BASE_URL}${cleanPath}`;
};