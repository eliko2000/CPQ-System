import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { BarChart3, FileText, Package, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { useCPQ } from '../../contexts/CPQContext'
import { useQuotations } from '../../hooks/useQuotations'
import { useComponents } from '../../hooks/useComponents'
import { useProjects } from '../../hooks/useProjects'
import { formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'

export function Dashboard() {
  const { setActiveView } = useCPQ()
  const { quotations, loading: quotationsLoading } = useQuotations()
  const { components, loading: componentsLoading } = useComponents()
  const { projects, loading: projectsLoading } = useProjects()

  // Calculate statistics
  const statistics = useMemo(() => {
    const now = new Date()
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

    // Filter data for last year
    const recentQuotations = quotations.filter(q => new Date(q.created_at) >= oneYearAgo)

    // Filter data for previous month (for growth calculation)
    const lastMonthQuotations = quotations.filter(q => {
      const date = new Date(q.created_at)
      return date >= oneMonthAgo && date < now
    })
    const lastMonthComponents = components.filter(c => {
      const date = new Date(c.created_at)
      return date >= oneMonthAgo && date < now
    })
    const lastMonthProjects = projects.filter(p => {
      const date = new Date(p.createdAt)
      return date >= oneMonthAgo && date < now
    })

    // Active projects count
    const activeProjectsCount = projects.filter(p => p.status === 'active').length
    const lastMonthActiveProjects = lastMonthProjects.filter(p => p.status === 'active').length

    // Total quotations
    const totalQuotations = recentQuotations.length
    const quotationsGrowth = lastMonthQuotations.length

    // Components count
    const totalComponents = components.length
    const componentsGrowth = lastMonthComponents.length

    // Average margin calculation
    const quotationsWithMargin = recentQuotations.filter(q => q.margin_percentage !== null && q.margin_percentage !== undefined)
    const avgMargin = quotationsWithMargin.length > 0
      ? quotationsWithMargin.reduce((sum, q) => sum + (q.margin_percentage || 0), 0) / quotationsWithMargin.length
      : 0

    // Previous period margin for comparison
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())
    const prevPeriodQuotations = quotations.filter(q => {
      const date = new Date(q.created_at)
      return date >= twoMonthsAgo && date < oneMonthAgo
    }).filter(q => q.margin_percentage !== null && q.margin_percentage !== undefined)

    const prevAvgMargin = prevPeriodQuotations.length > 0
      ? prevPeriodQuotations.reduce((sum, q) => sum + (q.margin_percentage || 0), 0) / prevPeriodQuotations.length
      : 0

    const marginGrowth = avgMargin - prevAvgMargin

    return {
      activeProjects: activeProjectsCount,
      activeProjectsGrowth: lastMonthActiveProjects,
      totalQuotations,
      quotationsGrowth,
      totalComponents,
      componentsGrowth,
      avgMargin: avgMargin.toFixed(1),
      marginGrowth: marginGrowth.toFixed(1)
    }
  }, [quotations, components, projects])

  // Recent activity feed
  const recentActivity = useMemo(() => {
    interface Activity {
      type: 'quotation' | 'component' | 'project'
      title: string
      description: string
      timestamp: string
    }

    const activities: Activity[] = []

    // Add recent quotations
    quotations.slice(0, 3).forEach(q => {
      activities.push({
        type: 'quotation',
        title: 'הצעת מחיר חדשה',
        description: `${q.customer_name} - ${q.quotation_number}`,
        timestamp: q.updated_at || q.created_at
      })
    })

    // Add recent components
    components.slice(0, 3).forEach(c => {
      activities.push({
        type: 'component',
        title: 'רכיב חדש נוסף',
        description: c.name,
        timestamp: c.created_at
      })
    })

    // Add recent projects
    projects.slice(0, 3).forEach(p => {
      activities.push({
        type: 'project',
        title: `פרויקט ${p.projectName}`,
        description: p.companyName,
        timestamp: p.updatedAt
      })
    })

    // Sort by timestamp and take top 7
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 7)
  }, [quotations, components, projects])

  const isLoading = quotationsLoading || componentsLoading || projectsLoading

  // Format relative time in Hebrew
  const formatRelativeTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: he })
    } catch {
      return 'זמן לא ידוע'
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">לוח בקרה</h1>
        <p className="text-muted-foreground">
          ברוכים הבאים למערכת CPQ שלכם. הנה מה קורה עם הפרויקטים שלכם.
        </p>
      </div>

      {/* פעולות מהירות */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveView('projects')}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-reverse space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">פרויקט חדש</h3>
                <p className="text-sm text-muted-foreground">צור פרויקט הצעת מחיר חדש</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveView('quotes')}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-reverse space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">העלאת הצעה</h3>
                <p className="text-sm text-muted-foreground">הוסף הצעות ספקים דרך OCR</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveView('components')}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-reverse space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">ספריית רכיבים</h3>
                <p className="text-sm text-muted-foreground">נהל רכיבים ואסמבלים</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* סקירת סטטיסטיקות */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">פרויקטים פעילים</p>
                  <p className="text-3xl font-bold">{statistics.activeProjects}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {statistics.activeProjectsGrowth > 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">+{statistics.activeProjectsGrowth} מהחודש שעבר</span>
                      </>
                    ) : statistics.activeProjectsGrowth < 0 ? (
                      <>
                        <TrendingDown className="h-3 w-3 text-red-600" />
                        <span className="text-red-600">{statistics.activeProjectsGrowth} מהחודש שעבר</span>
                      </>
                    ) : (
                      <span>ללא שינוי מהחודש שעבר</span>
                    )}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">סך הצעות</p>
                  <p className="text-3xl font-bold">{statistics.totalQuotations}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {statistics.quotationsGrowth > 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">+{statistics.quotationsGrowth} מהחודש שעבר</span>
                      </>
                    ) : statistics.quotationsGrowth < 0 ? (
                      <>
                        <TrendingDown className="h-3 w-3 text-red-600" />
                        <span className="text-red-600">{statistics.quotationsGrowth} מהחודש שעבר</span>
                      </>
                    ) : (
                      <span>ללא שינוי מהחודש שעבר</span>
                    )}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">רכיבים</p>
                  <p className="text-3xl font-bold">{statistics.totalComponents}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {statistics.componentsGrowth > 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">+{statistics.componentsGrowth} מהחודש שעבר</span>
                      </>
                    ) : statistics.componentsGrowth < 0 ? (
                      <>
                        <TrendingDown className="h-3 w-3 text-red-600" />
                        <span className="text-red-600">{statistics.componentsGrowth} מהחודש שעבר</span>
                      </>
                    ) : (
                      <span>ללא שינוי מהחודש שעבר</span>
                    )}
                  </p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">רווח ממוצע</p>
                  <p className="text-3xl font-bold">{statistics.avgMargin}%</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {parseFloat(statistics.marginGrowth) > 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">+{statistics.marginGrowth}% מהחודש שעבר</span>
                      </>
                    ) : parseFloat(statistics.marginGrowth) < 0 ? (
                      <>
                        <TrendingDown className="h-3 w-3 text-red-600" />
                        <span className="text-red-600">{statistics.marginGrowth}% מהחודש שעבר</span>
                      </>
                    ) : (
                      <span>ללא שינוי מהחודש שעבר</span>
                    )}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* פעילות אחרונה */}
      <Card>
        <CardHeader>
          <CardTitle>פעילות אחרונה</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse py-2 border-b">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={`${activity.type}-${index}`}
                  className={`flex items-center justify-between py-2 ${
                    index < recentActivity.length - 1 ? 'border-b' : ''
                  }`}
                >
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap mr-4">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>אין פעילות אחרונה להצגה</p>
              <p className="text-sm mt-2">התחל על ידי יצירת פרויקט או הצעת מחיר חדשה</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
