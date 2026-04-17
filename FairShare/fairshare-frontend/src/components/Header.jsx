import { Bell, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

export default function Header({ variant = 'default', title = 'FairShare' }) {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      {variant === 'back' ? (
        <div className="header-left">
          <button onClick={() => navigate(-1)} className="icon-btn">
            <ArrowLeft size={24} color="#f8678c" />
          </button>
          <span className="fairshare-title-red">{title}</span>
        </div>
      ) : (
        <div className="header-left">
          <div className="avatar-small">
            <img src="https://i.pravatar.cc/150?img=11" alt="User Avatar" />
          </div>
          <span className="fairshare-title">{title}</span>
        </div>
      )}

      <div className="header-right">
        {variant === 'back' ? (
          <div className="avatar-small">
            <img src="https://i.pravatar.cc/150?img=11" alt="User Avatar" />
          </div>
        ) : (
          <button className="icon-btn">
            <Bell size={24} color="#fff" />
          </button>
        )}
      </div>
    </header>
  );
}
