import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: string;
}

export const SkeletonBlock: React.FC<SkeletonProps> = ({
  className = '',
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded',
}) => {
  return (
    <div
      className={`skeleton-shimmer ${width} ${height} ${rounded} ${className}`}
    />
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#102034]/70 border border-[#334155]/60 rounded-xl p-8 space-y-6 animate-pulse"
        >
          <div className="flex justify-between items-center">
            <SkeletonBlock width="w-24" height="h-6" rounded="rounded-md" />
            <SkeletonBlock width="w-20" height="h-4" />
          </div>
          <div className="space-y-3">
            <SkeletonBlock width="w-3/4" height="h-7" />
            <SkeletonBlock width="w-1/2" height="h-4" />
            <SkeletonBlock width="w-full" height="h-12" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock width="w-16" height="h-6" />
            <SkeletonBlock width="w-20" height="h-6" />
            <SkeletonBlock width="w-16" height="h-6" />
          </div>
          <div className="pt-6 border-t border-[#334155]/40 flex justify-between items-center">
            <SkeletonBlock width="w-28" height="h-8" />
            <SkeletonBlock width="w-32" height="h-10" rounded="rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const ListItemSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#102034]/80 border border-[#334155]/60 rounded-lg p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 w-full">
            <SkeletonBlock width="w-8" height="h-8" rounded="rounded-full" className="shrink-0" />
            <div className="space-y-2 w-full max-w-md">
              <SkeletonBlock width="w-3/4" height="h-4" />
              <SkeletonBlock width="w-1/2" height="h-3" />
            </div>
          </div>
          <SkeletonBlock width="w-16" height="h-6" rounded="rounded-md" className="shrink-0" />
        </div>
      ))}
    </div>
  );
};

export const PaperCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#102034]/80 border border-[#334155]/60 rounded-xl p-6 space-y-4"
        >
          <div className="flex justify-between items-start">
            <SkeletonBlock width="w-2/3" height="h-6" />
            <SkeletonBlock width="w-20" height="h-5" rounded="rounded-full" />
          </div>
          <SkeletonBlock width="w-full" height="h-10" />
          <div className="flex items-center justify-between pt-2">
            <SkeletonBlock width="w-32" height="h-4" />
            <SkeletonBlock width="w-24" height="h-8" rounded="rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const AdminMetricsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-5 rounded-2xl bg-[#00172e]/80 border border-[#44474d]/30 space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonBlock width="w-32" height="h-4" />
            <SkeletonBlock width="w-4" height="h-4" rounded="rounded-full" />
          </div>
          <SkeletonBlock width="w-16" height="h-8" rounded="rounded-lg" />
          <SkeletonBlock width="w-40" height="h-3" />
        </div>
      ))}
    </div>
  );
};

export const AdminListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="divide-y divide-[#44474d]/20 w-full animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonBlock width="w-36" height="h-5" rounded="rounded-md" />
              <SkeletonBlock width="w-24" height="h-5" rounded="rounded-full" />
            </div>
            <SkeletonBlock width="w-20" height="h-4" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <SkeletonBlock width="w-44" height="h-3" />
            <SkeletonBlock width="w-32" height="h-3" />
            <SkeletonBlock width="w-40" height="h-3" />
          </div>
          <SkeletonBlock width="w-full" height="h-10" rounded="rounded-lg" />
        </div>
      ))}
    </div>
  );
};

export const AdminPageFullSkeleton: React.FC = () => {
  return (
    <div className="w-full min-h-screen text-[#d3e4fe] py-8 sm:py-12 px-4 md:px-12 max-w-[1280px] mx-auto space-y-8 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#44474d]/30">
        <div className="space-y-2">
          <SkeletonBlock width="w-48" height="h-5" rounded="rounded-full" />
          <SkeletonBlock width="w-72" height="h-9" rounded="rounded-lg" />
          <SkeletonBlock width="w-96" height="h-4" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBlock width="w-40" height="h-10" rounded="rounded-xl" />
          <SkeletonBlock width="w-24" height="h-10" rounded="rounded-xl" />
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#00172e] border border-[#44474d]/30 flex items-center justify-between">
        <SkeletonBlock width="w-64" height="h-4" />
        <SkeletonBlock width="w-32" height="h-4" />
      </div>

      <AdminMetricsSkeleton />

      <div className="rounded-2xl bg-[#00172e]/60 border border-[#44474d]/30 p-2">
        <AdminListSkeleton count={4} />
      </div>
    </div>
  );
};

