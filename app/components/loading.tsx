import { Skeleton } from '@/app/components/ui/skeleton';

export function PageLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero section skeleton */}
      <div className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            <Skeleton className="h-8 w-24 mx-auto mb-8" />
            <Skeleton className="h-16 w-full max-w-4xl mx-auto mb-6" />
            <Skeleton className="h-6 w-full max-w-3xl mx-auto mb-8" />
            <div className="flex gap-4 justify-center mb-12">
              <Skeleton className="h-12 w-40" />
              <Skeleton className="h-12 w-32" />
            </div>
            <div className="flex gap-6 justify-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardLoading() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <Skeleton className="h-6 w-3/4 mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

export function BlogPostLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-12 w-full mb-4" />
        <div className="flex gap-6 mb-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-8 w-1/2 mt-8 mb-4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}