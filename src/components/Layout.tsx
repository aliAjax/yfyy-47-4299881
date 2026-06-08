import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  FileText, 
  PlusCircle, 
  AlertTriangle, 
  Menu, 
  X,
  PhoneCall,
  User,
  ChevronDown,
  Upload,
  LayoutDashboard
} from 'lucide-react';
import { useTicketStore } from '@/store/useTicketStore';
import { clsx } from 'clsx';

const navItems = [
  { path: '/my-todo', label: '我的待办', icon: LayoutDashboard },
  { path: '/', label: '工单列表', icon: FileText },
  { path: '/tickets/new', label: '新建工单', icon: PlusCircle },
  { path: '/tickets/batch-import', label: '批量导入', icon: Upload },
  { path: '/supervision', label: '督办中心', icon: AlertTriangle },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { currentRole, setCurrentRole, currentUnit, setCurrentUnit } = useTicketStore();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-30 flex flex-col bg-gradient-to-b from-primary-600 to-primary-700 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20'
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-primary-500/30">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <PhoneCall className="h-6 w-6 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-base font-bold text-white">12345热线</h1>
                <p className="text-xs text-primary-200">工单办理系统</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive 
                    ? 'bg-white/20 text-white shadow-lg shadow-primary-900/20' 
                    : 'text-primary-100 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className={clsx('h-5 w-5 flex-shrink-0', isActive && 'scale-110')} />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Role Switcher */}
        {sidebarOpen && (
          <div className="p-4 border-t border-primary-500/30">
            <p className="mb-2 text-xs font-medium text-primary-200">当前身份</p>
            <div className="space-y-1">
              <button
                onClick={() => setCurrentRole('supervisor')}
                className={clsx(
                  'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  currentRole === 'supervisor'
                    ? 'bg-white/20 text-white'
                    : 'text-primary-100 hover:bg-white/10'
                )}
              >
                督办人员
              </button>
              <button
                onClick={() => {
                  setCurrentRole('handler');
                  setCurrentUnit('城市管理委员会');
                }}
                className={clsx(
                  'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  currentRole === 'handler'
                    ? 'bg-white/20 text-white'
                    : 'text-primary-100 hover:bg-white/10'
                )}
              >
                承办单位
              </button>
            </div>
            {currentRole === 'handler' && currentUnit && (
              <p className="mt-3 text-xs text-primary-200">
                当前单位：{currentUnit}
              </p>
            )}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className={clsx(
        'flex flex-1 flex-col transition-all duration-300',
        sidebarOpen ? 'ml-64' : 'ml-20'
      )}>
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {navItems.find(item => item.path === location.pathname)?.label || '工单管理'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {currentRole === 'supervisor' ? '李督办' : '张经办'}
              </p>
              <p className="text-xs text-gray-500">
                {currentRole === 'supervisor' ? '督办员' : currentUnit || '承办单位'}
              </p>
            </div>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white">
                  <User className="h-5 w-5" />
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200 z-50">
                  <button className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                    个人设置
                  </button>
                  <button className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
