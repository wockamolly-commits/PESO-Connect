const StatusTabs = ({ tabs, activeTab, setActiveTab }) => {
    return (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${activeTab === tab.id
                            ? tab.activeClass
                            : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    <span className={`text-xs px-1.5 py-0.5 rounded-md ${activeTab === tab.id ? 'bg-white/10' : 'bg-slate-800'
                        }`}>{tab.count}</span>
                </button>
            ))}
        </div>
    )
}

export { StatusTabs }
export default StatusTabs
