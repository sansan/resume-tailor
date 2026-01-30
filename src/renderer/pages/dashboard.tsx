import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your resume tailoring progress.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Resume Tailor</CardTitle>
          <CardDescription>Get started by importing your resume or creating one from scratch.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Dashboard content coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}
