import { Activity, FilePlus2, Home, Settings } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { label: 'Patients', to: '/', icon: Home },
  { label: 'New Patient', to: '/patient/new', icon: FilePlus2 },
] as const;

/** Render the application shell and nested route outlet. */
function App(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-4 sm:px-8 md:flex-row md:items-center md:justify-between">
          <NavLink aria-label="Gait Analysis home" className="flex items-center gap-3" to="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-700 text-white">
              <Activity aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase text-teal-700">
                Home Gait Assessment
              </p>
              <h1 className="text-lg font-bold text-slate-950">Gait Analysis MVP</h1>
            </div>
          </NavLink>

          <nav aria-label="Primary navigation" className="flex flex-wrap items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                      isActive
                        ? 'bg-teal-50 text-teal-800'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                    ].join(' ')
                  }
                  key={item.to}
                  to={item.to}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
        <Outlet />
      </main>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 text-xs text-slate-500 sm:px-8">
        <span>Local-first 10MWT workflow</span>
        <span className="flex items-center gap-1">
          <Settings aria-hidden="true" className="h-3.5 w-3.5" />
          MVP
        </span>
      </footer>
    </div>
  );
}

export default App;
