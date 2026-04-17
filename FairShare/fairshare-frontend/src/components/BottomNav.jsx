import { Home, Users, Plus, Activity, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import './BottomNav.css';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { id: 'dashboard', path: '/', icon: Home, label: 'HOME' },
    { id: 'groups', path: '/groups', icon: Users, label: 'GROUPS' },
    { id: 'add', path: '/add', icon: Plus, label: 'ADD', isCenter: true },
    { id: 'analytics', path: '/analytics', icon: Activity, label: 'STATS' },
    { id: 'profile', path: '/profile', icon: User, label: 'PROFILE' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.id === 'groups' && location.pathname.startsWith('/groups'));
        
        if (item.isCenter) {
          return (
            <div key={item.id} className="nav-item-center" onClick={() => navigate(item.path)}>
              <div className="center-fab">
                <item.icon size={24} color="#fff" />
              </div>
              <span className={clsx("nav-label", { "active-label": isActive })}>{item.id === 'add' && location.pathname === '/add' ? 'ADD' : isActive || location.pathname === '/add' ? 'ADD' : ''}</span>
              {/* Wait, the design logic for label under plus is a bit tricky: 
                  In image 3 (split/add view): ADD string IS present.
                  In image 1,2,4,5: No text under the ADD fab. 
              */}
              {isActive && <span className="nav-label active-label">ADD</span>}
            </div>
          );
        }

        return (
          <div 
            key={item.id} 
            className={clsx("nav-item", { "nav-item-active": isActive })}
            onClick={() => navigate(item.path)}
          >
            <item.icon 
              size={24} 
              color={isActive ? "#f8678c" : "#9a8d95"} 
            />
            <span className={clsx("nav-label", { "active-label": isActive })}>
              {item.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
