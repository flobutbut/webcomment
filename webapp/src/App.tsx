import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import { DashboardLayout } from './pages/dashboard/DashboardLayout'
import { InboxPage } from './pages/dashboard/InboxPage'
import { MyCommentsPage } from './pages/dashboard/MyCommentsPage'
import { ContactsPage } from './pages/dashboard/ContactsPage'
import { SettingsPage } from './pages/dashboard/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="inbox" replace />} />
          <Route path="inbox"       element={<InboxPage />} />
          <Route path="my-comments" element={<MyCommentsPage />} />
          <Route path="contacts"    element={<ContactsPage />} />
          <Route path="settings"    element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
