import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  Users, 
  Package, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export default function Dashboard() {
  const { profile, role } = useAuth();

  const stats = [
    {
      title: 'Total Revenue',
      value: '₨ 2,450,000',
      change: '+12.5%',
      trend: 'up',
      icon: TrendingUp,
      color: 'from-primary to-accent',
    },
    {
      title: 'Active Customers',
      value: '1,247',
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      color: 'from-accent to-success',
    },
    {
      title: 'Products in Stock',
      value: '156',
      change: '-3 low stock',
      trend: 'down',
      icon: Package,
      color: 'from-warning to-destructive',
    },
    {
      title: 'Target Achievement',
      value: '78%',
      change: '+5% this week',
      trend: 'up',
      icon: Target,
      color: 'from-success to-primary',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your business today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="h-3 w-3 text-success" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-destructive" />
                  )}
                  <span className={`text-xs ${stat.trend === 'up' ? 'text-success' : 'text-destructive'}`}>
                    {stat.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions & Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest transactions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        Sale completed - Order #{1000 + i}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {i === 0 ? '2 minutes ago' : `${i * 15} minutes ago`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-success">
                      +₨ {(Math.random() * 10000).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Performance */}
          {(role === 'admin' || role === 'manager') && (
            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>Top performers this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Ahmad Khan', 'Sara Ali', 'Hassan Malik'].map((name, i) => (
                    <div key={name} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${
                        i === 0 ? 'from-warning to-warning/60' :
                        i === 1 ? 'from-muted-foreground to-muted' :
                        'from-primary/60 to-primary/30'
                      } flex items-center justify-center text-sm font-bold text-white`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{name}</p>
                        <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${
                              i === 0 ? 'from-success to-accent' :
                              i === 1 ? 'from-primary to-accent' :
                              'from-warning to-primary'
                            }`}
                            style={{ width: `${95 - i * 15}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {95 - i * 15}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
