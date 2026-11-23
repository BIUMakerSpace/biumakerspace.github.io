import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // Every failed load surfaces once, instead of silently rendering an empty list.
    onError: (error) => toast.error("שגיאה בטעינת נתונים", { description: errorMessage(error) }),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
