import { useEffect } from 'react'
import useReminderStore from '../stores/useReminderStore'
import useCategoryStore from '../stores/useCategoryStore'

const PRIORITIES = [
  { value: null, label: 'Any Priority' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export default function FilterBar() {
  const { selectedCategory, selectedPriority, showCompletedOnly, setCategory, setPriority, setShowCompleted } =
    useReminderStore()
  const { categories, fetchCategories } = useCategoryStore()

  useEffect(() => {
    if (categories.length === 0) fetchCategories()
  }, [categories.length, fetchCategories])

  const categoryOptions = [{ value: null, label: 'All' }, ...categories.map((c) => ({ value: c.value, label: c.label, icon: c.icon }))]

  return (
    <div>
      <div className="filter-bar">
        {categoryOptions.map((cat) => (
          <button
            key={cat.label}
            className={`filter-chip ${selectedCategory === cat.value ? 'active' : ''}`}
            onClick={() => setCategory(cat.value)}
          >
            {cat.icon ? `${cat.icon} ` : ''}{cat.label}
          </button>
        ))}
      </div>
      <div className="filter-bar">
        {PRIORITIES.map((p) => (
          <button
            key={p.label}
            className={`filter-chip ${selectedPriority === p.value ? 'active' : ''}`}
            onClick={() => setPriority(p.value)}
          >
            {p.label}
          </button>
        ))}
        <button
          className={`filter-chip ${showCompletedOnly ? 'active' : ''}`}
          onClick={() => setShowCompleted(!showCompletedOnly)}
        >
          Completed
        </button>
      </div>
    </div>
  )
}
