import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LogoutIcon } from './icons';
import { NAV_ITEMS } from './nav';

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white">
        <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
      </span>
      <span className="text-sm font-extrabold tracking-tight">
        Flychael Trackson
      </span>
    </div>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const primary = NAV_ITEMS.filter((n) => n.primary);

  return (
    <div className="mx-auto flex min-h-full max-w-6xl">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/60 p-4 md:flex">
        <div className="px-2 py-2">
          <Brand />
        </div>
        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand/15 text-brand-soft'
                    : 'text-muted hover:bg-surface-2 hover:text-text'
                }`
              }
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-border pt-3">
          <div className="flex items-center gap-2 px-2">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="h-8 w-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-xs font-bold">
                {(user?.displayName ?? user?.email ?? '?')[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">
                {user?.displayName ?? user?.email}
              </p>
            </div>
            <button
              onClick={() => void logout()}
              className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-danger"
              title="Sign out"
            >
              <LogoutIcon width={18} height={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3 backdrop-blur md:hidden">
          <Brand />
          <button
            onClick={() => void logout()}
            className="rounded-lg p-2 text-muted hover:text-danger"
            title="Sign out"
          >
            <LogoutIcon width={18} height={18} />
          </button>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 md:px-8 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 flex items-stretch justify-around border-t border-border bg-surface/95 backdrop-blur md:hidden">
          {primary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
                  isActive ? 'text-brand-soft' : 'text-muted'
                }`
              }
            >
              <item.icon width={22} height={22} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
