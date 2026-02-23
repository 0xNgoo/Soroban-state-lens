import { createFileRoute } from '@tanstack/react-router'
import SearchLandingScreen from '@/components/Home/SearchLandingScreen'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="text-center h-full">
      <SearchLandingScreen />
    </div>
  )
}
