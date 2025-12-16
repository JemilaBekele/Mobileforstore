   const BACKEND_URL = "https://ordere.net";

export const normalizeImagePath = (path?: string) => {
        if (!path) return undefined;
        const normalizedPath = path.replace(/\\/g, '/');
        if (normalizedPath.startsWith('http')) {
          return normalizedPath;
        }
        // Remove any leading slashes to prevent double slashes in URL
        const cleanPath = normalizedPath.replace(/^\/+/, '');
        return `${BACKEND_URL}/${cleanPath}`;
      };
