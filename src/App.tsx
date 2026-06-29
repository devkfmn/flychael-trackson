import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Spinner } from './components/ui';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Flights } from './pages/Flights';
import { AddFlight } from './pages/AddFlight';
import { FlightDetail } from './pages/FlightDetail';
import { EquipmentList } from './pages/EquipmentList';
import { EquipmentDetail } from './pages/EquipmentDetail';
import { Maintenance } from './pages/Maintenance';
import { Expenses } from './pages/Expenses';
import { ImportPage } from './pages/Import';
import { Settings } from './pages/Settings';

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-full place-items-center px-4">
        <div className="text-center">
          <div className="mx-auto w-full max-w-[12rem] rounded-3xl bg-white p-3 shadow-lg">
            <img src="/logo.png" alt="Flychael Trackson" className="h-auto w-full" />
          </div>
          <Spinner label="Loading…" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="flights" element={<Flights />} />
        <Route path="flights/new" element={<AddFlight />} />
        <Route path="flights/:id" element={<FlightDetail />} />
        <Route path="equipment" element={<EquipmentList />} />
        <Route path="equipment/new" element={<EquipmentDetail />} />
        <Route path="equipment/:id" element={<EquipmentDetail />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
