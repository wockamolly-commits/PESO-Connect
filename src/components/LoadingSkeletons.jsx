const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
)

export const CardSkeleton = () => (
    <div className="card animate-pulse">
        <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gray-200 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
        </div>
    </div>
)

export const JobCardSkeleton = () => (
    <div className="card animate-pulse">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-14 h-14 bg-gray-200 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex flex-wrap gap-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                </div>
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
        </div>
    </div>
)

export const StatCardSkeleton = () => (
    <div className="card text-center animate-pulse">
        <Skeleton className="h-8 w-12 mx-auto mb-2" />
        <Skeleton className="h-4 w-20 mx-auto" />
    </div>
)

export const ProfileSkeleton = () => (
    <div className="card animate-pulse">
        <div className="flex flex-col items-center mb-8 pb-8 border-b border-gray-100">
            <div className="w-24 h-24 bg-gray-200 rounded-full mb-4" />
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="space-y-6">
            {[1, 2, 3, 4].map(i => (
                <div key={i}>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                </div>
            ))}
        </div>
    </div>
)

export const TableRowSkeleton = () => (
    <tr className="animate-pulse">
        <td className="px-5 py-4">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-200 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                </div>
            </div>
        </td>
        <td className="px-5 py-4"><Skeleton className="h-5 w-20 rounded-lg" /></td>
        <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
        <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
    </tr>
)

export const AdminCardSkeleton = () => (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 animate-pulse">
        <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-slate-800 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-5 w-48 bg-slate-800 rounded" />
                <div className="h-4 w-64 bg-slate-800 rounded" />
            </div>
            <div className="h-6 w-20 bg-slate-800 rounded-lg" />
        </div>
    </div>
)

export const JobListingSkeleton = ({ count = 4 }) => (
    <div className="grid gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <JobCardSkeleton key={i} />
        ))}
    </div>
)

export const ApplicationsSkeleton = ({ count = 3 }) => (
    <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
            <CardSkeleton key={i} />
        ))}
    </div>
)

export const ConversationListSkeleton = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
            <div className="h-6 w-28 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-9 w-full bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="flex-1">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 animate-pulse">
                    <div className="w-11 h-11 bg-gray-200 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                </div>
            ))}
        </div>
    </div>
)

export const ChatSkeleton = () => (
    <div className="flex flex-col h-full">
        <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
            </div>
        </div>
        <div className="flex-1 bg-gray-50 p-4 space-y-3 animate-pulse">
            <div className="flex justify-start"><Skeleton className="h-10 w-48 rounded-2xl" /></div>
            <div className="flex justify-end"><Skeleton className="h-10 w-56 rounded-2xl" /></div>
            <div className="flex justify-start"><Skeleton className="h-10 w-40 rounded-2xl" /></div>
            <div className="flex justify-end"><Skeleton className="h-10 w-44 rounded-2xl" /></div>
        </div>
        <div className="border-t border-gray-200 bg-white p-4 animate-pulse">
            <Skeleton className="h-10 w-full rounded-xl" />
        </div>
    </div>
)

export default Skeleton
