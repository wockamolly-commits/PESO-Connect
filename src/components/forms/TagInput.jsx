import { Plus, X } from 'lucide-react'

const TagInput = ({
    label,
    value,
    onChange,
    tags,
    onAdd,
    onRemove,
    placeholder,
    tagClassName = 'bg-primary-100 text-primary-700',
    removeClassName = 'hover:text-primary-900',
    icon: TagIcon = null
}) => {
    const handleAdd = () => {
        if (value.trim()) {
            onAdd(value.trim())
        }
    }

    return (
        <div>
            <label className="label">{label}</label>
            <div className="flex gap-2 mb-3">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
                    className="input-field flex-1"
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    className="px-4 py-3 bg-primary-100 text-primary-700 rounded-xl hover:bg-primary-200 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                        <span
                            key={index}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${tagClassName}`}
                        >
                            {TagIcon && <TagIcon className="w-3 h-3" />}
                            {tag}
                            <button
                                type="button"
                                onClick={() => onRemove(tag)}
                                className={removeClassName}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

export { TagInput }
export default TagInput
