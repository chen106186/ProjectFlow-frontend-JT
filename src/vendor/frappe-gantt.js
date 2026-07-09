export default class Gantt {
  constructor(container, tasks = [], options = {}) {
    this.container = container
    this.tasks = tasks
    this.options = options
    this.render()
  }

  render() {
    if (!this.container) return

    const dayWidth = 24
    const rowHeight = 42
    const dates = this.tasks.flatMap(task => [new Date(task.start), new Date(task.end)])
    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))
    const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / 86400000) + 1)
    const width = Math.max(totalDays * dayWidth, 720)

    const root = document.createElement('div')
    root.className = 'gantt-container'
    root.style.width = `${width}px`

    const todayButton = document.createElement('button')
    todayButton.type = 'button'
    todayButton.className = 'today-button'
    todayButton.textContent = 'Today'
    root.appendChild(todayButton)

    const chart = document.createElement('div')
    chart.className = 'gantt-chart'
    chart.style.width = `${width}px`

    this.tasks.forEach((task, index) => {
      const start = new Date(task.start)
      const end = new Date(task.end)
      const left = Math.max(0, Math.ceil((start - minDate) / 86400000) * dayWidth)
      const barWidth = Math.max(32, (Math.ceil((end - start) / 86400000) + 1) * dayWidth)

      const row = document.createElement('div')
      row.className = `bar-wrapper ${task.custom_class || ''}`
      row.style.top = `${index * rowHeight}px`

      const bar = document.createElement('div')
      bar.className = 'bar'
      bar.style.left = `${left}px`
      bar.style.width = `${barWidth}px`

      const progress = document.createElement('div')
      progress.className = 'bar-progress'
      progress.style.width = `${Math.min(Number(task.progress || 0), 100)}%`
      bar.appendChild(progress)

      const label = document.createElement('span')
      label.className = 'bar-label'
      label.textContent = task.name
      bar.appendChild(label)

      row.appendChild(bar)
      chart.appendChild(row)
    })

    chart.style.height = `${this.tasks.length * rowHeight + 12}px`
    root.appendChild(chart)
    this.container.replaceChildren(root)
  }
}
