import { BrowserRouter } from 'react-router-dom';
import AppShell from './layouts/AppShell';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
