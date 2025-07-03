import { useState, useEffect } from 'react'
import { Users, Car, CreditCard, MapPin, TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import StatsCard from '../components/UI/StatsCard'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRides: 0,
    totalDrivers: 0,
    totalRevenue: 0,
  })
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch basic stats
      const [usersResult, ridesResult, driversResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('rides').select('id, fare_amount', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'driver'),
      ])

      // Calculate total revenue
      const totalRevenue = ridesResult.data?.reduce((sum, ride) => sum + (ride.fare_amount || 0), 0) || 0

      setStats({
        totalUsers: usersResult.count || 0,
        totalRides: ridesResult.count || 0,
        totalDrivers: driversResult.count || 0,
        totalRevenue: totalRevenue,
      })

      // Fetch chart data (rides per day for last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: ridesData } = await supabase
        .from('rides')
        .select('created_at, fare_amount')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at')

      // Group by date
      const groupedData = {}
      ridesData?.forEach(ride => {
        const date = new Date(ride.created_at).toLocaleDateString('fr-FR')
        if (!groupedData[date]) {
          groupedData[date] = { date, rides: 0, revenue: 0 }
        }
        groupedData[date].rides += 1
        groupedData[date].revenue += ride.fare_amount || 0
      })

      setChartData(Object.values(groupedData))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
            ))}
          </div>
          <div className="bg-gray-200 h-64 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="mt-1 text-sm text-gray-600">
          Vue d'ensemble de votre plateforme AfriLyft
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Total Utilisateurs"
          value={stats.totalUsers.toLocaleString()}
          change="+12%"
          changeType="increase"
          icon={Users}
        />
        <StatsCard
          title="Total Courses"
          value={stats.totalRides.toLocaleString()}
          change="+8%"
          changeType="increase"
          icon={Car}
        />
        <StatsCard
          title="Chauffeurs Actifs"
          value={stats.totalDrivers.toLocaleString()}
          change="+5%"
          changeType="increase"
          icon={MapPin}
        />
        <StatsCard
          title="Revenus Total"
          value={`${stats.totalRevenue.toLocaleString()} GNF`}
          change="+15%"
          changeType="increase"
          icon={CreditCard}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Courses par jour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="rides" stroke="#0ea5e9" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenus par jour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} GNF`, 'Revenus']} />
              <Bar dataKey="revenue" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Activité récente</h3>
        </div>
        <div className="p-6">
          <div className="flow-root">
            <ul className="-mb-8">
              <li className="relative pb-8">
                <div className="relative flex space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-100">
                    <Car className="h-4 w-4 text-success-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div>
                      <p className="text-sm text-gray-900">
                        Nouvelle course terminée
                      </p>
                      <p className="text-xs text-gray-500">Il y a 2 minutes</p>
                    </div>
                  </div>
                </div>
              </li>
              <li className="relative pb-8">
                <div className="relative flex space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                    <Users className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div>
                      <p className="text-sm text-gray-900">
                        Nouvel utilisateur inscrit
                      </p>
                      <p className="text-xs text-gray-500">Il y a 5 minutes</p>
                    </div>
                  </div>
                </div>
              </li>
              <li className="relative">
                <div className="relative flex space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-100">
                    <MapPin className="h-4 w-4 text-warning-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div>
                      <p className="text-sm text-gray-900">
                        Nouveau chauffeur en attente de validation
                      </p>
                      <p className="text-xs text-gray-500">Il y a 10 minutes</p>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}