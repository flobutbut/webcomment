import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import WelcomePage from './pages/WelcomePage'
import PrivacyPage from './pages/PrivacyPage'
import LegalPage from './pages/LegalPage'
import ReleasesPage from './pages/ReleasesPage'
import { DashboardLayout } from './pages/dashboard/DashboardLayout'
import { InboxPage } from './pages/dashboard/InboxPage'
import { MyCommentsPage } from './pages/dashboard/MyCommentsPage'
import { ContactsPage } from './pages/dashboard/ContactsPage'
import { FollowedUrlsPage } from './pages/dashboard/FollowedUrlsPage'
import { SettingsPage } from './pages/dashboard/SettingsPage'
import { GroupsPage } from './pages/dashboard/GroupsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="inbox" replace />} />
          <Route path="inbox"       element={<InboxPage />} />
          <Route path="my-comments" element={<MyCommentsPage />} />
          <Route path="contacts"    element={<ContactsPage />} />
          <Route path="feed"        element={<FollowedUrlsPage />} />
          <Route path="groups"      element={<GroupsPage />} />
          <Route path="settings"    element={<SettingsPage />} />
        </Route>
        <Route path="/privacy"   element={<PrivacyPage />} />
        <Route path="/legal"     element={<LegalPage />} />
        <Route path="/releases"  element={<ReleasesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
