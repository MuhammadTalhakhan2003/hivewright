import { useRoute } from './lib/router'
import Landing from './landing/Landing'
import AppShell from './app/AppShell'

export default function App() {
  const route = useRoute()
  if (route.startsWith('/app')) return <AppShell route={route} />
  return <Landing />
}
