import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Leaf,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  UserCircle,
  Target,
  BarChart3,
  Settings,
  LogOut,
  DollarSign,
  Calendar,
} from 'lucide-react';

const menuItems = {
  admin: [
    { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { title: 'Inventory', icon: Package, href: '/inventory' },
    { title: 'POS', icon: ShoppingCart, href: '/pos' },
    { title: 'Customers', icon: Users, href: '/customers' },
    { title: 'Sales Team', icon: UserCircle, href: '/team' },
    { title: 'Targets', icon: Target, href: '/targets' },
    { title: 'Commissions', icon: DollarSign, href: '/commissions' },
    { title: 'Analytics', icon: BarChart3, href: '/analytics' },
    { title: 'Settings', icon: Settings, href: '/settings' },
  ],
  manager: [
    { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { title: 'Inventory', icon: Package, href: '/inventory' },
    { title: 'Customers', icon: Users, href: '/customers' },
    { title: 'Sales Team', icon: UserCircle, href: '/team' },
    { title: 'Targets', icon: Target, href: '/targets' },
    { title: 'Commissions', icon: DollarSign, href: '/commissions' },
    { title: 'Analytics', icon: BarChart3, href: '/analytics' },
  ],
  counter_staff: [
    { title: 'POS', icon: ShoppingCart, href: '/pos' },
    { title: 'Inventory', icon: Package, href: '/inventory' },
  ],
  health_rep: [
    { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { title: 'My Sales', icon: ShoppingCart, href: '/my-sales' },
    { title: 'Appointments', icon: Calendar, href: '/appointments' },
    { title: 'Customers', icon: Users, href: '/customers' },
    { title: 'My Performance', icon: Target, href: '/my-performance' },
  ],
};

export function AppSidebar() {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items = menuItems[role || 'health_rep'] || menuItems.health_rep;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive/20 text-destructive';
      case 'manager':
        return 'bg-warning/20 text-warning-foreground';
      case 'counter_staff':
        return 'bg-accent/20 text-accent-foreground';
      default:
        return 'bg-primary/20 text-primary-foreground';
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-accent flex items-center justify-center">
            <Leaf className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-sidebar-foreground">Herbal Hills</h1>
            <p className="text-xs text-sidebar-foreground/60">Management System</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                    tooltip={item.title}
                  >
                    <a href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm">
              {profile?.full_name ? getInitials(profile.full_name) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'User'}
            </p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getRoleBadgeColor(role || '')}`}>
              {role?.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
